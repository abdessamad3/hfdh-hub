import hashlib
import importlib.util
import json
import fcntl
import io
from pathlib import Path
import subprocess
import tempfile
import time
import unittest
from unittest.mock import patch
import zipfile

ROOT=Path(__file__).resolve().parents[1]
def module(name,path):
    spec=importlib.util.spec_from_file_location(name,path)
    obj=importlib.util.module_from_spec(spec);spec.loader.exec_module(obj);return obj
m=module('migration',ROOT/'scripts/katatib-migration-audit.py')
b=module('backup',ROOT/'scripts/katatib-backup.py')


def backup(folder,project,rows,missing=(),corrupt=False):
    docs=b''.join((json.dumps({'name':m.root(project)+'/'+p,'fields':f,'createTime':'2026-01-01T00:00:00Z'})+'\n').encode() for p,f in rows.items())
    absent=b''.join((json.dumps({'name':m.root(project)+'/'+p})+'\n').encode() for p in missing)
    payloads={'documents.jsonl':docs,'missing-parents.jsonl':absent}
    manifest={'format':'hifdh-firestore-rest-jsonl-v1','project':project,'database':'(default)','summary':{'documents':len(rows),'missing_parent_paths':len(missing)},'payload_sha256':{k:hashlib.sha256(v).hexdigest() for k,v in payloads.items()}}
    path=folder/(project+'.zip')
    with zipfile.ZipFile(path,'w') as z:
        for key,value in payloads.items():z.writestr(key,value+(b'corrupt' if corrupt and key=='documents.jsonl' else b''))
        z.writestr('manifest.json',json.dumps(manifest))
    return path


class AuditTests(unittest.TestCase):
    def test_typed_clone_and_new_v2_data_do_not_mean_production_ready(self):
        source={'students/a':{'total':{'integerValue':'9223372036854775807'},'link':{'referenceValue':m.root(m.SOURCE)+'/kuttabs/k'},'bytes':{'bytesValue':'AP8='},'timestamp':{'timestampValue':'2020-01-01T00:00:00.123456789Z'}}}
        target={'students/a':{**source['students/a'],'link':{'referenceValue':m.root(m.TARGET)+'/kuttabs/k'}},'katatib_tasks/task':{'status':{'stringValue':'planned'}}}
        with tempfile.TemporaryDirectory() as d:
            a=backup(Path(d),m.SOURCE,source);b=backup(Path(d),m.TARGET,target)
            before=(a.read_bytes(),b.read_bytes());result=m.audit(a,b)
            self.assertTrue(result['typed_clone_matches']);self.assertFalse(result['production_migration_ready']);self.assertEqual(result['additional_v2_documents'],1)
            self.assertEqual((a.read_bytes(),b.read_bytes()),before)
            self.assertNotIn('students/a',json.dumps(result))
    def test_changed_types_missing_or_unexplained_docs_are_blockers(self):
        original={'students/a':{'x':{'integerValue':'1'}}}
        self.assertFalse(m.compare(original,{'students/a':{'x':{'doubleValue':1}}})['typed_clone_matches'])
        self.assertEqual(m.compare(original,{})['missing_documents'],1)
        self.assertEqual(m.compare(original,{**original,'unknown/new':{}})['unexplained_target_documents'],1)
    def test_empty_typed_values_normalize_but_external_references_do_not(self):
        self.assertEqual(m.normal({'x':{'arrayValue':{}}},m.SOURCE),m.normal({'x':{'arrayValue':{'values':[]}}},m.TARGET))
        ref={'referenceValue':'projects/external/databases/(default)/documents/a/b'}
        self.assertEqual(m.normal(ref,m.SOURCE),ref)
    def test_corrupt_or_wrong_project_archive_is_rejected(self):
        with tempfile.TemporaryDirectory() as d:
            a=backup(Path(d),m.SOURCE,{'students/a':{}},corrupt=True)
            with self.assertRaisesRegex(ValueError,'checksum'):m.load_backup(a,m.SOURCE)
            a=backup(Path(d),m.TARGET,{})
            with self.assertRaisesRegex(ValueError,'Wrong backup'):m.load_backup(a,m.SOURCE)
    def test_missing_parent_mismatch_and_original_ambiguities_are_not_hidden(self):
        rows={'students/a':{'kuttabName':{'stringValue':'One'},'teacherId':{'stringValue':'missing'}},'kuttabs/k':{'name':{'stringValue':'One'}},'kuttabs/duplicate':{'name':{'stringValue':'One'}},'attendance/x':{'studentId':{'stringValue':'orphan'},'date':{'stringValue':'2026-02-30'}}}
        with tempfile.TemporaryDirectory() as d:
            result=m.audit(backup(Path(d),m.SOURCE,rows,['empty/parent']),backup(Path(d),m.TARGET,rows))
            self.assertFalse(result['missing_parent_paths_match']);self.assertEqual(result['source_relationship_issues']['duplicate_kuttab_names'],1);self.assertEqual(result['source_relationship_issues']['orphan_student_activities'],1)
    def test_read_only_exporter_refuses_wrong_project_and_all_writes(self):
        b.configure_project('katatib-64049');reader=b.Reader('2026-10-18T00:00:00Z')
        for resource,body in [(m.root(m.SOURCE)+'/students',None),(b.ROOT+':commit',{'writes':[]}),(b.ROOT+'/students/a',{'fields':{}})]:
            with self.assertRaisesRegex(RuntimeError,'outside|writes'):reader.request(resource,body=body)
        with self.assertRaises(ValueError):b.configure_project('unknown')
        b.configure_project('hifd-kouttab')


