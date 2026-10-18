import test from 'node:test';
import assert from 'node:assert/strict';
import {validateConfig, accessScopes, studentView, mergeStudents} from '../public/katatib/live/model.mjs';
const config = {projectId:'katatib-64049',authDomain:'katatib-64049.firebaseapp.com',apiKey:'example',appId:'example'};
test('only the separate test project and its own auth domain are accepted',()=>{
  assert.equal(validateConfig(config),config);
  for(const x of [{...config,projectId:'hifd-kouttab'},{...config,authDomain:'hifd-kouttab.firebaseapp.com'},{...config,apiKey:''},{}]) assert.throws(()=>validateConfig(x));
});
test('inactive, unknown and unassigned access fails closed',()=>{
  for(const x of [null,{}, {active:false,role:'admin'}, {active:true,role:'student'}, {active:true,role:'teacher'}, {active:true,role:'teacher',kuttabNames:['']}, {active:true,role:'teacher',teacherIds:'anything'}]) assert.throws(()=>accessScopes(x));
});
test('teacher query scopes come only from explicit deduplicated assignments',()=>{
  assert.deepEqual(accessScopes({active:true,role:'teacher',kuttabNames:['A','A'],teacherIds:['legacy']}),[{field:'kuttabName',value:'A'},{field:'teacherId',value:'legacy'}]);
  assert.deepEqual(accessScopes({active:true,role:'admin'}),[{field:null,value:null}]);
});
test('copied students expose only display fields, and missing statistics stay missing',()=>{
  const row = studentView('one',{name:'<img>',email:'private',teacherId:'old',age:'12',stats:{totalHizbs:3,attendanceRate:80}});
  assert.deepEqual(row,{id:'one',name:'<img>',kuttab:'',age:null,hizbs:3,attendance:80});
  assert.equal(studentView('x',{}).hizbs,null);
  assert.equal(studentView('x',{totalHizbs:NaN}).hizbs,null);
});
test('overlapping permitted scopes do not duplicate students',()=>{
  const a={id:'a',name:'Amine'}, b={id:'b',name:'Basma'};
  assert.deepEqual(mergeStudents([[b,a],[a]]),[a,b]);
});
