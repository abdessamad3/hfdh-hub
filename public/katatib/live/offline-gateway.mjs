import {deviceStore,plain,pendingRows,readKey,opTarget,networkFailure} from './offline-store.mjs';
import {cleanAttendance,attendanceId} from './attendance.mjs';
import {cleanLearning} from './learning.mjs';
import {cleanVerseMark} from './mushaf-model.mjs';
import {CLEANERS,STAFF_ROLES} from './workspace-model.mjs';
import {historyProjection,mergeHistory} from './legacy.mjs';
const READS=new Set(['students','kuttabs','scheduleRows','teachers','teacherAttendance','teacherHistory','history','attendanceHistory','studentHistory','workspaceList','learningHistory','verseMarks','attendance','noticeAcks']);
const WORKSPACE=new Set(['katatib_tasks','katatib_legacy_task_states','katatib_legacy_corrections','katatib_schedules']);
const WRITES=new Set(['saveAttendance','saveTeacherAttendance','saveLearning','saveVerseMark','workspaceSave']);
const blockedRead=(name,args)=>name==='workspaceList'&&['katatib_access','katatib_audit'].includes(args[0]);
const stamp=()=>{const now=Date.now();return {seconds:Math.floor(now/1000),nanoseconds:(now%1000)*1000000};};
function revive(v){if(Array.isArray(v))return v.map(revive);if(v&&typeof v==='object'){const r=Object.fromEntries(Object.entries(v).map(([k,x])=>[k,revive(x)]));if(Number.isFinite(r.seconds))Object.defineProperty(r,'toDate',{value:()=>new Date(r.seconds*1000+(r.nanoseconds||0)/1e6)});return r;}return v;}
function resultFor(op,uid){const a=op.args,createdAt=op.createdAt;
 if(op.name==='saveAttendance'||op.name==='saveTeacherAttendance')return {...a[2],revision:a[3]+1,...op.confirmed,queued:!op.confirmed};
 if(op.name==='saveLearning')return {schemaVersion:2,...a[0],id:a[1],createdBy:uid,createdAt,...op.confirmed,queued:!op.confirmed};
 if(op.name==='saveVerseMark')return {schemaVersion:1,...a[0],id:a[1],createdBy:uid,createdAt,...op.confirmed,queued:!op.confirmed};
 return {schemaVersion:1,...a[2],id:a[1],revision:a[3]+1,updatedBy:uid,updatedAt:createdAt,eventId:a[4],...op.confirmed,queued:!op.confirmed};
}
export function projectPending(name,args,base,operations,uid){
 let value=plain(base);
 for(const op of operations){const a=op.args,r=resultFor(op,uid),append=()=>{value=value.filter(x=>x.id!==r.id).concat(r);};
  if(op.name==='saveAttendance'){
   if(name==='attendance'&&args[0].includes(a[0])&&args[1].date===a[1].date&&args[1].session===a[1].session)value[a[0]]=r;
   if(name==='studentHistory'&&args[0]===a[0]){const id=attendanceId(a[0],a[1].date,a[1].session),row={...historyProjection('katatib_attendance',id,{studentId:a[0],...a[1],...r}),queued:true};value=value.filter(x=>x.key!==row.key).concat(row);}
   if(name==='attendanceHistory'&&args[0]===a[0])value.push({...a[1],...r});
  }
  if(op.name==='saveTeacherAttendance'&&name==='teacherAttendance'&&args[0]===a[0]&&args[1].date===a[1].date&&args[1].session===a[1].session)value=r;
  if(op.name==='saveTeacherAttendance'&&name==='teacherHistory'&&args[0]===a[0])value.push({...a[1],...r,teacherId:a[0],source:'V2',id:op.id});
  if(op.name==='saveLearning'&&name==='learningHistory'&&args[0]===a[0].studentId)append();
  if(op.name==='saveVerseMark'&&name==='verseMarks'&&args[0]===a[0].studentId&&args[1]===a[0].page)append();
  if(op.name==='workspaceSave'&&name==='workspaceList'&&args[0]===a[0]&&(!args[1]||args[1]===a[2].studentId))append();
  if(op.name==='workspaceSave'&&a[0]==='katatib_schedules'&&name==='scheduleRows'&&args[0]===a[2].kuttabId)append();
  if(op.name==='workspaceSave'&&name==='studentHistory'&&args[0]===a[2].studentId&&a[0]==='katatib_legacy_task_states')value=value.map(x=>x.collection===a[2].sourceCollection&&x.id===a[2].sourceId?{...x,status:a[2].status,note:a[2].note,taskState:r,original:x.original||plain(x)}:x);
  if(op.name==='workspaceSave'&&name==='studentHistory'&&args[0]===a[2].studentId&&a[0]==='katatib_legacy_corrections')value=value.map(x=>x.collection===a[2].sourceCollection&&x.id===a[2].sourceId?{...x,...Object.fromEntries(Object.entries(a[2]).filter(([k])=>!['sourceCollection','sourceId','studentId','reason'].includes(k))),validDate:true,correction:r,original:x.original||plain(x)}:x);
 }
 return name==='studentHistory'?mergeHistory([value],args[0]):value;
}
export function createOfflineGateway(raw,{store=deviceStore(),online=()=>navigator.onLine,locks=globalThis.navigator?.locks,onChange=()=>{}}={}){
 let identity=null,state={enabled:false,cache:{},queue:[]},syncing=false,preparing=false,authEpoch=0,prepareDone=0,prepareTotal=0;
 const syncLock=fn=>{if(!locks?.request)throw Error('offline-locks-unavailable');return locks.request('katatib-device-sync',fn);};
 const lock=fn=>{if(!locks?.request)throw Error('offline-locks-unavailable');return locks.request('katatib-device-writes',fn);};
 const current=uid=>{if(!identity||identity.uid!==uid||raw.authUid&&raw.authUid()!==uid)throw Error('offline-account-changed');};
 const notify=()=>onChange({enabled:state.enabled,pending:pendingRows(state).length,syncing,preparing,preparedAt:state.preparedAt,prepareDone,prepareTotal});
 async function refresh(uid){state=await store.read(uid);current(uid);return state;}
 async function markBlocked(uid,op,error){await store.update(uid,s=>{const r=s.queue.find(x=>x.id===op.id);if(r){r.status='blocked';r.error=/conflict/.test(error.code||error.message||'')?'conflict':error.code==='resource-exhausted'?'quota':'permission-or-validation';}return s;});await refresh(uid);notify();}
 async function read(name,args,fresh=false){if(state.storageFailed)return raw[name](...args);const uid=identity?.uid;if(!uid)return raw[name](...args);await refresh(uid);const key=readKey(name,args);let base;
  const roster=state.cache[readKey('students',[])];if(!online()&&state.enabled){if(!STAFF_ROLES.includes(roster?.role))throw Error('no-access');const ids=name==='attendance'?args[0]:['studentHistory','history','attendanceHistory','learningHistory','verseMarks','noticeAcks'].includes(name)?[args[0]]:name==='workspaceList'&&args[1]?[args[1]]:[];if(ids.some(id=>!roster.students.some(s=>s.id===id)))throw Error('no-access');}
  if(!online()&&state.enabled&&!fresh&&!blockedRead(name,args)){
   if(name==='attendance'){base={};for(const id of args[0]){const single=readKey('attendance',[[id],args[1]]);if(!(single in state.cache))throw Error('offline-not-prepared');base[id]=state.cache[single][id];}}
   else{if(!(key in state.cache))throw Error('offline-not-prepared');base=state.cache[key];}
  }else{
   try{base=await raw[name](...args);current(uid);if(state.enabled&&!blockedRead(name,args))await store.update(uid,s=>{if(name==='students'){const prior=s.cache[key];if(prior&&(prior.role!==base.role||prior.students.some(old=>!base.students.some(x=>x.id===old.id)))){s.cache={};s.preparedAt=null;if(!STAFF_ROLES.includes(base.role))s.enabled=false;}}if(name==='attendance')for(const id of args[0])s.cache[readKey(name,[[id],args[1]])]={[id]:plain(base[id])};else s.cache[key]=plain(base);return s;});}
   catch(e){if(state.enabled&&!fresh&&!blockedRead(name,args)&&networkFailure(e)){
     // Network failures never turn permission errors into cached access.
     if(name==='attendance'){base={};for(const id of args[0]){const cached=state.cache[readKey(name,[[id],args[1]])];if(!cached)throw e;base[id]=cached[id];}}
     else{if(!(key in state.cache))throw e;base=state.cache[key];}
    }else{if(name==='students'&&/permission-denied|no-access/.test(e.code||e.message||'')){await store.update(uid,s=>({...s,enabled:false,preparedAt:null,cache:{}}));await refresh(uid);}throw e;}}
  }
  await refresh(uid);return revive(projectPending(name,args,base,pendingRows(state),uid));
 }
 function validate(name,args){const roster=state.cache[readKey('students',[])];if(!roster||!STAFF_ROLES.includes(roster.role))throw Error('offline-staff-only');
  const student=name==='workspaceSave'?args[2].studentId:name==='saveAttendance'?args[0]:args[0]?.studentId;
  if(student&&!roster.students.some(s=>s.id===student))throw Error('no-access');
  if(name==='saveAttendance'||name==='saveTeacherAttendance'){attendanceId(args[0],args[1].date,args[1].session);cleanAttendance(args[2]);if(!Number.isSafeInteger(args[3])||args[3]<0)throw Error('invalid-revision');}
  if(name==='saveTeacherAttendance'){const teachers=state.cache[readKey('teachers',[])];if(!['admin','manager'].includes(roster.role)||!teachers?.some(t=>t.id===args[0]))throw Error('no-access');}
  if(name==='workspaceSave'&&args[0]==='katatib_schedules'){const kuttabs=state.cache[readKey('kuttabs',[])];if(!['admin','manager'].includes(roster.role)||!kuttabs?.some(k=>k.id===args[2].kuttabId))throw Error('no-access');}
  if(['saveLearning','saveVerseMark'].includes(name)&&!(/^[A-Za-z0-9-]{16,80}$/.test(args[1])))throw Error('invalid-identity');
  if(name==='saveLearning')cleanLearning(args[0]);if(name==='saveVerseMark')cleanVerseMark(args[0],args[2]);
  if(name==='workspaceSave'){if(!WORKSPACE.has(args[0]))throw Error('offline-online-only-action');CLEANERS[args[0]](args[2]);if(!Number.isSafeInteger(args[3])||args[3]<0)throw Error('invalid-revision');}
 }
 async function write(name,args){if(state.storageFailed)return raw[name](...args);const uid=identity?.uid;if(!uid)throw Error('no-access');await refresh(uid);if(!state.enabled)return raw[name](...args);if(name==='workspaceSave'&&!WORKSPACE.has(args[0])){if(!online())throw Error('offline-online-only-action');return raw[name](...args);}
  return lock(async()=>{await refresh(uid);validate(name,args);const id=name==='saveLearning'||name==='saveVerseMark'?args[1]:name==='workspaceSave'?args[4]:name==='saveTeacherAttendance'?args[4]:crypto.randomUUID();
   const savedArgs=plain(args);if(name==='saveAttendance')savedArgs[4]=id;
   const op={id,name,args:savedArgs,target:opTarget(name,args),status:'pending',createdAt:stamp()};
   await store.update(uid,s=>{const prior=s.queue.find(x=>x.id===id);if(prior){if(JSON.stringify(prior.args)!==JSON.stringify(op.args)||prior.name!==name)throw Error('offline-intent-conflict');}else{if(pendingRows(s).length>=500)throw Error('offline-queue-full');s.queue.push(op);}return s;});await refresh(uid);notify();return revive(resultFor(op,uid));
  }).then(local=>{if(online())void sync().catch(()=>{});return local;});
 }
 async function sync(){if(pendingRows(state)[0]?.status==='blocked')return;if(syncing||!online()||!identity||(!state.enabled&&!pendingRows(state).length))return;const uid=identity.uid;syncing=true;notify();
  try{await syncLock(async()=>{await refresh(uid); // Recheck access on the server before replaying any queued operation.
   try{const roster=await raw.students(identity);current(uid);if(!STAFF_ROLES.includes(roster.role))throw Error('no-access');await store.update(uid,s=>{const previous=s.cache[readKey('students',[])];if(previous?.students.some(old=>!roster.students.some(x=>x.id===old.id))||previous&&previous.role!==roster.role){s.cache={};s.preparedAt=null;}s.enabled=true;s.cache[readKey('students',[])]=plain(roster);return s;});}catch(e){if(!networkFailure(e)){await store.update(uid,s=>({...s,enabled:false,preparedAt:null,cache:{}}));}return;}
   while(online()){await refresh(uid);const op=pendingRows(state)[0];if(!op||op.status==='blocked')break;
    try{if(!WRITES.has(op.name)||!Array.isArray(op.args))throw Error('invalid-offline-intent');validate(op.name,op.args);current(uid);const confirmed=await raw[op.name](...op.args);current(uid);op.confirmed=plain(confirmed??resultFor(op,uid));await store.update(uid,s=>{for(const [key,base] of Object.entries(s.cache)){const [name,...args]=JSON.parse(key);s.cache[key]=projectPending(name,args,base,[op],uid);}const saved=s.queue.find(x=>x.id===op.id);if(saved){saved.status='synced';delete saved.args;}s.queue=s.queue.filter(x=>x.status!=='synced');return s;});}
    catch(e){if(networkFailure(e))break;await markBlocked(uid,op,e);break;}
   }
  });}finally{syncing=false;if(identity?.uid===uid)await refresh(uid);notify();}
 }
 async function prepare({date,students,pages=[]}){if(!locks?.request)throw Error('offline-locks-unavailable');attendanceId('prepare',date,'morning');if(!Array.isArray(students)||students.length>200||!Array.isArray(pages)||pages.length>10||pages.some(p=>!Number.isInteger(p)||p<1||p>604))throw Error('invalid-offline-preparation');if(state.storageFailed)throw Error('offline-storage-unavailable');if(!identity||!online())throw Error('offline-prepare-online');if(preparing||pendingRows(state).length)throw Error('offline-sync-first');const uid=identity.uid;prepareDone=0;prepareTotal=students.length;preparing=true;notify();try{
  const roster=await raw.students(identity);current(uid);if(!STAFF_ROLES.includes(roster.role))throw Error('offline-staff-only');await raw.trustDevice?.();current(uid);
  const selected=roster.students.filter(s=>students.includes(s.id));if(!selected.length||selected.length>200)throw Error('offline-roster-limit');
  await store.update(uid,s=>({...s,enabled:true,cache:{...s.cache,[readKey('students',[])]:plain({...roster,students:selected})}}));await refresh(uid);
  // Use the raw readers and bounded workers; only a successfully completed preparation is labelled ready.
  const download=(name,args)=>read(name,args,true);
  let i=0;await Promise.all(Array.from({length:Math.min(3,selected.length)},async()=>{while(i<selected.length){const s=selected[i++];for(const [name,args] of [['studentHistory',[s.id]],['learningHistory',[s.id]],['workspaceList',['katatib_tasks',s.id]],['history',[s.id]],['attendanceHistory',[s.id]],...pages.map(p=>['verseMarks',[s.id,p]])]){current(uid);await download(name,args);}for(const session of ['morning','afternoon','evening'])await download('attendance',[[s.id],{date,session}]);prepareDone++;notify();}}));
  const kuttabs=await download('kuttabs',[]);for(const k of kuttabs)await download('scheduleRows',[k.id]);
  if(['admin','manager'].includes(roster.role)){const teachers=await download('teachers',[]);for(const teacher of teachers){await download('teacherHistory',[teacher.id]);for(const session of ['morning','afternoon','evening'])await download('teacherAttendance',[teacher.id,{date,session}]);}}
  await store.update(uid,s=>({...s,preparedAt:null,preparedDate:date}));await refresh(uid);notify();
 }catch(e){await store.update(uid,s=>({...s,preparedAt:null}));throw e;}finally{preparing=false;notify();}}
 const api=new Proxy(raw,{get(target,name){if(name==='observe')return callback=>raw.observe(async next=>{const token=++authEpoch;identity=next;let loaded;try{loaded=next?await store.read(next.uid):{enabled:false,cache:{},queue:[]};}catch{loaded={enabled:false,cache:{},queue:[],storageFailed:true};}if(token!==authEpoch)return;state=loaded;callback(next);notify();if(next&&state.enabled&&online())void sync().catch(()=>{});});if(name==='logout')return async()=>{const uid=identity?.uid;if(!uid)return raw.logout();if(state.storageFailed||!locks?.request){if(state.enabled||pendingRows(state).length)throw Error('offline-sync-first');await raw.logout();try{localStorage.removeItem('katatib-offline-trusted');}catch{}return;}await syncLock(()=>lock(async()=>{await refresh(uid);if(pendingRows(state).length)throw Error('offline-sync-first');await raw.logout();await store.remove(uid);try{localStorage.removeItem('katatib-offline-trusted');}catch{}}));};
  if(name==='offline')return {prepare,sync,async retry(){const uid=identity?.uid;if(!uid)return;await syncLock(async()=>{await store.update(uid,s=>{for(const r of pendingRows(s))if(r.status==='blocked'&&r.error!=='conflict'){r.status='pending';delete r.error;}return s;});await refresh(uid);});await sync();},async completePreparation(){const uid=identity?.uid;if(!uid)throw Error('no-access');await store.update(uid,s=>({...s,preparedAt:new Date().toISOString()}));await refresh(uid);notify();},status:()=>({...state,prepareDone,prepareTotal,pending:pendingRows(state).length,syncing,preparing}),async dismiss(id){const uid=identity?.uid;if(!uid)return;await syncLock(async()=>{await store.update(uid,s=>{const row=s.queue.find(x=>x.id===id);if(!row)return s;for(const r of s.queue)if(r.target===row.target&&!['synced','dismissed'].includes(r.status))r.status='dismissed';return s;});await refresh(uid);notify();});},async forget(){if(pendingRows(state).length)throw Error('offline-sync-first');const uid=identity?.uid;if(uid)await syncLock(()=>lock(async()=>{await refresh(uid);if(pendingRows(state).length)throw Error('offline-sync-first');await store.remove(uid);}));try{localStorage.removeItem('katatib-offline-trusted');}catch{}await raw.untrustDevice?.();state={enabled:false,cache:{},queue:[]};notify();}};
  if(name==='offlinePending')return ()=>pendingRows(state).length;
  if(READS.has(name))return (...args)=>read(name,args);if(WRITES.has(name))return (...args)=>write(name,args);
  return typeof target[name]==='function'?target[name].bind(target):target[name];}});
 if(globalThis.window){setInterval(()=>{if(online()&&identity&&state.enabled&&pendingRows(state).length&&!document.hidden)void sync().catch(()=>{});},30000);document.addEventListener('visibilitychange',()=>{if(!document.hidden&&online()&&identity&&state.enabled&&pendingRows(state).length)void sync().catch(()=>{});});}
 globalThis.addEventListener?.('online',()=>{if(state.enabled)void sync().catch(()=>{});notify();});globalThis.addEventListener?.('offline',notify);
 return api;
}
