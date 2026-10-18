import test from 'node:test';
import assert from 'node:assert/strict';
import {cleanLearning,sameLearning} from '../public/katatib/live/learning.mjs';
const input={studentId:'one',kind:'memorization',date:'2026-10-18',session:'morning',hizb:4,fromEighth:2,toEighth:4,mistakes:null,score:null,note:'حفظ جديد',supersedesId:null};
test('memorization stores an exact inclusive eighth range without an invented grade',()=>{
 const x=cleanLearning(input);assert.equal(x.quantity,3);assert.equal(x.score,null);assert.equal(x.mistakes,null);
});
test('revision and evaluation accept zero mistakes and teacher-entered scores',()=>{
 for(const kind of ['revision','evaluation']){const x=cleanLearning({...input,kind,mistakes:0,score:100});assert.equal(x.score,100);assert.equal(x.mistakes,0);}
});
test('unknown types, impossible dates and missing student identities are rejected',()=>{
 for(const x of [{kind:'exam-other'},{date:'2026-02-30'},{studentId:''},{session:'night'}])assert.throws(()=>cleanLearning({...input,...x}));
});
test('hizb boundaries and reversed or out-of-range eighths are rejected',()=>{
 for(const x of [{hizb:0},{hizb:61},{hizb:1.5},{fromEighth:0},{fromEighth:5,toEighth:3},{toEighth:9}])assert.throws(()=>cleanLearning({...input,...x}));
});
test('grades and mistakes require bounded integers, and memorization has no grade',()=>{
 for(const x of [{mistakes:-1,score:50},{mistakes:1.5,score:50},{mistakes:1000,score:50},{mistakes:0,score:101},{mistakes:0,score:40.5},{mistakes:null,score:null}])assert.throws(()=>cleanLearning({...input,kind:'evaluation',...x}));
 assert.throws(()=>cleanLearning({...input,mistakes:0,score:100}));
});
test('only learning display fields are saved, and notes are bounded',()=>{
 const x=cleanLearning({...input,role:'admin',createdBy:'forged'});assert.equal(x.role,undefined);assert.equal(x.createdBy,undefined);assert.equal(x.note,'حفظ جديد');assert.throws(()=>cleanLearning({...input,note:'x'.repeat(501)}));
});
test('corrections require a valid existing-record identifier shape',()=>{
 assert.equal(cleanLearning({...input,supersedesId:'prior-record-0001'}).supersedesId,'prior-record-0001');
 assert.throws(()=>cleanLearning({...input,supersedesId:'../users/a'}));
});
test('an identical retry matches the original author and every semantic field',()=>{
 const clean=cleanLearning(input),stored={...clean,createdBy:'teacher',createdAt:'server'};
 assert.equal(sameLearning(stored,clean,'teacher'),true);
 assert.equal(sameLearning(stored,{...clean,note:'changed'},'teacher'),false);
 assert.equal(sameLearning(stored,clean,'other'),false);
});

const {currentLearning,readLearningPages}=await import('../public/katatib/live/learning.mjs');
const version=(id,parent=null,hizb=1,seconds=1)=>({...cleanLearning(input),id,hizb,supersedesId:parent,createdAt:{seconds,nanoseconds:0}});
test('an edit replaces the visible content of one logical record',()=>{
 const rows=currentLearning([version('original'),version('edited','original',2,2)]);
 assert.equal(rows.length,1);assert.equal(rows[0].hizb,2);assert.equal(rows[0].id,'edited');assert.equal(rows[0].previousVersions[0].hizb,1);
});
test('repeated edits keep one row even when fetched out of order',()=>{
 const rows=currentLearning([version('last','middle',4),version('original'),version('middle','original',3)]);
 assert.equal(rows.length,1);assert.equal(rows[0].id,'last');assert.equal(rows[0].previousVersions.length,2);
});
test('distinct lessons sharing a date and portion are not merged',()=>{
 assert.equal(currentLearning([version('one'),version('two')]).length,2);
});
test('competing edits are flagged and choose the newest saved leaf deterministically',()=>{
 const records=[version('root'),version('older','root',2,2),version('newer','root',3,3)];
 for(const items of [records,[...records].reverse()]){const row=currentLearning(items)[0];assert.equal(row.id,'newer');assert.equal(row.competingEdits,true);assert.equal(row.previousVersions.length,2);}
});
test('missing ancestors, cycles and cross-student links fail closed',()=>{
 for(const rows of [[version('a','missing')],[version('a','b'),version('b','a')],[version('a'),{...version('b','a'),studentId:'other'}]])assert.throws(()=>currentLearning(rows));
});
test('paging resolves corrections beyond the first 30 versions without reviving the original',async()=>{
 const records=Array.from({length:35},(_,i)=>version(String(i).padStart(3,'0'),i===34?'000':null,i===34?5:1));
 const calls=[];
 const all=await readLearningPages(async after=>{calls.push(after);const start=after===null?0:records.findIndex(r=>r.id===after)+1;return records.slice(start,start+30);});
 assert.deepEqual(calls,[null,'029']);assert.equal(all.length,35);const active=currentLearning(all);assert.equal(active.length,34);assert.equal(active.some(r=>r.id==='000'),false);assert.equal(active.find(r=>r.id==='034').hizb,5);
});
test('incomplete or repeated pages are not displayed as a complete history',async()=>{
 const page=Array.from({length:30},(_,i)=>version(String(i)));
 await assert.rejects(readLearningPages(async()=>page));
 await assert.rejects(readLearningPages(async()=>page,20),/learning-history-limit/);
});
test('empty learning history and exact page boundaries are handled',async()=>{
 assert.deepEqual(currentLearning([]),[]);const first=Array.from({length:30},(_,i)=>version(String(i)));
 const all=await readLearningPages(async after=>after===null?first:[]);assert.equal(all.length,30);
});
