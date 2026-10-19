import { attendanceId, cleanAttendance, decideSave } from './attendance.mjs';
export const TEACHER_CURRENT='katatib_teacher_attendance';
export const TEACHER_HISTORY='katatib_teacher_attendance_history';
export function teacherView(id,data){
 if(data?.role!=='teacher'||typeof id!=='string'||!id||/[~/]/.test(id))throw new Error('invalid-teacher');
 return {id,name:typeof data.displayName==='string'?data.displayName:id,kuttab:typeof data.kuttabName==='string'?data.kuttabName:''};
}
export async function commitTeacherAttendance(db,sdk,uid,teacherId,context,desired,expectedRevision,eventId){
 const recordId=attendanceId(teacherId,context.date,context.session),clean=cleanAttendance(desired);
 if(!uid||!/^[A-Za-z0-9-]{16,80}$/.test(eventId))throw new Error('invalid-identity');
 const ref=sdk.doc(db,TEACHER_CURRENT,recordId);
 try{return await sdk.runTransaction(db,async tx=>{
  const snap=await tx.get(ref),current=snap.exists()?snap.data():null;
  const decision=decideSave(current,clean,expectedRevision);
  if(decision.unchanged)return {...clean,revision:decision.revision};
  const data={schemaVersion:1,recordId,teacherId,date:context.date,session:context.session,...clean,revision:decision.revision,updatedBy:uid,updatedAt:sdk.serverTimestamp(),eventId};
  tx.set(ref,data);tx.set(sdk.doc(db,TEACHER_HISTORY,eventId),data);
  return {...clean,revision:decision.revision};
 });}catch(error){
  if(error.code==='permission-denied'){
   let latest;try{latest=await sdk.getDocFromServer(ref);}catch{throw error;}
   const decision=decideSave(latest.exists()?latest.data():null,clean,expectedRevision);
   if(decision.unchanged)return {...clean,revision:decision.revision};
  }
  throw error;
 }
}
