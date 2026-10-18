import { attendanceId } from './attendance.mjs';
export const LEARNING_KINDS = Object.freeze(['memorization','revision','evaluation']);
export function cleanLearning(input) {
  if(!input || !LEARNING_KINDS.includes(input.kind)) throw new Error('invalid-learning');
  attendanceId(input.studentId,input.date,input.session);
  const integer=(n,min,max)=>Number.isInteger(n)&&n>=min&&n<=max;
  if(!integer(input.hizb,1,60)||!integer(input.fromEighth,1,8)||!integer(input.toEighth,input.fromEighth,8))throw new Error('invalid-portion');
  if(typeof input.note!=='string'||input.note.length>500)throw new Error('invalid-note');
  const graded=input.kind!=='memorization';
  if(graded&&(!integer(input.mistakes,0,999)||!integer(input.score,0,100)))throw new Error('invalid-grade');
  if(!graded&&(input.mistakes!==null||input.score!==null))throw new Error('invalid-grade');
  const supersedesId=input.supersedesId??null;
  if(supersedesId!==null&&(typeof supersedesId!=='string'||!/^[A-Za-z0-9-]{16,80}$/.test(supersedesId)))throw new Error('invalid-correction');
  return {studentId:input.studentId,kind:input.kind,date:input.date,session:input.session,hizb:input.hizb,fromEighth:input.fromEighth,toEighth:input.toEighth,quantity:input.toEighth-input.fromEighth+1,mistakes:input.mistakes,score:input.score,note:input.note,supersedesId};
}
export function sameLearning(stored,input,userId) {
  return stored.createdBy===userId&&Object.entries(input).every(([key,value])=>stored[key]===value);
}
export async function commitLearning(db,sdk,userId,input,id) {
  const clean=cleanLearning(input);
  if(!userId||!/^[A-Za-z0-9-]{16,80}$/.test(id)||id===clean.supersedesId)throw new Error('invalid-identity');
  const ref=sdk.doc(db,'katatib_learning',id);
  return sdk.runTransaction(db,async tx=>{
    const snap=await tx.get(ref);
    if(snap.exists()) {
      if(!sameLearning(snap.data(),clean,userId))throw Object.assign(new Error('learning-conflict'),{code:'learning-conflict'});
      return {id,...clean};
    }
    if(clean.supersedesId){
      const prior=await tx.get(sdk.doc(db,'katatib_learning',clean.supersedesId));
      if(!prior.exists()||prior.data().studentId!==clean.studentId||prior.data().kind!==clean.kind)throw new Error('invalid-correction');
    }
    tx.set(ref,{schemaVersion:1,...clean,createdBy:userId,createdAt:sdk.serverTimestamp()});
    return {id,...clean};
  });
}
