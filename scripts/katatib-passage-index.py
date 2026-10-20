#!/usr/bin/env python3
"""Build source-checked Warsh passage descriptions; never infer eighth boundaries."""
import argparse,hashlib,json,re,urllib.request
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
TEXT_COMMIT='3b7afc7f8c905da3d8fb3e8725f86805bd76b2bd'
# Set below to an immutable data-source commit.
EIGHTH_COMMIT='365910bc8bf6309765156f221c52d1f6c5813cc0'
TEXT_URL=f'https://raw.githubusercontent.com/quran-center/quran-meta/{TEXT_COMMIT}/examples/data-check/data/warshData_v2-1.json'
EIGHTH_URL=f'https://raw.githubusercontent.com/smartmaker-devs/nuralhifz-data/{EIGHTH_COMMIT}/data/eighths.json'
def norm(text):
 text=text.translate(str.maketrans({'أ':'ا','إ':'ا','آ':'ا','ٱ':'ا','ى':'ي','ے':'ي','ؤ':'و','ئ':'ي','ء':''}))
 return ''.join(c for c in text if '\u0620'<=c<='\u064a' and c!='ـ')
def clean(text):
 # KFQC uses presentation-form glyph slots for its final verse-number ornament.
 text=re.sub(r'\s*[\ufb50-\ufdff]+\s*$','',text)
 return text.replace('۞','').strip()
def build(eighth_bytes,text_bytes):
 manifest=json.loads((ROOT/'public/katatib/mushaf/manifest.json').read_text())
 text=json.loads(text_bytes);eighths=json.loads(eighth_bytes)
 assert len(text)==6214 and len(eighths)==480
 by={}
 for i,r in enumerate(text,1):
  assert r['id']==i
  expected=sum(s['ayahCount'] for s in manifest['surahs'][:r['sura_no']-1])+r['aya_no']
  assert expected==i
  by[r['sura_no'],r['aya_no']]=r
 result=[];previous=(0,0)
 for i,e in enumerate(eighths,1):
  assert e['eighth_id']==i and e['hizb']==(i-1)//8+1 and e['pos_in_hizb']==(i-1)%8+1
  start=e['start'];r=by[start['sura'],start['aya']];full=clean(r['aya_text']);offset=0
  if start['aya']!=1:
   needle=norm(e['text_preview']);normalized=norm(full)
   assert needle and normalized.count(needle)==1,(i,'opening mismatch')
   index=normalized.index(needle)
   assert bool(index)==bool(start['partial_verse']),(i,'partial-verse mismatch')
   if index:
    mapping=[]
    for j,c in enumerate(full):mapping.extend([j]*len(norm(c)))
    offset=mapping[index]
   assert norm(full[offset:]).startswith(needle)
  assert (r['id'],offset)>previous,(i,'non-increasing start')
  previous=(r['id'],offset)
  page=next(j+1 for j in range(604) if manifest['pageStarts'][j]<=r['id']<manifest['pageStarts'][j+1])
  opening=' '.join(full[offset:].split()[:8])
  result.append({'hizb':e['hizb'],'eighth':e['pos_in_hizb'],'surah':r['sura_no'],'ayah':r['aya_no'],'ordinal':r['id'],'page':page,'surahName':manifest['surahs'][r['sura_no']-1]['name'],'opening':opening,'fullAyah':full,'startOffset':offset,'startsInsideAyah':bool(offset)})
 return {'edition':manifest['edition'],'artworkCommit':manifest['commit'],'textSource':TEXT_URL,'boundarySource':EIGHTH_URL,'textSha256':hashlib.sha256(text_bytes).hexdigest(),'boundarySha256':hashlib.sha256(eighth_bytes).hexdigest(),'entries':result}
def main():
 p=argparse.ArgumentParser();p.add_argument('--text',type=Path);p.add_argument('--eighths',type=Path);p.add_argument('--check',action='store_true');a=p.parse_args()
 output=ROOT/'public/katatib/live/passage-index.mjs'
 if a.check:
  data=json.loads(output.read_text().removeprefix('export const PASSAGE_INDEX=').rstrip('\n;'));assert len(data['entries'])==480
  print('Passage index: 480 source-pinned entries');return
 t=a.text.read_bytes() if a.text else urllib.request.urlopen(TEXT_URL,timeout=40).read()
 e=a.eighths.read_bytes() if a.eighths else urllib.request.urlopen(EIGHTH_URL,timeout=40).read()
 data=build(e,t);output.write_text('export const PASSAGE_INDEX='+json.dumps(data,ensure_ascii=False,separators=(',',':'))+';\n')
 # Correct older quarter-derived navigation offsets without changing artwork/page numbering.
 manifest_path=ROOT/'public/katatib/mushaf/manifest.json';m=json.loads(manifest_path.read_text())
 m['hizbStarts']=[r['ordinal'] for r in data['entries'] if r['eighth']==1]
 manifest_path.write_text(json.dumps(m,ensure_ascii=False,separators=(',',':'))+'\n')
 print(f'Built {len(data["entries"])} passage descriptions, {output.stat().st_size} bytes')
if __name__=='__main__':main()
