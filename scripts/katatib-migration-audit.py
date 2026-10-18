#!/usr/bin/env python3
"""Offline, read-only reconciliation of private typed source/test Firestore ZIPs.

Never makes network requests, restores data, sends notifications or prints record
contents. A successful comparison proves a document clone, not production readiness
or Firebase Authentication/Storage recovery. Keep the output private too.
"""
import argparse
from collections import Counter
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import zipfile

SOURCE = 'hifd-kouttab'
TARGET = 'katatib-64049'
V2_COLLECTIONS = {'katatib_students','katatib_tasks','katatib_attendance','katatib_attendance_history','katatib_learning','katatib_access','katatib_audit'}
MAX_BYTES = 128 * 1024 * 1024


def root(project):
    return f'projects/{project}/databases/(default)/documents'


def normal(value, project):
    if isinstance(value, list):
        return [normal(x, project) for x in value]
    if isinstance(value, dict):
        result = {}
        for key, x in value.items():
            if key in ('fields','values') and not x:
                continue
            if key == 'referenceValue' and isinstance(x, str) and x.startswith(root(project) + '/'):
                result[key] = '$SAME_DATABASE$/' + x[len(root(project)) + 1:]
            else:
                result[key] = normal(x, project)
        return result
    return value


def load_backup(path, project):
    with zipfile.ZipFile(path) as z:
        if len(z.namelist()) != len(set(z.namelist())) or sum(x.file_size for x in z.infolist()) > MAX_BYTES:
            raise ValueError('Duplicate archive entries or backup size exceeds the audit budget.')
        if z.testzip() is not None:
            raise ValueError('Backup ZIP integrity failed.')
        manifest = json.loads(z.read('manifest.json'))
        if (manifest.get('format'), manifest.get('project'), manifest.get('database')) != ('hifdh-firestore-rest-jsonl-v1',project,'(default)'):
            raise ValueError('Wrong backup format or source/target project. Auth ZIPs are separate.')
        payloads = {}
        for key in ('documents.jsonl','missing-parents.jsonl'):
            value = z.read(key)
            if hashlib.sha256(value).hexdigest() != manifest.get('payload_sha256',{}).get(key):
                raise ValueError('Backup checksum failed.')
            payloads[key] = value
        rows = {}
        for line in payloads['documents.jsonl'].splitlines():
            doc = json.loads(line)
            prefix = root(project) + '/'
            name = doc.get('name','')
            if not name.startswith(prefix):
                raise ValueError('Record outside the specified project.')
            relative = name[len(prefix):]
            pieces = relative.split('/')
            if len(pieces) % 2 or any(not x or x in ('.','..') for x in pieces) or relative in rows or not isinstance(doc.get('fields',{}),dict):
                raise ValueError('Invalid/duplicate document path or fields.')
            rows[relative] = doc.get('fields',{})
        if len(rows) != manifest.get('summary',{}).get('documents'):
            raise ValueError('Manifest count does not match payload.')
        missing = set()
        for line in payloads['missing-parents.jsonl'].splitlines():
            doc = json.loads(line)
            prefix = root(project) + '/'
            if not doc.get('name','').startswith(prefix):
                raise ValueError('Missing parent outside expected project.')
            relative = doc['name'][len(prefix):]
            pieces = relative.split('/')
            if len(pieces) % 2 or any(not x or x in ('.','..') for x in pieces) or relative in missing or relative in rows:
                raise ValueError('Invalid missing-parent path.')
            missing.add(relative)
        if len(missing) != manifest.get('summary',{}).get('missing_parent_paths',len(missing)):
            raise ValueError('Missing-parent count mismatch.')
        return rows, missing, manifest


def scalar(fields, key, tag):
    return fields.get(key,{}).get(tag)


