import { GROUPS, STUDENTS, SESSIONS, STATUSES, businessDate, sessionKey, loadNotebook, recordsFor, saveSession, attendanceCounts, markRemainingPresent, studentHistory } from './domain.mjs';

const copy = {
  ar: {
    brand: 'كتاتيب', tagline: 'مساحة للحفظ والنمو', workspace: 'مساحة المعلم', today: 'اليوم', students: 'الطلاب', attendance: 'الحضور', demo: 'بيانات تجريبية',
    school: 'كتّاب النور', teacher: 'الأستاذة أمينة', role: 'معلمة القرآن الكريم', greeting: 'أهلاً أستاذة أمينة', subtitle: 'كل جلسة فرصة جديدة للتقدم.',
    heroKicker: 'جلسة جديدة، أثر يبقى', heroTitle: 'خطوة صغيرة، حفظ راسخ.', heroBody: 'ركّزي على الطالب أمامك. حضورُه، تقدّمُه وخطوتُه القادمة، في مكان واحد.',
    sessionProgress: 'حضور مسجّل', room: 'القاعة', group: 'الحلقة', session: 'الحصة', date: 'التاريخ', morning: 'الصباحية', afternoon: 'المسائية', evening: 'الليلية',
    present: 'حاضر', absent: 'غائب', excused: 'معذور', late: 'متأخر', leftEarly: 'انصرف مبكراً', unmarked: 'لم يُسجّل',
    attendedToday: 'الحضور في هذه الحصة', awaiting: 'بانتظار التسجيل', plannedToday: 'خطة اليوم', tasks: 'مهام', tasksCaption: 'حفظ جديد ومراجعة', groupProgress: 'متوسط الحفظ', hizb: 'حزب', of60: 'من 60 حزباً',
    currentStudent: 'الطالب أمامك', currentCaption: 'خطوة بخطوة، طالباً بعد طالب.', viewAttendance: 'قائمة الحضور', learned: 'مقدار الحفظ', attendanceQuestion: 'كيف كان الحضور؟',
    note: 'ملاحظة لهذه الحصة', notePlaceholder: 'ملاحظة قصيرة أو سبب الغياب…', nextStudent: 'الطالب التالي', previous: 'السابق', studentProfile: 'ملف الطالب',
    saveSession: 'حفظ الحصة', saved: 'محفوظ على هذا الجهاز', unsaved: 'تغييرات لم تُحفظ بعد', notSaved: 'لم تُحفظ هذه الحصة بعد', savedToast: 'تم حفظ الحصة على هذا الجهاز',
    localOnly: 'هذه معاينة ببيانات وهمية. الحفظ على جهازك فقط؛ لا اتصال بقاعدة البيانات.', dataNoteTitle: 'جرّبيها بكل اطمئنان', dataNote: 'يمكنك تجربة الحضور والملاحظات. لا تتأثر بيانات الطلاب الحقيقية.',
    revision: 'مراجعة', memorization: 'حفظ جديد', portion: 'الحزب', reviewProfile: 'عرض الملف', afterThis: 'بعد هذا الطالب', remaining: 'بانتظار دورهم',
    demoFooter: 'معاينة كتاتيب V2 · بيانات وهمية', privacyFooter: 'لا تُدخلي بيانات شخصية حقيقية في هذه المعاينة.',
    studentSubtitle: 'لمحة عن كل طالب، وخطوته القادمة.', search: 'البحث عن طالب…', searchLabel: 'البحث عن طالب', studentCount: 'طلاب', age: 'سنة', progress: 'تقدم الحفظ', noResults: 'لم نعثر على طالب بهذا الاسم.',
    rollcallSubtitle: 'حضور مستقل لكل حلقة وتاريخ وحصة.', markRest: 'تسجيل الباقين كحاضرين', allStatuses: 'كل الحالات', filter: 'تصفية حسب الحضور', total: 'الإجمالي',
    close: 'إغلاق الملف', history: 'سجل الحضور المحفوظ', noHistory: 'لا توجد حصص محفوظة لهذا الطالب بعد. سجّلي الحضور واحفظي الحصة لتظهر هنا.',
    sessionsSaved: 'حصص محفوظة', sampleProgress: 'مقدار الحفظ المعروض تجريبي. سجل الحضور يعرض الحصص التي حفظتِها في هذه المعاينة.',
    storageError: 'تعذّر قراءة الحفظ المحلي. ما زالت بياناتك الأصلية محفوظة كما هي؛ لا يمكن حفظ تغييرات جديدة الآن.',
    saveError: 'تعذّر الحفظ على الجهاز. احتفظي بهذه النافذة مفتوحة ولا تغلقيها حتى تحفظي ملاحظاتك.',
    conflict: 'تم تعديل هذه الحصة في نافذة أخرى. احتفظي بملاحظاتك ثم أعيدي تحميل الصفحة.', invalidDate: 'اختاري تاريخاً صحيحاً.',
    saveHint: 'الحفظ محلي وليس مزامنة سحابية.', viewStudents: 'عرض الطلاب', unfinished: 'لم يُسجّل بعد', teacherSpace: 'مساحة المعلم',
  },
  fr: {
    brand: 'Katatib', tagline: 'Apprendre. Grandir. Transmettre.', workspace: 'ESPACE ENSEIGNANT', today: 'Aujourd’hui', students: 'Élèves', attendance: 'Présences', demo: 'Démonstration',
    school: 'Kouttab An-Nour', teacher: 'Oustadha Amina', role: 'Enseignante de Coran', greeting: 'Bonjour, Oustadha Amina', subtitle: 'Une nouvelle séance, de nouveaux progrès.',
    heroKicker: 'LES PETITS PAS FONT LES GRANDS PARCOURS', heroTitle: 'Chaque élève, une belle avancée.', heroBody: 'L’élève devant vous, sa présence et sa prochaine étape. L’essentiel, simplement.',
    sessionProgress: 'présences renseignées', room: 'Salle', group: 'Cercle', session: 'Séance', date: 'Date', morning: 'Matin', afternoon: 'Après-midi', evening: 'Soir',
    present: 'Présent', absent: 'Absent', excused: 'Excusé', late: 'En retard', leftEarly: 'Parti tôt', unmarked: 'À renseigner',
    attendedToday: 'Présents à cette séance', awaiting: 'à renseigner', plannedToday: 'Au programme', tasks: 'activités', tasksCaption: 'Mémorisation et révision', groupProgress: 'Mémorisation moyenne', hizb: 'hizb', of60: 'sur 60 hizbs',
    currentStudent: 'L’élève devant vous', currentCaption: 'Un élève à la fois. Chaque progrès compte.', viewAttendance: 'Voir les présences', learned: 'Mémorisation', attendanceQuestion: 'Sa présence à cette séance',
    note: 'Note pour cette séance', notePlaceholder: 'Une observation, une raison d’absence…', nextStudent: 'Élève suivant', previous: 'Précédent', studentProfile: 'Fiche élève',
    saveSession: 'Enregistrer la séance', saved: 'Enregistré sur cet appareil', unsaved: 'Modifications non enregistrées', notSaved: 'Cette séance n’est pas encore enregistrée', savedToast: 'Séance enregistrée sur cet appareil',
    localOnly: 'Données fictives. Enregistrement sur cet appareil uniquement ; aucune connexion à la base de données.', dataNoteTitle: 'Un espace pour essayer', dataNote: 'Testez les présences et les notes. Les véritables données des élèves restent intactes.',
    revision: 'Révision', memorization: 'Mémorisation', portion: 'Hizb', reviewProfile: 'Voir la fiche', afterThis: 'Les prochains élèves', remaining: 'attendent leur tour',
    demoFooter: 'Katatib V2 · Aperçu avec données fictives', privacyFooter: 'Ne saisissez pas de véritables données personnelles ici.',
    studentSubtitle: 'Le parcours de chacun, sa prochaine étape.', search: 'Rechercher un élève…', searchLabel: 'Rechercher un élève', studentCount: 'élèves', age: 'ans', progress: 'Parcours de mémorisation', noResults: 'Aucun élève ne correspond à cette recherche.',
    rollcallSubtitle: 'Une présence distincte pour chaque cercle, date et séance.', markRest: 'Marquer les autres présents', allStatuses: 'Tous les statuts', filter: 'Filtrer par présence', total: 'Total',
    close: 'Fermer la fiche', history: 'Historique des séances enregistrées', noHistory: 'Aucune séance enregistrée pour cet élève. Renseignez sa présence, puis enregistrez la séance.',
    sessionsSaved: 'Séances enregistrées', sampleProgress: 'La mémorisation affichée est fictive. L’historique des présences reflète les séances enregistrées dans cet aperçu.',
    storageError: 'Le carnet local ne peut pas être lu. Son contenu est conservé ; l’enregistrement de nouvelles modifications est désactivé.',
    saveError: 'Impossible d’enregistrer sur cet appareil. Gardez cet onglet ouvert et conservez vos notes.',
    conflict: 'Cette séance a changé dans un autre onglet. Conservez vos notes, puis rechargez la page.', invalidDate: 'Choisissez une date valide.',
    saveHint: 'Enregistrement local, sans synchronisation cloud.', viewStudents: 'Voir les élèves', unfinished: 'À renseigner', teacherSpace: 'Espace enseignant',
  },
};

