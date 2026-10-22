import test from 'node:test';
import assert from 'node:assert/strict';
import { commitTeacherAttendance, teacherView, TEACHER_CURRENT, TEACHER_HISTORY } from '../public/katatib/live/teacher-attendance.mjs';
const context={date:'2026-10-18',session:'morning'};
function memory(){const records=new Map();const sdk={doc:(_,c,id)=>c+'/'+id,serverTimestamp:()=>123,async runTransaction(_,fn){const writes=[];const result=await fn({async get(ref){return {exists:()=>records.has(ref),data:()=>records.get(ref)};},set(ref,data){writes.push([ref,data]);}});for(const [ref,data] of writes)records.set(ref,data);return result;}};return {records,sdk};}
test('teacher directory exposes display fields, not old email or account roles',()=>{
 assert.deepEqual(teacherView('t',{role:'teacher',displayName:'أستاذ',kuttabName:'One',email:'private@example.com'}),{id:'t',name:'أستاذ',kuttab:'One'});
 assert.throws(()=>teacherView('t',{role:'admin'}));assert.throws(()=>teacherView('x/y',{role:'teacher'}));
});
test('teacher corrections replace one canonical row and retain both immutable snapshots',async()=>{
 const {records,sdk}=memory(),save=(payload,revision,event)=>commitTeacherAttendance(null,sdk,'manager','t',context,payload,revision,event);
 await save({status:'present',note:'أول سجل'},0,'teacher-first-0001');
 await save({status:'excused',note:'تصحيح'},1,'teacher-second-001');
 assert.equal(records.get(TEACHER_CURRENT+'/t~2026-10-18~morning').revision,2);
 assert.equal(records.get(TEACHER_HISTORY+'/teacher-first-0001').status,'present');
 assert.equal(records.get(TEACHER_HISTORY+'/teacher-second-001').status,'excused');
 assert.equal([...records.keys()].filter(k=>k.startsWith(TEACHER_CURRENT+'/')).length,1);
 assert.ok([...records.keys()].every(k=>!k.startsWith('attendance/')&&!k.startsWith('teacher_attendance/')));
 await assert.rejects(save({status:'absent',note:'stale'},1,'teacher-stale-0001'),e=>e.code==='conflict');
});
test('lost-ack retry does not duplicate teacher audit and date/session identities are separate',async()=>{
 const {records,sdk}=memory();
 const save=(c,revision,event)=>commitTeacherAttendance(null,sdk,'manager','t',c,{status:'late',note:'note'},revision,event);
 await save(context,0,'teacher-retry-0001');await save(context,0,'teacher-retry-0001');
 assert.equal(records.size,2);
 await save({...context,session:'afternoon'},0,'teacher-second-001');await save({...context,date:'2026-10-19'},0,'teacher-third-0001');
 assert.equal(records.size,6);
});
test('malformed teacher dates and payloads fail before transaction writes',async()=>{
 const {records,sdk}=memory();
 for(const [c,p] of [[{...context,date:'2026-02-30'},{status:'present',note:''}],[context,{status:'bad',note:''}],[context,{status:'present',note:'x'.repeat(501)}]])await assert.rejects(commitTeacherAttendance(null,sdk,'manager','t',c,p,0,'teacher-invalid-01'));
 assert.equal(records.size,0);
});
