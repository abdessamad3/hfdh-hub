// Student secrets are sent only to Firebase Auth. Firestore stores the account link, never a PIN.
export const STUDENT_DOMAIN = 'students.katatib.invalid';
const CODE = /^[a-z2-7]{20}$/;
export function studentAddress(code) {
  const value=String(code??'').trim().toLowerCase().replace(/[ -]/g,'');
  if(!CODE.test(value))throw new Error('invalid-student-login');
  return `${value}@${STUDENT_DOMAIN}`;
}
export function studentSecret(pin) {
  if(typeof pin!=='string'||pin.length!==8||!/^\d{8}$/.test(pin))throw new Error('invalid-student-login');
  return pin;
}
export function newStudentLogin(random=crypto) {
  const bytes=random.getRandomValues(new Uint8Array(20));
  const alphabet='abcdefghijklmnopqrstuvwxyz234567';
  const code=Array.from(bytes.slice(0,20),b=>alphabet[b&31]).join('');
  // Rejection sampling avoids a biased decimal digit distribution.
  const digits=[];
  while(digits.length<8)for(const b of random.getRandomValues(new Uint8Array(16))){if(b<250)digits.push(String(b%10));if(digits.length===8)break;}
  return {code,pin:digits.join(''),address:studentAddress(code)};
}
export async function permittedIdentity(user) {
  if(!user?.email)throw new Error('no-access');
  const token=await user.getIdTokenResult();
  const provider=token.claims?.firebase?.sign_in_provider;
  const address=user.email.toLowerCase();
  if(provider==='google.com'&&user.emailVerified)return {address,coded:false};
  if(provider==='password'&&address.endsWith('@'+STUDENT_DOMAIN)&&CODE.test(address.split('@')[0]))return {address,coded:true};
  throw new Error('no-access');
}
export function checkStudentGrant(identity,user,grant) {
  if(identity.coded&&(grant?.role!=='student'||grant.authUid!==user.uid||grant.studentIds?.length!==1||grant.kuttabNames?.length||grant.teacherIds?.length))throw new Error('no-access');
}
// A separate, ephemeral Auth instance prevents account creation from replacing the staff session.
export async function provisionStudentAuth(config,login,sdk) {
  studentSecret(login.pin);
  const address=studentAddress(login.code);
  const app=sdk.initializeApp(config,'katatib-provision-'+crypto.randomUUID());
  const auth=sdk.initializeAuth(app,{persistence:sdk.inMemoryPersistence});
  try {
    let credential;
    try {credential=await sdk.createUserWithEmailAndPassword(auth,address,login.pin);}
    catch(error){
      // A lost acknowledgement/retry may find the same account already created. Never reset it.
      if(error.code!=='auth/email-already-in-use')throw error;
      credential=await sdk.signInWithEmailAndPassword(auth,address,login.pin);
    }
    return credential.user.uid;
  } finally {try {await sdk.signOut(auth);} finally {await sdk.deleteApp(app);}}
}
export async function commitStudentCredential(db,sdk,uid,studentId,login,authUid,expectedRevision,eventId) {
  const address=studentAddress(login.code);
  if(!uid||!authUid||typeof studentId!=='string'||!studentId||studentId.length>128||/[~/]/.test(studentId)||!Number.isInteger(expectedRevision)||expectedRevision<0||!/^[A-Za-z0-9_-]{1,100}$/.test(eventId))throw new Error('invalid-credential');
  const pointer=sdk.doc(db,'katatib_student_credentials',studentId);
  return sdk.runTransaction(db,async tx=>{
    const link=await tx.get(pointer),prior=link.exists()?link.data():null;
    if(prior?.eventId===eventId&&prior.address===address&&prior.authUid===authUid)return prior;
    if((prior?.revision??0)!==expectedRevision)throw Object.assign(new Error('conflict'),{code:'conflict'});
    const nextRef=sdk.doc(db,'katatib_access',address),next=await tx.get(nextRef);
    if(next.exists())throw new Error('credential-exists');
    let oldRef,old;
    if(prior){oldRef=sdk.doc(db,'katatib_access',prior.address);const snapshot=await tx.get(oldRef);if(!snapshot.exists())throw new Error('credential-inconsistent');old=snapshot.data();}
    const meta=id=>({schemaVersion:1,updatedBy:uid,updatedAt:sdk.serverTimestamp(),eventId:id});
    const save=(name,id,data)=>{tx.set(sdk.doc(db,name,id),data);tx.set(sdk.doc(db,'katatib_audit',data.eventId),{collection:name,recordId:id,snapshot:data});};
    const grant={...meta(eventId+'-new'),active:true,role:'student',studentIds:[studentId],teacherIds:[],kuttabNames:[],authUid,revision:1};
    const current={...meta(eventId),studentId,address,authUid,revision:expectedRevision+1};
    if(old)save('katatib_access',prior.address,{...old,...meta(eventId+'-old'),active:false,revision:old.revision+1});
    save('katatib_access',address,grant);
    save('katatib_student_credentials',studentId,current);
    return current;
  });
}