const paths = {
  book: '<path d="M3 4.5c3-1 6-.5 9 1.5 3-2 6-2.5 9-1.5V20c-3-1-6-.5-9 1-3-1.5-6-2-9-1V4.5ZM12 6v15"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  people: '<circle cx="9" cy="8" r="3"/><path d="M3 21v-2a6 6 0 0 1 12 0v2M16 5a3 3 0 0 1 0 6m3 10v-2a6 6 0 0 0-3-5"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4m10-4v4M3 11h18m-13 4h1m6 0h1m-8 3h1"/>',
  check: '<path d="m5 12 4 4L19 6"/>', clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  x: '<path d="m6 6 12 12M6 18 18 6"/>', shield: '<path d="M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6l-8-3Z"/><path d="m8 12 3 3 5-6"/>',
  arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>', search: '<circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/>',
  leaf: '<path d="M20 3C7 2 2 9 6 16s15 2 14-13ZM5 21 17 7"/>', sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1 1m12 12 1 1M5 19l1-1M18 6l1-1"/>',
  save: '<path d="M5 3h12l4 4v13a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a2 2 0 0 1 2-2ZM7 3v6h10V3M7 21v-8h10v8"/>',
  flag: '<path d="M5 21V3c5-3 9 3 14 0v10c-5 3-9-3-14 0"/>',
};
const icon = (name, cls = '') => `<svg viewBox="0 0 24 24" aria-hidden="true" class="${cls}">${paths[name] || paths.book}</svg>`;
const statusIcon = { present: 'check', absent: 'x', excused: 'shield', late: 'clock', leftEarly: 'arrow' };
const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

