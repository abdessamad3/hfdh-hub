import {cleanMushafPolicy,cleanMushafAssignment,schoolMushafId,groupMushafId} from './mushaf-assignment.mjs';
import { cleanNotice, cleanAcknowledgement, cleanConsent } from './family-model.mjs';
import { cleanSchedule, cleanLegacyCorrection, cleanQuestion, cleanAttempt, cleanLegacyTaskState } from './advanced-model.mjs';
import { attendanceId } from './attendance.mjs';
export const STAFF_ROLES = ['admin','manager','teacher'];
export const PORTAL_ROLES = ['parent','student'];
export const validId = x => typeof x==='string' && /^[A-Za-z0-9_-]{1,128}$/.test(x);
const text=(x,n,required=false)=>typeof x==='string'&&x.length<=n&&(!required||x.trim().length>0);
const fail=()=>{throw new Error('invalid-workspace-record');};
export function cleanProfile(x){
 if(!x||!text(x.name,120,true)||!text(x.kuttabName,120,true)||!text(x.teacherId,128)||!text(x.group,80)||!['active','archived'].includes(x.status)||!['copy','new'].includes(x.source)||!(x.age===null||Number.isInteger(x.age)&&x.age>=1&&x.age<=120))fail();
 return {name:x.name.trim(),kuttabName:x.kuttabName,teacherId:x.teacherId,group:x.group.trim(),status:x.status,source:x.source,age:x.age};
}
export function cleanTask(x){
 if(!x||!['memorization','revision','evaluation'].includes(x.kind)||!['planned','done','cancelled'].includes(x.status)||!text(x.note,500))fail();
 attendanceId(x.studentId,x.due,'morning');
 if(!Number.isInteger(x.hizb)||x.hizb<1||x.hizb>60||!Number.isInteger(x.fromEighth)||x.fromEighth<1||x.fromEighth>8||!Number.isInteger(x.toEighth)||x.toEighth<x.fromEighth||x.toEighth>8)fail();
 return {studentId:x.studentId,kind:x.kind,due:x.due,hizb:x.hizb,fromEighth:x.fromEighth,toEighth:x.toEighth,note:x.note,status:x.status};
}
export function cleanAccess(x){
 if(!x||typeof x.active!=='boolean'||![...STAFF_ROLES,...PORTAL_ROLES].includes(x.role))fail();
 const arrays={};for(const key of ['kuttabNames','teacherIds','studentIds']){
  if(!Array.isArray(x[key])||x[key].length>10||x[key].some(v=>!text(v,key==='kuttabNames'?120:128,true)||key==='studentIds'&&!validId(v)))fail();
  arrays[key]=[...new Set(x[key])];
 }
 if(x.role!=='admin'&&!(PORTAL_ROLES.includes(x.role)?arrays.studentIds.length:arrays.kuttabNames.length+arrays.teacherIds.length))fail();
 return {active:x.active,role:x.role,...arrays};
}
export const CLEANERS={katatib_mushaf_policies:cleanMushafPolicy,katatib_mushaf_assignments:cleanMushafAssignment,katatib_notices:cleanNotice,katatib_notice_acks:cleanAcknowledgement,katatib_consents:cleanConsent,katatib_legacy_task_states:cleanLegacyTaskState,katatib_schedules:cleanSchedule,katatib_legacy_corrections:cleanLegacyCorrection,katatib_questions:cleanQuestion,katatib_challenge_attempts:cleanAttempt,katatib_students:cleanProfile,katatib_tasks:cleanTask,katatib_access:cleanAccess};
// A write and its immutable audit snapshot succeed together. Stable intent IDs make lost-ack retries safe.
export async function commitWorkspace(db,sdk,uid,collection,id,input,expectedRevision,eventId){
 if(!uid||!CLEANERS[collection]||!text(id,['katatib_mushaf_policies','katatib_mushaf_assignments'].includes(collection)?1000:254,true)||id.includes('/')||!validId(eventId)||!Number.isInteger(expectedRevision)||expectedRevision<0)fail();
 const clean=CLEANERS[collection](input),ref=sdk.doc(db,collection,id);
 if(collection==='katatib_mushaf_policies'&&id!==schoolMushafId(clean.kuttabName)||collection==='katatib_mushaf_assignments'&&id!==groupMushafId(clean))fail();
 if(collection==='katatib_notice_acks'&&id!==clean.noticeId+'~'+clean.noticeRevision+'~'+clean.readerUid||collection==='katatib_consents'&&id!==clean.guardianUid+'~'+clean.studentId+'~'+clean.purpose)fail();
 if(collection==='katatib_schedules'&&id!==clean.kuttabId+'~'+clean.key||['katatib_legacy_corrections','katatib_legacy_task_states'].includes(collection)&&id!==clean.sourceCollection+'~'+clean.sourceId)fail();
 return sdk.runTransaction(db,async tx=>{
  const snap=await tx.get(ref),prior=snap.exists()?snap.data():null;
  if(prior?.eventId===eventId&&Object.entries(clean).every(([k,v])=>JSON.stringify(prior[k])===JSON.stringify(v)))return {...prior,id};
  if((prior?.revision??0)!==expectedRevision)throw Object.assign(new Error('conflict'),{code:'conflict'});
  const data={schemaVersion:1,...clean,revision:expectedRevision+1,updatedBy:uid,updatedAt:sdk.serverTimestamp(),eventId};
  tx.set(ref,data);tx.set(sdk.doc(db,'katatib_audit',eventId),{collection,recordId:id,snapshot:data});
  return {...data,id};
 });
}
export async function readPages(readPage,pageSize=100,max=5000){
 const rows=[],seen=new Set();let after=null;
 while(true){const page=await readPage(after);if(!Array.isArray(page)||page.length>pageSize)throw new Error('invalid-page');
  for(const r of page){if(typeof r.id!=='string'||seen.has(r.id))throw new Error('invalid-page');seen.add(r.id);rows.push(r);}
  if(rows.length>max)throw new Error('record-limit');if(page.length<pageSize)return rows;after=page.at(-1).id;
 }
}
// RFC 4180 CSV import: bounded, explicit headers, duplicate IDs rejected before any write.
export function parseStudentCSV(content){
 if(typeof content!=='string'||content.length>200000)throw new Error('invalid-csv');
 const rows=[];let row=[],cell='',quoted=false,closed=false;
 for(let i=0;i<content.length;i++){
  const c=content[i];
  if(quoted){if(c==='"'){if(content[i+1]==='"'){cell+='"';i++;}else{quoted=false;closed=true;}}else cell+=c;continue;}
  if(c==='"'){if(cell!==''||closed)throw new Error('invalid-csv');quoted=true;continue;}
  if(c===','||c==='\n'||c==='\r'){
   row.push(cell);cell='';closed=false;
   if(c!==','){if(c==='\r'&&content[i+1]==='\n')i++;if(row.some(x=>x.trim()))rows.push(row);row=[];}
  }else{if(closed)throw new Error('invalid-csv');cell+=c;}
 }
 if(quoted)throw new Error('invalid-csv');row.push(cell);if(row.some(x=>x.trim()))rows.push(row);
 const headers=(rows.shift()||[]).map(x=>x.replace(/^\uFEFF/,'').trim());
 if(headers.join(',')!=='id,name,kuttabName,teacherId,group,age'||!rows.length||rows.length>100)throw new Error('invalid-csv');
 const seen=new Set();return rows.map(r=>{if(r.length!==6)throw new Error('invalid-csv');const [id,name,kuttabName,teacherId,group,age]=r;if(!validId(id)||seen.has(id)||age!==''&&!/^\d{1,3}$/.test(age))throw new Error('invalid-csv');seen.add(id);return {id,...cleanProfile({name,kuttabName,teacherId,group,age:age===''?null:Number(age),status:'active',source:'new'})};});
}
export function monthlyAttendance(students,records,month){
 if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))throw new Error('invalid-month');
 const ids=new Set(students.map(s=>s.id)),byKey=new Map();
 for(const r of records){if(!ids.has(r.studentId)||!r.date?.startsWith(month+'-'))continue;attendanceId(r.studentId,r.date,r.session);if(!['present','absent','excused','late','leftEarly','unmarked'].includes(r.status))throw new Error('invalid-attendance');const key=attendanceId(r.studentId,r.date,r.session);if(byKey.has(key))throw new Error('duplicate-session');byKey.set(key,r);}
 return students.map(s=>{const counts={present:0,absent:0,excused:0,late:0,leftEarly:0,unmarked:0};for(const r of byKey.values())if(r.studentId===s.id)counts[r.status]++;return {id:s.id,name:s.name,kuttab:s.kuttab,...counts};});
}
const xml=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
export function excelWorkbook(headers,rows){
 // Explicit String cells prevent spreadsheet formula injection, even for names starting with =,+,-,@.
 return '<?xml version="1.0" encoding="UTF-8"?><?mso-application progid="Excel.Sheet"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="Katatib"><Table>'+[headers,...rows].map(row=>'<Row>'+row.map(c=>'<Cell><Data ss:Type="String">'+xml(c)+'</Data></Cell>').join('')+'</Row>').join('')+'</Table></Worksheet></Workbook>';
}
