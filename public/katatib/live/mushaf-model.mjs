export const MUSHAF_EDITION='warsh-kfqc-1442';
export const MUSHAF_COMMIT='b4155f07e4aea087d2c458069acff9f7c7e749f6';
export const VERSE_MARKS={forgot:{letter:'ن',color:'#d44848'},hesitated:{letter:'ت',color:'#bd8b13'},error:{letter:'خ',color:'#d9762b'},correct:{letter:'ص',color:'#32885d'}};
export function validateMushafManifest(m){
 if(m?.edition!==MUSHAF_EDITION||m.commit!==MUSHAF_COMMIT||m.pages?.length!==604||m.surahs?.length!==114||m.pageStarts?.length!==605||m.hizbStarts?.length!==60)throw new Error('invalid-mushaf-index');
 if(m.pages.some((p,i)=>p.page!==i+1||!Number.isInteger(p.bytes)||p.bytes<1000||p.bytes>3000000||!/^[a-f0-9]{40}$/.test(p.sha))||m.surahs.some((s,i)=>s.number!==i+1||!Number.isInteger(s.ayahCount)||s.ayahCount<1||s.ayahCount>300||typeof s.name!=='string'||!Number.isInteger(s.page)||s.page<1||s.page>604))throw new Error('invalid-mushaf-index');
 if(m.surahs.reduce((n,s)=>n+s.ayahCount,0)!==6214||m.pageStarts[0]!==1||m.pageStarts[604]!==6215||m.pageStarts.some((v,i)=>!Number.isInteger(v)||i&&v<=m.pageStarts[i-1])||m.hizbStarts.some((v,i)=>!Number.isInteger(v)||v<1||v>6214||i&&v<=m.hizbStarts[i-1]))throw new Error('invalid-mushaf-index');
 return m;
}
export function verseOrdinal(m,surah,ayah){
 if(!Number.isInteger(surah)||surah<1||surah>114||!Number.isInteger(ayah)||ayah<1||ayah>m.surahs[surah-1].ayahCount)throw new Error('invalid-warsh-reference');
 return m.surahs.slice(0,surah-1).reduce((n,s)=>n+s.ayahCount,0)+ayah;
}
export function verseReference(m,ordinal){
 if(!Number.isInteger(ordinal)||ordinal<1||ordinal>6214)throw new Error('invalid-warsh-reference');
 for(const s of m.surahs){if(ordinal<=s.ayahCount)return {surah:s.number,ayah:ordinal};ordinal-=s.ayahCount;}
}
export function versePage(m,surah,ayah){const n=verseOrdinal(m,surah,ayah);return m.pageStarts.findIndex((start,i)=>i<604&&start<=n&&m.pageStarts[i+1]>n)+1;}
export function pageReferences(m,page){
 if(!Number.isInteger(page)||page<1||page>604)throw new Error('invalid-mushaf-page');
 return Array.from({length:m.pageStarts[page]-m.pageStarts[page-1]},(_,i)=>verseReference(m,m.pageStarts[page-1]+i));
}
export function cleanVerseMark(input,m){
 if(!input||typeof input.studentId!=='string'||!input.studentId||input.studentId.length>128||/[~/\r\n]/.test(input.studentId)||input.edition!==MUSHAF_EDITION||input.sourceVersion!==MUSHAF_COMMIT||!VERSE_MARKS[input.mark]||typeof input.note!=='string'||input.note.length>500)throw new Error('invalid-verse-mark');
 if(versePage(m,input.surah,input.ayah)!==input.page)throw new Error('invalid-warsh-reference');
 if(input.recitationId!==undefined&&(!/^[A-Za-z0-9-]{16,80}$/.test(input.recitationId)))throw Error('invalid-recitation');
 return {...(input.recitationId?{recitationId:input.recitationId}:{}),studentId:input.studentId,edition:MUSHAF_EDITION,sourceVersion:MUSHAF_COMMIT,page:input.page,surah:input.surah,ayah:input.ayah,mark:input.mark,note:input.note};
}
export async function commitVerseMark(db,sdk,uid,input,eventId,m){
 const data=cleanVerseMark(input,m);
 if(!uid||typeof eventId!=='string'||eventId.length<16||eventId.length>80||/[^A-Za-z0-9-]/.test(eventId))throw new Error('invalid-verse-mark');
 const ref=sdk.doc(db,'katatib_verse_marks',eventId);
 return sdk.runTransaction(db,async tx=>{
  const snap=await tx.get(ref);
  if(snap.exists()){
   const prior=snap.data();
   if(prior.createdBy!==uid||Object.keys(data).some(k=>prior[k]!==data[k]))throw new Error('verse-mark-conflict');
   return {...prior,id:eventId};
  }
  const record={schemaVersion:1,...data,createdBy:uid,createdAt:sdk.serverTimestamp()};
  tx.set(ref,record);return {...record,id:eventId};
 });
}
export function verseHistory(rows,surah,ayah){return rows.filter(r=>r.edition===MUSHAF_EDITION&&r.sourceVersion===MUSHAF_COMMIT&&r.surah===surah&&r.ayah===ayah).sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0)||(b.createdAt?.nanoseconds||0)-(a.createdAt?.nanoseconds||0)||b.id.localeCompare(a.id));}