class RecoveryTests(unittest.TestCase):
    def fixtures(self, directory, corrupt=False):
        paths = []
        for project, name in [(m.SOURCE, 'source'), (m.TARGET, 'target')]:
            folder = directory / name
            folder.mkdir()
            original = backup(folder, project, {'students/a': {}}, corrupt=corrupt and name == 'source')
            path = folder / 'hifdh-firestore-fixture.zip'
            original.rename(path)
            paths.append(path)
        return paths

    def run_check(self, directory, *options):
        return subprocess.run(['bash', str(ROOT/'scripts/katatib-migration-check.sh'), '--resume', str(directory), *options], capture_output=True, text=True, timeout=15)

    def test_resume_reuses_valid_archives_and_preserves_previous_report(self):
        with tempfile.TemporaryDirectory() as d:
            directory = Path(d)
            archives = self.fixtures(directory)
            before = [p.read_bytes() for p in archives]
            first = self.run_check(directory)
            self.assertEqual(first.returncode, 0, first.stdout + first.stderr)
            report = (directory/'readiness.json').read_bytes()
            self.assertEqual(first.stdout.count('No export needed.'), 2)
            second = self.run_check(directory)
            self.assertEqual(second.returncode, 0, second.stdout + second.stderr)
            self.assertEqual((directory/'readiness.json').read_bytes(), report)
            self.assertEqual(len(list(directory.glob('readiness-*.json'))), 1)
            self.assertEqual([p.read_bytes() for p in archives], before)

    def test_invalid_source_stops_before_target_or_network_work(self):
        with tempfile.TemporaryDirectory() as d:
            directory = Path(d)
            self.fixtures(directory, corrupt=True)
            result = self.run_check(directory)
            self.assertNotEqual(result.returncode, 0)
            self.assertIn('checksum', result.stdout + result.stderr)
            self.assertNotIn('Starting the missing', result.stdout)
            self.assertNotIn('Validated existing katatib-64049', result.stdout)
            self.assertFalse((directory/'readiness.json').exists())

    def test_lock_refuses_duplicate_job(self):
        with tempfile.TemporaryDirectory() as d:
            directory = Path(d)
            with (directory/'.check.lock').open('w') as lock:
                fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
                result = self.run_check(directory)
            self.assertNotEqual(result.returncode, 0)
            self.assertIn('already running', result.stderr)
            self.assertFalse((directory/'source').exists())

    def test_background_reports_completion_in_private_log(self):
        with tempfile.TemporaryDirectory() as d:
            directory = Path(d)
            self.fixtures(directory)
            result = self.run_check(directory, '--background')
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertIn('tail -f', result.stdout)
            deadline = time.monotonic() + 5
            log, = directory.glob('check-*.log')
            while 'CHECK FINISHED' not in log.read_text() and time.monotonic() < deadline:
                time.sleep(0.05)
            self.assertIn('CHECK FINISHED', log.read_text())
            self.assertTrue((directory/'readiness.json').exists())
            self.assertEqual(log.stat().st_mode & 0o777, 0o600)

    def test_atomic_publication_never_overwrites_existing_report(self):
        with tempfile.TemporaryDirectory() as d:
            directory = Path(d)
            a, target = self.fixtures(directory)
            output = directory/'readiness.json'
            output.write_text('previous report')
            with patch('sys.argv', ['audit', '--source', str(a), '--target', str(target), '--output', str(output)]):
                with self.assertRaises(FileExistsError):
                    m.main()
            self.assertEqual(output.read_text(), 'previous report')
            self.assertFalse(list(directory.glob('.readiness-*')))

    def test_export_progress_excludes_credentials_and_document_paths(self):
        b.configure_project(m.SOURCE)
        reader = b.Reader('2026-10-18T00:00:00Z')
        reader.token = 'private-test-token'
        reader.requests = 24
        with patch.object(b.urllib.request, 'urlopen') as urlopen, patch('builtins.print') as out:
            urlopen.return_value.__enter__.return_value = io.StringIO('{}')
            reader.request(b.ROOT+'/students/private-student')
        printed = str(out.call_args_list)
        self.assertIn('25 read requests', printed)
        self.assertNotIn('private-test-token', printed)
        self.assertNotIn('private-student', printed)


