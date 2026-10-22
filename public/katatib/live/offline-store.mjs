// Per-account device data. No tokens, PINs or passwords are written here.
export const DEVICE_DB='katatib-device-v1';
export const plain=value=>JSON.parse(JSON.stringify(value));
export function deviceStore(indexed=globalThis.indexedDB){
 let opening;
 const open=()=>opening??=new Promise((resolve,reject)=>{const r=indexed.open(DEVICE_DB,1);r.onupgradeneeded=()=>r.result.createObjectStore('accounts');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
 async function transact(uid,change){const db=await open();return new Promise((resolve,reject)=>{const tx=db.transaction('accounts',change?'readwrite':'readonly'),store=tx.objectStore('accounts'),request=store.get(uid);let value;request.onsuccess=()=>{try{value=request.result||{enabled:false,cache:{},queue:[],preparedAt:null};if(change){value=change(value);if(value===null)store.delete(uid);else{if(new TextEncoder().encode(JSON.stringify(value)).byteLength>12*1024*1024)throw Error('device-storage-limit');store.put(value,uid);}}}catch(e){tx.abort();reject(e);}};tx.oncomplete=()=>resolve(value);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error('device-storage-failed'));});}
 return {read:uid=>transact(uid),update:(uid,change)=>transact(uid,change),remove:uid=>transact(uid,()=>null)};
}
export const pendingRows=state=>state.queue.filter(r=>!['dismissed','synced'].includes(r.status));
export function networkFailure(error){return /^(unavailable|network-request-failed|auth\/network-request-failed|deadline-exceeded)$/.test(error?.code||'')||/Failed to fetch|NetworkError|network-unavailable/.test(error?.message||'');}
export const readKey=(name,args)=>JSON.stringify([name,...(name==='students'?[]:args)]);
export function opTarget(name,args){return name==='saveAttendance'?JSON.stringify(['attendance',args[0],args[1].date,args[1].session]):name==='saveTeacherAttendance'?JSON.stringify(['teacherAttendance',args[0],args[1].date,args[1].session]):name==='workspaceSave'?JSON.stringify([args[0],args[1]]):JSON.stringify([name,args[1]]);}
