import {createPriorities} from './priorities-ui.mjs';
const priorities=createPriorities();
import {interfaceCopy,navigationGroups,navigationIcon} from './interface.mjs';
import {createOfflineGateway} from './offline-gateway.mjs';
import {createOfflineControls,offlineLabels} from './offline-ui.mjs';
const offlineControls=createOfflineControls();
let offlineObservedPending=0;
function offlineChanged(s){offlineControls.paint();const finished=offlineObservedPending>0&&s.pending===0&&!s.syncing;offlineObservedPending=s.pending;if(finished&&state==='ready'&&!hasSaves()&&!hasDrafts())void refreshDeviceData().catch(()=>{});}
import { loginOptions, studentLoginLabels } from './student-login-ui.mjs';
import { english } from './english.mjs';
import { readinessLabels } from './readiness.mjs';
import { rosterPage } from './roster.mjs';
import { legacyLabels } from './legacy.mjs';
import { createLocalRecorder, recorderLabels } from './recorder.mjs';
const localRecorder=createLocalRecorder();
import { createWorkspace, workspaceLabels } from './workspace.mjs';
const workspace = createWorkspace();
import { learningProgress } from './progress.mjs';
import { LEARNING_KINDS, cleanLearning, currentLearning, isGradedLearning } from './learning.mjs';
import { businessDate, CLOUD_STATUSES, CLOUD_SESSIONS, attendanceId, sameAttendance } from './attendance.mjs';
const root = document.getElementById('live-app');
const dialog = document.getElementById('student-dialog');
const copy = {
  ar: {
    brand:'كتاتيب', brandCaption:'مساحة للحفظ والنمو', workspaceTitle:'مساحتك', testBadge:'نسخة تجريبية', today:'اليوم', greeting:'أهلاً،', todayKicker:'كل جلسة، خطوة إلى الأمام', todayHero:'جلسة هادئة، وتقدّم واضح.', todayIntro:'طلابك وحضورهم وتعلّمهم في مكان واحد.', authorizedRoster:'الطلاب المسموح لك بمتابعتهم', authorizedGroups:'الكتاتيب الظاهرة في قائمتك', draftsTitle:'مسودات غير محفوظة', draftsCaption:'في علامة التبويب الحالية', rosterSubtitle:'اختر طالباً لمتابعة الحفظ والحضور وسجل التعلم.', viewAll:'عرض جميع الطلاب', attendanceSubtitle:'سجّل الحضور والملاحظات لكل طالب وحصة.', learningSubtitle:'حفظ مثبت، تثبيت، مراجعة وتقييم مع تاريخ واضح.', loginHero:'كل طالب، وخطوته القادمة.', loginStory:'مساحة واحدة لمتابعة الحضور والحفظ والمراجعة. سجّل الدخول لتبدأ مع طلابك.',
    title:'كتاتيب', notice:'هذه نسخة اختبار ببيانات منسوخة. ما تحفظه هنا لا يغيّر الموقع الأصلي.',
    login:'تسجيل الدخول بحساب Google', logout:'تسجيل الخروج', demo:'العودة إلى المعاينة الوهمية', welcome:'أهلاً بك في كتاتيب', intro:'سجّل الدخول لعرض الطلاب المسموح لك بالاطلاع عليهم. يبقى الدخول في علامة التبويب هذه افتراضياً. إذا جهّزت جهازك الخاص للعمل دون اتصال، يبقى الدخول والطلاب المحملون على الجهاز حتى تزيل البيانات أو تسجل الخروج. سجّل الخروج عند الانتهاء.',
    loading:'جارٍ التحميل…', denied:'هذا الحساب غير مخوّل، أو تم إيقاف وصوله. على المسؤول منحه الوصول في مشروع الاختبار.',
    setup:'تسجيل الدخول غير مفعّل بعد. فعّل Google في Authentication بمشروع katatib-64049 وأضف هذا الموقع إلى النطاقات المصرّح بها.',
    popup:'تعذّر إكمال نافذة الدخول. اسمح بالنوافذ المنبثقة وافتح الصفحة في Chrome ثم حاول مجدداً.',
    network:'تعذّر الاتصال بالخدمة. تحقّق من الإنترنت ثم أعد المحاولة.', config:'تعذّر التحقق من إعداد مشروع الاختبار. تم إيقاف الاتصال لحماية البيانات.',
    error:'تعذّر تحميل البيانات. تحقّق من الاتصال وإعداد الصلاحيات ثم أعد المحاولة.', retry:'إعادة المحاولة', search:'البحث عن طالب', all:'كل الكتاتيب المتاحة', count:'طلاب محمّلون', empty:'لا يوجد طلاب مطابقون.',
    hizbs:'الرصيد السابق (أحزاب)', age:'العمر', school:'الكتّاب', unknown:'غير مسجّل', profile:'عرض الملف', close:'إغلاق', attendance:'نسبة الحضور المنسوخة', source:'هذه قيم من النسخة المنسوخة؛ لم يُعَد حسابها.',
    history:'سجل الحضور من النسخة الأصلية', noHistory:'لا يوجد سجل حضور.', historyError:'تعذّر تحميل سجل الحضور.', capped:'تم الوصول إلى حد 100 طالب في إحدى مجموعات الوصول. قد لا تظهر جميع النتائج.',
    practice:'يحتاج تثبيت', confirmMastery:'أؤكد أن الطالب أتقن هذا المقطع', masteryHint:'الحفظ المثبت فقط يزيد التقدم. المحاولة غير المكتملة تُسجّل «يحتاج تثبيت».', progressTitle:'تقدم الحفظ', baselineLabel:'رصيد V1 المنسوخ (أحزاب)', trackedLabel:'حفظ مثبت محدد بالمقاطع في V2 (أحزاب)', eighthsLabel:'أثمان فريدة', practiceLabel:'أثمان لها محاولات تثبيت', revisionCount:'سجلات المراجعة الحالية', evaluationCount:'سجلات التقييم الحالية', baselineUnknown:'لا يحدد الرصيد القديم المقاطع المحفوظة، لذلك لا نجمعه مع V2 كي لا نكرر احتسابها.', trackedOnly:'الشريط يخص مقاطع V2 المثبتة فقط من 60 حزباً.', unreviewedLabel:'سجلات حفظ سابقة تحتاج تأكيد المعلم؛ لم تُحتسب في تقدم V2', progressConflict:'توجد تعديلات متعارضة؛ استُبعدت من الحساب حتى مراجعتها.', oldLearningLabel:'يحتاج مراجعة المعلم قبل احتسابه',
    learningTab:'الحفظ والتقييم', learningTitle:'تسجيل التعلم', learningHint:'حدد الحزب والثمن من 1 إلى 8 داخل الحزب نفسه. للمقاطع الممتدة على حزبين، سجّل كل حزب على حدة.', learningStudent:'الطالب', chooseStudent:'اختر الطالب', learningType:'نوع السجل', memorization:'حفظ مثبت', revision:'مراجعة', evaluation:'تقييم', learningHizb:'الحزب', learningFrom:'من الثمن', learningTo:'إلى الثمن', learningMistakes:'عدد الأخطاء', learningScore:'تقدير المعلم من 100', learningScoreHint:'التقدير يدخله المعلم؛ لا توجد معادلة نقاط تلقائية. يُحسب تقدم V2 من المقاطع المثبتة الفريدة، مع إبقاء رصيد V1 منفصلاً.', learningHistory:'سجل التعلم', learningNoHistory:'لا توجد سجلات معروضة. اختر طالباً لعرض سجلاته.', learningSaved:'تم حفظ السجل في قاعدة الاختبار.', learningInvalid:'تحقق من الطالب والتاريخ ونطاق الأثمان والأخطاء والتقدير.', learningRetry:'إعادة محاولة حفظ السجل نفسه', learningSaveError:'لم يُؤكد الحفظ. احتُفظ بالسجل دون تغيير لتتمكن من إعادة المحاولة من دون تكرار. يلزم الاتصال والصلاحيات.', learningConflict:'معرّف هذا السجل محفوظ بمحتوى مختلف. لم يُستبدل. راجع سجل الطالب قبل المتابعة.', learningCorrect:'تعديل', learningCorrection:'تعديل سجل موجود. بعد الحفظ ستظهر المعلومات المحدّثة في السجل نفسه.', learningCorrected:'سجل التعديلات', learningPrevious:'نسخة سابقة', learningCompeting:'توجد تعديلات متزامنة مختلفة. راجع سجل التعديلات.', learningUpdate:'حفظ التعديل', learningCancel:'إلغاء التصحيح', learningDiscard:'هل تريد استبدال مسودة التعلم غير المحفوظة؟',
    markAttendance:'الحضور', studentsTab:'الطلاب', cloudAttendance:'تسجيل الحضور', date:'التاريخ', cloudSession:'الحصة', morning:'الصباحية', afternoon:'المسائية', evening:'الليلية', unmarked:'لم يسجّل', cloudNote:'ملاحظة', cloudSave:'حفظ', cloudSaving:'جارٍ الحفظ…', cloudSaved:'محفوظ في موقع التجربة', cloudUnsaved:'تغييرات لم تُحفظ بعد', cloudNotMarked:'لم يُحفظ سجل لهذه الحصة', cloudReload:'تحديث من الخادم', cloudHint:'احفظ حضور كل طالب على حدة. دون اتصال، يلزم تجهيز هذا التاريخ مسبقاً. انتظر تأكيد المزامنة؛ لا تُحسب الحالات غير المسجلة غياباً. اختر الحصة يدوياً.', cloudLoadError:'تعذّر تحميل الحضور من الخادم. حاول مجدداً.', cloudSaveError:'لم يتم تأكيد الحفظ. احتُفظ بالتعديل هنا؛ تحقّق من الاتصال والصلاحيات ثم أعد المحاولة.', cloudConflict:'عُدّل هذا السجل من مكان آخر. لم يُستبدل. حدّثه من الخادم ثم أعد التعديل.', cloudDiscard:'سيُستبدل تعديلك غير المحفوظ بالقيمة الموجودة في الخادم. هل تتابع؟', cloudHistory:'سجل تعديلات الحضور V2', cloudRevision:'مراجعة', cloudLeave:'يوجد تعديل غير محفوظ. هل تريد تسجيل الخروج وفقدانه؟',
    present:'حاضر', absent:'غائب', excused:'معذور', late:'متأخر', leftEarly:'انصرف مبكراً', session:'رقم الحصة في النسخة الأصلية', admin:'مسؤول الاختبار', teacher:'معلم',
  },
  fr: {
    brand:'Katatib', brandCaption:'Apprendre, un jour à la fois', workspaceTitle:'Votre espace', testBadge:'Version de test', today:'Aujourd’hui', greeting:'Bonjour,', todayKicker:'Une séance, un pas de plus', todayHero:'Une séance sereine, des progrès visibles.', todayIntro:'Vos élèves, leurs présences et leurs apprentissages, au même endroit.', authorizedRoster:'Élèves que vous pouvez accompagner', authorizedGroups:'Kuttabs présents dans votre liste', draftsTitle:'Brouillons non enregistrés', draftsCaption:'Dans cet onglet', rosterSubtitle:'Choisissez un élève pour suivre ses acquis, présences et apprentissages.', viewAll:'Voir tous les élèves', attendanceSubtitle:'Notez les présences et remarques de chaque élève et séance.', learningSubtitle:'Mémorisation, consolidation, révision et évaluation avec un historique clair.', loginHero:'Chaque élève, sa prochaine étape.', loginStory:'Un seul espace pour suivre les présences, la mémorisation et les révisions. Connectez-vous pour retrouver vos élèves.',
    title:'Katatib', notice:'Version de test avec une copie des données. Vos saisies ici ne modifient pas le site d’origine.',
    login:'Se connecter avec Google', logout:'Se déconnecter', demo:'Retour aux données fictives', welcome:'Bienvenue dans Katatib', intro:'Connectez-vous pour consulter les élèves autorisés. La connexion reste dans cet onglet par défaut. Si vous préparez votre appareil personnel hors ligne, sa connexion et les élèves téléchargés restent sur cet appareil jusqu’à suppression ou déconnexion. Déconnectez-vous à la fin.',
    loading:'Chargement…', denied:'Ce compte n’a pas accès, ou son accès est suspendu. Un administrateur doit lui accorder un accès dans le projet de test.',
    setup:'La connexion n’est pas encore configurée. Activez Google dans Authentication du projet katatib-64049 et autorisez le domaine de ce site.',
    popup:'La fenêtre de connexion n’a pas abouti. Autorisez les fenêtres contextuelles et ouvrez la page dans Chrome, puis réessayez.',
    network:'Connexion au service impossible. Vérifiez Internet puis réessayez.', config:'Impossible de vérifier la configuration du projet de test. Connexion interrompue pour protéger les données.',
    error:'Impossible de charger les données. Vérifiez la connexion et les droits puis réessayez.', retry:'Réessayer', search:'Rechercher un élève', all:'Tous les kuttabs autorisés', count:'élèves chargés', empty:'Aucun élève correspondant.',
    hizbs:'Acquis antérieurs (hizbs)', age:'Âge', school:'Kuttab', unknown:'Non renseigné', profile:'Voir le profil', close:'Fermer', attendance:'Taux de présence copié', source:'Valeurs issues de la copie ; elles n’ont pas été recalculées.',
    history:'Présences de la copie d’origine', noHistory:'Aucune présence enregistrée.', historyError:'Impossible de charger les présences.', capped:'La limite de 100 élèves est atteinte pour un périmètre. Certains résultats peuvent manquer.',
    practice:'À consolider', confirmMastery:'Je confirme que cet élève maîtrise cette portion', masteryHint:'Seule la mémorisation confirmée augmente la progression. Une tentative incomplète se note «À consolider».', progressTitle:'Progression de mémorisation', baselineLabel:'Acquis V1 copiés (hizbs)', trackedLabel:'Portions V2 confirmées (hizbs)', eighthsLabel:'huitièmes uniques', practiceLabel:'Huitièmes avec tentatives de consolidation', revisionCount:'Fiches de révision actuelles', evaluationCount:'Fiches d’évaluation actuelles', baselineUnknown:'Les acquis anciens ne précisent pas les portions. Ils ne sont pas additionnés à V2 pour éviter les doublons.', trackedOnly:'La barre représente uniquement les portions V2 confirmées sur 60 hizbs.', unreviewedLabel:'anciennes fiches de mémorisation à confirmer ; exclues de la progression V2', progressConflict:'Des modifications concurrentes sont exclues du calcul en attendant leur vérification.', oldLearningLabel:'À vérifier par le professeur avant comptage',
    learningTab:'Apprentissage', learningTitle:'Saisir un apprentissage', learningHint:'Choisissez un hizb et les huitièmes 1 à 8 dans ce même hizb. Pour deux hizbs, saisissez une fiche par hizb.', learningStudent:'Élève', chooseStudent:'Choisir un élève', learningType:'Type de fiche', memorization:'Mémorisation confirmée', revision:'Révision', evaluation:'Évaluation', learningHizb:'Hizb', learningFrom:'Du huitième', learningTo:'Au huitième', learningMistakes:'Nombre d’erreurs', learningScore:'Note du professeur sur 100', learningScoreHint:'La note est saisie par le professeur, sans formule automatique. V2 compte les portions confirmées uniques en gardant les acquis V1 séparés.', learningHistory:'Apprentissages', learningNoHistory:'Aucune fiche affichée. Choisissez un élève pour consulter ses fiches.', learningSaved:'Fiche enregistrée dans la base de test.', learningInvalid:'Vérifiez l’élève, la date, les huitièmes, les erreurs et la note.', learningRetry:'Réessayer la même fiche', learningSaveError:'Enregistrement non confirmé. La fiche reste inchangée pour réessayer sans doublon. Vérifiez Internet et vos droits.', learningConflict:'Cet identifiant contient déjà une fiche différente. Elle n’a pas été écrasée. Consultez l’historique de l’élève.', learningCorrect:'Modifier', learningCorrection:'Modification d’une fiche existante. Après enregistrement, la fiche affichera les informations actualisées.', learningCorrected:'Historique des modifications', learningPrevious:'Version précédente', learningCompeting:'Des modifications concurrentes existent. Consultez l’historique.', learningUpdate:'Enregistrer la modification', learningCancel:'Annuler la correction', learningDiscard:'Remplacer le brouillon d’apprentissage non enregistré ?',
    markAttendance:'Présence', studentsTab:'Élèves', cloudAttendance:'Saisir les présences', date:'Date', cloudSession:'Séance', morning:'Matin', afternoon:'Après-midi', evening:'Soir', unmarked:'Non renseigné', cloudNote:'Note', cloudSave:'Enregistrer', cloudSaving:'Enregistrement…', cloudSaved:'Enregistré dans la base de test', cloudUnsaved:'Modifications non enregistrées', cloudNotMarked:'Aucune fiche enregistrée pour cette séance', cloudReload:'Recharger du serveur', cloudHint:'Enregistrez chaque élève séparément. Hors ligne, préparez cette date à l’avance et attendez la confirmation de synchronisation ; une présence non renseignée n’est pas une absence. Choisissez la séance manuellement.', cloudLoadError:'Impossible de charger les présences du serveur. Réessayez.', cloudSaveError:'Enregistrement non confirmé. La modification reste ici ; vérifiez Internet et vos droits puis réessayez.', cloudConflict:'Cette fiche a été modifiée ailleurs et n’a pas été écrasée. Rechargez-la du serveur puis refaites votre modification.', cloudDiscard:'Votre modification non enregistrée sera remplacée par la valeur du serveur. Continuer ?', cloudHistory:'Historique des présences V2', cloudRevision:'Révision', cloudLeave:'Des modifications ne sont pas enregistrées. Se déconnecter et les perdre ?',
    present:'Présent', absent:'Absent', excused:'Excusé', late:'En retard', leftEarly:'Parti tôt', session:'Numéro de séance dans la copie d’origine', admin:'Administrateur du test', teacher:'Enseignant',
  },
};
copy.en=english;
let allStudents = [];
let language = 'ar', gateway, user = null, students = [], role = '', capped = false, state = 'loading', error = '', search = '', school = '', epoch = 0, historyEpoch = 0, pendingLogin = false, loginTab='staff';
const t = key => (['cloudSaved','learningSaved'].includes(key)&&gateway?.offlinePending?.()>0?offlineLabels[language].localSaved:null)||offlineLabels[language][key]||copy[language][key] || studentLoginLabels[language][key] || workspaceLabels[language][key] || legacyLabels[language][key] || readinessLabels[language][key] || recorderLabels[language][key] || copy[language].error;
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const value = (n,precision=2) => n == null ? t('unknown') : new Intl.NumberFormat(language === 'ar' ? 'ar-MA' : language==='en'?'en-GB':'fr-FR', {maximumFractionDigits:precision}).format(n);
function errorKey(e) {
  const code = e?.code || e?.message || '';
  if (/wrong-project|config-unavailable/.test(code)) return 'config';
  if (/no-access|permission-denied/.test(code)) return 'denied';
  if (/operation-not-allowed|unauthorized-domain|configuration-not-found/.test(code)) return 'setup';
  if (/popup|cancelled-popup/.test(code)) return 'popup';
  if (/network|unavailable|Failed to fetch/.test(code)) return 'network';
  return 'error';
}
let rosterIndex=0;
const pageView=()=>rosterPage(students,{search,school,page:rosterIndex});
function rosterPager(){const p=pageView();return p.pages>1?`<nav class="roster-pager" aria-label="${t('studentsTab')}"><button type="button" class="secondary-button" data-roster-page="${p.page-1}" ${p.page===0?'disabled':''}>${t('previous')}</button><span>${p.from}–${p.to} / ${p.total}</span><button type="button" class="secondary-button" data-roster-page="${p.page+1}" ${p.page+1>=p.pages?'disabled':''}>${t('next')}</button></nav>`:'';}
function renderCards() {
 return (pageView().rows.map(studentCard).join('')||`<p class="empty-state">${t('empty')}</p>`)+rosterPager();
}
function updateRoster(){const target=document.getElementById('live-students');if(target)target.innerHTML=renderResults();const status=document.getElementById('attendance-loading');if(status)status.textContent=attendanceState==='loading'?t('loading'):'';}
let screen = 'today', cloudContext = {date:businessDate(),session:'morning'}, cloudRows = new Map(), attendanceState = 'idle', attendanceEpoch = 0;
const rowKey = id => attendanceId(id, cloudContext.date, cloudContext.session);
const cloudRow = id => cloudRows.get(rowKey(id));
const rowDirty = row => row && !sameAttendance(row.base,row.draft);
function hasDrafts() {return localRecorder.dirty()||workspace.dirty()||learningTouched||!!learningPending||[...cloudRows.values()].some(rowDirty);}
function hasSaves() {return localRecorder.busy()||workspace.busy()||learningSaving||[...cloudRows.values()].some(row=>row.saving);}
function attendanceControls() {
  return `<div class="live-filter cloud-controls"><label>${t('date')}<input id="cloud-date" type="date" value="${cloudContext.date}" ${hasSaves()?'disabled':''}></label><label>${t('cloudSession')}<select id="cloud-session" ${hasSaves()?'disabled':''}>${CLOUD_SESSIONS.map(s=>`<option value="${s}" ${cloudContext.session===s?'selected':''}>${t(s)}</option>`).join('')}</select></label></div><p class="live-status">${t('cloudHint')}</p><p id="attendance-loading" role="status">${attendanceState==='loading'?t('loading'):''}</p>`;
}
function attendanceCards() {
  const matches=pageView().rows;
  return (attendanceState==='error'?`<p class="notice-error" role="alert">${t('cloudLoadError')}</p><button class="secondary-button" data-action="reload-attendance">${t('retry')}</button>`:'')+matches.map(s=>{
    const row=cloudRow(s.id);
    if(!row)return `<article class="student-card"><h3>${escape(s.name)}</h3><p>${t('loading')}</p></article>`;
    const saved=row.base.revision>0;
    return `<article class="student-card cloud-card" data-cloud-row="${escape(s.id)}"><h3>${escape(s.name||t('unknown'))}</h3><p>${escape(s.kuttab||t('unknown'))}</p><div class="status-grid" role="group" aria-label="${escape(t('markAttendance')+' · '+s.name)}">${CLOUD_STATUSES.map(status=>`<button class="status-button ${status}" data-cloud-student="${escape(s.id)}" data-cloud-status="${status}" aria-pressed="${row.draft.status===status}" ${row.saving?'disabled':''}>${t(status)}</button>`).join('')}</div><label>${t('cloudNote')}<textarea data-cloud-note="${escape(s.id)}" maxlength="500" ${row.saving?'disabled':''}>${escape(row.draft.note)}</textarea></label><p class="cloud-save-state ${row.error?'live-error':''}" role="status" data-cloud-message="${escape(s.id)}">${t(row.error || (row.saving?'cloudSaving':rowDirty(row)?'cloudUnsaved':row.base.queued?'localSaved':saved?'cloudSaved':'cloudNotMarked'))}</p><div class="cloud-buttons"><button class="primary-button" data-cloud-save="${escape(s.id)}" ${row.saving||!rowDirty(row)?'disabled':''}>${t('cloudSave')}</button><button class="secondary-button" data-cloud-reload="${escape(s.id)}" ${row.saving?'disabled':''}>${t('cloudReload')}</button></div></article>`;
  }).join('')+rosterPager()||`<p class="empty-state">${t('empty')}</p>`;
}
function renderResults() {return screen==='learning'?learningView():screen==='attendance'?attendanceCards():renderCards();}
async function loadAttendance(soft=false) {
  if(!user||state!=='ready')return;
  const generation=++attendanceEpoch, authGeneration=epoch;
  const context={...cloudContext},visible=pageView().rows;
  attendanceState='loading';if(soft)updateRoster();else render();
  try {
    const records=await gateway.attendance(visible.map(s=>s.id),context);
    if(generation!==attendanceEpoch||authGeneration!==epoch||!user)return;
    for(const s of visible){
      const key=attendanceId(s.id,context.date,context.session), old=cloudRows.get(key), base=records[s.id];
      if(!old||(!rowDirty(old)&&!old.saving)) cloudRows.set(key,{base:{...base},draft:{status:base.status,note:base.note},saving:false,error:''});
    }
    attendanceState='ready';
  }catch{if(generation!==attendanceEpoch||authGeneration!==epoch)return;attendanceState='error';}
  if(screen==='attendance')updateRoster();
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

let learningForm=blankLearning(), learningRecords=[], learningState='idle', learningError='', learningSaved=false, learningSaving=false, learningPending=null, learningEpoch=0, learningTouched=false;
function blankLearning(studentId='',kind='memorization') {return {studentId,kind,date:businessDate(),session:'morning',hizb:'',fromEighth:1,toEighth:1,mistakes:'',score:'',note:'',supersedesId:null,confirmMastered:false};}
function learningOptions(values,current) {return values.map(x=>`<option value="${escape(x)}" ${String(x)===String(current)?'selected':''}>${value(x)}</option>`).join('');}
function learningView() {
  const form=learningForm, locked=!!learningPending, busy=learningSaving;
  const selected=students.find(s=>s.id===form.studentId);
  return `<section class="panel learning-panel"><h2>${t('learningTitle')}</h2><p class="live-status">${t('learningHint')}</p><p class="live-status">${t('masteryHint')}</p>${form.supersedesId?`<p class="live-notice">${t('learningCorrection')}</p>`:''}${learningSaved?`<p class="live-notice" role="status">${t('learningSaved')}</p>`:''}${learningError?`<p class="notice-error" role="alert">${t(learningError)}</p>`:''}<form id="learning-form"><fieldset ${locked?'disabled':''}><div class="learning-fields"><label>${t('learningStudent')}<select id="learning-student" name="studentId" required ${form.supersedesId?'disabled':''}><option value="">${t('chooseStudent')}</option>${students.map(s=>`<option value="${escape(s.id)}" ${s.id===form.studentId?'selected':''}>${escape(s.name)} · ${escape(s.kuttab||t('unknown'))}</option>`).join('')}</select></label><label>${t('learningType')}<select name="kind" ${form.supersedesId&&isGradedLearning(form.kind)?'disabled':''}>${(form.supersedesId?isGradedLearning(form.kind)?[form.kind]:['memorization','practice']:LEARNING_KINDS).map(k=>`<option value="${k}" ${k===form.kind?'selected':''}>${t(k)}</option>`).join('')}</select></label><label>${t('date')}<input name="date" type="date" value="${form.date}" required></label><label>${t('cloudSession')}<select name="session">${CLOUD_SESSIONS.map(s=>`<option value="${s}" ${s===form.session?'selected':''}>${t(s)}</option>`).join('')}</select></label><label>${t('learningHizb')}<input name="hizb" type="number" min="1" max="60" step="1" value="${form.hizb}" required></label><label>${t('learningFrom')}<select name="fromEighth">${learningOptions([1,2,3,4,5,6,7,8],form.fromEighth)}</select></label><label>${t('learningTo')}<select name="toEighth">${learningOptions([1,2,3,4,5,6,7,8],form.toEighth)}</select></label>${!isGradedLearning(form.kind)?'':`<label>${t('learningMistakes')}<input name="mistakes" type="number" min="0" max="999" step="1" value="${form.mistakes}" required></label><label>${t('learningScore')}<input name="score" type="number" min="0" max="100" step="1" value="${form.score}" required></label>`}</div>${form.kind==='memorization'?`<label class="mastery-check"><input type="checkbox" name="confirmMastered" required ${form.confirmMastered?'checked':''}>${t('confirmMastery')}</label>`:''}<label class="learning-note">${t('cloudNote')}<textarea name="note" maxlength="500">${escape(form.note)}</textarea></label></fieldset><div class="learning-buttons"><button type="submit" class="primary-button" ${busy?'disabled':''}>${t(busy?'cloudSaving':locked?'learningRetry':form.supersedesId?'learningUpdate':'cloudSave')}</button>${!locked&&form.supersedesId?`<button type="button" class="secondary-button" data-action="cancel-correction">${t('learningCancel')}</button>`:''}</div></form><p class="live-status">${t('learningScoreHint')}</p></section><section class="panel learning-panel" id="learning-history-panel">${learningHistoryPanel()}</section>`;
}
function learningHistoryPanel(){const selected=students.find(s=>s.id===learningForm.studentId);return `<h2>${t('learningHistory')}</h2>${selected?`<p class="live-account">${escape(selected.name)}</p>`:''}${learningState==='ready'?progressView(selected,learningRecords):''}${learningState==='loading'?`<p role="status">${t('loading')}</p>`:learningState==='error'?`<p class="notice-error" role="alert">${t('historyError')}</p><button class="secondary-button" data-action="learning-reload">${t('retry')}</button>`:learningHistoryList(learningRecords,true)}`;}

function progressView(student,records) {
  const p=learningProgress(records,student?.hizbs??null);
  return `<section class="learning-progress" aria-label="${t('progressTitle')}" data-progress><h3>${t('progressTitle')}</h3><dl><div><dt>${t('baselineLabel')}</dt><dd data-baseline-hizbs>${value(p.baselineHizbs)}</dd></div><div><dt>${t('trackedLabel')}</dt><dd data-confirmed-hizbs>${value(p.confirmedHizbs,3)}</dd><small><span data-confirmed-eighths>${value(p.confirmedEighths)}</span> ${t('eighthsLabel')}</small></div><div><dt>${t('practiceLabel')}</dt><dd data-practice-eighths>${value(p.practiceEighths)}</dd></div><div><dt>${t('revisionCount')}</dt><dd>${value(p.revisions)}</dd></div><div><dt>${t('evaluationCount')}</dt><dd>${value(p.evaluations)}</dd></div></dl><div class="progress-track" role="progressbar" aria-label="${t('trackedOnly')}" aria-valuemin="0" aria-valuemax="480" aria-valuenow="${p.confirmedEighths}"><span style="width:${p.confirmedPercent}%"></span></div><p>${t('trackedOnly')}</p>${p.baselineHizbs!==0?`<p>${t('baselineUnknown')}</p>`:''}${p.unreviewed?`<p class="notice-error">${value(p.unreviewed)} ${t('unreviewedLabel')}</p>`:''}${p.conflicts?`<p class="notice-error" role="alert">${t('progressConflict')}</p>`:''}</section>`;
}
function learningDetails(r) {
  return `<strong>${t(r.kind)} · ${escape(r.date)} · ${t(r.session)}</strong><p>${t('learningHizb')} ${value(r.hizb)} · ${t('learningFrom')} ${value(r.fromEighth)} · ${t('learningTo')} ${value(r.toEighth)}</p>${r.score==null?'':`<p>${t('learningMistakes')}: ${value(r.mistakes)} · ${t('learningScore')}: ${value(r.score)}</p>`}<p>${escape(r.note)}</p>${r.kind==='memorization'&&r.schemaVersion!==2?`<small>${t('oldLearningLabel')}</small>`:''}`;
}
function learningHistoryList(records,corrections=false) {
  if(!records.length)return `<p class="live-status">${t('learningNoHistory')}</p>`;
  const current=currentLearning(records);
  return `<ul class="learning-history">${current.map(r=>`<li class="learning-record" data-learning-record="${escape(r.id)}">${learningDetails(r)}${r.competingEdits?`<p class="notice-error" role="alert">${t('learningCompeting')}</p>`:''}${r.previousVersions.length?`<details class="learning-versions"><summary>${t('learningCorrected')} (${value(r.previousVersions.length)})</summary>${r.previousVersions.map(prior=>`<div class="learning-previous"><small>${t('learningPrevious')}</small>${learningDetails(prior)}</div>`).join('')}</details>`:''}${corrections&&!learningPending?`<button type="button" class="text-button" data-learning-correct="${escape(r.id)}">${t('learningCorrect')}</button>`:''}</li>`).join('')}</ul>`;
}

async function loadLearning() {
  const id=learningForm.studentId,generation=++learningEpoch,authGeneration=epoch;
  if(!id){learningRecords=[];learningState='idle';render();return;}
  learningState='loading';learningRecords=[];render();
  try {
    const records=await gateway.learningHistory(id);
    if(generation!==learningEpoch||authGeneration!==epoch||!user)return;
    currentLearning(records);learningRecords=records;learningState='ready';
  }catch{if(generation!==learningEpoch||authGeneration!==epoch)return;learningState='error';}
  if(screen==='learning'){const panel=document.getElementById('learning-history-panel');if(panel)panel.innerHTML=learningHistoryPanel();else render();}
}
async function saveLearning(event) {
  event.preventDefault();if(!user||learningSaving)return;
  if(!learningPending){
    try {
      const data=new FormData(event.target);for(const key of ['studentId','kind','date','session','hizb','fromEighth','toEighth','mistakes','score','note'])if(data.has(key))learningForm[key]=data.get(key);learningForm.confirmMastered=data.has('confirmMastered');
      const f=learningForm,graded=isGradedLearning(f.kind);
      if(f.kind==='memorization'&&!f.confirmMastered)throw new Error('mastery-unconfirmed');
      const input=cleanLearning({...f,hizb:Number(f.hizb),fromEighth:Number(f.fromEighth),toEighth:Number(f.toEighth),mistakes:graded?Number(f.mistakes):null,score:graded?Number(f.score):null});
      if(!students.some(s=>s.id===input.studentId)||graded&&(f.mistakes===''||f.score===''))throw new Error('invalid-learning');
      learningPending={input,id:crypto.randomUUID()};
    }catch{learningError='learningInvalid';render();return;}
  }
  const generation=epoch,pending=learningPending;
  learningSaving=true;learningError='';learningSaved=false;render();
  try{
    await gateway.saveLearning(pending.input,pending.id);
    if(generation!==epoch||!user)return;
    learningForm=blankLearning(pending.input.studentId,pending.input.kind);learningForm.date=pending.input.date;learningForm.session=pending.input.session;
    learningPending=null;learningTouched=false;learningSaved=true;
  }catch(e){if(generation!==epoch)return;learningError=e?.code==='learning-conflict'?'learningConflict':'learningSaveError';}
  finally{if(generation===epoch){learningSaving=false;render();}}
  if(generation===epoch&&learningSaved)loadLearning();
}

const icons={today:'◈',students:'◉',attendance:'✓',learning:'▤',tasks:'◷',reports:'▥',manage:'⚙',access:'♙',audit:'≡',audioTest:'◉',mushaf:'▣',notices:'♧',consent:'✓',credentials:'♙',recording:'◉',history:'▦',readiness:'◇',teacherAttendance:'✓',schedules:'◷',corrections:'✎',questions:'?',challenge:'◇',ranking:'▥'};
const extraScreens=['audioTest','mushaf','notices','consent','credentials','schedules','corrections','questions','challenge','ranking','teacherAttendance','tasks','reports','manage','access','audit','history','readiness'];
const screens=()=>['today','students','mushaf',...(['parent','student'].includes(role)?[]:['attendance','learning','recording','audioTest','schedules','corrections','ranking']),'history','tasks','reports','challenge','notices',...(role==='parent'?['consent']:[]),...(['admin','manager'].includes(role)?['teacherAttendance','manage']:[]),...(role==='admin'?['credentials','access','audit','readiness','questions']:[])];
const titleKey=s=>({today:'today',students:'studentsTab',attendance:'cloudAttendance',learning:'learningTab',history:'legacyTitle'}[s]||s);
const screenTitle=()=>t(titleKey(screen));
const displayName=()=>user?.displayName?.trim()||user?.email||t('workspaceTitle');
const initials=name=>Array.from(name.trim()).slice(0,2).join('').toLocaleUpperCase();
function languageSwitch(){return `<div class="language-switch" role="group" aria-label="Language / اللغة"><button data-lang="fr" class="${language==='fr'?'active':''}" aria-pressed="${language==='fr'}">FR</button><button data-lang="en" class="${language==='en'?'active':''}" aria-pressed="${language==='en'}">EN</button><button data-lang="ar" class="${language==='ar'?'active':''}" aria-pressed="${language==='ar'}">عربي</button></div>`;}
function accountChip(){return `<div class="teacher-chip"><span class="avatar" aria-hidden="true">${escape(initials(displayName()))}</span><div><strong>${escape(displayName())}</strong><small>${role?t(role):t('loading')}</small></div></div>`;}
function sidebar(){const available=screens();return `<aside class="sidebar unified-sidebar"><div class="brand"><span class="brand-symbol" aria-hidden="true">${bookIcon()}</span><div><div class="brand-name">${t('brand')}</div><div class="brand-caption">${t('brandCaption')}</div></div></div><nav aria-label="${t('workspaceTitle')}">${navigationGroups.map(([key,items])=>{const visible=items.filter(s=>available.includes(s));return visible.length?`<section class="navigation-group" aria-label="${interfaceCopy[language][key]}"><p class="nav-label">${interfaceCopy[language][key]}</p>${visible.map(s=>`<button type="button" data-screen="${s}" class="nav-link ${screen===s?'active':''}" aria-pressed="${screen===s}" ${screen===s?'aria-current="page"':''}><span class="unified-nav-icon" aria-hidden="true">${navigationIcon(s)}</span><span>${t(titleKey(s))}</span></button>`).join('')}</section>`:'';}).join('')}</nav><div class="sidebar-bottom"><div class="sidebar-note"><strong>${t('testBadge')}</strong>${t('notice')}</div>${accountChip()}</div></aside>`;}
function bookIcon(){return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 4c4-1 7 0 9 2 2-2 5-3 9-2v15c-4-1-7 0-9 2-2-2-5-3-9-2ZM12 6v15"/></svg>';}
function todayView(){
 const groups=new Set(students.map(s=>s.kuttab).filter(Boolean));
 const drafts=[...cloudRows.values()].filter(rowDirty).length+(learningTouched||learningPending?1:0);
 return `<section class="hero unified-hero"><div class="hero-copy"><p class="hero-kicker">${t('todayKicker')}</p><h2>${['parent','student'].includes(role)?interfaceCopy[language].familyHero:t('todayHero')}</h2><p>${['parent','student'].includes(role)?interfaceCopy[language].familyIntro:t('todayIntro')}</p><div class="hero-cta">${['parent','student'].includes(role)?`<button class="primary-button" data-action="open-tasks">${t('tasks')}</button><button class="secondary-button" data-action="open-students">${t('studentsTab')}</button>`:`<button class="primary-button" data-action="open-attendance">${t('cloudAttendance')}</button><button class="secondary-button" data-action="open-learning">${t('learningTab')}</button>`}</div></div><div class="hero-emblem" aria-hidden="true">${bookIcon()}</div></section><div class="stats-grid"><div class="stat-card"><div><p class="stat-label">${t('studentsTab')}</p><div class="stat-value" data-dashboard-students>${value(students.length)}</div><p class="stat-detail">${t('authorizedRoster')}</p></div><span class="stat-icon" aria-hidden="true">◉</span></div><div class="stat-card"><div><p class="stat-label">${t('school')}</p><div class="stat-value">${value(groups.size)}</div><p class="stat-detail">${t('authorizedGroups')}</p></div><span class="stat-icon" aria-hidden="true">▤</span></div><div class="stat-card"><div><p class="stat-label">${t('draftsTitle')}</p><div class="stat-value">${value(drafts)}</div><p class="stat-detail">${t('draftsCaption')}</p></div><span class="stat-icon" aria-hidden="true">✎</span></div></div><div id="priorities-root"></div><div class="section-heading"><div><h2>${t('studentsTab')}</h2><p>${t('rosterSubtitle')}</p></div><button class="text-button" data-action="open-students">${t('viewAll')}</button></div><div class="student-cards">${students.slice(0,4).map(s=>studentCard(s)).join('')||`<p class="empty-state">${t('empty')}</p>`}</div>`;
}
function studentCard(s){
 return `<article class="student-card live-student"><span class="avatar ${['sage','sand','lavender','blue'][Array.from(s.id).reduce((sum,c)=>sum+c.charCodeAt(0),0)%4]}" aria-hidden="true">${escape(initials(s.name||'?'))}</span><h3>${escape(s.name||t('unknown'))}</h3><p>${escape(s.kuttab||t('unknown'))}</p><div class="progress-heading"><span>${t('hizbs')}</span><strong>${value(s.hizbs)}</strong></div><button class="text-button" data-profile="${escape(s.id)}">${t('profile')} <span aria-hidden="true">←</span></button></article>`;
}
function rosterFilters(){return `<div class="live-filter"><input type="search" id="live-search" aria-label="${t('search')}" placeholder="${t('search')}" value="${escape(search)}"><select id="live-school" aria-label="${t('school')}"><option value="">${t('all')}</option>${[...new Set(students.map(s=>s.kuttab).filter(Boolean))].sort().map(name=>`<option value="${escape(name)}" ${name===school?'selected':''}>${escape(name)}</option>`).join('')}</select></div>`;}
function errorNotice(){return error?`<p class="notice-error" role="alert">${t(error)}</p>`:'';}
function render(){
 document.documentElement.lang=language;document.documentElement.dir=language==='ar'?'rtl':'ltr';document.title=`${user?screenTitle():t('welcome')} · Katatib`;root.setAttribute('aria-busy',String(state==='loading'));
 const brand=`<div class="unified-brand"><span class="brand-symbol">${bookIcon()}</span><span class="brand-name">${t('brand')}</span></div>`;
 if(!user){
  root.innerHTML=`<div class="login-shell"><header class="unified-login-header">${brand}<div class="live-actions"><span class="demo-pill">${t('testBadge')}</span>${languageSwitch()}</div></header><div class="unified-login-grid"><section class="login-story"><p class="eyebrow">${t('brandCaption')}</p><h1>${t('loginHero')}</h1><p>${t('loginStory')}</p><div class="login-story-mark" aria-hidden="true">${bookIcon()}</div></section><section class="panel live-panel login-panel"><p class="eyebrow">${t('workspaceTitle')}</p><h2>${state==='loading'?t('loading'):t('welcome')}</h2><p>${t('intro')}</p>${errorNotice()}${gateway?`${loginOptions(language,loginTab,pendingLogin)}${loginTab!=='student'?`<button data-action="login" class="primary-button" ${pendingLogin?'disabled':''}>${t('login')}</button>`:''}`:''}${state==='error'?`<button data-action="retry" class="secondary-button">${t('retry')}</button>`:''}<p class="login-footnote">${t('notice')}</p></section></div></div>`;
  return;
 }
 const body=state==='ready'?(screen==='today'?todayView():screen==='recording'?'<div id="recording-root"></div>':extraScreens.includes(screen)?'<div id="work-root"></div>':`${screen==='attendance'?attendanceControls():''}${capped?`<p class="notice-error">${t('capped')}</p>`:''}${screen!=='learning'?rosterFilters():''}<div id="live-students" class="${screen==='learning'?'learning-layout':'student-cards'}">${renderResults()}</div>`):`<section class="panel live-panel"><h2>${state==='loading'?t('loading'):t('welcome')}</h2>${state==='error'?`<button data-action="retry" class="secondary-button">${t('retry')}</button>`:''}</section>`;
 root.innerHTML=`<a class="skip-link" href="#workspace-content">${interfaceCopy[language].skip}</a><div class="app-shell">${sidebar()}<div class="workspace"><header class="topbar"><div class="breadcrumb"><span>${t('brand')}</span><span>/</span><b>${t('workspaceTitle')}</b></div><div class="unified-mobile-brand">${brand}</div><div class="top-actions"><span class="demo-pill"><i class="dot"></i>${t('testBadge')}</span>${languageSwitch()}<button class="text-button unified-logout" data-action="logout">${t('logout')}</button></div></header><main id="workspace-content" tabindex="-1" class="content unified-content" data-current-screen="${screen}"><div class="page-heading"><div><p class="eyebrow">${t('workspaceTitle')}</p><h1>${screen==='today'?`${t('greeting')} ${escape(displayName())}`:screenTitle()}</h1><p class="heading-caption">${extraScreens.includes(screen)||screen==='recording'?interfaceCopy[language].savedScope:t(screen==='today'?'todayIntro':screen==='students'?'rosterSubtitle':screen==='attendance'?'attendanceSubtitle':'learningSubtitle')}</p></div><span class="heading-date">${new Intl.DateTimeFormat(language==='ar'?'ar-MA':language==='en'?'en-GB':'fr-FR',{dateStyle:'long',timeZone:'Africa/Casablanca'}).format(new Date())}</span></div>${errorNotice()}${(['admin','manager','teacher'].includes(role)||gateway?.offlinePending?.())?'<div id="offline-device-root"></div>':''}${body}<footer class="footer-note"><span>${t('notice')}</span><span>${escape(user.email||'')}</span></footer></main></div></div>`;
 if((state==='ready'&&['admin','manager','teacher'].includes(role))||gateway?.offlinePending?.())offlineControls.mount(document.getElementById('offline-device-root'),{gateway,user,students:allStudents,language,refresh:refreshDeviceData,busy:()=>hasSaves()||hasDrafts()});
 if(state==='ready'&&screen==='today')priorities.mount(document.getElementById('priorities-root'),{gateway,user,students,language,translate:t});
 if(state==='ready'&&screen==='recording')localRecorder.mount(document.getElementById('recording-root'),{user,students:allStudents,language});
 if(state==='ready'&&extraScreens.includes(screen))workspace.mount(document.getElementById('work-root'),{page:screen,gateway,user,role,students:allStudents,language,refresh:loadStudents});
}

async function refreshDeviceData(){if(hasSaves()||hasDrafts())throw Error('unsaved-draft');workspace.reset();cloudRows.clear();await loadStudents();if(state==='ready'&&screen==='attendance')await loadAttendance();if(state==='ready'&&screen==='learning')await loadLearning();}

function clearData() {
  priorities.reset();localRecorder.reset();workspace.reset();allStudents=[];rosterIndex=0;
  learningEpoch++;learningForm=blankLearning();learningRecords=[];learningState='idle';learningError='';learningSaved=false;learningSaving=false;learningPending=null;learningTouched=false;
  attendanceEpoch++; cloudRows.clear(); attendanceState='idle'; screen='today'; cloudContext={date:businessDate(),session:'morning'};
  epoch++; historyEpoch++; students = []; role = ''; capped = false; search = ''; school = ''; dialog.close(); dialog.replaceChildren();
}
async function loadStudents() {
  priorities.reset();
  if (!user || !gateway) return;
  const generation = ++epoch; state = 'loading'; error = ''; render();
  try {
    const result = await gateway.students(user);
    if (generation !== epoch) return;
    allStudents = result.students; role = result.role; students = allStudents.filter(s=>['parent','student'].includes(role)||s.status!=='archived'); capped = result.capped; if(!screens().includes(screen)){screen='today';localRecorder.reset();workspace.reset();} state = 'ready';
  } catch (e) { if (generation !== epoch) return; students = [];allStudents=[];localRecorder.reset();workspace.reset(); state = 'error'; error = errorKey(e); }
  render();
}
async function start() {
  state = 'loading'; error = ''; render();
  try {
    // Tests replace the module at the HTTP boundary; there is no production mock bypass.
    const {connect} = await import('./gateway.mjs');
    gateway = createOfflineGateway(await connect(),{onChange:offlineChanged});
    gateway.observe(next => { clearData(); user = next; error = ''; if (user) loadStudents(); else { state = 'signed-out'; render(); } });
  } catch (e) { state = 'error'; error = errorKey(e); render(); }
}
let trigger;
async function profile(id, button) {
  const student = students.find(s=>s.id === id); if (!student || !user) return;
  trigger = button; const generation = ++historyEpoch;
  dialog.innerHTML = `<section class="live-profile"><button class="close-button" data-close aria-label="${t('close')}">×</button><h2 id="student-heading">${escape(student.name)}</h2><dl><div><dt>${t('school')}</dt><dd>${escape(student.kuttab || t('unknown'))}</dd></div><div><dt>${t('age')}</dt><dd>${value(student.age)}</dd></div><div><dt>${t('hizbs')}</dt><dd>${value(student.hizbs)}</dd></div><div><dt>${t('attendance')}</dt><dd>${value(student.attendance)}${student.attendance == null ? '' : '%'}</dd></div></dl><p class="live-status">${t('source')}</p><h3>${t('history')}</h3><div id="live-history" role="status">${t('loading')}</div><h3>${t('cloudHistory')}</h3><div id="cloud-history" role="status">${t('loading')}</div><h3>${t('learningHistory')}</h3><div id="profile-progress" role="status"></div><div id="profile-learning" role="status">${t('loading')}</div></section>`;
  dialog.showModal();
  try {
    const [history, cloudHistory, learningHistory] = await Promise.all([gateway.history(id),gateway.attendanceHistory(id),gateway.learningHistory(id)]);
    if (generation !== historyEpoch || !dialog.open || !user) return;
    document.getElementById('profile-progress').innerHTML=progressView(student,learningHistory);
    document.getElementById('profile-learning').innerHTML=learningHistoryList(learningHistory);
    document.getElementById('cloud-history').innerHTML=cloudHistory.length?`<ul>${cloudHistory.map(h=>`<li>${escape(h.date)} · ${t(h.session)} · ${escape(copy[language][h.status]||t('unknown'))} · ${t('cloudRevision')} ${value(h.revision)}<p>${escape(h.note)}</p></li>`).join('')}</ul>`:t('noHistory');
    document.getElementById('live-history').innerHTML = history.length ? `<ul>${history.map(h=>`<li>${escape(h.date || t('unknown'))} · ${escape(copy[language][h.status] || t('unknown'))}${h.session == null ? '' : ` · ${t('session')}: ${value(h.session)}`}</li>`).join('')}</ul>` : t('noHistory');
  } catch { if (generation === historyEpoch && dialog.open) for(const id of ['live-history','cloud-history','profile-learning','profile-progress'])document.getElementById(id).textContent = t('historyError'); }
}
dialog.addEventListener('click', e=>{ if(e.target.closest('[data-close]')) dialog.close(); });
dialog.addEventListener('close',()=>{historyEpoch++;dialog.replaceChildren();if(trigger?.isConnected)trigger.focus();});
root.addEventListener('click', async e => {
  const b = e.target.closest('button'); if (!b || b.disabled) return;
  const nextScreen=b.dataset.screen|| (b.dataset.action?.startsWith('open-')?b.dataset.action.slice(5):null);
  if(nextScreen&&(!screens().includes(nextScreen)||workspace.busy()||extraScreens.includes(screen)&&nextScreen!==screen&&!workspace.canLeave()||screen==='recording'&&nextScreen!==screen&&!localRecorder.canLeave()))return;
  if(nextScreen&&nextScreen!==screen&&extraScreens.includes(screen))workspace.reset();
  if(nextScreen&&nextScreen!==screen&&screen==='recording')localRecorder.reset();
  if(b.dataset.rosterPage!==undefined){rosterIndex=Number(b.dataset.rosterPage);if(screen==='attendance')loadAttendance();else render();return;}
  if(b.dataset.action?.startsWith('open-')){screen=b.dataset.action.slice(5);if(screen==='attendance')loadAttendance();else if(screen==='learning')loadLearning();else render();window.scrollTo(0,0);}
  else if (b.dataset.screen) {screen=b.dataset.screen;if(screen==='attendance')loadAttendance();else if(screen==='learning')loadLearning();else render();}
  else if(b.dataset.learningCorrect){
    if(learningSaving||learningPending)return;
    if(learningTouched&&!confirm(t('learningDiscard')))return;
    const entry=currentLearning(learningRecords).find(r=>r.id===b.dataset.learningCorrect);if(!entry)return;
    learningForm={...entry,supersedesId:entry.id,confirmMastered:false};learningTouched=true;learningSaved=false;learningError='';render();document.querySelector('#learning-form')?.scrollIntoView({behavior:'smooth',block:'start'});
  }
  else if(b.dataset.action==='cancel-correction'){if(confirm(t('learningDiscard'))){learningForm=blankLearning(learningForm.studentId);learningTouched=false;render();}}
  else if(b.dataset.action==='learning-reload')loadLearning();
  else if (b.dataset.cloudStatus) {const row=cloudRow(b.dataset.cloudStudent);if(row&&!row.saving){row.draft.status=b.dataset.cloudStatus;row.error='';render();root.querySelector(`[data-cloud-student="${CSS.escape(b.dataset.cloudStudent)}"][data-cloud-status="${b.dataset.cloudStatus}"]`)?.focus();}}
  else if (b.dataset.cloudSave) saveCloud(b.dataset.cloudSave);
  else if (b.dataset.cloudReload) reloadCloud(b.dataset.cloudReload);
  else if (b.dataset.action==='reload-attendance')loadAttendance();
  else if (b.dataset.lang) { language = b.dataset.lang; render(); }
  else if (b.dataset.profile) profile(b.dataset.profile, b);
  else if (b.dataset.loginTab) {loginTab=b.dataset.loginTab;error='';render();}
  else if (b.dataset.action === 'login') {
    pendingLogin = true; error = ''; render();
    try { await gateway.login(); } catch (e) { error = errorKey(e); } finally { pendingLogin = false; render(); }
  } else if (b.dataset.action === 'logout') {
    if(hasSaves())return;
    if(gateway.offlinePending?.()){alert(offlineLabels[language].noLogout);return;}
    if(hasDrafts()&&!confirm(t('cloudLeave')))return;
    localRecorder.reset();
    const previousState=state,leavingUid=user?.uid;pendingLogin=true;state='loading';render();
    try { await gateway.logout(); } catch(e) { if(user?.uid===leavingUid)state=previousState;if(e.message==='offline-sync-first')alert(offlineLabels[language].noLogout);else error='error'; } finally {pendingLogin=false;render();}
  } else if (b.dataset.action === 'retry') { if (user) loadStudents(); else if (gateway) {state='signed-out';error='';render();} else start(); }
});
root.addEventListener('submit',async e=>{
 if(e.target.id==='learning-form')saveLearning(e);
 if(e.target.id==='student-login-form'){
   e.preventDefault();if(pendingLogin)return;
   const data=new FormData(e.target),code=data.get('code'),pin=data.get('pin');
   pendingLogin=true;error='';render();
   try{await gateway.studentLogin(code,pin);}catch(e){error=/operation-not-allowed|configuration-not-found/.test(e.code||'')?'setup':'loginFailed';}
   finally{pendingLogin=false;render();}
 }
});
root.addEventListener('input', e=>{if(e.target.closest('#learning-form')&&e.target.name){if(!learningPending&&e.target.tagName!=='SELECT'){learningForm[e.target.name]=e.target.type==='checkbox'?e.target.checked:e.target.value;learningTouched=true;learningSaved=false;}}else if(e.target.dataset.cloudNote){const row=cloudRow(e.target.dataset.cloudNote);if(row&&!row.saving){row.draft.note=e.target.value;row.error='';const card=e.target.closest('[data-cloud-row]');card.querySelector('[data-cloud-save]').disabled=!rowDirty(row);card.querySelector('[data-cloud-message]').textContent=t(rowDirty(row)?'cloudUnsaved':row.base.revision?'cloudSaved':'cloudNotMarked');}}else if(e.target.id === 'live-search'){search=e.target.value;rosterIndex=0;if(screen==='attendance')loadAttendance(true);else updateRoster();}});
root.addEventListener('change', e=>{if(e.target.closest('#learning-form')&&e.target.name){
  if(learningPending)return;
  if(e.target.name==='studentId'){
    if(learningTouched&&!confirm(t('learningDiscard'))){e.target.value=learningForm.studentId;return;}
    learningForm=blankLearning(e.target.value,learningForm.kind);learningTouched=false;learningSaved=false;learningError='';loadLearning();return;
  }
  learningForm[e.target.name]=e.target.type==='checkbox'?e.target.checked:e.target.value;learningTouched=true;learningSaved=false;learningError='';
  if(e.target.name==='kind'){learningForm.confirmMastered=false;learningForm.mistakes='';learningForm.score='';render();}

}else if(e.target.id==='cloud-date'||e.target.id==='cloud-session'){const next={...cloudContext,...(e.target.id==='cloud-date'?{date:e.target.value}:{session:e.target.value})};try{attendanceId('validate',next.date,next.session);cloudContext=next;loadAttendance();}catch{render();}}else if(e.target.id === 'live-school'){school=e.target.value;rosterIndex=0;if(screen==='attendance')loadAttendance();else render();}});
window.addEventListener('beforeunload',event=>{if(hasDrafts()||hasSaves()){event.preventDefault();event.returnValue='';}});
// Browser history restoration must not resurrect a previous account's records.
window.addEventListener('pagehide',()=>{clearData();user=null;state='signed-out';render();});
window.addEventListener('pageshow',e=>{if(e.persisted)location.reload();});
start();
