#!/usr/bin/env python3
"""Create a test-only access grant using the owner's gcloud identity; never changes copied records."""
import argparse
import json
import subprocess
import urllib.error
import urllib.parse
import urllib.request

PROJECT = 'katatib-64049'
BASE = f'https://firestore.googleapis.com/v1/projects/{PROJECT}/databases/(default)/documents/katatib_access'

def grant_fields(email, role, kuttabs, teachers):
    if '@' not in email or '/' in email or len(email) > 254:
        raise ValueError('Use a valid Google account email.')
    if role not in ('admin', 'teacher'):
        raise ValueError('Unsupported role.')
    if role == 'teacher' and not kuttabs and not teachers:
        raise ValueError('A teacher needs an explicit kuttab name or original teacher ID.')
    if any(len(items) > 10 or any(not x.strip() for x in items) for items in (kuttabs, teachers)):
        raise ValueError('Use at most ten non-empty assignments of each kind.')
    array = lambda items: {'arrayValue': {'values': [{'stringValue': x} for x in sorted(set(items))]}}
    return {'active': {'booleanValue': True}, 'role': {'stringValue': role}, 'kuttabNames': array(kuttabs), 'teacherIds': array(teachers)}

def normalize(fields):
    return {
        'active': fields.get('active', {}).get('booleanValue'),
        'role': fields.get('role', {}).get('stringValue'),
        **{key: sorted(v.get('stringValue', '') for v in fields.get(key, {}).get('arrayValue', {}).get('values', [])) for key in ('kuttabNames', 'teacherIds')},
    }

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--email', required=True)
    parser.add_argument('--role', required=True, choices=['admin', 'teacher'])
    parser.add_argument('--kuttab', action='append', default=[])
    parser.add_argument('--teacher-id', action='append', default=[])
    args = parser.parse_args()
    email = args.email.strip().lower()
    fields = grant_fields(email, args.role, args.kuttab, args.teacher_id)
    token = subprocess.check_output(['gcloud', 'auth', 'print-access-token'], text=True).strip()
    headers = {'Authorization': 'Bearer ' + token, 'X-Goog-User-Project': PROJECT, 'Content-Type': 'application/json'}
    url = BASE + '/' + urllib.parse.quote(email, safe='')
    try:
        with urllib.request.urlopen(urllib.request.Request(url, headers=headers), timeout=30) as response:
            current = json.load(response)
        if normalize(current.get('fields', {})) != normalize(fields):
            raise SystemExit('An access grant already exists with different assignments. Review it in the test console; it was not overwritten.')
        print('Test access grant already matches:', email)
        return
    except urllib.error.HTTPError as error:
        if error.code != 404:
            raise SystemExit(f'Could not check test access (HTTP {error.code}). No grant was written.') from None
    request = urllib.request.Request(BASE + '?documentId=' + urllib.parse.quote(email, safe=''), data=json.dumps({'fields': fields}).encode(), headers=headers, method='POST')
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            response.read()
    except urllib.error.HTTPError as error:
        raise SystemExit(f'Could not create test access (HTTP {error.code}). Existing grants were not overwritten.') from None
    print('Created test-only access:', email, args.role)

if __name__ == '__main__':
    main()
