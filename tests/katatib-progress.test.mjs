import test from 'node:test';
import assert from 'node:assert/strict';
import {learningProgress} from '../public/katatib/live/progress.mjs';
const rid=id=>'record-'+id.padEnd(16,'x');
const r=(id,extra={})=>({id:rid(id),schemaVersion:2,studentId:'one',kind:'memorization',date:'2026-10-18',session:'morning',hizb:1,fromEighth:1,toEighth:1,mistakes:null,score:null,note:'',supersedesId:null,createdAt:{seconds:1},...extra,...(extra.supersedesId?{supersedesId:rid(extra.supersedesId)}:{})});
test('confirmed memorization counts inclusive eighths and exact fractional hizbs',()=>{
 const p=learningProgress([r('one',{fromEighth:2,toEighth:4})],3);assert.equal(p.confirmedEighths,3);assert.equal(p.confirmedHizbs,.375);assert.equal(p.baselineHizbs,3);assert.equal(p.combinedHizbs,null);
});
test('overlapping portions and repeated lessons count once',()=>{
 const p=learningProgress([r('one',{toEighth:4}),r('two',{fromEighth:3,toEighth:6}),r('three',{toEighth:4})]);assert.equal(p.confirmedEighths,6);
});
test('different hizbs have distinct coverage and the complete Quran cannot exceed 480 eighths',()=>{
 const records=Array.from({length:60},(_,i)=>r('h'+i,{hizb:i+1,toEighth:8}));const p=learningProgress(records);assert.equal(p.confirmedEighths,480);assert.equal(p.confirmedHizbs,60);assert.equal(p.confirmedPercent,100);
});
test('practice, revision and evaluation do not increase confirmed progress',()=>{
 const p=learningProgress([r('p',{kind:'practice',toEighth:4}),r('r',{kind:'revision',mistakes:0,score:100}),r('e',{kind:'evaluation',mistakes:1,score:90})]);assert.equal(p.confirmedEighths,0);assert.equal(p.practiceEighths,4);assert.equal(p.revisions,1);assert.equal(p.evaluations,1);
});
test('an edited range replaces the original contribution',()=>{
 const p=learningProgress([r('one',{toEighth:5}),r('edit',{supersedesId:'one',fromEighth:2,toEighth:3})]);assert.equal(p.confirmedEighths,2);
});
test('changing an edited record from confirmed to practice removes its contribution',()=>{
 const p=learningProgress([r('one',{toEighth:5}),r('edit',{kind:'practice',supersedesId:'one',toEighth:5})]);assert.equal(p.confirmedEighths,0);assert.equal(p.practiceEighths,5);
});
test('promoting practice to confirmed counts the portion once',()=>{
 const p=learningProgress([r('one',{kind:'practice',toEighth:2}),r('edit',{supersedesId:'one',toEighth:2})]);assert.equal(p.confirmedEighths,2);assert.equal(p.practiceEighths,0);
});
test('pre-decision V1 learning entries need review and can be confirmed by a new version',()=>{
 const old=r('one',{schemaVersion:1,toEighth:3});assert.equal(learningProgress([old]).unreviewed,1);assert.equal(learningProgress([old]).confirmedEighths,0);
 const p=learningProgress([old,r('confirmed',{supersedesId:'one',toEighth:3})]);assert.equal(p.unreviewed,0);assert.equal(p.confirmedEighths,3);
});
test('an unmapped V1 baseline is preserved separately without guessing overlaps',()=>{
 for(const baseline of [0,3.5,60,null,NaN,61]){const p=learningProgress([r('one')],baseline);assert.equal(p.confirmedEighths,1);assert.equal(p.baselineHizbs,typeof baseline==='number'&&Number.isFinite(baseline)&&baseline<=60?baseline:null);if(baseline!==0)assert.equal(p.combinedHizbs,null);}
});
test('unresolved competing edits are flagged and excluded from certified progress',()=>{
 const p=learningProgress([r('one'),r('left',{supersedesId:'one',hizb:2,createdAt:{seconds:2}}),r('right',{supersedesId:'one',hizb:3,createdAt:{seconds:3}})]);assert.equal(p.conflicts,1);assert.equal(p.confirmedEighths,0);
});