let language = 'ar';
try { if (localStorage.getItem('katatib.preview.language') === 'fr') language = 'fr'; } catch {}
let notebook = { version: 1, entries: {} }, storageProblem = false;
try { notebook = loadNotebook(localStorage); } catch { storageProblem = true; }
let context = { group: 'fajr', date: businessDate(), session: 'morning' };
let currentStudent = 0, query = '', statusFilter = '', route = getRoute(), saveError = '', toastTimer;
const drafts = new Map();
const root = document.getElementById('app');
const dialog = document.getElementById('profile-dialog');
const t = key => copy[language][key] ?? key;
const number = value => new Intl.NumberFormat(language === 'ar' ? 'ar-MA' : 'fr-FR', { maximumFractionDigits: 2 }).format(value);
const studentName = student => student[language];
const groupInfo = () => GROUPS.find(g => g.id === context.group);
const groupStudents = () => STUDENTS.filter(s => s.group === context.group);
const avatar = (student, extra = '') => `<span class="avatar ${student.color} ${extra}" aria-hidden="true">${escape(language === 'ar' ? student.initials : student.latin)}</span>`;
const badge = status => `<span class="status-badge ${status || ''}">${t(status || 'unmarked')}</span>`;
function getRoute() { return ['today', 'students', 'attendance'].includes(location.hash.slice(1)) ? location.hash.slice(1) : 'today'; }
function dateLabel(date, short = false) {
  return new Intl.DateTimeFormat(language === 'ar' ? 'ar-MA' : 'fr-FR', { timeZone: 'UTC', ...(short ? { day: 'numeric', month: 'short' } : { weekday: 'long', day: 'numeric', month: 'long' }) }).format(new Date(`${date}T12:00:00Z`));
}
function draft() {
  const key = sessionKey(context);
  if (!drafts.has(key)) drafts.set(key, recordsFor(notebook, context));
  return drafts.get(key);
}
function dirty() { return JSON.stringify(draft()) !== JSON.stringify(recordsFor(notebook, context)); }
function saveLabel() { return saveError || (dirty() ? t('unsaved') : notebook.entries[sessionKey(context)] ? t('saved') : t('notSaved')); }
function saveState() {
  return `<span class="save-state ${saveError ? 'error' : dirty() ? 'dirty' : ''}" data-save-state>${icon(saveError ? 'flag' : dirty() ? 'clock' : 'shield')}<span>${escape(saveLabel())}</span></span>`;
}
const saveButton = () => `<button class="primary-button" data-action="save" ${!dirty() || storageProblem ? 'disabled' : ''}>${icon('save')}${t('saveSession')}</button>`;
function paintSaveState() {
  document.querySelectorAll('[data-save-state]').forEach(el => { el.outerHTML = saveState(); });
  document.querySelectorAll('[data-action=save]').forEach(el => { el.disabled = !dirty() || storageProblem; });
}
function toast(message) {
  const el = document.getElementById('toast');
  el.textContent = message; el.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 6000);
}
function statusButtons(id) {
  return `<div class="status-grid" role="group" aria-label="${escape(t('attendanceQuestion') + ' · ' + studentName(STUDENTS.find(s => s.id === id)))}">${STATUSES.map(status => `<button class="status-button ${status}" data-student="${id}" data-status="${status}" aria-pressed="${draft()[id].status === status}">${icon(statusIcon[status])}${t(status)}</button>`).join('')}</div>`;
}
function navLinks(mobile = false) {
  return ['today', 'students', 'attendance'].map((item, index) => `<a href="#${item}" class="${mobile ? '' : 'nav-link '}${route === item ? 'active' : ''}" ${route === item ? 'aria-current="page"' : ''}>${icon(['grid', 'people', 'calendar'][index])}<span>${t(item)}</span>${!mobile && route === item ? '<i class="nav-dot"></i>' : ''}</a>`).join('');
}
function controls() {
  return `<div class="group-picker">${icon('people')}<select id="group-select" aria-label="${t('group')}">${GROUPS.map(g => `<option value="${g.id}" ${context.group === g.id ? 'selected' : ''}>${escape(g[language])}</option>`).join('')}</select><span class="picker-divider"></span><div class="session-tabs" role="group" aria-label="${t('session')}">${SESSIONS.map(session => `<button data-session="${session}" class="${context.session === session ? 'active' : ''}" aria-pressed="${context.session === session}">${t(session)}</button>`).join('')}</div><label class="picker-date"><input type="date" id="session-date" aria-label="${t('date')}" value="${context.date}"></label></div>`;
}
function stats() {
  const counts = attendanceCounts(draft());
  const students = groupStudents();
  const average = Math.round(students.reduce((n, s) => n + s.hizbs, 0) / students.length * 10) / 10;
  return `<div class="stats-grid"><div class="stat-card"><div><p class="stat-label">${t('attendedToday')}</p><div class="stat-value">${number(counts.attended)} <small>/ ${number(students.length)}</small></div><p class="stat-detail">${number(counts.unmarked)} ${t('awaiting')}</p></div><span class="stat-icon">${icon('people')}</span></div><div class="stat-card"><div><p class="stat-label">${t('plannedToday')}</p><div class="stat-value">${number(students.length)} <small>${t('tasks')}</small></div><p class="stat-detail">${t('tasksCaption')}</p></div><span class="stat-icon">${icon('book')}</span></div><div class="stat-card"><div><p class="stat-label">${t('groupProgress')}</p><div class="stat-value">${number(average)} <small>${t('hizb')}</small></div><p class="stat-detail">${t('of60')}</p></div><span class="stat-icon">${icon('leaf')}</span></div></div>`;
}
function todayScreen() {
  const students = groupStudents();
  const student = students[currentStudent];
  const counts = attendanceCounts(draft());
  const progress = (students.length - counts.unmarked) / students.length;
  const circumference = 2 * Math.PI * 45;
  return `<section class="hero"><div class="hero-copy"><div class="hero-kicker">${icon('sun')}${t('heroKicker')}</div><h2>${t('heroTitle')}</h2><p>${t('heroBody')}</p></div><div class="hero-right"><div class="hero-session"><strong>${escape(groupInfo()[language])}</strong><span dir="ltr">${groupInfo().time}</span><br>${t('room')} ${groupInfo().room}</div><div class="hero-ring"><svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="45" stroke="#ffffff20"/><circle cx="50" cy="50" r="45" stroke="#c6d6a5" stroke-dasharray="${circumference}" stroke-dashoffset="${circumference * (1 - progress)}"/></svg><div><strong>${number(students.length - counts.unmarked)}<span>/ ${number(students.length)} ${t('sessionProgress')}</span></strong></div></div></div></section>${stats()}
  <div class="today-grid"><section><div class="section-heading"><div><h2>${t('currentStudent')}</h2><p>${t('currentCaption')}</p></div><a class="text-button" href="#attendance">${t('viewAttendance')}${icon('arrow', 'directional')}</a></div><div class="panel"><div class="student-spotlight"><div class="student-top">${avatar(student)}<div><h3>${escape(studentName(student))}</h3><p>${number(student.age)} ${t('age')} · ${escape(groupInfo()[language])}</p></div><span class="student-index">${number(currentStudent + 1)} / ${number(students.length)}</span></div><div class="portion-summary"><div><span>${t('learned')}</span><strong>${number(student.hizbs)} ${t('hizb')}</strong></div>${icon('book')}</div><span class="field-label">${t('attendanceQuestion')}</span>${statusButtons(student.id)}<label class="field-label" for="student-note">${t('note')}</label><textarea class="note-input" id="student-note" data-note="${student.id}" placeholder="${t('notePlaceholder')}" maxlength="500">${escape(draft()[student.id].note)}</textarea></div><div class="student-footer"><button class="arrow-button" data-action="previous" ${currentStudent === 0 ? 'disabled' : ''}>${icon('arrow', 'arrow-back directional')}${t('previous')}</button><button class="primary-button" data-action="next" ${currentStudent === students.length - 1 ? 'disabled' : ''}>${t('nextStudent')}${icon('arrow', 'directional')}</button></div></div><div class="save-strip">${saveState()}${saveButton()}</div></section>
  <aside><div class="section-heading"><h2>${t('plannedToday')}</h2><span class="count-pill">${number(students.length)} ${t('tasks')}</span></div><div class="panel day-plan">${students.slice(currentStudent, currentStudent + 2).map(planned => `<div class="plan-item"><span class="plan-icon">${icon(planned.task === 'revision' ? 'clock' : 'book')}</span><div><strong>${t(planned.task)}</strong><p>${t('portion')} ${number(planned.portion)} · ${escape(studentName(planned).split(' ')[0])}</p></div><button class="text-button" data-profile="${planned.id}">${t('reviewProfile')}${icon('arrow', 'directional')}</button></div>`).join('')}<div class="soft-note"><strong>${icon('shield')}${t('dataNoteTitle')}</strong>${t('dataNote')}</div><div class="up-next"><div class="section-heading"><h3>${t('afterThis')}</h3><small class="heading-caption">${number(Math.max(0, students.length - currentStudent - 1))} ${t('remaining')}</small></div>${students.slice(currentStudent + 1, currentStudent + 4).map(s => `<button class="next-student" data-select-student="${s.id}">${avatar(s)}<span><strong>${escape(studentName(s))}</strong><small>${t(s.task)} · ${t('portion')} ${number(s.portion)}</small></span>${icon('arrow', 'directional')}</button>`).join('') || `<button class="text-button" data-profile="${student.id}">${t('studentProfile')}${icon('arrow', 'directional')}</button>`}</div></div></aside></div>`;
}
function studentsScreen() {
  return `<div class="toolbar"><label class="search-field">${icon('search')}<input id="student-search" type="search" aria-label="${t('searchLabel')}" placeholder="${t('search')}" value="${escape(query)}"></label><span class="count-pill">${number(groupStudents().length)} ${t('studentCount')}</span></div><div class="student-cards" id="student-results">${studentCards()}</div>`;
}
function studentCards() {
  const students = groupStudents().filter(s => [s.ar, s.fr].some(name => name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())));
  return students.map(student => `<article class="student-card">${avatar(student)}<h3>${escape(studentName(student))}</h3><p>${escape(groupInfo()[language])} · ${number(student.age)} ${t('age')}</p><div class="progress-heading"><span>${t('learned')}</span><strong>${number(student.hizbs)} ${t('hizb')}</strong></div><div class="progress-track" role="progressbar" aria-label="${escape(t('progress') + ' · ' + studentName(student))}" aria-valuenow="${student.hizbs}" aria-valuemin="0" aria-valuemax="60"><span style="width:${student.hizbs / 60 * 100}%"></span></div><button class="text-button" data-profile="${student.id}">${t('studentProfile')}${icon('arrow', 'directional')}</button><div class="card-status"><span>${t(context.session)}</span>${badge(draft()[student.id].status)}</div></article>`).join('') || `<p class="empty-state">${t('noResults')}</p>`;
}
function attendanceScreen() {
  const students = groupStudents().filter(s => !statusFilter || (draft()[s.id].status ?? 'unmarked') === statusFilter);
  const counts = attendanceCounts(draft());
  return `${stats()}<div class="toolbar"><h2>${t('attendance')}</h2><select id="status-filter" class="filter-select" aria-label="${t('filter')}"><option value="">${t('allStatuses')}</option>${[...STATUSES, 'unmarked'].map(s => `<option value="${s}" ${statusFilter === s ? 'selected' : ''}>${t(s)}</option>`).join('')}</select></div><div class="panel attendance-panel"><div class="rollcall-header"><div><h2>${escape(groupInfo()[language])}</h2><p class="heading-caption">${dateLabel(context.date)} · ${t(context.session)}</p></div><button class="text-button" data-action="mark-rest" ${counts.unmarked === 0 ? 'disabled' : ''}>${icon('check')}${t('markRest')}</button></div><div class="attendance-totals">${[...STATUSES, 'unmarked'].map(s => `<span><b>${number(counts[s])}</b>${t(s)}</span>`).join('')}</div>${students.map(student => `<div class="rollcall-row" data-row="${student.id}"><div class="rollcall-person">${avatar(student)}<button class="person-link" data-profile="${student.id}">${escape(studentName(student))}<small>${number(student.hizbs)} ${t('hizb')}</small></button></div>${statusButtons(student.id)}</div>`).join('') || `<p class="empty-state">${t('noResults')}</p>`}<div class="rollcall-actions"><div>${saveState()}<p class="heading-caption">${t('saveHint')}</p></div>${saveButton()}</div></div>`;
}
function render() {
  document.documentElement.lang = language;
  document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
  document.title = `${t(route)} · Katatib`;
  const title = route === 'today' ? t('greeting') : t(route);
  const subtitle = t(route === 'today' ? 'subtitle' : route === 'students' ? 'studentSubtitle' : 'rollcallSubtitle');
  root.innerHTML = `<div class="app-shell"><aside class="sidebar"><a class="brand" href="#today" aria-label="Katatib"><span class="brand-symbol">${icon('book')}</span><div><div class="brand-name">${t('brand')}</div><div class="brand-caption">${t('tagline')}</div></div></a><p class="nav-label">${t('workspace')}</p><nav aria-label="${t('workspace')}">${navLinks()}</nav><div class="sidebar-bottom"><div class="sidebar-note">${icon('leaf')}<strong>${t('dataNoteTitle')}</strong>${t('dataNote')}</div><div class="teacher-chip"><span class="avatar">${language === 'ar' ? 'أم' : 'OA'}</span><div><strong>${t('teacher')}</strong><small>${t('role')}</small></div></div></div></aside><div class="workspace"><header class="topbar"><div class="breadcrumb">${icon('book')}<span>${t('school')}</span><span>/</span><b>${t('teacherSpace')}</b></div><a class="mobile-brand" href="#today" aria-label="Katatib"><span class="brand-symbol">${icon('book')}</span><span class="brand-name">${t('brand')}</span></a><div class="top-actions"><span class="demo-pill"><i class="dot"></i>${t('demo')}</span><div class="language-switch" role="group" aria-label="Language / اللغة"><button data-language="fr" class="${language === 'fr' ? 'active' : ''}" aria-pressed="${language === 'fr'}">FR</button><button data-language="ar" class="${language === 'ar' ? 'active' : ''}" aria-pressed="${language === 'ar'}">عربي</button></div><span class="avatar top-avatar">${language === 'ar' ? 'أم' : 'OA'}</span></div></header><main id="main" class="content page-enter" tabindex="-1"><div class="page-heading"><div><p class="eyebrow">${t('school')} / ${t('workspace')}</p><h1>${title}</h1><p class="heading-caption">${subtitle}</p></div><span class="heading-date">${icon('calendar')}${dateLabel(context.date)}</span></div>${storageProblem ? `<div class="notice-error" role="alert">${t('storageError')}</div>` : ''}${controls()}${route === 'today' ? todayScreen() : route === 'students' ? studentsScreen() : attendanceScreen()}<footer class="footer-note"><a href="${new URL('./live/',import.meta.url).pathname}">${language === 'ar' ? 'قاعدة الاختبار · تسجيل الدخول' : 'Base de test · Se connecter'}</a><span>${icon('shield')}${t('demoFooter')}</span><span>${t('privacyFooter')}</span></footer></main></div><nav class="mobile-nav" aria-label="${t('workspace')}">${navLinks(true)}</nav></div>`;
}

