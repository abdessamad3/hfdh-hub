import { english } from './english.mjs';
// Display projection only. Legacy evidence is never converted into confirmed V2 coverage.
export const LEGACY_COLLECTIONS=Object.freeze(['attendance','evaluations','revisions','memorizations','next_revisions','next_evaluations']);
export const HISTORY_COLLECTIONS=Object.freeze([...LEGACY_COLLECTIONS,'katatib_attendance']);
const text=x=>typeof x==='string'?x:'';
const number=x=>typeof x==='number'&&Number.isFinite(x)?x:null;
export function validCalendarDate(date){
 if(typeof date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(date))return false;
 const d=new Date(date+'T12:00:00Z');return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===date;
}
export function historyProjection(collection,id,data){
 if(!HISTORY_COLLECTIONS.includes(collection)||typeof id!=='string'||typeof data?.studentId!=='string')throw new Error('invalid-history');
 const kinds={attendance:'attendance',katatib_attendance:'attendance',evaluations:'evaluation',revisions:'revision',memorizations:'memorization',next_revisions:'nextRevision',next_evaluations:'nextEvaluation'};
 const date=text(collection.startsWith('next_')?data.dueDate:data.date);
 return {id,key:collection+'/'+id,collection,source:collection.startsWith('katatib_')?'V2':'V1',studentId:data.studentId,kind:kinds[collection],date,validDate:validCalendarDate(date),sessionIndex:Number.isInteger(data.sessionIndex)?data.sessionIndex:null,session:text(data.session),status:text(data.status),hizb:number(data.hizbNumber),quantity:number(data.quantity),identifier:text(data.quantityIdentifier),surah:text(data.surahName),fromAyah:number(data.fromAyah),toAyah:number(data.toAyah),mistakes:number(data.mistakesCount),score:number(collection==='revisions'?data.qualityScore:data.accuracyScore),note:text(data.notes||data.excuse||data.note)};
}
export function reviewLegacyAttendance(records){
 const groups=new Map(),issues=new Map();
 for(const r of records){if(r.collection!=='attendance')continue;
  const flags=[];if(!r.validDate)flags.push('invalidDate');if(!Number.isInteger(r.sessionIndex)||r.sessionIndex<0)flags.push('unmappedSession');if(!['present','absent','excused'].includes(r.status))flags.push('unknownStatus');
  issues.set(r.key,flags);
  if(r.validDate&&r.sessionIndex!==null&&r.sessionIndex>=0){const key=JSON.stringify([r.studentId,r.date,r.sessionIndex]);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(r);}
 }
 for(const group of groups.values())if(group.length>1)for(const r of group)issues.get(r.key).push('duplicateSession');
 return issues;
}
export function mergeHistory(batches,studentId){
 const rows=batches.flat();if(rows.some(r=>r.studentId!==studentId))throw new Error('wrong-student-history');
 const seen=new Set();for(const r of rows){if(seen.has(r.key))throw new Error('duplicate-history-page');seen.add(r.key);}
 const issues=reviewLegacyAttendance(rows);
 return rows.map(r=>({...r,issues:issues.get(r.key)||(!r.validDate?['invalidDate']:[])})).sort((a,b)=>Number(b.validDate)-Number(a.validDate)||b.date.localeCompare(a.date)||a.key.localeCompare(b.key));
}
export const legacyLabels={
 ar:{attendance:'الحضور',evaluation:'التقييم',memorization:'الحفظ',revision:'المراجعة',legacyTitle:'السجل والتقويم',legacyIntro:'السجلات الأصلية V1 للقراءة فقط، بجانب سجلات التعلم والحضور والأعمال الجديدة V2. لا نحول العلامات القديمة إلى حفظ مثبت ولا ندمج حصصاً مجهولة أو مكررة.',legacySource:'المصدر',legacyKind:'النوع',legacyDate:'التاريخ / الموعد',legacySession:'الحصة الأصلية',legacyPortion:'المقطع الأصلي',legacyGrade:'التقدير / الأخطاء',legacyNote:'الملاحظة',legacyReview:'مراجعة مطلوبة',legacyMonth:'الشهر (اختياري)',legacyAll:'كل الأنواع',nextRevision:'مراجعة مخططة V1',nextEvaluation:'تقييم مخطط V1',invalidDate:'تاريخ غير صالح أو غير مسجل',unmappedSession:'حصة غير محددة؛ لم نحزر توقيتها',unknownStatus:'حالة أصلية غير معروفة',duplicateSession:'أكثر من سجل للحصة نفسها؛ حُفظت جميع النسخ',historyCount:'سجلات مقروءة',originalIdentifier:'معرّف المقطع الأصلي',history:'السجل والتقويم',previous:'السابق',next:'التالي',showing:'المعروض'},
 fr:{attendance:'Présence',evaluation:'Évaluation',memorization:'Mémorisation',revision:'Révision',legacyTitle:'Historique et calendrier',legacyIntro:'Fiches V1 en lecture seule, à côté des apprentissages, présences et travaux V2. Les notes anciennes ne deviennent pas des acquis confirmés ; les séances inconnues ou en double ne sont pas fusionnées.',legacySource:'Source',legacyKind:'Type',legacyDate:'Date / échéance',legacySession:'Séance d’origine',legacyPortion:'Portion d’origine',legacyGrade:'Note / erreurs',legacyNote:'Remarque',legacyReview:'À vérifier',legacyMonth:'Mois (facultatif)',legacyAll:'Tous les types',nextRevision:'Révision prévue V1',nextEvaluation:'Évaluation prévue V1',invalidDate:'Date absente ou invalide',unmappedSession:'Séance non identifiée ; aucun horaire déduit',unknownStatus:'État d’origine inconnu',duplicateSession:'Plusieurs fiches pour cette séance ; toutes sont conservées',historyCount:'fiches lues',originalIdentifier:'Identifiant de portion d’origine',history:'Historique et calendrier',previous:'Précédent',next:'Suivant',showing:'Affichage'}
};

legacyLabels.en=english;
