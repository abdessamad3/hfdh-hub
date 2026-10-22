import {currentLearning,cleanLearning} from './learning.mjs';
import {combinedTasks} from './planning.mjs';
import { mergeHistory } from './legacy.mjs';
import { monthlyAttendance } from './workspace-model.mjs';
import { learningProgress } from './progress.mjs';

export const V2_REPORT_KEYS=Object.freeze(['name','kuttab','present','absent','excused','late','leftEarly','unmarked','baseline','confirmed']);
export const V1_REPORT_KEYS=Object.freeze(['name','v1Present','v1Absent','v1Excused','v1Review','v1Evaluations','v1Revisions','v1Memorizations','v1Planned','v1EvaluationMean','v1RevisionMean','invalidHistoryDates']);

export const ACTIVITY_REPORT_KEYS=Object.freeze(['name','monthlyMemorizations','monthlyPractice','monthlyRevisions','monthlyEvaluations','monthlyRevisionMean','monthlyEvaluationMean','learningReview']);
export const PLAN_REPORT_KEYS=Object.freeze(['name','v1TasksOpen','v1TasksDone','v1TasksCancelled','v2TasksOpen','v2TasksDone','v2TasksCancelled']);
export const reportLabels={
 en:{reportActivities:'V2 learning in the selected month',reportPlans:'Tasks due in the selected month',reportDetails:'Counts use current corrected records. Task status is its current status, not its status at month end. Balances remain cumulative to today. Conflicting learning chains are excluded and shown for review across all history.',monthlyMemorizations:'V2: memorization records',monthlyPractice:'V2: practice records',monthlyRevisions:'V2: revision records',monthlyEvaluations:'V2: evaluation records',monthlyRevisionMean:'V2: mean revision score /100',monthlyEvaluationMean:'V2: mean evaluation score /100',learningReview:'V2: conflicting chains (all history)',v1TasksOpen:'V1: planned',v1TasksDone:'V1: done',v1TasksCancelled:'V1: cancelled',v2TasksOpen:'V2: planned',v2TasksDone:'V2: done',v2TasksCancelled:'V2: cancelled'},
 ar:{reportActivities:'التعلم V2 في الشهر المحدد',reportPlans:'الأعمال المستحقة في الشهر المحدد',reportDetails:'تُحسب السجلات المصححة الحالية. حالة العمل هي حالته الآن وليست حالته عند نهاية الشهر. الأرصدة تراكمية حتى اليوم. تُستبعد سلاسل التعلم المتعارضة وتُعرض للمراجعة عبر كامل السجل.',monthlyMemorizations:'V2: سجلات الحفظ',monthlyPractice:'V2: سجلات التدريب',monthlyRevisions:'V2: سجلات المراجعة',monthlyEvaluations:'V2: سجلات التقييم',monthlyRevisionMean:'V2: متوسط المراجعة من 100',monthlyEvaluationMean:'V2: متوسط التقييم من 100',learningReview:'V2: سلاسل متعارضة في كامل السجل',v1TasksOpen:'V1: مخطط',v1TasksDone:'V1: مكتمل',v1TasksCancelled:'V1: ملغى',v2TasksOpen:'V2: مخطط',v2TasksDone:'V2: مكتمل',v2TasksCancelled:'V2: ملغى'},
 fr:{reportActivities:'Apprentissage V2 du mois sélectionné',reportPlans:'Travaux à échéance dans le mois sélectionné',reportDetails:'Les fiches corrigées actuelles sont comptées. L’état du travail est son état actuel, pas celui en fin de mois. Les acquis restent cumulés à ce jour. Les chaînes en conflit sont exclues et signalées pour tout l’historique.',monthlyMemorizations:'V2 : mémorisations',monthlyPractice:'V2 : entraînements',monthlyRevisions:'V2 : révisions',monthlyEvaluations:'V2 : évaluations',monthlyRevisionMean:'V2 : moyenne révision /100',monthlyEvaluationMean:'V2 : moyenne évaluation /100',learningReview:'V2 : chaînes en conflit (tout l’historique)',v1TasksOpen:'V1 : prévu',v1TasksDone:'V1 : terminé',v1TasksCancelled:'V1 : annulé',v2TasksOpen:'V2 : prévu',v2TasksDone:'V2 : terminé',v2TasksCancelled:'V2 : annulé'}
};
export function monthlyLearningSummary(records,studentId,month){
 if(typeof month!=='string'||!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))throw new Error('invalid-month');
 if(records.some(r=>r.studentId!==studentId))throw new Error('wrong-student-learning');
 const result={monthlyMemorizations:0,monthlyPractice:0,monthlyRevisions:0,monthlyEvaluations:0,monthlyRevisionMean:null,monthlyEvaluationMean:null,learningReview:0},scores={revision:[],evaluation:[]};
 for(const r of currentLearning(records)){
  if(r.competingEdits){result.learningReview++;continue;}
  const clean=cleanLearning(r);if(!clean.date.startsWith(month+'-'))continue;
  result[{memorization:'monthlyMemorizations',practice:'monthlyPractice',revision:'monthlyRevisions',evaluation:'monthlyEvaluations'}[clean.kind]]++;
  if(scores[clean.kind])scores[clean.kind].push(clean.score);
 }
 for(const [kind,key] of [['revision','monthlyRevisionMean'],['evaluation','monthlyEvaluationMean']])if(scores[kind].length)result[key]=Math.round(scores[kind].reduce((a,b)=>a+b,0)/scores[kind].length*100)/100;
 return result;
}
export function monthlyPlanSummary(history,tasks,studentId,month){
 if(typeof month!=='string'||!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))throw new Error('invalid-month');
 const result=Object.fromEntries(PLAN_REPORT_KEYS.filter(k=>k!=='name').map(k=>[k,0]));
 for(const r of combinedTasks(history,tasks,studentId)){if(r.validDate===false||!r.due.startsWith(month+'-'))continue;result[(r.source==='V1'?'v1':'v2')+'Tasks'+({planned:'Open',done:'Done',cancelled:'Cancelled'}[r.status])]++;}
 return result;
}

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
    const tasks=await gateway.workspaceList('katatib_tasks',s.id);
    if(!isCurrent()||failed)return;
    const activity=monthlyLearningSummary(learning,s.id,month),plans=monthlyPlanSummary(history,tasks,s.id,month);
    const historical=historicalMonthlySummary(history,s.id,month);
    const attendance=history.filter(r=>r.collection==='katatib_attendance');
    const [current]=monthlyAttendance([s],attendance,month);
    const progress=learningProgress(learning,s.hizbs);
    output[index]={...current,...historical,...activity,...plans,baseline:progress.baselineHizbs,confirmed:progress.confirmedHizbs};
   }catch(error){failed=true;throw error;}
  }
 }
 await Promise.all(Array.from({length:Math.min(3,students.length)},worker));
 if(!isCurrent())throw new Error('report-cancelled');
 return output;
}
