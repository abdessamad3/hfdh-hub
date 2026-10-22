import {PASSAGE_INDEX} from './passage-index.mjs';
import {WARSH_REFERENCE as m} from './warsh-reference.mjs';
import {verseOrdinal,verseReference,versePage} from './mushaf-model.mjs';
export const boundaries=Object.freeze([...PASSAGE_INDEX.entries.map(r=>r.ordinal*10000+r.startOffset),62150000]);
export function cleanPassage(input){
 if(!input||!['ayahs','divisions'].includes(input.mode))throw Error('invalid-passage');
 let start,end;
 if(input.mode==='ayahs'){
  start=verseOrdinal(m,Number(input.fromSurah),Number(input.fromAyah))*10000;
  end=(verseOrdinal(m,Number(input.toSurah),Number(input.toAyah))+1)*10000;
 }else{
  if(!Number.isInteger(input.startCell)||!Number.isInteger(input.endCell)||input.startCell<0||input.endCell<input.startCell||input.endCell>479)throw Error('invalid-passage');
  start=boundaries[input.startCell];end=boundaries[input.endCell+1];
 }
 if(start>=end)throw Error('invalid-passage');
 const startCell=boundaries.findIndex((b,i)=>i<480&&b<=start&&boundaries[i+1]>start);
 const endCell=boundaries.findIndex((b,i)=>i<480&&b<end&&boundaries[i+1]>=end);
 const from=verseReference(m,Math.floor(start/10000)),to=verseReference(m,Math.floor((end-1)/10000));
 return {mode:input.mode,start,end,startCell,endCell,fromSurah:from.surah,fromAyah:from.ayah,toSurah:to.surah,toAyah:to.ayah};
}