def relationship_issues(rows):
    """Report ambiguities; never invent teachers, kuttabs, sessions or enrollment."""
    counts = Counter()
    students = {p.split('/')[1] for p in rows if p.count('/') == 1 and p.startswith('students/')}
    users = {p.split('/')[1] for p in rows if p.count('/') == 1 and p.startswith('users/')}
    kuttab_names = Counter(scalar(f,'name','stringValue') for p,f in rows.items() if p.count('/')==1 and p.startswith('kuttabs/'))
    for name, n in kuttab_names.items():
        if name and n > 1:
            counts['duplicate_kuttab_names'] += 1
    attendance = Counter()
    for path, fields in rows.items():
        pieces = path.split('/')
        if len(pieces) != 2:
            continue
        collection = pieces[0]
        if collection == 'students':
            name = scalar(fields,'kuttabName','stringValue')
            if not name or kuttab_names[name] != 1:
                counts['students_with_unresolved_kuttab'] += 1
            teacher = scalar(fields,'teacherId','stringValue')
            if not teacher or teacher not in users:
                counts['students_with_unresolved_teacher'] += 1
        if collection in {'attendance','evaluations','revisions','memorizations','next_revisions','next_evaluations'}:
            student = scalar(fields,'studentId','stringValue')
            if student not in students:
                counts['orphan_student_activities'] += 1
            date = scalar(fields,'dueDate' if collection.startswith('next_') else 'date','stringValue')
            try:
                if datetime.strptime(date, '%Y-%m-%d').strftime('%Y-%m-%d') != date:
                    raise ValueError()
            except (ValueError,TypeError):
                counts['activities_with_invalid_dates'] += 1
            if collection == 'attendance':
                session = scalar(fields,'sessionIndex','integerValue')
                if session is None or not str(session).isdigit():
                    counts['attendance_with_unmapped_session'] += 1
                else:
                    attendance[(student,date,session)] += 1
    counts['duplicate_attendance_groups'] = sum(n > 1 for n in attendance.values())
    return dict(sorted((k,v) for k,v in counts.items() if v))


def compare(source, target):
    missing = [p for p in source if p not in target]
    different = [p for p in source if p in target and normal(source[p],SOURCE) != normal(target[p],TARGET)]
    extra = [p for p in target if p not in source]
    unexplained = [p for p in extra if p.split('/')[0] not in V2_COLLECTIONS]
    return {'source_documents':len(source),'matched_documents':len(source)-len(missing)-len(different),
            'missing_documents':len(missing),'different_documents':len(different),
            'additional_v2_documents':len(extra)-len(unexplained),'unexplained_target_documents':len(unexplained),
            'counts_by_source_collection':dict(sorted(Counter(p.split('/')[0] for p in source).items())),
            'typed_clone_matches':not(missing or different or unexplained)}


def audit(source_path,target_path):
    source, missing_source, a = load_backup(source_path,SOURCE)
    target, missing_target, b = load_backup(target_path,TARGET)
    result = compare(source,target)
    result['missing_parent_paths_match'] = missing_source == missing_target
    result['source_relationship_issues'] = relationship_issues(source)
    result['checked_at'] = datetime.now(timezone.utc).isoformat()
    result['source_snapshot'] = a.get('read_time')
    result['target_snapshot'] = b.get('read_time')
    result['backup_sha256'] = {SOURCE:hashlib.sha256(source_path.read_bytes()).hexdigest(),TARGET:hashlib.sha256(target_path.read_bytes()).hexdigest()}
    result['production_migration_ready'] = False
    result['not_verified'] = ['Auth identity/provider recovery','Storage objects','rules/indexes','actual-phone acceptance','production cutover/rollback for new writes','feature parity']
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source',type=Path,required=True)
    parser.add_argument('--target',type=Path,required=True)
    parser.add_argument('--output',type=Path,required=True)
    args = parser.parse_args()
    os.umask(0o077)
    result = audit(args.source,args.target)
    # Never clobber an earlier report or a backup file.
    with args.output.open('x',encoding='utf8') as stream:
        json.dump(result,stream,ensure_ascii=False,indent=2)
        stream.write('\n')
    print(json.dumps(result,indent=2))
    return 0 if result['typed_clone_matches'] and result['missing_parent_paths_match'] else 2


if __name__ == '__main__':
    try:
        raise SystemExit(main())
    except (ValueError,KeyError,zipfile.BadZipFile,FileNotFoundError,FileExistsError) as error:
        raise SystemExit('Audit stopped: '+str(error)) from None
