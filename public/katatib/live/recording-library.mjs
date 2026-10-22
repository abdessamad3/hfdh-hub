import {attendanceId} from './attendance.mjs';
async function uploadBlob(url,blob,mime,onProgress){
 if(!globalThis.XMLHttpRequest)return fetch(url,{method:'PUT',headers:{'Content-Type':mime,'x-upsert':'false'},body:blob});
 return new Promise((resolve,reject)=>{const xhr=new XMLHttpRequest();xhr.open('PUT',url);xhr.timeout=120000;xhr.setRequestHeader('Content-Type',mime);xhr.setRequestHeader('x-upsert','false');xhr.upload.onprogress=e=>{if(e.lengthComputable)onProgress(Math.floor(e.loaded/e.total*85));};xhr.onload=()=>resolve({ok:xhr.status>=200&&xhr.status<300,status:xhr.status});xhr.onerror=xhr.ontimeout=()=>reject(Error('audio-upload-interrupted'));xhr.send(blob);});
}
import {cleanPassage} from './recitation-passage.mjs';
export const MAX_RECORDING_BYTES=32*1024*1024,MAX_DEVICE_AUDIO_BYTES=256*1024*1024;
export function recordingStore(indexed=globalThis.indexedDB){
 let opening;
 const db=()=>opening??=new Promise((resolve,reject)=>{const q=indexed.open('katatib-private-audio-v1',1);q.onupgradeneeded=()=>q.result.createObjectStore('recordings',{keyPath:['uid','id']});q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error);});
 async function tx(mode,fn){const d=await db();return new Promise((resolve,reject)=>{const t=d.transaction('recordings',mode);let result;fn(t.objectStore('recordings'),x=>result=x,t);t.oncomplete=()=>resolve(result);t.onabort=t.onerror=()=>reject(t.error||Error('audio-storage-failed'));});}
 return {list:uid=>tx('readonly',(s,set)=>{const q=s.getAll(IDBKeyRange.bound([uid,''],[uid,'\uffff']));q.onsuccess=()=>set(q.result);}),put:row=>tx('readwrite',(s,set,t)=>{const q=s.getAll(IDBKeyRange.bound([row.uid,''],[row.uid,'\uffff']));q.onsuccess=()=>{const bytes=q.result.filter(r=>r.id!==row.id).reduce((n,r)=>n+(r.blob?.size||0),0)+(row.blob?.size||0);if(bytes>MAX_DEVICE_AUDIO_BYTES){t.abort();return;}s.put(row);set(row);};}),remove:(uid,id)=>tx('readwrite',s=>s.delete([uid,id]))};
}
export function createRecordingLibrary({uid:authUid,request,store=recordingStore(),notify=()=>globalThis.dispatchEvent?.(new Event('katatib-audio-changed'))}){
 let owner=null,rows=[],syncing=false;
 const current=uid=>{if(!uid||uid!==owner||authUid()!==uid)throw Error('audio-account-changed');};
 async function refresh(uid){const result=await store.list(uid);current(uid);rows=result;notify();return rows;}
 const pending=()=>rows.filter(r=>r.state!=='online'&&r.blob).length;
 async function put(row){current(row.uid);await store.put(row);await refresh(row.uid);return row;}
 async function upload(id,onProgress=()=>{}){
  const uid=owner;current(uid);const row=rows.find(r=>r.id===id);if(!row?.blob)throw Error('audio-not-on-device');
  const {blob,...meta}=row;onProgress(0);
  try{
   const upload=await request('begin',{...meta,uid:undefined});current(uid);
   // URL is issued by our server for this exact object; no privileged key is sent to the browser.
   const url=new URL(upload.url);if(url.protocol!=='https:'||url.hostname!==new URL(upload.origin).hostname||!url.hostname.endsWith('.supabase.co'))throw Error('invalid-upload-url');
   const response=(upload.alreadySaved||upload.alreadyUploaded)?{ok:true}:await uploadBlob(url,blob,row.mime,onProgress);
   current(uid);if(!response.ok&&response.status!==409)throw Error('audio-upload-failed');onProgress(90);
   const confirmed=await request('finish',{...meta,uid:undefined});current(uid);
   if(confirmed.id!==row.id||confirmed.bytes!==row.bytes)throw Error('audio-not-confirmed');
   await put({...row,...confirmed,uid,blob,state:'online'});onProgress(100);return confirmed;
  }catch(e){current(uid);await put({...row,error:true});throw e;}
 }
 return {
  async activate(uid){owner=uid;rows=[];if(uid)await refresh(uid);},pending,rows:()=>rows.map(r=>({...r})),
  async save({blob,studentId,date,session,passage,recitationId,duration,id=crypto.randomUUID()}){
   const uid=owner;current(uid);attendanceId(studentId,date,session);if(!(blob instanceof Blob)||!blob.size||blob.size>MAX_RECORDING_BYTES||!['audio/webm','audio/ogg','audio/mp4'].includes(blob.type.split(';')[0])||!Number.isFinite(duration)||duration<0||duration>2705)throw Error('invalid-audio');
   const sha256=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await blob.arrayBuffer())),x=>x.toString(16).padStart(2,'0')).join('');current(uid);
   const row={...(recitationId?{recitationId}:{}),sha256,id,uid,studentId,date,session,passage:cleanPassage(passage),duration,bytes:blob.size,mime:blob.type.split(';')[0],createdAt:new Date().toISOString(),state:'local',blob};
   await put(row);try{await navigator.storage?.persist?.();}catch{}return row;
  },upload,
  async sync(){if(syncing)throw Error('audio-sync-busy');syncing=true;const uid=owner;try{for(const row of [...rows])if(row.state!=='online'&&row.blob){current(uid);await upload(row.id);}}finally{syncing=false;}},
  async list(studentId){const uid=owner;current(uid);const local=rows.filter(r=>r.studentId===studentId);if(globalThis.navigator?.onLine===false)return local;const remote=[];for(let offset=0;;offset+=1000){const page=await request('list',{studentId,offset});current(uid);if(!Array.isArray(page)||page.length>1000)throw Error('invalid-audio-history');remote.push(...page);if(page.length<1000)break;if(offset>=19000)throw Error('audio-history-limit');}const merged=new Map(local.map(r=>[r.id,r]));for(const r of remote){const previous=merged.get(r.id);const row={...r,uid,state:'online',blob:previous?.blob};await put(row);merged.set(r.id,row);}return [...merged.values()].sort((a,b)=>b.createdAt.localeCompare(a.createdAt));},
  async play(id){const uid=owner;current(uid);const row=rows.find(r=>r.id===id);if(!row)throw Error('audio-not-found');if(row.blob)return row.blob;const result=await request('play',{studentId:row.studentId,id});current(uid);const response=await fetch(result.url);if(!response.ok)throw Error('audio-download-failed');const blob=await response.blob();current(uid);if(blob.size!==row.bytes)throw Error('audio-download-incomplete');return blob;},
  async keep(id){const uid=owner,blob=await this.play(id);current(uid);const row=rows.find(r=>r.id===id);await put({...row,blob});},
  async remove(id){const uid=owner;current(uid);await store.remove(uid,id);await refresh(uid);},
  async forget(){const uid=owner;current(uid);if(pending())throw Error('audio-sync-first');for(const r of rows)await store.remove(uid,r.id);rows=[];notify();},usage:studentId=>request('usage',{studentId}),busy:()=>syncing
 };
}
