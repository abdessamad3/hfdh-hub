const id=x=>typeof x==='string'&&x.length>0&&x.length<=128&&!/[^A-Za-z0-9_-]/.test(x);
const uid=x=>typeof x==='string'&&x.length>0&&x.length<=128&&!/[~/\r\n]/.test(x);
const text=(x,max)=>typeof x==='string'&&x.trim().length>0&&x.length<=max;
export function cleanNotice(x){
 if(!x||!id(x.studentId)||!text(x.title,120)||!text(x.body,2000)||!['info','attendance','learning'].includes(x.kind)||typeof x.active!=='boolean')throw new Error('invalid-notice');
 return {studentId:x.studentId,title:x.title.trim(),body:x.body.trim(),kind:x.kind,active:x.active};
}
export function cleanAcknowledgement(x){
 if(!x||!id(x.studentId)||!id(x.noticeId)||!uid(x.readerUid)||!Number.isInteger(x.noticeRevision)||x.noticeRevision<1)throw new Error('invalid-acknowledgement');
 return {studentId:x.studentId,noticeId:x.noticeId,readerUid:x.readerUid,noticeRevision:x.noticeRevision};
}
export const CONSENT_POLICY='katatib-test-2026-10-19';
export function cleanConsent(x){
 if(!x||!id(x.studentId)||!uid(x.guardianUid)||!['audio','ranking'].includes(x.purpose)||typeof x.approved!=='boolean'||x.policyVersion!==CONSENT_POLICY)throw new Error('invalid-consent');
 return {studentId:x.studentId,guardianUid:x.guardianUid,purpose:x.purpose,approved:x.approved,policyVersion:CONSENT_POLICY};
}
export function noticeRows(notices,acknowledgements){
 const seen=new Set(acknowledgements.map(a=>a.noticeId+'~'+a.noticeRevision));
 return notices.filter(n=>n.active).map(n=>({...n,acknowledged:seen.has(n.id+'~'+n.revision)})).sort((a,b)=>Number(a.acknowledged)-Number(b.acknowledged)||Number(b.updatedAt?.seconds||0)-Number(a.updatedAt?.seconds||0)||a.id.localeCompare(b.id));
}
