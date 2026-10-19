import { english } from './english.mjs';
import { businessDate, CLOUD_SESSIONS, CLOUD_STATUSES, emptyAttendance } from './attendance.mjs';
export const teacherLabels={
 ar:{teacherAttendance:'حضور المعلمين',teacherPerson:'المعلم',teacherDate:'التاريخ',teacherSession:'الحصة',teacherNote:'ملاحظة / عذر',teacherHistory:'سجل حضور المعلم والتصحيحات',teacherHint:'يسجّل المسؤول أو مدير الكتّاب الحضور صراحة. السجلات الأصلية للقراءة فقط؛ أرقام حصصها لا تُحوّل تلقائياً إلى صباح أو مساء.',teacherEmpty:'لا يوجد معلمون ضمن صلاحيتك في النسخة المنسوخة.',teacherLoading:'جارٍ التحميل…',teacherFailed:'لم تُؤكد العملية. تحقق من الاتصال والصلاحيات ثم أعد المحاولة.',teacherConflict:'عُدل السجل من مكان آخر. بقيت مسودتك؛ حدّث قبل إعادة الحفظ.',teacherSaved:'حُفظ الحضور.',teacherSave:'حفظ',teacherReload:'تحديث من الخادم',teacherDiscard:'التحديث أو تغيير المعلم/الحصة سيترك المسودة غير المحفوظة. هل تتابع؟',teacherReadHistoryFailed:'حُفظ الحضور، لكن تعذر تحديث التاريخ. حدّث من الخادم لرؤيته.',teacherOld:'سجل أصلي V1',teacherChange:'تغيير V2',teacherRevision:'النسخة',teacherAuthor:'المسجّل',teacherWhen:'وقت التغيير',teacherNoHistory:'لا توجد سجلات.',teacherPrevious:'السابق',teacherNext:'التالي',teacherMissingSession:'رقم الحصة الأصلي غير مسجل',morning:'الصباحية',afternoon:'بعد الظهر',evening:'المسائية',present:'حاضر',absent:'غائب',excused:'معذور',late:'متأخر',leftEarly:'انصرف مبكراً',unmarked:'لم يسجل'},
 fr:{teacherAttendance:'Présences enseignants',teacherPerson:'Enseignant',teacherDate:'Date',teacherSession:'Séance',teacherNote:'Remarque / justification',teacherHistory:'Historique et corrections des présences',teacherHint:'Un administrateur ou responsable saisit explicitement la présence. Les fiches originales restent en lecture seule ; leurs numéros de séance ne sont pas convertis automatiquement en matin ou soir.',teacherEmpty:'Aucun enseignant dans votre périmètre parmi les profils copiés.',teacherLoading:'Chargement…',teacherFailed:'Opération non confirmée. Vérifiez la connexion et les droits, puis réessayez.',teacherConflict:'La fiche a changé ailleurs. Votre brouillon est conservé ; rechargez avant de réenregistrer.',teacherSaved:'Présence enregistrée.',teacherSave:'Enregistrer',teacherReload:'Actualiser depuis le serveur',teacherDiscard:'Actualiser ou changer d’enseignant/séance abandonne le brouillon non enregistré. Continuer ?',teacherReadHistoryFailed:'Présence enregistrée, mais historique non actualisé. Rechargez pour le consulter.',teacherOld:'Fiche originale V1',teacherChange:'Modification V2',teacherRevision:'Version',teacherAuthor:'Auteur',teacherWhen:'Date de modification',teacherNoHistory:'Aucune fiche.',teacherPrevious:'Précédent',teacherNext:'Suivant',teacherMissingSession:'Numéro de séance original absent',morning:'Matin',afternoon:'Après-midi',evening:'Soir',present:'Présent',absent:'Absent',excused:'Excusé',late:'Retard',leftEarly:'Départ anticipé',unmarked:'Non renseigné'}
};
teacherLabels.en=english;
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function createTeacherAttendance(){
 let host,ctx,teachers=[],selected='',date=businessDate(),session='morning',baseline=emptyAttendance(),draft=emptyAttendance(),history=[],page=0,token=0,loading=false,saving=false,loaded=false,error='',notice='',pending=null;
 const t=k=>teacherLabels[ctx.language][k]||k;
 const dirty=()=>!!pending||draft.status!==baseline.status||draft.note!==baseline.note;
 const canLeave=()=>!saving&&(!dirty()||confirm(t('teacherDiscard')));
 function reset(){token++;host=null;ctx=null;teachers=[];selected='';date=businessDate();session='morning';baseline=emptyAttendance();draft=emptyAttendance();history=[];page=0;loading=false;saving=false;loaded=false;error='';notice='';pending=null;}
 function paint(){if(!host?.isConnected)return;
  const disabled=loading||saving;
  const shown=history.slice(page*40,(page+1)*40);
  host.innerHTML=`<section class="workspace-module teacher-attendance-module"><p>${t('teacherHint')}</p>${error?`<p class="notice-error" role="alert">${t(error)}</p>`:''}${notice?`<p class="live-notice" role="status">${t(notice)}</p>`:''}<button class="secondary-button" data-teacher-reload ${disabled?'disabled':''}>${t('teacherReload')}</button>${loading?`<p role="status">${t('teacherLoading')}</p>`:''}${teachers.length?`<div class="workspace-toolbar"><label>${t('teacherPerson')}<select id="teacher-person" ${disabled?'disabled':''}>${teachers.map(s=>`<option value="${esc(s.id)}" ${selected===s.id?'selected':''}>${esc(s.name)} · ${esc(s.kuttab)}</option>`).join('')}</select></label><label>${t('teacherDate')}<input id="teacher-date" type="date" value="${esc(date)}" ${disabled?'disabled':''}></label><label>${t('teacherSession')}<select id="teacher-session" ${disabled?'disabled':''}>${CLOUD_SESSIONS.map(s=>`<option value="${s}" ${s===session?'selected':''}>${t(s)}</option>`).join('')}</select></label></div>`:''}${loaded&&selected?`<form data-teacher-form><fieldset ${disabled||pending?'disabled':''}><label>${t('teacherAttendance')}<select id="teacher-status">${CLOUD_STATUSES.map(s=>`<option value="${s}" ${draft.status===s?'selected':''}>${t(s)}</option>`).join('')}</select></label><label>${t('teacherNote')}<textarea id="teacher-note" maxlength="500">${esc(draft.note)}</textarea></label></fieldset><button class="primary-button" type="submit" ${disabled||!dirty()?'disabled':''}>${t(saving?'teacherLoading':'teacherSave')}</button></form><h2>${t('teacherHistory')}</h2>${history.length?`<div class="workspace-table-wrap"><table class="workspace-table"><thead><tr>${['teacherDate','teacherSession','teacherAttendance','teacherNote','teacherRevision','teacherAuthor','teacherWhen'].map(k=>`<th>${t(k)}</th>`).join('')}</tr></thead><tbody>${shown.map(r=>`<tr><td>${esc(r.date)}<br>${t(r.source==='V1'?'teacherOld':'teacherChange')}</td><td>${r.source==='V1'?esc(r.sessionIndex??t('teacherMissingSession')):esc(t(r.session))}</td><td>${esc(t(r.status))}</td><td>${esc(r.note||r.excuse)}</td><td>${esc(r.revision??'—')}</td><td>${esc(r.updatedBy||r.markedById||'—')}</td><td>${esc(r.updatedAt?.toDate?.().toLocaleString(ctx.language)||'—')}</td></tr>`).join('')}</tbody></table></div><div class="workspace-toolbar"><button data-teacher-page="previous" class="secondary-button" ${page===0?'disabled':''}>${t('teacherPrevious')}</button><span>${page+1} / ${Math.ceil(history.length/40)}</span><button data-teacher-page="next" class="secondary-button" ${(page+1)*40>=history.length?'disabled':''}>${t('teacherNext')}</button></div>`:`<p>${t('teacherNoHistory')}</p>`}`:loaded&&!teachers.length?`<p>${t('teacherEmpty')}</p>`:''}</section>`;
 }
 async function load(refreshRoster=false){const generation=++token;loading=true;loaded=false;error='';notice='';paint();const gateway=ctx.gateway;
  try{
   if(refreshRoster||!teachers.length){const roster=await gateway.teachers();if(generation!==token)return;teachers=roster;if(!teachers.some(t=>t.id===selected))selected=teachers[0]?.id||'';}
   const id=selected;
   const [record,events]=id?await Promise.all([gateway.teacherAttendance(id,{date,session}),gateway.teacherHistory(id)]):[emptyAttendance(),[]];
   if(generation!==token)return;
   baseline={...record};draft={...record};history=events;page=0;pending=null;loaded=true;
  }catch{if(generation===token)error='teacherFailed';}
  finally{if(generation===token){loading=false;paint();}}
 }
 async function submit(event){if(!event.target.matches('[data-teacher-form]'))return;event.preventDefault();if(saving||loading||!dirty())return;
  const generation=token,gateway=ctx.gateway;pending??={teacher:selected,context:{date,session},desired:{status:draft.status,note:draft.note},revision:baseline.revision,eventId:crypto.randomUUID()};
  saving=true;error='';notice='';paint();
  try{const p=pending,result=await gateway.saveTeacherAttendance(p.teacher,p.context,p.desired,p.revision,p.eventId);if(generation!==token)return;
   baseline={...result};draft={...result};pending=null;notice='teacherSaved';
   try{const events=await gateway.teacherHistory(selected);if(generation!==token)return;history=events;page=0;}catch{if(generation===token)error='teacherReadHistoryFailed';}
  }catch(e){if(generation===token){error=e.code==='conflict'?'teacherConflict':'teacherFailed';if(e.code==='conflict')pending=null;}}
  finally{if(generation===token){saving=false;paint();}}
 }
 function input(event){if(saving||pending)return;if(event.target.id==='teacher-status')draft.status=event.target.value;else if(event.target.id==='teacher-note')draft.note=event.target.value;else return;
  const button=host.querySelector('[data-teacher-form] button[type=submit]');if(button)button.disabled=!dirty();notice='';
 }
 function change(event){if(saving||loading)return;const id=event.target.id;if(!['teacher-person','teacher-date','teacher-session'].includes(id))return;
  if(!canLeave()){paint();return;}
  if(id==='teacher-person')selected=teachers.some(t=>t.id===event.target.value)?event.target.value:'';
  if(id==='teacher-date')date=event.target.value;
  if(id==='teacher-session')session=event.target.value;
  pending=null;load();
 }
 function click(event){const button=event.target.closest('button');if(!button||button.disabled||saving)return;
  if(button.hasAttribute('data-teacher-reload')){if(canLeave())load(true);}
  if(button.dataset.teacherPage){page+=button.dataset.teacherPage==='next'?1:-1;paint();}
 }
 return {reset,dirty,busy:()=>saving,canLeave,mount(target,context){ctx=context;host=target;if(!['admin','manager'].includes(ctx.role)){host.textContent=t('teacherFailed');return;}host.onclick=click;host.onchange=change;host.oninput=input;host.onsubmit=submit;paint();if(!loaded&&!loading)load();}};
}
