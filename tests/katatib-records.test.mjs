import test from 'node:test';
import assert from 'node:assert/strict';
import {completeHistory,recordCounts,loadRecordReview,previousRecordsView} from '../public/katatib/live/records.mjs';
import {historyProjection} from '../public/katatib/live/legacy.mjs';
const old=(id='old',studentId='a')=>historyProjection('evaluations',id,{studentId,date:'2020-01-01',hizbNumber:2,quantity:1,quantityIdentifier:'t3',accuracyScore:80,mistakesCount:2,notes:'Original <script> note'});
const learning=(id='aaaaaaaa-aaaa-aaaa',extra={})=>({id,schemaVersion:2,studentId:'a',kind:'evaluation',date:'2026-10-20',session:'morning',hizb:1,fromEighth:1,toEighth:1,mistakes:2,score:80,note:'New note',supersedesId:null,...extra});
const task={id:'task-one',studentId:'a',kind:'memorization',due:'2026-10-21',hizb:1,fromEighth:2,toEighth:4,status:'planned',note:'Next lesson'};
test('complete display includes all old dates, new learning and planned memorization without converting old evidence',()=>{
 const rows=completeHistory([old()],[learning()],[task],'a');
 assert.equal(rows.length,3);assert.equal(rows.find(r=>r.source==='V1').identifier,'t3');assert.equal(rows.find(r=>r.collection==='katatib_tasks').kind,'nextMemorization');
 assert.deepEqual(recordCounts(rows).V1.evaluation,1);assert.equal(recordCounts(rows).V2.evaluation,1);assert.equal(recordCounts(rows).V2.nextMemorization,1);
});
test('one corrected lesson is counted once and its original is preserved',()=>{
 const first=learning(),second=learning('bbbbbbbb-bbbb-bbbb',{supersedesId:first.id,score:95,note:'Correction'});
 const rows=completeHistory([old()],[first,second],[],'a');assert.equal(rows.length,2);
 const now=rows.find(r=>r.source==='V2');assert.equal(now.score,95);assert.equal(now.previousVersions[0].score,80);assert.equal(recordCounts(rows).V2.evaluation,1);
});
test('wrong-student or duplicate source records fail rather than inflating totals',()=>{
 assert.throws(()=>completeHistory([old('wrong','b')],[],[],'a'),/wrong-student/);
 assert.throws(()=>completeHistory([],[learning('a',{studentId:'b'})],[],'a'),/wrong-student/);
 assert.throws(()=>completeHistory([],[],[{...task,studentId:'b'}],'a'),/wrong-student/);
 assert.throws(()=>completeHistory([old(),old()],[],[],'a'),/duplicate-history/);
});
test('record review retrieves more than a display page and includes archived authorized pupils',async()=>{
 const calls=[];const gateway={studentHistory:async id=>{calls.push(id);return id==='a'?Array.from({length:130},(_,i)=>old(String(i))):[];},learningHistory:async id=>id==='a'?[learning()]:[],workspaceList:async(_,id)=>id==='a'?[task]:[]};
 const rows=await loadRecordReview([{id:'a',name:'A',status:'active'},{id:'b',name:'B',status:'archived'}],gateway);
 assert.equal(rows.length,2);assert.equal(rows[0].counts.V1.evaluation,130);assert.equal(rows[0].total,132);assert.equal(rows[1].total,0);assert.deepEqual(calls.sort(),['a','b']);
});
test('failure and account cancellation produce no apparently complete count table',async()=>{
 await assert.rejects(loadRecordReview([{id:'a'}],{studentHistory:async()=>{throw Error('permission-denied');}}),/permission-denied/);
 await assert.rejects(loadRecordReview([{id:'a'}],{},()=>false),/review-cancelled/);
});
test('old notes and identifiers are escaped, missing dates remain visible, all rows have a reveal path',()=>{
 const rows=Array.from({length:12},(_,i)=>old(String(i)));rows[0].date='';
 const html=previousRecordsView(rows,'en',key=>key);assert.ok(html.includes('&lt;script&gt;'));assert.ok(!html.includes('<script>'));assert.equal((html.match(/data-previous-record=/g)||[]).length,12);assert.equal((html.match(/ hidden/g)||[]).length,4);assert.ok(html.includes('data-records-more'));assert.ok(html.includes('unknown'));assert.ok(html.includes('t3'));
});
