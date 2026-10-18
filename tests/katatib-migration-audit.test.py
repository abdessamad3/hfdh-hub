import hashlib
import importlib.util
import json
from pathlib import Path
import tempfile
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
