#!/usr/bin/env python3
"""Read-only typed source/test Firestore snapshot export for the owner's Google Cloud Shell.

Uses only Python's standard library and the existing gcloud sign-in. No pip,
service-account key, billing change, database write or upload is performed.
The ZIP is a custom JSONL export, NOT a managed Firestore import archive.
Firebase Auth users, Storage files, rules and indexes are NOT included.
"""
import argparse
from collections import defaultdict
from datetime import datetime, timedelta, timezone
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request
import zipfile

PROJECT = 'hifd-kouttab'
DATABASE = '(default)'
ROOT = f'projects/{PROJECT}/databases/{DATABASE}/documents'
API = 'https://firestore.googleapis.com/v1/'


def utc():
    return datetime.now(timezone.utc)


def stamp(value):
    return value.isoformat(timespec='microseconds').replace('+00:00', 'Z')


class Reader:
    def __init__(self, snapshot):
        self.snapshot = snapshot
        self.started = time.monotonic()
        self.token = None
        self.requests = 0

    def refresh_token(self):
        result = subprocess.run(
            ['gcloud', 'auth', 'print-access-token'],
            capture_output=True, text=True, check=False,
        )
        if result.returncode or not result.stdout.strip():
            raise RuntimeError('Google authentication failed. Check your Cloud Shell sign-in. No token was displayed.')
        self.token = result.stdout.strip()

    def request(self, resource, body=None, params=None):
        if resource != ROOT and not resource.startswith(ROOT + '/') and resource != ROOT + ':listCollectionIds':
            raise RuntimeError('Refusing a request outside the selected database.')
        # The only POST operation allowed by this exporter is a read-only list.
        if body is not None and not resource.endswith(':listCollectionIds'):
            raise RuntimeError('This exporter cannot perform database writes.')
        url = API + urllib.parse.quote(resource, safe='/():')
        if params:
            url += '?' + urllib.parse.urlencode(params)
        for attempt in range(6):
            if time.monotonic() - self.started > 45 * 60:
                raise RuntimeError('Stopped before the one-hour snapshot window expired. No completed backup was published.')
            if not self.token:
                self.refresh_token()
            request = urllib.request.Request(
                url,
                data=None if body is None else json.dumps(body).encode('utf-8'),
                headers={'Authorization': 'Bearer ' + self.token, 'Content-Type': 'application/json'},
            )
            self.requests += 1
            if self.requests == 1 or self.requests % 25 == 0:
                print(f'Progress: {self.requests} read requests; checking documents and subcollections ({int(time.monotonic() - self.started)} seconds).', flush=True)
            try:
                with urllib.request.urlopen(request, timeout=60) as response:
                    return json.load(response)
            except urllib.error.HTTPError as error:
                if error.code == 401 and attempt < 5:
                    print('Refreshing Google sign-in for the next read.', flush=True)
                    self.token = None
                    continue
                if error.code in (429, 500, 502, 503, 504) and attempt < 5:
                    print(f'Read delayed (HTTP {error.code}); retry {attempt + 1}/5.', flush=True)
                    time.sleep(min(2 ** attempt, 16))
                    continue
                # Do not print response bodies, records, headers, or tokens.
                raise RuntimeError(f'Firestore read failed with HTTP {error.code}. No completed backup was published.') from None
            except (urllib.error.URLError, TimeoutError):
                if attempt == 5:
                    raise RuntimeError('Network read failed. No completed backup was published.') from None
                print(f'Network read delayed; retry {attempt + 1}/5.', flush=True)
                time.sleep(min(2 ** attempt, 16))
        raise RuntimeError('Read attempts exhausted.')

    def pages(self, resource, key, body=None, params=None):
        seen_tokens = set()
        while True:
            result = self.request(resource, body=body, params=params)
            yield from result.get(key, [])
            token = result.get('nextPageToken')
            if not token:
                return
            if token in seen_tokens:
                raise RuntimeError('Repeated pagination token; refusing an incomplete export.')
            seen_tokens.add(token)
            if body is not None:
                body = dict(body, pageToken=token)
            else:
                params = dict(params or {}, pageToken=token)

    def collection_ids(self, parent):
        return self.pages(parent + ':listCollectionIds', 'collectionIds', body={
            'pageSize': 100, 'readTime': self.snapshot,
        })

    def documents(self, parent, collection):
        if not collection or '/' in collection:
            raise RuntimeError('Unexpected collection identifier.')
        return self.pages(parent + '/' + collection, 'documents', params={
            'pageSize': 100, 'readTime': self.snapshot, 'showMissing': 'true',
        })


def encoded(record):
    # REST typed values are retained: int64 strings, timestamps, bytes, refs,
    # geo points, arrays/maps, and unknown future fields are not simplified.
    return (json.dumps(record, ensure_ascii=False, sort_keys=True, separators=(',', ':')) + '\n').encode('utf-8')