let profileTrigger;
function openProfile(id, trigger) {
  const student = STUDENTS.find(s => s.id === id && s.group === context.group);
  if (!student) return;
  profileTrigger = trigger;
  const history = studentHistory(notebook, id);
  dialog.innerHTML = `<div class="profile-header"><button class="close-button" data-action="close-profile" aria-label="${t('close')}">${icon('x')}</button>${avatar(student)}<h2 id="profile-name">${escape(studentName(student))}</h2><p>${escape(groupInfo()[language])} · ${number(student.age)} ${t('age')}</p></div><div class="profile-body"><div class="profile-stats"><div class="profile-stat"><span>${t('learned')}</span><strong>${number(student.hizbs)} <small>${t('hizb')}</small></strong></div><div class="profile-stat"><span>${t('sessionsSaved')}</span><strong>${number(history.length)}</strong></div></div><h3>${t('history')}</h3>${history.length ? history.map(entry => `<div class="history-entry"><div><strong>${dateLabel(entry.context.date, true)}</strong><small>${t(entry.context.session)}</small>${entry.records[id].note ? `<p>${escape(entry.records[id].note)}</p>` : ''}</div>${badge(entry.records[id].status)}</div>`).join('') : `<p class="profile-empty">${t('noHistory')}</p>`}<p class="profile-footnote">${t('sampleProgress')}</p></div>`;
  dialog.showModal();
}
dialog.addEventListener('close', () => profileTrigger?.isConnected && profileTrigger.focus());
dialog.addEventListener('click', event => {
  if (event.target.closest('[data-action=close-profile]')) dialog.close();
  if (event.target === dialog) {
    const box = dialog.getBoundingClientRect();
    if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close();
  }
});

