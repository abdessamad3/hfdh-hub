import { mergeHistory } from './legacy.mjs';
import { monthlyAttendance } from './workspace-model.mjs';
import { learningProgress } from './progress.mjs';

export const V2_REPORT_KEYS=Object.freeze(['name','kuttab','present','absent','excused','late','leftEarly','unmarked','baseline','confirmed']);
export const V1_REPORT_KEYS=Object.freeze(['name','v1Present','v1Absent','v1Excused','v1Review','v1Evaluations','v1Revisions','v1Memorizations','v1Planned','v1EvaluationMean','v1RevisionMean','invalidHistoryDates']);

// Count original evidence without guessing a session or combining it with V2.
export function historicalMonthlySummary(history,studentId,month){
 if(typeof month!=='string'||!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))throw new Error('invalid-month');
 const rows=mergeHistory([history],studentId),scores={evaluation:[],revision:[]};
 const result={v1Present:0,v1Absent:0,v1Excused:0,v1Review:0,v1Evaluations:0,v1Revisions:0,v1Memorizations:0,v1Planned:0,invalidHistoryDates:0};
 for(const r of rows){
  if(r.source!=='V1')continue;
  if(!r.validDate){result.invalidHistoryDates++;continue;}
  if(!r.date.startsWith(month+'-'))continue;
  if(['evaluation','revision'].includes(r.kind)&&typeof r.score==='number'&&r.score>=0&&r.score<=100)scores[r.kind].push(r.score);
  if(r.kind==='attendance'){
   if(r.issues.length){result.v1Review++;continue;}
   result[{present:'v1Present',absent:'v1Absent',excused:'v1Excused'}[r.status]]++;
  }else{
   const field={evaluation:'v1Evaluations',revision:'v1Revisions',memorization:'v1Memorizations',nextRevision:'v1Planned',nextEvaluation:'v1Planned'}[r.kind];
   if(field)result[field]++;
  }
 }
 for(const [kind,key] of [['evaluation','v1EvaluationMean'],['revision','v1RevisionMean']])result[key]=scores[kind].length?Math.round(scores[kind].reduce((sum,x)=>sum+x,0)/scores[kind].length*100)/100:null;
 return result;
}

// A failed read produces no partial report. Limit concurrent pupils on large rosters.
export async function loadMonthlyReports(students,month,gateway,isCurrent=()=>true){
 if(typeof month!=='string'||!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))throw new Error('invalid-month');
 const output=new Array(students.length);let next=0,failed=false;
 async function worker(){
  while(!failed&&isCurrent()&&next<students.length){
   const index=next++,s=students[index];
   try{
    const history=await gateway.studentHistory(s.id);
    if(!isCurrent()||failed)return;
    const learning=await gateway.learningHistory(s.id);
    if(!isCurrent()||failed)return;
    const historical=historicalMonthlySummary(history,s.id,month);
    const attendance=history.filter(r=>r.collection==='katatib_attendance');
    const [current]=monthlyAttendance([s],attendance,month);
    const progress=learningProgress(learning,s.hizbs);
    output[index]={...current,...historical,baseline:progress.baselineHizbs,confirmed:progress.confirmedHizbs};
   }catch(error){failed=true;throw error;}
  }
 }
 await Promise.all(Array.from({length:Math.min(3,students.length)},worker));
 if(!isCurrent())throw new Error('report-cancelled');
 return output;
}
