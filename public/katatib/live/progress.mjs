import { currentLearning, cleanLearning } from './learning.mjs';
// V1 provides a quantity, not a map. Never assume that it covers hizbs 1..N.
export function learningProgress(records,baselineHizbs=null) {
  const current=currentLearning(records),confirmed=new Set(),practice=new Set();
  let unreviewed=0,conflicts=0,revisions=0,evaluations=0;
  for(const record of current){
    // An unresolved competing edit is not silently certified by a timestamp tie-break.
    if(record.competingEdits){conflicts++;continue;}
    const clean=cleanLearning(record);
    if(clean.kind==='revision'){revisions++;continue;}
    if(clean.kind==='evaluation'){evaluations++;continue;}
    if(record.schemaVersion!==2){unreviewed++;continue;}
    const target=clean.kind==='memorization'?confirmed:practice;
    for(let eighth=clean.fromEighth;eighth<=clean.toEighth;eighth++)target.add((clean.hizb-1)*8+eighth-1);
  }
  const baseline=typeof baselineHizbs==='number'&&Number.isFinite(baselineHizbs)&&baselineHizbs>=0&&baselineHizbs<=60?baselineHizbs:null;
  return {baselineHizbs:baseline,confirmedEighths:confirmed.size,confirmedHizbs:confirmed.size/8,confirmedPercent:confirmed.size/480*100,practiceEighths:practice.size,unreviewed,conflicts,revisions,evaluations,combinedHizbs:baseline===0&&unreviewed===0&&conflicts===0?confirmed.size/8:null};
}
