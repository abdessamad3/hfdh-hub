import {MUSHAF_EDITION} from './mushaf-model.mjs';
export const MUSHAF_CHOICES=[{id:MUSHAF_EDITION,ready:true},{id:'warsh-tajweed-publisher',ready:false}];
const validText=(x,max,empty=false)=>typeof x==='string'&&x.length<=max&&(empty||x.trim().length>0);
const fail=()=>{throw Error('invalid-mushaf-assignment');};
// The same escaping is enforced by Firestore rules; separators cannot collide with names.
const key=x=>x.replaceAll('%','%25').replaceAll('/','%2F').replaceAll('~','%7E');
export function schoolMushafId(kuttabName){if(!validText(kuttabName,120))fail();return 'school~'+key(kuttabName);}
export function groupMushafScope(student){
 const kuttabName=student?.kuttab,group=student?.group??'',teacherId=group?'':student?.teacherId??'';
 if(!validText(kuttabName,120)||!validText(group,80,true)||!validText(teacherId,128,true))fail();
 return {kuttabName,group,teacherId};
}
export function groupMushafId(scope){const {kuttabName,group,teacherId}=scope;schoolMushafId(kuttabName);if(!validText(group,80,true)||!validText(teacherId,128,true)||group&&teacherId)fail();return 'group~'+[kuttabName,group,teacherId].map(key).join('~');}
export function cleanMushafPolicy(x){
 if(!x||!validText(x.kuttabName,120)||x.defaultEdition!==MUSHAF_EDITION||typeof x.teacherCanAssign!=='boolean')fail();
 return {kuttabName:x.kuttabName,defaultEdition:x.defaultEdition,teacherCanAssign:x.teacherCanAssign};
}
export function cleanMushafAssignment(x){
 if(!x||!validText(x.studentId,128)||/[~/]/.test(x.studentId)||![MUSHAF_EDITION,'inherit'].includes(x.edition))fail();
 const scope={kuttabName:x.kuttabName,group:x.group,teacherId:x.teacherId};groupMushafId(scope);
 return {...scope,studentId:x.studentId,edition:x.edition};
}
export function resolveMushafAssignment(student,policy=null,assignment=null){
 const scope=groupMushafScope(student),policyId=schoolMushafId(scope.kuttabName),groupId=groupMushafId(scope);
 if(policy){const p=cleanMushafPolicy(policy);if(p.kuttabName!==scope.kuttabName)fail();}
 if(assignment){const a=cleanMushafAssignment(assignment);if(groupMushafId(a)!==groupId)fail();}
 return {studentId:student.id,scope,policyId,groupId,policy,assignment,effectiveEdition:assignment&&assignment.edition!=='inherit'?assignment.edition:policy?.defaultEdition||MUSHAF_EDITION,source:assignment&&assignment.edition!=='inherit'?'group':'school'};
}
export function mayAssignMushaf(role,bundle){return role==='admin'||['teacher','manager'].includes(role)&&bundle?.policy?.teacherCanAssign===true;}
