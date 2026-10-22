import test from 'node:test';
import assert from 'node:assert/strict';
import {studentAddress,studentSecret,newStudentLogin,permittedIdentity,checkStudentGrant,provisionStudentAuth} from '../public/katatib/live/student-login.mjs';
test('code/PIN inputs are bounded and no arbitrary email or short PIN is accepted',()=>{
 const login=newStudentLogin();assert.match(login.code,/^[a-z2-7]{20}$/);assert.match(login.pin,/^\d{8}$/);
 assert.equal(studentAddress(login.code.toUpperCase()),login.address);assert.equal(studentSecret(login.pin),login.pin);
 for(const v of ['teacher@example.com','a'.repeat(19),'a'.repeat(21),'1'.repeat(20),'../students/a'])assert.throws(()=>studentAddress(v));
 for(const v of ['1234','12345678x',12345678,'1234567\n','12345678\n','١٢٣٤٥٦٧٨'])assert.throws(()=>studentSecret(v));
});
test('password identity can use only its exact student grant, never a staff or family role',async()=>{
 const user={uid:'student-uid',email:studentAddress('a'.repeat(20)),emailVerified:false,getIdTokenResult:async()=>({claims:{firebase:{sign_in_provider:'password'}}})};
 const identity=await permittedIdentity(user),grant={role:'student',authUid:user.uid,studentIds:['a'],teacherIds:[],kuttabNames:[]};
 checkStudentGrant(identity,user,grant);
 for(const change of [{role:'admin'},{role:'parent'},{authUid:'someone-else'},{studentIds:['a','b']},{teacherIds:['teacher']}])assert.throws(()=>checkStudentGrant(identity,user,{...grant,...change}));
 await assert.rejects(permittedIdentity({...user,email:'teacher@example.com'}));
 await assert.rejects(permittedIdentity({...user,getIdTokenResult:async()=>({claims:{firebase:{sign_in_provider:'anonymous'}}})}));
 const google=await permittedIdentity({...user,email:'staff@example.com',emailVerified:true,getIdTokenResult:async()=>({claims:{firebase:{sign_in_provider:'google.com'}}})});assert.equal(google.coded,false);
});
test('secondary Auth is ephemeral and cleaned up after creation, retry, or failure',async()=>{
 const login=newStudentLogin();let closed=0,deleted=0;const auth={id:'secondary'};
 const sdk={initializeApp:()=>({}),initializeAuth:(_,opts)=>{assert.equal(opts.persistence,'memory');return auth;},inMemoryPersistence:'memory',createUserWithEmailAndPassword:async a=>{assert.equal(a,auth);return {user:{uid:'new-user'}};},signInWithEmailAndPassword:async()=>({user:{uid:'existing-user'}}),signOut:async a=>{assert.equal(a,auth);closed++;},deleteApp:async()=>{deleted++;}};
 assert.equal(await provisionStudentAuth({},login,sdk),'new-user');
 const retry={...sdk,createUserWithEmailAndPassword:async()=>{throw {code:'auth/email-already-in-use'};}};
 assert.equal(await provisionStudentAuth({},login,retry),'existing-user');
 await assert.rejects(provisionStudentAuth({},login,{...sdk,createUserWithEmailAndPassword:async()=>{throw new Error('offline');}}));
 assert.equal(closed,3);assert.equal(deleted,3);
});
