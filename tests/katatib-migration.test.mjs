import test from 'node:test';
import assert from 'node:assert/strict';
import {historyProjection,mergeHistory,validCalendarDate} from '../public/katatib/live/legacy.mjs';
import {rosterPage} from '../public/katatib/live/roster.mjs';
import {readPages} from '../public/katatib/live/workspace-model.mjs';
import {historicalMonthlySummary,loadMonthlyReports} from '../public/katatib/live/reports.mjs';

test('monthly history keeps ambiguous attendance outside totals and retains activities without claiming mastery',()=>{
 const make=(collection,id,fields)=>historyProjection(collection,id,{studentId:'a',date:'2026-10-18',...fields});
 const history=[
  make('attendance','clear',{sessionIndex:0,status:'present'}),
  make('attendance','duplicate-1',{sessionIndex:1,status:'absent'}),
  make('attendance','duplicate-2',{sessionIndex:1,status:'present'}),
  make('attendance','unknown',{status:'excused'}),
  make('attendance','unknown-status',{sessionIndex:2,status:'other'}),
  make('attendance','invalid',{date:'2026-02-30',status:'present'}),
  make('attendance','previous',{date:'2026-09-18',sessionIndex:0,status:'present'}),
  make('evaluations','e',{accuracyScore:100}),make('revisions','r',{}),make('memorizations','m',{}),
  make('next_revisions','plan',{dueDate:'2026-10-20'}),make('next_evaluations','plan',{dueDate:'2026-11-20'}),
  make('katatib_attendance','new',{session:'morning',status:'present'})
 ];
 const before=structuredClone(history),summary=historicalMonthlySummary(history,'a','2026-10');
 assert.deepEqual(summary,{v1Present:1,v1Absent:0,v1Excused:0,v1Review:4,v1Evaluations:1,v1Revisions:1,v1Memorizations:1,v1Planned:1,invalidHistoryDates:1,v1EvaluationMean:100,v1RevisionMean:null});
 assert.deepEqual(history,before);assert.equal(summary.confirmed,undefined);
 assert.throws(()=>historicalMonthlySummary(history,'b','2026-10'),/wrong-student/);
 assert.throws(()=>historicalMonthlySummary([...history,history[0]],'a','2026-10'),/duplicate/);
 assert.throws(()=>historicalMonthlySummary(history,'a','2026-13'),/invalid-month/);
});
test('combined reports distinguish monthly V2 sessions, original records and lifetime coverage',async()=>{
 const students=[{id:'a',name:'A',kuttab:'One',hizbs:3}];
 const gateway={async studentHistory(id){return [historyProjection('attendance','old',{studentId:id,date:'2026-10-18',sessionIndex:0,status:'absent'}),historyProjection('katatib_attendance','new',{studentId:id,date:'2026-10-18',session:'morning',status:'present'})];},async learningHistory(){return [];}};
 const [row]=await loadMonthlyReports(students,'2026-10',gateway);
 assert.equal(row.present,1);assert.equal(row.absent,0);assert.equal(row.v1Present,0);assert.equal(row.v1Absent,1);assert.equal(row.baseline,3);assert.equal(row.confirmed,0);
 const [next]=await loadMonthlyReports(students,'2026-11',gateway);
 assert.equal(next.present,0);assert.equal(next.v1Absent,0);assert.equal(next.baseline,3);
});
test('report reads bound concurrency, stop on failure and never return partial success',async()=>{
 const students=Array.from({length:12},(_,i)=>({id:'s'+i,name:'Student',kuttab:'One'}));
 let active=0,peak=0;
 const gateway={async studentHistory(){active++;peak=Math.max(peak,active);await new Promise(resolve=>setTimeout(resolve,2));active--;return [];},async learningHistory(){return [];}};
 const result=await loadMonthlyReports(students,'2026-10',gateway);
 assert.equal(result.length,12);assert.equal(peak,3);assert.deepEqual(result.map(r=>r.id),students.map(s=>s.id));
 let reads=0;
 await assert.rejects(loadMonthlyReports(students,'2026-10',{async studentHistory(){reads++;throw new Error('permission-denied');}}),/permission-denied/);
 assert.equal(reads,3);
 reads=0;await assert.rejects(loadMonthlyReports(students,'2026-10',{async studentHistory(){reads++;}},()=>false),/report-cancelled/);assert.equal(reads,0);
 await assert.rejects(loadMonthlyReports(students,'invalid',gateway),/invalid-month/);
});
test('legacy learning display preserves original grades, quantities, identifiers and Unicode without claiming V2 mastery',()=>{
 const original={studentId:'a',date:'2026-10-18',hizbNumber:3,quantity:2,quantityIdentifier:'r2',accuracyScore:87,mistakesCount:3,notes:'قديم <script>',surahName:'البقرة'};
 const row=historyProjection('evaluations','old',original);
 assert.equal(row.score,87);assert.equal(row.quantity,2);assert.equal(row.identifier,'r2');assert.equal(row.note,'قديم <script>');assert.equal(row.source,'V1');assert.equal(row.confirmMastered,undefined);
 assert.deepEqual(original,{studentId:'a',date:'2026-10-18',hizbNumber:3,quantity:2,quantityIdentifier:'r2',accuracyScore:87,mistakesCount:3,notes:'قديم <script>',surahName:'البقرة'});
 assert.equal(historyProjection('revisions','r',{studentId:'a',qualityScore:75}).score,75);
 assert.equal(historyProjection('next_revisions','planned',{studentId:'a',dueDate:'2020-01-01'}).date,'2020-01-01');
});
test('both historical attendance IDs survive, duplicates and missing sessions require review',()=>{
 const data={studentId:'a',date:'2026-10-18',sessionIndex:0,status:'present'};
 const rows=mergeHistory([['legacy-a','legacy-b','unknown'].map((id,i)=>historyProjection('attendance',id,i===2?{...data,sessionIndex:undefined}:data))],'a');
 assert.equal(rows.length,3);assert.equal(rows.filter(r=>r.issues.includes('duplicateSession')).length,2);assert.equal(rows.filter(r=>r.issues.includes('unmappedSession')).length,1);
});
test('unusable dates remain visible and cross-student or repeated pages fail closed',()=>{
 assert.equal(validCalendarDate('2026-02-30'),false);assert.equal(validCalendarDate('2024-02-29'),true);
 const old=historyProjection('evaluations','old',{studentId:'a',date:'unknown'});
 assert.deepEqual(mergeHistory([[old]],'a')[0].issues,['invalidDate']);
 assert.throws(()=>mergeHistory([[old]],'b'),/wrong-student/);assert.throws(()=>mergeHistory([[old,old]],'a'),/duplicate/);
});
test('a 1,001-student roster is fully reachable with at most 40 cards per page',()=>{
 const rows=Array.from({length:1001},(_,i)=>({id:String(i),name:'Student '+String(i).padStart(4,'0'),kuttab:i%2?'One':'Two'}));
 const all=[];for(let page=0;page<26;page++){const view=rosterPage(rows,{page});assert.ok(view.rows.length<=40);all.push(...view.rows.map(s=>s.id));}
 assert.equal(new Set(all).size,1001);assert.equal(all.length,1001);assert.equal(rosterPage(rows,{page:999}).page,25);
 assert.equal(rosterPage(rows,{search:'Student 1000'}).rows[0].id,'1000');
 assert.equal(rosterPage(rows,{school:'One'}).total,500);assert.equal(rosterPage(rows,{search:'no match'}).from,0);
});
test('paginated legacy history does not stop at 20, 100 or 500 records',async()=>{
 const rows=Array.from({length:621},(_,i)=>({id:String(i).padStart(4,'0')}));
 const loaded=await readPages(async after=>{const start=after?rows.findIndex(r=>r.id===after)+1:0;return rows.slice(start,start+100);});
 assert.equal(loaded.length,621);assert.equal(loaded.at(-1).id,'0620');
});

import {parseComparisonReport} from '../public/katatib/live/readiness.mjs';
test('a clone report cannot authorize migration or silently accept inconsistent evidence',()=>{
 const report={source_documents:1,matched_documents:1,missing_documents:0,different_documents:0,unexplained_target_documents:0,typed_clone_matches:true,missing_parent_paths_match:true,source_snapshot:'2026-10-18T00:00:00Z',source_relationship_issues:{},production_migration_ready:false};
 assert.equal(parseComparisonReport(JSON.stringify(report)).typed_clone_matches,true);
 assert.equal(parseComparisonReport(JSON.stringify(report)).production_migration_ready,undefined);
 for(const change of [{production_migration_ready:true},{matched_documents:2},{source_snapshot:'bad'},{source_relationship_issues:{orphan:-1}},{typed_clone_matches:false}])assert.throws(()=>parseComparisonReport(JSON.stringify({...report,...change})));
});
