const root = document.getElementById('live-app');
const dialog = document.getElementById('student-dialog');
const copy = {
  ar: {
    title:'كتاتيب · قاعدة الاختبار', notice:'نسخة من بيانات الطلاب في مشروع الاختبار katatib-64049. للقراءة فقط؛ لا تعديل ولا حذف. هذه ليست قاعدة الموقع الأصلي.',
    login:'تسجيل الدخول بحساب Google', logout:'تسجيل الخروج', demo:'العودة إلى المعاينة الوهمية', welcome:'أهلاً بك في كتاتيب', intro:'سجّل الدخول لعرض الطلاب المسموح لك بالاطلاع عليهم. لا يُحفظ سجل الطلاب في تخزين المتصفح الدائم. إعادة تحميل الصفحة تتطلب تسجيل الدخول مجدداً.',
    loading:'جارٍ التحميل…', denied:'هذا الحساب غير مخوّل، أو تم إيقاف وصوله. على المسؤول منحه الوصول في مشروع الاختبار.',
    setup:'تسجيل الدخول غير مفعّل بعد. فعّل Google في Authentication بمشروع katatib-64049 وأضف هذا الموقع إلى النطاقات المصرّح بها.',
    popup:'تعذّر إكمال نافذة الدخول. اسمح بالنوافذ المنبثقة وافتح الصفحة في Chrome ثم حاول مجدداً.',
    network:'تعذّر الاتصال بالخدمة. تحقّق من الإنترنت ثم أعد المحاولة.', config:'تعذّر التحقق من إعداد مشروع الاختبار. تم إيقاف الاتصال لحماية البيانات.',
    error:'تعذّر تحميل البيانات. تحقّق من الاتصال وإعداد الصلاحيات ثم أعد المحاولة.', retry:'إعادة المحاولة', search:'البحث عن طالب', all:'كل الكتاتيب المتاحة', count:'طلاب محمّلون', empty:'لا يوجد طلاب مطابقون.',
    hizbs:'الأحزاب المحفوظة', age:'العمر', school:'الكتّاب', unknown:'غير مسجّل', profile:'عرض الملف', close:'إغلاق', attendance:'نسبة الحضور المنسوخة', source:'هذه قيم من النسخة المنسوخة؛ لم يُعَد حسابها.',
    history:'سجل الحضور (حتى 20 سجلاً من النسخة)', noHistory:'لا يوجد سجل حضور.', historyError:'تعذّر تحميل سجل الحضور.', capped:'تم الوصول إلى حد 100 طالب في إحدى مجموعات الوصول. قد لا تظهر جميع النتائج.',
    present:'حاضر', absent:'غائب', excused:'معذور', late:'متأخر', leftEarly:'انصرف مبكراً', session:'رقم الحصة في النسخة الأصلية', admin:'مسؤول الاختبار', teacher:'معلم',
  },
  fr: {
    title:'Katatib · Base de test', notice:'Copie des élèves dans le projet de test katatib-64049. Lecture seule : aucune modification ni suppression. Ce n’est pas la base du site d’origine.',
    login:'Se connecter avec Google', logout:'Se déconnecter', demo:'Retour aux données fictives', welcome:'Bienvenue dans Katatib', intro:'Connectez-vous pour consulter les élèves autorisés. Les données élèves ne sont pas conservées dans le stockage persistant du navigateur. Un rechargement demande une nouvelle connexion.',
    loading:'Chargement…', denied:'Ce compte n’a pas accès, ou son accès est suspendu. Un administrateur doit lui accorder un accès dans le projet de test.',
    setup:'La connexion n’est pas encore configurée. Activez Google dans Authentication du projet katatib-64049 et autorisez le domaine de ce site.',
    popup:'La fenêtre de connexion n’a pas abouti. Autorisez les fenêtres contextuelles et ouvrez la page dans Chrome, puis réessayez.',
    network:'Connexion au service impossible. Vérifiez Internet puis réessayez.', config:'Impossible de vérifier la configuration du projet de test. Connexion interrompue pour protéger les données.',
    error:'Impossible de charger les données. Vérifiez la connexion et les droits puis réessayez.', retry:'Réessayer', search:'Rechercher un élève', all:'Tous les kuttabs autorisés', count:'élèves chargés', empty:'Aucun élève correspondant.',
    hizbs:'Hizbs mémorisés', age:'Âge', school:'Kuttab', unknown:'Non renseigné', profile:'Voir le profil', close:'Fermer', attendance:'Taux de présence copié', source:'Valeurs issues de la copie ; elles n’ont pas été recalculées.',
    history:'Présences (jusqu’à 20 entrées de la copie)', noHistory:'Aucune présence enregistrée.', historyError:'Impossible de charger les présences.', capped:'La limite de 100 élèves est atteinte pour un périmètre. Certains résultats peuvent manquer.',
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
function render() {
  document.documentElement.lang = language; document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr'; document.title = t('title'); root.setAttribute('aria-busy', String(state === 'loading'));
  root.innerHTML = `<header class="live-header"><h1>${t('title')}</h1><div class="live-actions"><div class="language-switch" aria-label="Language / اللغة" role="group"><button data-lang="ar" aria-pressed="${language === 'ar'}">عربي</button><button data-lang="fr" aria-pressed="${language === 'fr'}">FR</button></div>${user ? `<button class="secondary-button" data-action="logout">${t('logout')}</button>` : ''}</div></header><p class="live-notice">${t('notice')}</p><a class="live-link" href="../">${t('demo')}</a>${user ? `<p class="live-account">${escape(user.email || '')}${role ? ` · ${t(role)}` : ''}</p>` : ''}${error ? `<p class="notice-error" role="alert">${t(error)}</p>` : ''}${state === 'ready' ? `<p class="live-status">${value(students.length)} ${t('count')}</p>${capped ? `<p class="notice-error">${t('capped')}</p>` : ''}<div class="live-filter"><input type="search" id="live-search" aria-label="${t('search')}" placeholder="${t('search')}" value="${escape(search)}"><select id="live-school" aria-label="${t('school')}"><option value="">${t('all')}</option>${[...new Set(students.map(s=>s.kuttab).filter(Boolean))].sort().map(name => `<option value="${escape(name)}" ${name === school ? 'selected' : ''}>${escape(name)}</option>`).join('')}</select></div><div id="live-students" class="student-cards">${renderCards()}</div>` : `<section class="panel live-panel"><h2>${state === 'loading' ? t('loading') : t('welcome')}</h2><p>${t('intro')}</p>${!user && gateway ? `<button data-action="login" class="primary-button" ${pendingLogin ? 'disabled' : ''}>${t('login')}</button>` : ''}${state === 'error' ? `<button data-action="retry" class="secondary-button">${t('retry')}</button>` : ''}</section>`}`;
}
function clearData() {
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
  dialog.innerHTML = `<section class="live-profile"><button class="close-button" data-close aria-label="${t('close')}">×</button><h2 id="student-heading">${escape(student.name)}</h2><dl><div><dt>${t('school')}</dt><dd>${escape(student.kuttab || t('unknown'))}</dd></div><div><dt>${t('age')}</dt><dd>${value(student.age)}</dd></div><div><dt>${t('hizbs')}</dt><dd>${value(student.hizbs)}</dd></div><div><dt>${t('attendance')}</dt><dd>${value(student.attendance)}${student.attendance == null ? '' : '%'}</dd></div></dl><p class="live-status">${t('source')}</p><h3>${t('history')}</h3><div id="live-history" role="status">${t('loading')}</div></section>`;
  dialog.showModal();
  try {
    const history = await gateway.history(id);
    if (generation !== historyEpoch || !dialog.open || !user) return;
    document.getElementById('live-history').innerHTML = history.length ? `<ul>${history.map(h=>`<li>${escape(h.date || t('unknown'))} · ${escape(copy[language][h.status] || t('unknown'))}${h.session == null ? '' : ` · ${t('session')}: ${value(h.session)}`}</li>`).join('')}</ul>` : t('noHistory');
  } catch { if (generation === historyEpoch && dialog.open) document.getElementById('live-history').textContent = t('historyError'); }
}
dialog.addEventListener('click', e=>{ if(e.target.closest('[data-close]')) dialog.close(); });
dialog.addEventListener('close',()=>{historyEpoch++;dialog.replaceChildren();if(trigger?.isConnected)trigger.focus();});
root.addEventListener('click', async e => {
  const b = e.target.closest('button'); if (!b || b.disabled) return;
  if (b.dataset.lang) { language = b.dataset.lang; render(); }
  else if (b.dataset.profile) profile(b.dataset.profile, b);
  else if (b.dataset.action === 'login') {
    pendingLogin = true; error = ''; render();
    try { await gateway.login(); } catch (e) { error = errorKey(e); } finally { pendingLogin = false; render(); }
  } else if (b.dataset.action === 'logout') {
    clearData(); user = null; state = 'signed-out'; error = ''; render();
    try { await gateway.logout(); } catch { error = 'error'; render(); }
  } else if (b.dataset.action === 'retry') { if (user) loadStudents(); else if (gateway) {state='signed-out';error='';render();} else start(); }
});
root.addEventListener('input', e=>{if(e.target.id === 'live-search'){search=e.target.value;document.getElementById('live-students').innerHTML=renderCards();}});
root.addEventListener('change', e=>{if(e.target.id === 'live-school'){school=e.target.value;render();}});
// Browser history restoration must not resurrect a previous account's records.
window.addEventListener('pagehide',()=>{clearData();user=null;state='signed-out';render();});
window.addEventListener('pageshow',e=>{if(e.persisted)location.reload();});
start();
