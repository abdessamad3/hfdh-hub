#!/usr/bin/env python3
"""Read-only private recovery inventory. Does not restore accounts, download Storage payloads or change settings."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import tempfile
import urllib.error
import urllib.parse
import urllib.request

PROJECTS=('hifd-kouttab','katatib-64049')

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--project',choices=PROJECTS,required=True)
    parser.add_argument('--output-dir',type=Path,default=Path.home()/'hifdh-backups')
    args=parser.parse_args();os.umask(0o077)
    args.output_dir.mkdir(parents=True,exist_ok=True)
    folder=Path(tempfile.mkdtemp(prefix='recovery-'+args.project+'-',dir=args.output_dir))
    auth=subprocess.run(['gcloud','auth','print-access-token'],capture_output=True,text=True,check=False)
    if auth.returncode or not auth.stdout.strip():raise SystemExit('Google sign-in unavailable; no credential was printed.')
    token=auth.stdout.strip();report={'project':args.project,'read_only':True,'production_migration_ready':False,'sections':{},'not_verified':['Account import and Google-provider sign-in on the destination','Storage object payload backup and restore','Actual phone classroom acceptance','Production cutover and retention of new writes on rollback']}
    def get(host,path,params=None):
        url='https://'+host+'/'+path
        if params:url+='?'+urllib.parse.urlencode(params)
        request=urllib.request.Request(url,headers={'Authorization':'Bearer '+token,'X-Goog-User-Project':args.project})
        try:
            with urllib.request.urlopen(request,timeout=60) as response:return json.load(response)
        except urllib.error.HTTPError as e:raise RuntimeError('HTTP '+str(e.code)) from None
        except (urllib.error.URLError,TimeoutError):raise RuntimeError('Network request failed') from None
    def pages(host,path,key,params=None,token_key='pageToken'):
        output=[];seen=set();query=dict(params or {})
        while True:
            data=get(host,path,query);output.extend(data.get(key,[]));token=data.get('nextPageToken')
            if len(output)>10000:raise RuntimeError('Inventory safety limit reached; section is not complete')
            if not token:return output
            if token in seen:raise RuntimeError('Repeated page token; section is not complete')
            seen.add(token);query[token_key]=token
    def section(name,fn):
        try:
            data,summary=fn();path=folder/(name+'.json');path.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
            report['sections'][name]={'status':'inventory_saved','sha256':hashlib.sha256(path.read_bytes()).hexdigest(),**summary}
            print(name+': private inventory saved; recovery not yet verified.',flush=True)
        except (RuntimeError,ValueError,KeyError) as e:
            report['sections'][name]={'status':'not_verified','reason':str(e)};print(name+': not verified ('+str(e)+').',flush=True)
    def accounts():
        rows=pages('identitytoolkit.googleapis.com','v1/projects/'+args.project+'/accounts:batchGet','users',{'maxResults':1000},'nextPageToken')
        passwords=[u for u in rows if any(p.get('providerId')=='password' for p in u.get('providerUserInfo',[]))]
        hashes=sum(bool(u.get('passwordHash')) for u in passwords)
        return rows,{'accounts':len(rows),'password_accounts':len(passwords),'password_hashes_present':hashes,'all_password_hashes_present':hashes==len(passwords)}
    section('auth-accounts',accounts)
    section('auth-config',lambda:(get('identitytoolkit.googleapis.com','admin/v2/projects/'+args.project+'/config'),{'contains_sensitive_configuration':True}))
    section('firestore-indexes',lambda:(pages('firestore.googleapis.com','v1/projects/'+args.project+'/databases/(default)/collectionGroups/-/indexes','indexes',{'pageSize':100}),{}))
    section('firestore-field-overrides',lambda:(pages('firestore.googleapis.com','v1/projects/'+args.project+'/databases/(default)/collectionGroups/-/fields','fields',{'pageSize':100}),{}))
    def rules():
        releases=pages('firebaserules.googleapis.com','v1/projects/'+args.project+'/releases','releases',{'pageSize':100})
        sources={}
        for release in releases:
            name=release.get('rulesetName','')
            if not re.fullmatch(r'projects/'+re.escape(args.project)+r'/rulesets/[A-Za-z0-9_-]+',name):raise RuntimeError('Unexpected ruleset identity')
            sources[name]=get('firebaserules.googleapis.com','v1/'+name)
        return {'releases':releases,'rulesets':sources},{'releases':len(releases)}
    section('rules',rules)
    def hosting():
        sites=pages('firebasehosting.googleapis.com','v1beta1/projects/'+args.project+'/sites','sites',{'pageSize':100});releases={}
        for site in sites:
            name=site.get('name','');identifier=name.split('/')[-1]
            if not re.fullmatch('[a-z0-9-]+',identifier):raise RuntimeError('Unexpected Hosting site identity')
            releases[identifier]=pages('firebasehosting.googleapis.com','v1beta1/sites/'+identifier+'/releases','releases',{'pageSize':100})
        return {'sites':sites,'releases':releases},{'sites':len(sites),'version_contents_downloaded':False}
    section('hosting-releases',hosting)
    def storage():
        buckets=pages('storage.googleapis.com','storage/v1/b','items',{'project':args.project,'maxResults':100});objects={}
        for bucket in buckets:
            name=bucket['name']
            if not re.fullmatch('[a-z0-9._-]+',name):raise RuntimeError('Unexpected bucket identity')
            objects[name]=pages('storage.googleapis.com','storage/v1/b/'+name+'/o','items',{'maxResults':100})
        return {'buckets':buckets,'objects':objects},{'buckets':len(buckets),'objects':sum(map(len,objects.values())),'payloads_downloaded':False}
    section('storage-inventory',storage)
    path=folder/'recovery-inventory.json';path.write_text(json.dumps(report,indent=2)+'\n')
    print('Private recovery inventory: '+str(path));print('Keep this folder private: it may contain password hashes and authentication settings. Do not upload it to GitHub or chat.')
    print('Inventory is not a verified restore or permission to replace production.')
    return 0 if all(x['status']=='inventory_saved' for x in report['sections'].values()) else 2

if __name__=='__main__':raise SystemExit(main())
