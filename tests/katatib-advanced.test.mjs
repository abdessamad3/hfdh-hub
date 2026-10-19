import test from 'node:test';import assert from 'node:assert/strict';
import {cleanLegacyTaskState,applyLegacyTaskStates,cleanSchedule,effectiveSchedule,cleanLegacyCorrection,applyLegacyCorrections,cleanQuestion,cleanAttempt,rankProgress,loadRanking} from '../public/katatib/live/advanced-model.mjs';
import {historyProjection} from '../public/katatib/live/legacy.mjs';import {english} from '../public/katatib/live/english.mjs';import {workspaceLabels} from '../public/katatib/live/workspace.mjs';import {recorderLabels} from '../public/katatib/live/recorder.mjs';import {readinessLabels} from '../public/katatib/live/readiness.mjs';import {teacherLabels} from '../public/katatib/live/teacher-attendance-ui.mjs';
const rule={kuttabId:'one',key:'1',morning:'08:00',afternoon:'',evening:'18:00',note:''};
const correction={sourceCollection:'evaluations',sourceId:'old',studentId:'a',date:'2026-10-19',hizb:3,quantity:1,identifier:'r1',surah:'',fromAyah:null,toAyah:null,mistakes:0,score:90,note:'مصحح',reason:'Corrected teacher entry'};
const q={prompt:'A reviewed general question?',options:['Yes','No'],answerIndex:0,edition:'general',reference:'Teacher reference',active:true,reviewed:true,sourceId:''};
test('dated schedule closures override recurring sessions without mutating copied labels',()=>{
 const k={id:'one',schedule:{lessons:{'1':{lessons:['Lesson A']},'2026-10-20':{lessons:[]}}}};const before=structuredClone(k);
 assert.equal(effectiveSchedule(k,[],'2026-10-19').lessons[0].session,null);
 assert.equal(effectiveSchedule(k,[rule],'2026-10-19').lessons.length,2);
 assert.equal(effectiveSchedule(k,[rule,{...rule,key:'2026-10-19',morning:'',evening:''}],'2026-10-19').lessons.length,0);
 assert.equal(effectiveSchedule(k,[{...rule,key:'2'}],'2026-10-20').source,'V1');
 assert.equal(effectiveSchedule(k,[],'2026-10-21'),null);assert.deepEqual(k,before);
 for(const change of [{key:'2026-02-30'},{morning:'25:00'},{afternoon:'08:00'}])assert.throws(()=>cleanSchedule({...rule,...change}));
});
test('an old-record correction changes one display entry and retains its original',()=>{
 const old=historyProjection('evaluations','old',{studentId:'a',date:'2026-10-18',accuracyScore:70,notes:'Original'}),before=structuredClone(old);
 const out=applyLegacyCorrections([old],[{...correction,revision:1}]);assert.equal(out.length,1);assert.equal(out[0].score,90);assert.equal(out[0].original.score,70);assert.deepEqual(old,before);assert.equal(out[0].confirmMastered,undefined);
 for(const change of [{studentId:'b'},{sourceId:'missing'}])assert.throws(()=>applyLegacyCorrections([old],[{...correction,...change}]));
 assert.throws(()=>applyLegacyCorrections([old],[correction,correction]));assert.throws(()=>cleanLegacyCorrection({...correction,reason:''}));
});
test('questions require explicit review and a reference; practice claims are bounded',()=>{
 assert.deepEqual(cleanQuestion(q),q);
 for(const change of [{reviewed:false},{reference:''},{options:['Yes','Yes']},{answerIndex:3},{prompt:''}])assert.throws(()=>cleanQuestion({...q,...change}));
 const a={studentId:'a',questionId:'q',questionRevision:1,choice:0,correct:true,date:'2026-10-19'};assert.deepEqual(cleanAttempt(a),a);assert.throws(()=>cleanAttempt({...a,date:'2026-02-30'}));assert.throws(()=>cleanAttempt({...a,choice:4}));
});
test('rankings use only confirmed V2 coverage, share ties and keep old balances separate',async()=>{
 const students=[{id:'a',name:'A',hizbs:40},{id:'b',name:'B',hizbs:1},{id:'c',name:'C',status:'archived'}];
 const ranked=rankProgress(students,new Map([['a',{confirmedHizbs:1,baselineHizbs:40}],['b',{confirmedHizbs:1,baselineHizbs:1}]]));assert.deepEqual(ranked.map(r=>r.rank),[1,1]);assert.deepEqual(ranked.map(r=>r.baseline),[40,1]);
 const result=await loadRanking(students,{async learningHistory(){return [];}});assert.equal(result.length,2);assert.ok(result.every(r=>r.confirmed===0));await assert.rejects(loadRanking(students,{async learningHistory(){throw Error('denied');}}));
});
test('English covers every existing interface label including errors and recording',()=>{
 for(const group of [workspaceLabels,recorderLabels,readinessLabels,teacherLabels])for(const key of Object.keys(group.fr))assert.equal(typeof group.en[key],'string',key);
 assert.match(english.cloudConflict,/draft/);assert.match(english.noGo,/Not yet/);assert.match(recorderLabels.en.intro,/not uploaded/);
});

test('completing original planned work preserves the source and never fabricates an evaluation',()=>{const row=historyProjection('next_evaluations','plan',{studentId:'a',dueDate:'2020-01-01',notes:'Original plan'}),state={sourceCollection:'next_evaluations',sourceId:'plan',studentId:'a',status:'done',note:'Completed task'};const [out]=applyLegacyTaskStates([row],[state]);assert.equal(out.status,'done');assert.equal(out.original.note,'Original plan');assert.equal(out.score,null);assert.equal(row.status,'');assert.deepEqual(cleanLegacyTaskState(state),state);assert.throws(()=>applyLegacyTaskStates([row],[{...state,studentId:'b'}]));});