class FakeReader:
    def __init__(self, snapshot):
        self.snapshot = snapshot
        self.requests = 0

    def collection_ids(self, parent):
        return {b.ROOT: ['students', 'programs'],
                b.ROOT + '/programs/missing': ['history']}.get(parent, [])

    def documents(self, parent, collection):
        base = parent + '/' + collection
        values = {'students': [
            {'name': base + '/s1', 'createTime': '2020-01-01T00:00:00Z', 'fields': {
                'large': {'integerValue': '9223372036854775807'},
                'binary': {'bytesValue': 'AP8='},
                'ref': {'referenceValue': b.ROOT + '/programs/missing'},
                'nested': {'mapValue': {'fields': {'when': {'timestampValue': '2020-01-01T00:00:00.123456Z'}}}},
            }}],
            'programs': [{'name': base + '/missing'}],
            'history': [{'name': base + '/h1', 'createTime': '2020-01-01T00:00:00Z', 'fields': {}}]}
        return values[collection]


class ExportTests(unittest.TestCase):
    def test_nested_orphans_typed_values_and_archive(self):
        with tempfile.TemporaryDirectory() as temp, patch.object(b, 'Reader', FakeReader), patch('builtins.print'):
            directory = Path(temp)
            b.export(directory, 100)
            archive, = directory.glob('*.zip')
            with zipfile.ZipFile(archive) as bundle:
                manifest = json.loads(bundle.read('manifest.json'))
                self.assertEqual(manifest['summary']['documents'], 2)
                self.assertEqual(manifest['summary']['missing_parent_paths'], 1)
                self.assertEqual(manifest['summary']['top_level_collections'], ['programs', 'students'])
                docs = [json.loads(row) for row in bundle.read('documents.jsonl').splitlines()]
                self.assertEqual(docs[0]['fields']['large']['integerValue'], '9223372036854775807')
                self.assertEqual(docs[0]['fields']['binary']['bytesValue'], 'AP8=')
                self.assertIn('/programs/missing/history/h1', docs[1]['name'])
                self.assertEqual(manifest['status'], 'export_finished_restore_not_verified')
                for name, digest in manifest['payload_sha256'].items():
                    self.assertEqual(b.hashlib.sha256(bundle.read(name)).hexdigest(), digest)
            self.assertIn(b.sha256_file(archive), archive.with_suffix('.sha256').read_text())

    def test_limit_publishes_no_completed_backup(self):
        with tempfile.TemporaryDirectory() as temp, patch.object(b, 'Reader', FakeReader), patch('builtins.print'):
            with self.assertRaisesRegex(RuntimeError, 'safety limit'):
                b.export(Path(temp), 1)
            self.assertFalse(list(Path(temp).iterdir()))

    def test_pagination_keeps_snapshot(self):
        reader = b.Reader('2026-10-18T00:00:00.000000Z')
        calls = []
        def request(resource, body=None, params=None):
            calls.append(dict(body))
            return {'collectionIds': ['first'], 'nextPageToken': 'next'} if len(calls) == 1 else {'collectionIds': ['second']}
        reader.request = request
        self.assertEqual(list(reader.collection_ids(b.ROOT)), ['first', 'second'])
        self.assertEqual(calls[0]['readTime'], calls[1]['readTime'])
        self.assertEqual(calls[1]['pageToken'], 'next')

    def test_no_write_or_cross_database_calls(self):
        reader = b.Reader('2026-10-18T00:00:00.000000Z')
        with self.assertRaisesRegex(RuntimeError, 'database writes'):
            reader.request(b.ROOT + '/students/s1', body={'fields': {}})
        with self.assertRaisesRegex(RuntimeError, 'outside'):
            reader.request('projects/other/databases/(default)/documents')



if __name__=='__main__':unittest.main()