root.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button || button.disabled) return;
  if (button.dataset.language) {
    language = button.dataset.language;
    try { localStorage.setItem('katatib.preview.language', language); } catch {}
    saveError = ''; render();
  } else if (button.dataset.session) {
    context = { ...context, session: button.dataset.session }; saveError = ''; render();
  } else if (button.dataset.status) {
    const { student: id, status } = button.dataset;
    if (!draft()[id]) return;
    draft()[id].status = draft()[id].status === status ? null : status;
    saveError = ''; render();
    root.querySelector(`[data-student="${id}"][data-status="${status}"]`)?.focus({ preventScroll: true });
  } else if (button.dataset.profile) {
    openProfile(button.dataset.profile, button);
  } else if (button.dataset.selectStudent) {
    currentStudent = groupStudents().findIndex(s => s.id === button.dataset.selectStudent); render();
  } else if (button.dataset.action === 'next' || button.dataset.action === 'previous') {
    currentStudent = Math.max(0, Math.min(groupStudents().length - 1, currentStudent + (button.dataset.action === 'next' ? 1 : -1))); render();
  } else if (button.dataset.action === 'mark-rest') {
    drafts.set(sessionKey(context), markRemainingPresent(draft())); render();
  } else if (button.dataset.action === 'save') {
    try {
      notebook = saveSession(localStorage, notebook, context, draft());
      drafts.set(sessionKey(context), recordsFor(notebook, context));
      saveError = ''; render(); toast(t('savedToast'));
    } catch (error) {
      saveError = t(error.code === 'conflict' ? 'conflict' : 'saveError');
      paintSaveState(); toast(saveError);
    }
  }
});
root.addEventListener('input', event => {
  if (event.target.dataset.note) {
    draft()[event.target.dataset.note].note = event.target.value; saveError = ''; paintSaveState();
  } else if (event.target.id === 'student-search') {
    query = event.target.value;
    document.getElementById('student-results').innerHTML = studentCards();
  }
});
root.addEventListener('change', event => {
  if (event.target.id === 'group-select') {
    context = { ...context, group: event.target.value }; currentStudent = 0; query = ''; statusFilter = ''; saveError = ''; render();
  } else if (event.target.id === 'session-date') {
    const candidate = { ...context, date: event.target.value };
    try { sessionKey(candidate); context = candidate; saveError = ''; render(); } catch { event.target.value = context.date; toast(t('invalidDate')); }
  } else if (event.target.id === 'status-filter') { statusFilter = event.target.value; render(); }
});
window.addEventListener('hashchange', () => { route = getRoute(); query = ''; statusFilter = ''; render(); document.getElementById('main').focus({ preventScroll: true }); window.scrollTo(0, 0); });
window.addEventListener('beforeunload', event => {
  if ([...drafts].some(([key, records]) => JSON.stringify(records) !== JSON.stringify(recordsFor(notebook, { group: key.split(':')[0], date: key.split(':')[1], session: key.split(':')[2] })))) { event.preventDefault(); event.returnValue = ''; }
});
render();
