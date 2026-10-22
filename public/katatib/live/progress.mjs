import {recordPassage,passageCells,passageCoverage} from './recitation-passage.mjs';
import { currentLearning, cleanLearning } from './learning.mjs';
// V1 provides a quantity, not a map. Never assume that it covers hizbs 1..N.
export function learningProgress(records,baselineHizbs=null) {
  const current=currentLearning(records),confirmed=new Set(),practice=new Set(),confirmedRanges=[],practiceRanges=[];
  let unreviewed=0,conflicts=0,revisions=0,evaluations=0;
  for(const record of current){
    // An unresolved competing edit is not silently certified by a timestamp tie-break.
    if(record.competingEdits){conflicts++;continue;}
    const clean=cleanLearning(record);
    if(clean.kind==='revision'){revisions++;continue;}
    if(clean.kind==='evaluation'){evaluations++;continue;}
    if(![2,3].includes(record.schemaVersion)){unreviewed++;continue;}
    const target=clean.kind==='memorization'?confirmed:practice;
    const p=recordPassage(clean);(clean.kind==='memorization'?confirmedRanges:practiceRanges).push(p);
    for(const cell of passageCells(p))target.add(cell);
  }
  for(const cell of confirmed)if(passageCoverage(confirmedRanges,cell)!=='complete')confirmed.delete(cell);
  for(const cell of practice)if(passageCoverage(practiceRanges,cell)!=='complete')practice.delete(cell);
  const baseline=typeof baselineHizbs==='number'&&Number.isFinite(baselineHizbs)&&baselineHizbs>=0&&baselineHizbs<=60?baselineHizbs:null;
  return {baselineHizbs:baseline,confirmedEighths:confirmed.size,confirmedHizbs:confirmed.size/8,confirmedPercent:confirmed.size/480*100,practiceEighths:practice.size,unreviewed,conflicts,revisions,evaluations,combinedHizbs:baseline===0&&unreviewed===0&&conflicts===0?confirmed.size/8:null};
}
