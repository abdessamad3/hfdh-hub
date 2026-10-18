import { businessDate, CLOUD_STATUSES, CLOUD_SESSIONS, attendanceId, sameAttendance } from './attendance.mjs';
const root = document.getElementById('live-app');
const dialog = document.getElementById('student-dialog');
const copy = {
  ar: {
    title:'كتاتيب · قاعدة الاختبار', notice:'نسخة من بيانات الطلاب في مشروع الاختبار katatib-64049. سجل الطلاب المنسوخ للقراءة فقط؛ الحضور الجديد يُحفظ في سجل V2 منفصل داخل مشروع الاختبار. هذه ليست قاعدة الموقع الأصلي.',
    login:'تسجيل الدخول بحساب Google', logout:'تسجيل الخروج', demo:'العودة إلى المعاينة الوهمية', welcome:'أهلاً بك في كتاتيب', intro:'سجّل الدخول لعرض الطلاب المسموح لك بالاطلاع عليهم. لا يُحفظ سجل الطلاب في تخزين المتصفح الدائم. إعادة تحميل الصفحة تتطلب تسجيل الدخول مجدداً.',
    loading:'جارٍ التحميل…', denied:'هذا الحساب غير مخوّل، أو تم إيقاف وصوله. على المسؤول منحه الوصول في مشروع الاختبار.',
    setup:'تسجيل الدخول غير مفعّل بعد. فعّل Google في Authentication بمشروع katatib-64049 وأضف هذا الموقع إلى النطاقات المصرّح بها.',
    popup:'تعذّر إكمال نافذة الدخول. اسمح بالنوافذ المنبثقة وافتح الصفحة في Chrome ثم حاول مجدداً.',
    network:'تعذّر الاتصال بالخدمة. تحقّق من الإنترنت ثم أعد المحاولة.', config:'تعذّر التحقق من إعداد مشروع الاختبار. تم إيقاف الاتصال لحماية البيانات.',
    error:'تعذّر تحميل البيانات. تحقّق من الاتصال وإعداد الصلاحيات ثم أعد المحاولة.', retry:'إعادة المحاولة', search:'البحث عن طالب', all:'كل الكتاتيب المتاحة', count:'طلاب محمّلون', empty:'لا يوجد طلاب مطابقون.',
    hizbs:'الأحزاب المحفوظة', age:'العمر', school:'الكتّاب', unknown:'غير مسجّل', profile:'عرض الملف', close:'إغلاق', attendance:'نسبة الحضور المنسوخة', source:'هذه قيم من النسخة المنسوخة؛ لم يُعَد حسابها.',
    history:'سجل الحضور (حتى 20 سجلاً من النسخة)', noHistory:'لا يوجد سجل حضور.', historyError:'تعذّر تحميل سجل الحضور.', capped:'تم الوصول إلى حد 100 طالب في إحدى مجموعات الوصول. قد لا تظهر جميع النتائج.',
    markAttendance:'الحضور', studentsTab:'الطلاب', cloudAttendance:'تسجيل الحضور', date:'التاريخ', cloudSession:'الحصة', morning:'الصباحية', afternoon:'المسائية', evening:'الليلية', unmarked:'لم يسجّل', cloudNote:'ملاحظة', cloudSave:'حفظ في Firebase', cloudSaving:'جارٍ الحفظ…', cloudSaved:'محفوظ في قاعدة الاختبار', cloudUnsaved:'تغييرات لم تُحفظ بعد', cloudNotMarked:'لم يُحفظ سجل لهذه الحصة', cloudReload:'تحديث من الخادم', cloudHint:'احفظ حضور كل طالب على حدة. يلزم الاتصال بالإنترنت؛ لا تُحسب الحالات غير المسجلة غياباً. اختر الحصة يدوياً.', cloudLoadError:'تعذّر تحميل الحضور من الخادم. حاول مجدداً.', cloudSaveError:'لم يتم تأكيد الحفظ. احتُفظ بالتعديل هنا؛ تحقّق من الاتصال والصلاحيات ثم أعد المحاولة.', cloudConflict:'عُدّل هذا السجل من مكان آخر. لم يُستبدل. حدّثه من الخادم ثم أعد التعديل.', cloudDiscard:'سيُستبدل تعديلك غير المحفوظ بالقيمة الموجودة في الخادم. هل تتابع؟', cloudHistory:'سجل الحضور الجديد V2 (حتى 20 تعديلاً)', cloudRevision:'مراجعة', cloudLeave:'يوجد تعديل غير محفوظ. هل تريد تسجيل الخروج وفقدانه؟',
    present:'حاضر', absent:'غائب', excused:'معذور', late:'متأخر', leftEarly:'انصرف مبكراً', session:'رقم الحصة في النسخة الأصلية', admin:'مسؤول الاختبار', teacher:'معلم',
  },
  fr: {
    title:'Katatib · Base de test', notice:'Copie des élèves dans le projet de test katatib-64049. Élèves copiés en lecture seule ; les nouvelles présences sont enregistrées séparément dans V2, dans le projet de test. Ce n’est pas la base du site d’origine.',
    login:'Se connecter avec Google', logout:'Se déconnecter', demo:'Retour aux données fictives', welcome:'Bienvenue dans Katatib', intro:'Connectez-vous pour consulter les élèves autorisés. Les données élèves ne sont pas conservées dans le stockage persistant du navigateur. Un rechargement demande une nouvelle connexion.',
    loading:'Chargement…', denied:'Ce compte n’a pas accès, ou son accès est suspendu. Un administrateur doit lui accorder un accès dans le projet de test.',
    setup:'La connexion n’est pas encore configurée. Activez Google dans Authentication du projet katatib-64049 et autorisez le domaine de ce site.',
    popup:'La fenêtre de connexion n’a pas abouti. Autorisez les fenêtres contextuelles et ouvrez la page dans Chrome, puis réessayez.',
    network:'Connexion au service impossible. Vérifiez Internet puis réessayez.', config:'Impossible de vérifier la configuration du projet de test. Connexion interrompue pour protéger les données.',
    error:'Impossible de charger les données. Vérifiez la connexion et les droits puis réessayez.', retry:'Réessayer', search:'Rechercher un élève', all:'Tous les kuttabs autorisés', count:'élèves chargés', empty:'Aucun élève correspondant.',
    hizbs:'Hizbs mémorisés', age:'Âge', school:'Kuttab', unknown:'Non renseigné', profile:'Voir le profil', close:'Fermer', attendance:'Taux de présence copié', source:'Valeurs issues de la copie ; elles n’ont pas été recalculées.',
    history:'Présences (jusqu’à 20 entrées de la copie)', noHistory:'Aucune présence enregistrée.', historyError:'Impossible de charger les présences.', capped:'La limite de 100 élèves est atteinte pour un périmètre. Certains résultats peuvent manquer.',
    markAttendance:'Présence', studentsTab:'Élèves', cloudAttendance:'Saisir les présences', date:'Date', cloudSession:'Séance', morning:'Matin', afternoon:'Après-midi', evening:'Soir', unmarked:'Non renseigné', cloudNote:'Note', cloudSave:'Enregistrer dans Firebase', cloudSaving:'Enregistrement…', cloudSaved:'Enregistré dans la base de test', cloudUnsaved:'Modifications non enregistrées', cloudNotMarked:'Aucune fiche enregistrée pour cette séance', cloudReload:'Recharger du serveur', cloudHint:'Enregistrez chaque élève séparément. Internet est nécessaire ; une présence non renseignée ne compte pas comme une absence. Choisissez la séance manuellement.', cloudLoadError:'Impossible de charger les présences du serveur. Réessayez.', cloudSaveError:'Enregistrement non confirmé. La modification reste ici ; vérifiez Internet et vos droits puis réessayez.', cloudConflict:'Cette fiche a été modifiée ailleurs et n’a pas été écrasée. Rechargez-la du serveur puis refaites votre modification.', cloudDiscard:'Votre modification non enregistrée sera remplacée par la valeur du serveur. Continuer ?', cloudHistory:'Présences V2 (jusqu’à 20 modifications)', cloudRevision:'Révision', cloudLeave:'Des modifications ne sont pas enregistrées. Se déconnecter et les perdre ?',
    present:'Présent', absent:'Absent', excused:'Excusé', late:'En retard', leftEarly:'Parti tôt', session:'Numéro de séance dans la copie d’origine', admin:'Administrateur du test', teacher:'Enseignant',
  },
};
let language = 'ar', gateway, user = null, students = [], role = '', capped = false, state = 'loading', error = '', search = '', school = '', epoch = 0, historyEpoch = 0, pendingLogin = false;
const t = key => copy[language][key] || copy[language].error;
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const value = n => n == null ? t('unknown') : new Intl.NumberFormat(language === 'ar' ? 'ar-MA' : 'fr-FR', {maximumFractionDigits:2}).format(n);
function errorKey(e) {
  const code = e?.code || e?.message || '';
  if (/wrong-project|config-unavailable/.test(code)) return 'config';
  if (/no-access|permission-denied/.test(code)) return 'denied';
  if (/operation-not-allowed|unauthorized-domain|configuration-not-found/.test(code)) return 'setup';
  if (/popup|cancelled-popup/.test(code)) return 'popup';
  if (/network|unavailable|Failed to fetch/.test(code)) return 'network';
  return 'error';
}
function renderCards() {
  const matches = students.filter(s => (!school || s.kuttab === school) && s.name.toLocaleLowerCase().includes(search.toLocaleLowerCase().trim()));
  return matches.map(s => `<article class="student-card live-student"><h3>${escape(s.name || t('unknown'))}</h3><p>${escape(s.kuttab || t('unknown'))}</p><p>${t('hizbs')}: ${value(s.hizbs)}</p><button class="text-button" data-profile="${escape(s.id)}">${t('profile')}</button></article>`).join('') || `<p class="empty-state">${t('empty')}</p>`;
}
let screen = 'students', cloudContext = {date:businessDate(),session:'morning'}, cloudRows = new Map(), attendanceState = 'idle', attendanceEpoch = 0;
const rowKey = id => attendanceId(id, cloudContext.date, cloudContext.session);
const cloudRow = id => cloudRows.get(rowKey(id));
const rowDirty = row => row && !sameAttendance(row.base,row.draft);
function hasDrafts() {return [...cloudRows.values()].some(rowDirty);}
function hasSaves() {return [...cloudRows.values()].some(row=>row.saving);}
function attendanceControls() {
  return `<div class="live-filter cloud-controls"><label>${t('date')}<input id="cloud-date" type="date" value="${cloudContext.date}" ${hasSaves()?'disabled':''}></label><label>${t('cloudSession')}<select id="cloud-session" ${hasSaves()?'disabled':''}>${CLOUD_SESSIONS.map(s=>`<option value="${s}" ${cloudContext.session===s?'selected':''}>${t(s)}</option>`).join('')}</select></label></div><p class="live-status">${t('cloudHint')}</p>${attendanceState==='loading'?`<p role="status">${t('loading')}</p>`:''}${attendanceState==='error'?`<p class="notice-error" role="alert">${t('cloudLoadError')}</p><button class="secondary-button" data-action="reload-attendance">${t('retry')}</button>`:''}`;
}
function attendanceCards() {
  const matches=students.filter(s=>(!school||s.kuttab===school)&&s.name.toLocaleLowerCase().includes(search.toLocaleLowerCase().trim()));
  return matches.map(s=>{
    const row=cloudRow(s.id);
    if(!row)return `<article class="student-card"><h3>${escape(s.name)}</h3><p>${t('loading')}</p></article>`;
    const saved=row.base.revision>0;
    return `<article class="student-card cloud-card" data-cloud-row="${escape(s.id)}"><h3>${escape(s.name||t('unknown'))}</h3><p>${escape(s.kuttab||t('unknown'))}</p><div class="status-grid" role="group" aria-label="${escape(t('markAttendance')+' · '+s.name)}">${CLOUD_STATUSES.map(status=>`<button class="status-button ${status}" data-cloud-student="${escape(s.id)}" data-cloud-status="${status}" aria-pressed="${row.draft.status===status}" ${row.saving?'disabled':''}>${t(status)}</button>`).join('')}</div><label>${t('cloudNote')}<textarea data-cloud-note="${escape(s.id)}" maxlength="500" ${row.saving?'disabled':''}>${escape(row.draft.note)}</textarea></label><p class="cloud-save-state ${row.error?'live-error':''}" role="status" data-cloud-message="${escape(s.id)}">${t(row.error || (row.saving?'cloudSaving':rowDirty(row)?'cloudUnsaved':saved?'cloudSaved':'cloudNotMarked'))}</p><div class="cloud-buttons"><button class="primary-button" data-cloud-save="${escape(s.id)}" ${row.saving||!rowDirty(row)?'disabled':''}>${t('cloudSave')}</button><button class="secondary-button" data-cloud-reload="${escape(s.id)}" ${row.saving?'disabled':''}>${t('cloudReload')}</button></div></article>`;
  }).join('')||`<p class="empty-state">${t('empty')}</p>`;
}
function renderResults() {return screen==='attendance'?attendanceCards():renderCards();}
async function loadAttendance() {
  if(!user||state!=='ready')return;
  const generation=++attendanceEpoch, authGeneration=epoch;
  const context={...cloudContext};
  attendanceState='loading';render();
  try {
    const records=await gateway.attendance(students.map(s=>s.id),context);
    if(generation!==attendanceEpoch||authGeneration!==epoch||!user)return;
    for(const s of students){
      const key=attendanceId(s.id,context.date,context.session), old=cloudRows.get(key), base=records[s.id];
      if(!old||(!rowDirty(old)&&!old.saving)) cloudRows.set(key,{base:{...base},draft:{status:base.status,note:base.note},saving:false,error:''});
    }
    attendanceState='ready';
  }catch{if(generation!==attendanceEpoch||authGeneration!==epoch)return;attendanceState='error';}
  render();
}
async function saveCloud(id) {
  const row=cloudRow(id);if(!row||row.saving||!rowDirty(row)||!user)return;
  const context={...cloudContext}, generation=epoch;
  const desired={...row.draft}, expected=row.base.revision;
  row.saving=true;row.error='';render();
  try {
    const result=await gateway.saveAttendance(id,context,desired,expected);
    if(generation!==epoch||!user)return;
    row.base={...result};row.draft={status:result.status,note:result.note};
  }catch(e){if(generation!==epoch)return;row.error=e?.code==='conflict'?'cloudConflict':'cloudSaveError';}
  finally{if(generation===epoch){row.saving=false;render();}}
}
async function reloadCloud(id) {
  const row=cloudRow(id);if(!row||row.saving||!user)return;
  if(rowDirty(row)&&!confirm(t('cloudDiscard')))return;
  const context={...cloudContext},generation=epoch,key=rowKey(id);
  row.saving=true;render();
  try{
    const records=await gateway.attendance([id],context);
    if(generation!==epoch||!user)return;
    const base=records[id];cloudRows.set(key,{base:{...base},draft:{status:base.status,note:base.note},saving:false,error:''});
  }catch{if(generation===epoch){row.saving=false;row.error='cloudLoadError';}}
  if(generation===epoch)render();
}

