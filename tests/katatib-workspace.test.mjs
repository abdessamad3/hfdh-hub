import test from 'node:test';
import assert from 'node:assert/strict';
import {cleanProfile,cleanTask,cleanAccess,parseStudentCSV,monthlyAttendance,excelWorkbook,readPages,commitWorkspace} from '../public/katatib/live/workspace-model.mjs';
const profile={name:'  مريم  ',kuttabName:'One',teacherId:'teacher',group:'A',age:12,status:'active',source:'new'};
const task={studentId:'a',kind:'revision',due:'2026-10-20',hizb:2,fromEighth:2,toEighth:4,note:'',status:'planned'};
test('student profile validation never accepts deletion, scope metadata or invalid ages',()=>{
 assert.equal(cleanProfile(profile).name,'مريم');
 for(const data of [{...profile,name:''},{...profile,status:'deleted'},{...profile,age:0},{...profile,age:'12'},{...profile,source:'original'}])assert.throws(()=>cleanProfile(data));
 assert.equal(cleanProfile({...profile,role:'admin'}).role,undefined);
});
test('planned work requires real calendar dates and bounded portions',()=>{
 assert.equal(cleanTask(task).due,'2026-10-20');for(const patch of [{due:'2026-02-30'},{fromEighth:5,toEighth:4},{hizb:61},{status:'mastered'},{studentId:'a/b'}])assert.throws(()=>cleanTask({...task,...patch}));
});
test('portal links and staff assignments are explicit and bounded',()=>{
 const grant={active:true,role:'parent',kuttabNames:[],teacherIds:[],studentIds:['a','a']};assert.deepEqual(cleanAccess(grant).studentIds,['a']);
 for(const data of [{...grant,studentIds:[]},{...grant,studentIds:['../a']},{...grant,active:'yes'},{...grant,role:'teacher'},{...grant,kuttabNames:Array(11).fill('One')}])assert.throws(()=>cleanAccess(data));
});
test('CSV import validates all rows and preserves Unicode and quoted delimiters',()=>{
 const rows=parseStudentCSV('id,name,kuttabName,teacherId,group,age\r\na,"مريم, A",One,t,"Group ""A""",12\r\nb,B,One,t,,\r\n');
 assert.equal(rows[0].name,'مريم, A');assert.equal(rows[0].group,'Group "A"');assert.equal(rows[1].age,null);
 for(const csv of ['id,name\na,A','id,name,kuttabName,teacherId,group,age\na,A,One,t,,12\na,B,One,t,,13','id,name,kuttabName,teacherId,group,age\na,"bad,One,t,,12','id,name,kuttabName,teacherId,group,age\na,A,One,t,,x'])assert.throws(()=>parseStudentCSV(csv));
});
test('monthly attendance keeps unrecorded separate and rejects duplicate sessions',()=>{
 const students=[{id:'a',name:'A',kuttab:'One'},{id:'b',name:'B',kuttab:'One'}];
 const present={studentId:'a',date:'2026-10-18',session:'morning',status:'late'};
 const report=monthlyAttendance(students,[present,{...present,date:'2026-09-18'},{...present,studentId:'outside'}],'2026-10');
 assert.equal(report[0].late,1);assert.equal(report[0].absent,0);assert.equal(report[1].unmarked,0);
 assert.throws(()=>monthlyAttendance(students,[present,present],'2026-10'));
});
test('spreadsheet cells are explicit strings and XML special characters are escaped',()=>{
 const xml=excelWorkbook(['Name'],[['=IMPORTXML("url")'],['<img>&']]);assert.ok(xml.includes('ss:Type="String"'));assert.ok(xml.includes('&lt;img&gt;&amp;'));assert.ok(!xml.includes('ss:Formula'));
});
test('pagination retrieves every page and fails closed on repeated pages or excessive data',async()=>{
 const calls=[];const rows=await readPages(async after=>{calls.push(after);return after?[{id:'c'}]:[{id:'a'},{id:'b'}];},2);assert.equal(rows.length,3);assert.deepEqual(calls,[null,'b']);
 await assert.rejects(readPages(async()=>[{id:'a'}],1),/invalid-page/);
 await assert.rejects(readPages(async()=>[{id:'a'},{id:'b'}],2,1),/record-limit/);
});
test('workspace writes audit atomically, reject stale edits and retry one stable intent',async()=>{
 const data=new Map(),writes=[];const sdk={doc:(_,c,id)=>c+'/'+id,serverTimestamp:()=>123,runTransaction:async(_,fn)=>{const queued=[];const result=await fn({get:async ref=>({exists:()=>data.has(ref),data:()=>data.get(ref)}),set:(ref,v)=>queued.push([ref,v])});for(const pair of queued){data.set(...pair);writes.push(pair);}return result;}};
 const save=(input,revision,event)=>commitWorkspace({},sdk,'user','katatib_students','a',input,revision,event);
 await save(profile,0,'first');assert.equal(writes.length,2);assert.equal(data.get('katatib_audit/first').snapshot.name,'مريم');
 await save(profile,0,'first');assert.equal(writes.length,2);
 await assert.rejects(save({...profile,name:'Other'},0,'second'),e=>e.code==='conflict');assert.equal(writes.length,2);
 await save({...profile,status:'archived'},1,'archive');assert.equal(data.get('katatib_students/a').revision,2);assert.equal(data.get('katatib_audit/first').snapshot.status,'active');
});