def collect(reader, directory, maximum):
    counts = defaultdict(int)
    missing_count = 0
    total = 0
    seen = set()
    collections = set()
    root_ids = []
    stack = [ROOT]
    with (directory / 'documents.jsonl').open('wb') as output, (directory / 'missing-parents.jsonl').open('wb') as missing:
        while stack:
            parent = stack.pop()
            for collection in reader.collection_ids(parent):
                collection_path = parent + '/' + collection
                if collection_path in collections:
                    raise RuntimeError('Duplicate collection traversal; export stopped.')
                collections.add(collection_path)
                if parent == ROOT:
                    root_ids.append(collection)
                    print('Reading collection:', collection, flush=True)
                for document in reader.documents(parent, collection):
                    name = document.get('name', '')
                    prefix = collection_path + '/'
                    if not name.startswith(prefix) or '/' in name[len(prefix):] or not name[len(prefix):]:
                        raise RuntimeError('Unexpected document path; export stopped.')
                    if name in seen:
                        raise RuntimeError('Duplicate document path; export stopped.')
                    seen.add(name)
                    relative = name[len(ROOT) + 1:]
                    if document.get('createTime') is None:
                        # A missing parent can still have real subcollections.
                        missing.write(encoded(document))
                        missing_count += 1
                    else:
                        output.write(encoded(document))
                        counts[relative.split('/')[0]] += 1
                        total += 1
                        if total > maximum:
                            raise RuntimeError(f'Stopped at the safety limit of {maximum} documents. Contact your helper before increasing it.')
                    stack.append(name)
    return {'documents': total, 'missing_parent_paths': missing_count,
            'collection_paths': len(collections), 'top_level_collections': sorted(root_ids),
            'documents_by_top_level_collection': dict(sorted(counts.items()))}


def sha256_file(path):
    digest = hashlib.sha256()
    with path.open('rb') as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b''):
            digest.update(block)
    return digest.hexdigest()


def export(output_directory, maximum):
    os.umask(0o077)
    start = utc()
    # One point-in-time for collection discovery AND every document page.
    snapshot = stamp(start - timedelta(seconds=10))
    reader = Reader(snapshot)
    print('After listing collections, every document is checked for nested collections. This can take several minutes.', flush=True)
    output_directory.mkdir(mode=0o700, parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='hifdh-export-') as temporary:
        directory = Path(temporary)
        summary = collect(reader, directory, maximum)
        payloads = ['documents.jsonl', 'missing-parents.jsonl']
        manifest = {
            'format': 'hifdh-firestore-rest-jsonl-v1',
            'project': PROJECT, 'database': DATABASE,
            'started_at': stamp(start), 'completed_at': stamp(utc()),
            'read_time': snapshot, 'consistent_read_time_requested_for_all_pages': True,
            'status': 'export_finished_restore_not_verified',
            'scope': 'Firestore document data in this database, including discovered subcollections',
            'not_included': ['Firebase Auth identities', 'Storage files', 'rules', 'indexes', 'other databases'],
            'summary': summary, 'api_requests': reader.requests,
            'payload_sha256': {name: sha256_file(directory / name) for name in payloads},
            'restore_note': 'Custom typed JSONL format. Do not pass this ZIP to gcloud firestore import. Restoration must be implemented and rehearsed in an isolated destination before production changes.',
        }
        (directory / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
        filename = 'hifdh-firestore-' + start.strftime('%Y%m%dT%H%M%S') + '-' + os.urandom(3).hex() + '.zip'
        archive = output_directory / filename
        incomplete = archive.with_suffix('.partial')
        try:
            with zipfile.ZipFile(incomplete, 'x', compression=zipfile.ZIP_DEFLATED) as bundle:
                for name in payloads + ['manifest.json']:
                    bundle.write(directory / name, arcname=name)
            # Check the saved bytes before publishing a completed ZIP.
            with zipfile.ZipFile(incomplete) as bundle:
                if bundle.testzip() is not None:
                    raise RuntimeError('Archive integrity check failed.')
                for name, digest in manifest['payload_sha256'].items():
                    if hashlib.sha256(bundle.read(name)).hexdigest() != digest:
                        raise RuntimeError('Payload checksum verification failed.')
            incomplete.replace(archive)
        finally:
            if incomplete.exists():
                incomplete.unlink()
    digest = sha256_file(archive)
    archive.with_suffix('.sha256').write_text(f'{digest}  {archive.name}\n', encoding='utf-8')
    # This summary intentionally contains no student fields or access tokens.
    print('\nFIRESTORE EXPORT FINISHED — restore not yet verified')
    print(json.dumps(summary, indent=2))
    print('Snapshot UTC:', snapshot)
    print('Download file:', archive.resolve())
    print('SHA256:', digest)
    print('Keep this archive private. Auth accounts and stored files still need separate backup.')


def configure_project(project):
    global PROJECT, ROOT
    if project not in ('hifd-kouttab', 'katatib-64049'):
        raise ValueError('Only the original source or isolated test project is allowed.')
    PROJECT = project
    ROOT = f'projects/{PROJECT}/databases/{DATABASE}/documents'


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--project', choices=['hifd-kouttab', 'katatib-64049'], default='hifd-kouttab')
    parser.add_argument('--output-dir', type=Path, default=Path.home() / 'hifdh-backups')
    parser.add_argument('--max-documents', type=int, default=40000)
    args = parser.parse_args()
    configure_project(args.project)
    if args.max_documents < 1:
        parser.error('--max-documents must be positive')
    print(f'Read-only export: {PROJECT} / {DATABASE}. No records will be changed.', flush=True)
    try:
        export(args.output_dir, args.max_documents)
    except (RuntimeError, OSError, ValueError) as error:
        print('EXPORT FAILED:', str(error), file=sys.stderr)
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