function render() {
  document.documentElement.lang = language; document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr'; document.title = t('title'); root.setAttribute('aria-busy', String(state === 'loading'));
  root.innerHTML = `<header class="live-header"><h1>${t('title')}</h1><div class="live-actions"><div class="language-switch" aria-label="Language / اللغة" role="group"><button data-lang="ar" aria-pressed="${language === 'ar'}">عربي</button><button data-lang="fr" aria-pressed="${language === 'fr'}">FR</button></div>${user ? `<button class="secondary-button" data-action="logout">${t('logout')}</button>` : ''}</div></header><p class="live-notice">${t('notice')}</p><a class="live-link" href="../">${t('demo')}</a>${user ? `<p class="live-account">${escape(user.email || '')}${role ? ` · ${t(role)}` : ''}</p>` : ''}${error ? `<p class="notice-error" role="alert">${t(error)}</p>` : ''}${state === 'ready' ? `<div class="live-actions cloud-tabs" role="group" aria-label="${t('title')}"><button class="secondary-button" data-screen="students" aria-pressed="${screen==='students'}">${t('studentsTab')}</button><button class="secondary-button" data-screen="attendance" aria-pressed="${screen==='attendance'}">${t('cloudAttendance')}</button></div><p class="live-status">${value(students.length)} ${t('count')}</p>${screen==='attendance'?attendanceControls():''}${capped ? `<p class="notice-error">${t('capped')}</p>` : ''}<div class="live-filter"><input type="search" id="live-search" aria-label="${t('search')}" placeholder="${t('search')}" value="${escape(search)}"><select id="live-school" aria-label="${t('school')}"><option value="">${t('all')}</option>${[...new Set(students.map(s=>s.kuttab).filter(Boolean))].sort().map(name => `<option value="${escape(name)}" ${name === school ? 'selected' : ''}>${escape(name)}</option>`).join('')}</select></div><div id="live-students" class="student-cards">${renderResults()}</div>` : `<section class="panel live-panel"><h2>${state === 'loading' ? t('loading') : t('welcome')}</h2><p>${t('intro')}</p>${!user && gateway ? `<button data-action="login" class="primary-button" ${pendingLogin ? 'disabled' : ''}>${t('login')}</button>` : ''}${state === 'error' ? `<button data-action="retry" class="secondary-button">${t('retry')}</button>` : ''}</section>`}`;
}
function clearData() {
  attendanceEpoch++; cloudRows.clear(); attendanceState='idle'; screen='students'; cloudContext={date:businessDate(),session:'morning'};
  epoch++; historyEpoch++; students = []; role = ''; capped = false; search = ''; school = ''; dialog.close(); dialog.replaceChildren();
}
async function loadStudents() {
  if (!user || !gateway) return;
  const generation = ++epoch; state = 'loading'; error = ''; render();
  try {
    const result = await gateway.students(user);
    if (generation !== epoch) return;
    students = result.students; role = result.role; capped = result.capped; state = 'ready';
  } catch (e) { if (generation !== epoch) return; students = []; state = 'error'; error = errorKey(e); }
  render();
}
async function start() {
  state = 'loading'; error = ''; render();
  try {
    // Tests replace the module at the HTTP boundary; there is no production mock bypass.
    const {connect} = await import('./gateway.mjs');
    gateway = await connect();
    gateway.observe(next => { clearData(); user = next; error = ''; if (user) loadStudents(); else { state = 'signed-out'; render(); } });
  } catch (e) { state = 'error'; error = errorKey(e); render(); }
}
let trigger;
async function profile(id, button) {
  const student = students.find(s=>s.id === id); if (!student || !user) return;
  trigger = button; const generation = ++historyEpoch;
  dialog.innerHTML = `<section class="live-profile"><button class="close-button" data-close aria-label="${t('close')}">×</button><h2 id="student-heading">${escape(student.name)}</h2><dl><div><dt>${t('school')}</dt><dd>${escape(student.kuttab || t('unknown'))}</dd></div><div><dt>${t('age')}</dt><dd>${value(student.age)}</dd></div><div><dt>${t('hizbs')}</dt><dd>${value(student.hizbs)}</dd></div><div><dt>${t('attendance')}</dt><dd>${value(student.attendance)}${student.attendance == null ? '' : '%'}</dd></div></dl><p class="live-status">${t('source')}</p><h3>${t('history')}</h3><div id="live-history" role="status">${t('loading')}</div><h3>${t('cloudHistory')}</h3><div id="cloud-history" role="status">${t('loading')}</div></section>`;
  dialog.showModal();
  try {
    const [history, cloudHistory] = await Promise.all([gateway.history(id),gateway.attendanceHistory(id)]);
    if (generation !== historyEpoch || !dialog.open || !user) return;
    document.getElementById('cloud-history').innerHTML=cloudHistory.length?`<ul>${cloudHistory.map(h=>`<li>${escape(h.date)} · ${t(h.session)} · ${escape(copy[language][h.status]||t('unknown'))} · ${t('cloudRevision')} ${value(h.revision)}<p>${escape(h.note)}</p></li>`).join('')}</ul>`:t('noHistory');
    document.getElementById('live-history').innerHTML = history.length ? `<ul>${history.map(h=>`<li>${escape(h.date || t('unknown'))} · ${escape(copy[language][h.status] || t('unknown'))}${h.session == null ? '' : ` · ${t('session')}: ${value(h.session)}`}</li>`).join('')}</ul>` : t('noHistory');
  } catch { if (generation === historyEpoch && dialog.open) for(const id of ['live-history','cloud-history'])document.getElementById(id).textContent = t('historyError'); }
}
dialog.addEventListener('click', e=>{ if(e.target.closest('[data-close]')) dialog.close(); });
dialog.addEventListener('close',()=>{historyEpoch++;dialog.replaceChildren();if(trigger?.isConnected)trigger.focus();});
root.addEventListener('click', async e => {
  const b = e.target.closest('button'); if (!b || b.disabled) return;
  if (b.dataset.screen) {screen=b.dataset.screen;if(screen==='attendance')loadAttendance();else render();}
  else if (b.dataset.cloudStatus) {const row=cloudRow(b.dataset.cloudStudent);if(row&&!row.saving){row.draft.status=b.dataset.cloudStatus;row.error='';render();root.querySelector(`[data-cloud-student="${CSS.escape(b.dataset.cloudStudent)}"][data-cloud-status="${b.dataset.cloudStatus}"]`)?.focus();}}
  else if (b.dataset.cloudSave) saveCloud(b.dataset.cloudSave);
  else if (b.dataset.cloudReload) reloadCloud(b.dataset.cloudReload);
  else if (b.dataset.action==='reload-attendance')loadAttendance();
  else if (b.dataset.lang) { language = b.dataset.lang; render(); }
  else if (b.dataset.profile) profile(b.dataset.profile, b);
  else if (b.dataset.action === 'login') {
    pendingLogin = true; error = ''; render();
    try { await gateway.login(); } catch (e) { error = errorKey(e); } finally { pendingLogin = false; render(); }
  } else if (b.dataset.action === 'logout') {
    if(hasDrafts()&&!confirm(t('cloudLeave')))return;
    clearData(); user = null; state = 'signed-out'; error = ''; render();
    try { await gateway.logout(); } catch { error = 'error'; render(); }
  } else if (b.dataset.action === 'retry') { if (user) loadStudents(); else if (gateway) {state='signed-out';error='';render();} else start(); }
});
root.addEventListener('input', e=>{if(e.target.dataset.cloudNote){const row=cloudRow(e.target.dataset.cloudNote);if(row&&!row.saving){row.draft.note=e.target.value;row.error='';const card=e.target.closest('[data-cloud-row]');card.querySelector('[data-cloud-save]').disabled=!rowDirty(row);card.querySelector('[data-cloud-message]').textContent=t(rowDirty(row)?'cloudUnsaved':row.base.revision?'cloudSaved':'cloudNotMarked');}}else if(e.target.id === 'live-search'){search=e.target.value;document.getElementById('live-students').innerHTML=renderResults();}});
root.addEventListener('change', e=>{if(e.target.id==='cloud-date'||e.target.id==='cloud-session'){const next={...cloudContext,...(e.target.id==='cloud-date'?{date:e.target.value}:{session:e.target.value})};try{attendanceId('validate',next.date,next.session);cloudContext=next;loadAttendance();}catch{render();}}else if(e.target.id === 'live-school'){school=e.target.value;render();}});
window.addEventListener('beforeunload',event=>{if(hasDrafts()||hasSaves()){event.preventDefault();event.returnValue='';}});
// Browser history restoration must not resurrect a previous account's records.
window.addEventListener('pagehide',()=>{clearData();user=null;state='signed-out';render();});
window.addEventListener('pageshow',e=>{if(e.persisted)location.reload();});
start();
