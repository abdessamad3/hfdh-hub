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
