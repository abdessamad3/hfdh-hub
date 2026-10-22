import { mergeHistory } from './legacy.mjs';
import { cleanTask } from './workspace-model.mjs';

// One list, two preserved sources. Legacy portions are never guessed or rewritten.
export function combinedTasks(history,tasks,studentId){
 const rows=mergeHistory([history],studentId).filter(r=>['nextRevision','nextEvaluation'].includes(r.kind)).map(r=>({...r,id:r.key,source:'V1',due:r.date,kind:r.kind==='nextRevision'?'revision':'evaluation',status:r.taskState?.status||'planned',legacy:true}));
 const seen=new Set();
 for(const task of tasks){const clean=cleanTask(task);if(clean.studentId!==studentId||typeof task.id!=='string'||seen.has(task.id))throw new Error('invalid-task-history');seen.add(task.id);rows.push({...task,...clean,source:'V2',legacy:false});}
 return rows.sort((a,b)=>Number(b.validDate!==false)-Number(a.validDate!==false)||a.due.localeCompare(b.due)||a.source.localeCompare(b.source)||a.id.localeCompare(b.id));
}
export async function loadTasks(students,gateway,isCurrent=()=>true){
 const output=new Array(students.length);let next=0,failed=false;
 async function worker(){while(!failed&&isCurrent()&&next<students.length){const i=next++,s=students[i];try{const history=await gateway.studentHistory(s.id);if(failed||!isCurrent())return;const tasks=await gateway.workspaceList('katatib_tasks',s.id);if(failed||!isCurrent())return;output[i]=combinedTasks(history,tasks,s.id);}catch(e){failed=true;throw e;}}}
 await Promise.all(Array.from({length:Math.min(3,students.length)},worker));if(!isCurrent())throw new Error('tasks-cancelled');
 return output.flat().sort((a,b)=>Number(b.validDate!==false)-Number(a.validDate!==false)||a.due.localeCompare(b.due)||a.studentId.localeCompare(b.studentId)||a.id.localeCompare(b.id));
}
