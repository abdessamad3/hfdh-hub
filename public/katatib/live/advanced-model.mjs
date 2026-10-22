import { attendanceId } from './attendance.mjs';
import { learningProgress } from './progress.mjs';
const fail=()=>{throw new Error('invalid-workspace-record');};
const text=(x,n,required=false)=>typeof x==='string'&&x.length<=n&&(!required||!!x.trim());
const id=x=>text(x,128,true)&&!/[~/]/.test(x);
const date=x=>{try{attendanceId('check',x,'morning');return true;}catch{return false;}};
const nullable=(x,min,max)=>x===null||Number.isInteger(x)&&x>=min&&x<=max;
export function cleanSchedule(x){
 if(!x||!id(x.kuttabId)||!text(x.key,10,true)||!(/^[0-6]$/.test(x.key)||date(x.key))||!text(x.note,500))fail();
 for(const k of ['morning','afternoon','evening'])if(x[k]!==''&&!/^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(x[k]))fail();
 const times=['morning','afternoon','evening'].map(k=>x[k]).filter(Boolean);if(new Set(times).size!==times.length)fail();
 return Object.fromEntries(['kuttabId','key','morning','afternoon','evening','note'].map(k=>[k,x[k]]));
}
export function effectiveSchedule(kuttab,overlays,day){
 if(!date(day))fail();const weekday=String(new Date(day+'T12:00:00Z').getUTCDay());
 for(const key of [day,weekday]){
  const matches=overlays.filter(r=>r.kuttabId===kuttab.id&&r.key===key);if(matches.length>1)throw new Error('duplicate-schedule');
  if(matches.length){const r=cleanSchedule(matches[0]);return {source:'V2',lessons:['morning','afternoon','evening'].filter(k=>r[k]).map(session=>({session,time:r[session]})),note:r.note};}
  const legacy=kuttab.schedule?.lessons?.[key];if(legacy&&Array.isArray(legacy.lessons))return {source:'V1',lessons:legacy.lessons.map(time=>({session:null,time:String(time)})),note:''};
 }
 return null;
}
export function cleanLegacyCorrection(x){
 if(!x||!['evaluations','revisions','memorizations'].includes(x.sourceCollection)||!id(x.sourceId)||!id(x.studentId)||!date(x.date)||!nullable(x.hizb,1,60)||!nullable(x.quantity,1,8)||!nullable(x.mistakes,0,999)||!nullable(x.score,0,100)||!text(x.identifier,120)||!text(x.surah,120)||!nullable(x.fromAyah,1,286)||!nullable(x.toAyah,1,286)||x.fromAyah!==null&&x.toAyah!==null&&x.toAyah<x.fromAyah||!text(x.note,500)||!text(x.reason,500,true))fail();
 return Object.fromEntries(['sourceCollection','sourceId','studentId','date','hizb','quantity','identifier','surah','fromAyah','toAyah','mistakes','score','note','reason'].map(k=>[k,x[k]]));
}
export function applyLegacyCorrections(rows,corrections){
 const map=new Map(rows.map(r=>[r.key,r]));const seen=new Set();
 for(const raw of corrections){const c=cleanLegacyCorrection(raw),key=c.sourceCollection+'/'+c.sourceId,prior=map.get(key);if(seen.has(key)||!prior||prior.studentId!==c.studentId)throw new Error('invalid-correction-link');seen.add(key);
  map.set(key,{...prior,date:c.date,validDate:true,hizb:c.hizb,quantity:c.quantity,identifier:c.identifier,surah:c.surah,fromAyah:c.fromAyah,toAyah:c.toAyah,mistakes:c.mistakes,score:c.score,note:c.note,correction:{...raw},original:{...prior}});
 }
 return [...map.values()];
}
export function cleanQuestion(x){
 if(!x||!text(x.prompt,2000,true)||!Array.isArray(x.options)||x.options.length<2||x.options.length>4||x.options.some(v=>!text(v,1000,true))||new Set(x.options).size!==x.options.length||!Number.isInteger(x.answerIndex)||x.answerIndex<0||x.answerIndex>=x.options.length||!['warsh','general'].includes(x.edition)||!text(x.reference,500,true)||typeof x.active!=='boolean'||x.reviewed!==true||x.sourceId!==''&&!id(x.sourceId))fail();
 return {prompt:x.prompt,options:[...x.options],answerIndex:x.answerIndex,edition:x.edition,reference:x.reference,active:x.active,reviewed:true,sourceId:x.sourceId};
}
export function cleanAttempt(x){
 if(!x||!id(x.studentId)||!id(x.questionId)||!Number.isInteger(x.questionRevision)||x.questionRevision<1||!Number.isInteger(x.choice)||x.choice<0||x.choice>3||typeof x.correct!=='boolean'||!date(x.date))fail();
 return Object.fromEntries(['studentId','questionId','questionRevision','choice','correct','date'].map(k=>[k,x[k]]));
}
export function rankProgress(students,progress){
 const rows=students.filter(s=>s.status!=='archived').map(s=>({id:s.id,name:s.name,kuttab:s.kuttab,confirmed:progress.get(s.id)?.confirmedHizbs??0,baseline:progress.get(s.id)?.baselineHizbs??null})).sort((a,b)=>b.confirmed-a.confirmed||a.name.localeCompare(b.name)||a.id.localeCompare(b.id));
 let previous=null,rank=0;return rows.map((r,i)=>{if(r.confirmed!==previous)rank=i+1;previous=r.confirmed;return {...r,rank};});
}
export async function loadRanking(students,gateway,isCurrent=()=>true){
 const progress=new Map();let next=0,failed=false;
 async function worker(){while(!failed&&isCurrent()&&next<students.length){const s=students[next++];try{const records=await gateway.learningHistory(s.id);if(!isCurrent())return;progress.set(s.id,learningProgress(records,s.hizbs));}catch(e){failed=true;throw e;}}}
 await Promise.all(Array.from({length:Math.min(3,students.length)},worker));if(!isCurrent())throw new Error('cancelled');return rankProgress(students,progress);
}
export function cleanLegacyTaskState(x){
 if(!x||!['next_revisions','next_evaluations'].includes(x.sourceCollection)||!id(x.sourceId)||!id(x.studentId)||!['planned','done','cancelled'].includes(x.status)||!text(x.note,500))fail();
 return Object.fromEntries(['sourceCollection','sourceId','studentId','status','note'].map(k=>[k,x[k]]));
}
export function applyLegacyTaskStates(rows,states){
 const map=new Map(rows.map(r=>[r.key,r])),seen=new Set();
 for(const raw of states){const s=cleanLegacyTaskState(raw),key=s.sourceCollection+'/'+s.sourceId,r=map.get(key);if(!r||r.studentId!==s.studentId||seen.has(key))throw new Error('invalid-task-link');seen.add(key);map.set(key,{...r,status:s.status,note:s.note,taskState:{...raw},original:{...r}});}
 return [...map.values()];
}
