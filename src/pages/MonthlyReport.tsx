import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { dbService } from '../services/db';
import { auth } from '../lib/firebase';
import type { Student, Attendance, Evaluation, Revision, UserProfile, Kuttab } from '../types';
import { 
  FileText, 
  Calendar as CalendarIcon, 
  Printer,
  User as UserIcon,
  CheckCircle2,
  XCircle,
  Clock,
  Award,
  History,
  Check,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getDaysInMonth, format, startOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';

interface MonthlyReportProps {
  profile: UserProfile | null;
}

export default function MonthlyReport({ profile }: MonthlyReportProps) {
  const { t, i18n } = useTranslation();
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [kuttabs, setKuttabs] = useState<Kuttab[]>([]);
  const [teachers, setTeachers] = useState<UserProfile[]>([]);
  const [selectedKuttabId, setSelectedKuttabId] = useState<string>('');
  const [showPrintView, setShowPrintView] = useState(false);
  const [loading, setLoading] = useState(true);

  const isSenior = profile?.role === 'admin' || profile?.role === 'manager';
  const isAdmin = profile?.role === 'admin';

  // Find active kuttab
  const activeKuttab = useMemo(() => {
    if (selectedKuttabId === 'all') return null;
    if (selectedKuttabId) return kuttabs.find(k => k.id === selectedKuttabId);
    if (!isAdmin && profile?.kuttabName) {
      return kuttabs.find(k => k.name === profile.kuttabName);
    }
    return isAdmin ? null : kuttabs[0]; // Admin defaults to "All" if none selected
  }, [kuttabs, selectedKuttabId, isAdmin, profile?.kuttabName]);

  const manager = useMemo(() => {
    if (!activeKuttab) return null;
    return teachers.find(t => t.uid === activeKuttab.teacherId);
  }, [activeKuttab, teachers]);

  const studyDays = useMemo(() => {
    const date = new Date(selectedYear, selectedMonth - 1, 1);
    const allDays = eachDayOfInterval({
      start: startOfMonth(date),
      end: new Date(selectedYear, selectedMonth - 1, getDaysInMonth(date))
    });

    if (!activeKuttab) return allDays;

    return allDays.filter(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const dayIdx = day.getDay();
      const schedule = activeKuttab.schedule?.lessons;
      
      if (!schedule) return false;

      // Specific overrides first
      if (schedule[dateStr]) {
        return schedule[dateStr].lessons.length > 0;
      }
      
      // Then recurring
      const recurring = schedule[dayIdx.toString()];
      return recurring && (recurring.type === 'recurring' || recurring.lessons) && recurring.lessons.length > 0;
    });
  }, [selectedYear, selectedMonth, activeKuttab]);

  useEffect(() => {
    if (!auth.currentUser || !profile) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const [
          allStudents,
          monthAttendance,
          monthEvals,
          monthRevs,
          allKuttabsData,
          allTeachersData
        ] = await Promise.all([
          isSenior 
            ? dbService.getAllStudents() 
            : dbService.getStudents(auth.currentUser!.uid, profile.kuttabName),
          dbService.getMonthlyAttendanceByTeacher(
            auth.currentUser!.uid, 
            profile.kuttabName, 
            selectedYear, 
            selectedMonth, 
            isSenior
          ),
          dbService.getMonthlyEvaluationsByTeacher(
            auth.currentUser!.uid, 
            profile.kuttabName, 
            selectedYear, 
            selectedMonth, 
            isSenior
          ),
          dbService.getMonthlyRevisionsByTeacher(
            auth.currentUser!.uid, 
            profile.kuttabName, 
            selectedYear, 
            selectedMonth, 
            isSenior
          ),
          dbService.getAllKuttabs(),
          dbService.getAllTeachers()
        ]);

        let filteredStudents = allStudents;
        if (activeKuttab) {
          filteredStudents = allStudents.filter(s => s.kuttabName === activeKuttab.name);
        } else if (!isSenior && profile.kuttabName) {
           filteredStudents = allStudents.filter(s => s.kuttabName === profile.kuttabName);
        }

        setStudents(filteredStudents);
        setAttendance(monthAttendance);
        setEvaluations(monthEvals);
        setRevisions(monthRevs);
        setKuttabs(allKuttabsData);
        setTeachers(allTeachersData);
      } catch (err) {
        console.error('Error fetching monthly report data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [auth.currentUser, profile, selectedMonth, selectedYear, isSenior, activeKuttab?.id]);

  const reportData = useMemo(() => {
    return students.map(student => {
      const rawStudentAttendance = attendance.filter(a => a.studentId === student.id);
      
      // Deduplicate by date + sessionIndex for record integrity
      const attendanceMap: Record<string, Attendance> = {};
      rawStudentAttendance.forEach(a => {
        const key = `${a.date}_${a.sessionIndex || 0}`;
        if (!attendanceMap[key] || (a.status === 'present' && attendanceMap[key].status !== 'present')) {
          attendanceMap[key] = a;
        }
      });
      const studentAttendance = Object.values(attendanceMap);
      
      const studentEvals = evaluations.filter(e => e.studentId === student.id);
      const studentRevs = revisions.filter(r => r.studentId === student.id);

      const daysData = studyDays.map(day => {
        const dateStr = format(day, 'yyyy-MM-dd');
        
        // Match day data: if multiple sessions, present takes visual priority in the grid
        const sessionsForDay = studentAttendance.filter(a => a.date === dateStr);
        const dayAttendance = sessionsForDay.length > 0
          ? sessionsForDay.find(a => a.status === 'present') || sessionsForDay[0]
          : undefined;

        return {
          date: dateStr,
          attendance: dayAttendance,
          isSessionDay: true
        };
      });

      const presentCount = daysData.filter(d => d.attendance?.status === 'present').length;
      const absentCount = daysData.filter(d => d.attendance?.status === 'absent').length;
      const excusedCount = daysData.filter(d => d.attendance?.status === 'excused').length;
      
      const attBase = presentCount + absentCount;
      const presentPercent = attBase > 0 ? Math.round((presentCount / attBase) * 100) : 0;
      const absentPercent = attBase > 0 ? 100 - presentPercent : 0;

      return {
        ...student,
        daysData,
        presentCount,
        absentCount,
        excusedCount,
        presentPercent,
        absentPercent,
        evalCount: studentEvals.length,
        revCount: studentRevs.length,
      };
    }).sort((a, b) => a.name.localeCompare(b.name, i18n.language));
  }, [students, attendance, evaluations, revisions, studyDays, i18n.language]);

  // Helper to get day statistics
  const getDayStats = (dateStr: string) => {
    const presentOnDay = attendance.filter(a => a.date === dateStr && a.status === 'present');
    const present = new Set(presentOnDay.map(a => a.studentId)).size;
    
    let timeInfo = "—";
    if (activeKuttab?.schedule?.lessons) {
      const schedule = activeKuttab.schedule.lessons;
      const day = new Date(dateStr);
      const dayIdx = day.getDay();
      
      const lessonInfo = schedule[dateStr] || schedule[dayIdx.toString()];
      if (lessonInfo && lessonInfo.lessons && lessonInfo.lessons.length > 0) {
        timeInfo = lessonInfo.lessons.join(", ");
      }
    }
    
    return { present, timeInfo };
  };

  const months = [
    { value: 1, label: t('january') || 'January' },
    { value: 2, label: t('february') || 'February' },
    { value: 3, label: t('march') || 'March' },
    { value: 4, label: t('april') || 'April' },
    { value: 5, label: t('may') || 'May' },
    { value: 6, label: t('june') || 'June' },
    { value: 7, label: t('july') || 'July' },
    { value: 8, label: t('august') || 'August' },
    { value: 9, label: t('september') || 'September' },
    { value: 10, label: t('october') || 'October' },
    { value: 11, label: t('november') || 'November' },
    { value: 12, label: t('december') || 'December' },
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  if (loading) {
    return (
      <div className="p-8 flex justify-center items-center group">
        <div className="w-12 h-12 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin shadow-lg" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 space-y-8 max-w-[100vw] mx-auto overflow-hidden">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-100 text-amber-600 rounded-xl">
              <FileText className="w-6 h-6" />
            </div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight uppercase">
              {t('monthly_report')}
            </h1>
          </div>
          <p className="text-gray-500 font-medium ml-12 flex flex-wrap items-center gap-4">
            <span>{months.find(m => m.value === selectedMonth)?.label} {selectedYear}</span>
            {manager && (
              <span className="flex items-center gap-1 text-indigo-600 font-black uppercase text-xs border-l pl-4">
                <UserIcon className="w-3 h-3" />
                {t('manager_label')}: {manager.displayName || manager.email}
              </span>
            )}
            {activeKuttab && (
              <span className="flex items-center gap-1 text-emerald-600 font-black uppercase text-xs border-l pl-4">
                <CheckCircle2 className="w-3 h-3" />
                {activeKuttab.name}
              </span>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 bg-white p-2 rounded-2xl border shadow-sm no-print">
          {isAdmin && (
            <div className="flex items-center gap-2 px-3 border-r">
              <select 
                value={selectedKuttabId}
                onChange={(e) => setSelectedKuttabId(e.target.value)}
                className="bg-transparent font-bold text-sm focus:outline-none cursor-pointer p-1"
              >
                <option value="all">{t('all_kuttabs') || 'All Kuttabs'}</option>
                {kuttabs.map(k => (
                  <option key={k.id} value={k.id}>{k.name}</option>
                ))}
              </select>
            </div>
          )}
          <div className="flex items-center gap-2 px-3 border-r">
            <CalendarIcon className="w-4 h-4 text-emerald-600" />
            <select 
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="bg-transparent font-bold text-sm focus:outline-none cursor-pointer p-1"
            >
              {months.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2 px-3">
            <select 
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-transparent font-bold text-sm focus:outline-none cursor-pointer p-1"
            >
              {years.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Table Container */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white border rounded-[32px] shadow-sm overflow-hidden text-black"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-[10px] sm:text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50/80 border-b">
                <th className="p-4 text-start font-black text-gray-400 uppercase tracking-widest min-w-[200px] sticky left-0 bg-gray-50 z-20 border-r shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                  {t('student')}
                </th>
                {studyDays.map(day => {
                  const dateStr = format(day, 'yyyy-MM-dd');
                  const isToday = isSameDay(day, new Date());
                  const dayStats = getDayStats(dateStr);
                  
                  return (
                    <th key={day.toISOString()} className={`p-2 text-center font-black border-r min-w-[100px] ${isToday ? 'bg-emerald-50/50' : 'text-gray-400'}`}>
                      <div className="flex flex-col items-center gap-1">
                        <div className="flex items-center justify-between w-full text-[7px] uppercase font-bold opacity-60">
                           <span className="truncate max-w-[45px]">{activeKuttab?.name || t('all_kuttabs')}</span>
                           <span className="truncate max-w-[45px] font-black text-indigo-500">{manager?.displayName?.split(' ')[0] || '—'}</span>
                        </div>
                        
                        <div className="flex flex-col items-center py-1 border-y w-full border-gray-100">
                          <span className="text-[8px] font-bold text-gray-400">{format(day, 'EEE')}</span>
                          <span className="text-sm font-black text-gray-900">{format(day, 'd')}</span>
                        </div>
                        
                        <div className="flex flex-col gap-0.5 items-center w-full mt-1">
                          <div className="flex items-center gap-1 text-emerald-600 text-[8px]">
                            <CheckCircle2 className="w-2 h-2" />
                            <span>{dayStats.present}</span>
                          </div>
                          <div className="flex items-center gap-1 text-gray-400 text-[7px] tracking-tighter">
                            <Clock className="w-1.5 h-1.5" />
                            <span className="truncate max-w-[80px]">{dayStats.timeInfo}</span>
                          </div>
                        </div>
                      </div>
                    </th>
                  );
                })}
                <th className="p-4 text-center font-black text-emerald-600 uppercase tracking-widest min-w-[60px] border-l bg-emerald-50/30">
                  P
                </th>
                <th className="p-2 text-[8px] text-center font-black text-emerald-500 bg-emerald-50/20">
                  P%
                </th>
                <th className="p-4 text-center font-black text-red-600 uppercase tracking-widest min-w-[60px] bg-red-50/30">
                  A
                </th>
                <th className="p-2 text-[8px] text-center font-black text-red-500 bg-red-50/20">
                  A%
                </th>
                <th className="p-4 text-center font-black text-blue-600 uppercase tracking-widest min-w-[60px] bg-blue-50/30">
                  E
                </th>
                <th className="p-4 text-center font-black text-amber-600 uppercase tracking-widest min-w-[60px] bg-amber-50/30">
                  EV
                </th>
                <th className="p-4 text-center font-black text-indigo-600 uppercase tracking-widest min-w-[60px] bg-indigo-50/30">
                  RV
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {reportData.map(student => (
                <tr key={student.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="p-4 sticky left-0 bg-white group-hover:bg-gray-50 z-10 border-r shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                    <div className="flex items-center gap-2">
                       <UserIcon className="w-3 h-3 text-gray-300" />
                       <span className="font-bold text-gray-900 truncate max-w-[150px]">{student.name}</span>
                    </div>
                  </td>
                  {student.daysData.map(day => (
                    <td key={day.date} className={`p-1 border-r text-center transition-colors ${!day.isSessionDay ? 'bg-gray-50/80 saturate-0 opacity-40' : ''}`}>
                      <div className="flex flex-col gap-0.5 items-center justify-center min-h-[32px]">
                        {day.attendance ? (
                          <div className={`p-0.5 rounded-full ${
                            day.attendance.status === 'present' ? 'text-emerald-500' :
                            day.attendance.status === 'absent' ? 'text-red-500' : 'text-blue-500'
                          }`}>
                            {day.attendance.status === 'present' ? <CheckCircle2 className="w-4 h-4" /> :
                             day.attendance.status === 'absent' ? <XCircle className="w-4 h-4" /> :
                             <Clock className="w-4 h-4" />}
                          </div>
                        ) : !day.isSessionDay ? (
                          <div className="w-1 h-1 rounded-full bg-gray-300" />
                        ) : null}
                      </div>
                    </td>
                  ))}
                  <td className="p-2 text-center font-black text-emerald-700 bg-emerald-50/20 border-l">
                    {student.presentCount}
                  </td>
                  <td className="p-1 text-[8px] text-center font-bold text-emerald-500 bg-emerald-50/10">
                    {student.presentPercent}%
                  </td>
                  <td className="p-2 text-center font-black text-red-700 bg-red-50/20">
                    {student.absentCount}
                  </td>
                  <td className="p-1 text-[8px] text-center font-bold text-red-500 bg-red-50/10">
                    {student.absentPercent}%
                  </td>
                  <td className="p-2 text-center font-black text-blue-700 bg-blue-50/20">
                    {student.excusedCount}
                  </td>
                  <td className="p-2 text-center font-black text-amber-700 bg-amber-50/20">
                    {student.evalCount}
                  </td>
                  <td className="p-2 text-center font-black text-indigo-700 bg-indigo-50/20">
                    {student.revCount}
                  </td>
                </tr>
              ))}
              {reportData.length === 0 && (
                <tr>
                  <td colSpan={studyDays.length + 8} className="p-12 text-center">
                    <p className="text-gray-400 font-bold uppercase tracking-widest text-sm">
                      {t('no_students')}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Legend */}
      <div className="flex flex-wrap gap-6 px-4 py-4 bg-gray-50 border rounded-2xl no-print">
         <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span className="text-xs font-bold text-gray-600 uppercase">{t('present')}</span>
         </div>
         <div className="flex items-center gap-2">
            <XCircle className="w-4 h-4 text-red-500" />
            <span className="text-xs font-bold text-gray-600 uppercase">{t('absent')}</span>
         </div>
         <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-500" />
            <span className="text-xs font-bold text-gray-600 uppercase">{t('excused')}</span>
         </div>
         <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-gray-300" />
            <span className="text-xs font-bold text-gray-400 uppercase">{t('no_session') || 'No Session'}</span>
         </div>
         <div className="flex items-center gap-2 ml-auto">
            <Award className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-bold text-gray-600 uppercase">{t('total_evals')}</span>
         </div>
         <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-bold text-gray-600 uppercase">{t('total_revs')}</span>
         </div>
      </div>

      {/* Export Options */}
      <div className="flex justify-end gap-3 no-print">
        <button 
          onClick={() => setShowPrintView(true)}
          className="flex items-center gap-2 px-6 py-3 bg-white border border-gray-200 text-gray-700 rounded-2xl font-black text-sm hover:bg-gray-50 transition-all shadow-sm"
        >
          <Printer className="w-4 h-4" />
          {t('print_report') || 'Print Report'}
        </button>
      </div>

      {/* Print Preview Overlay */}
      <AnimatePresence>
        {showPrintView && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-white z-[999] overflow-auto print-overlay"
          >
            {/* Toolbar */}
            <div className="sticky top-0 left-0 right-0 bg-gray-50/95 backdrop-blur-sm border-b px-8 py-4 flex justify-between items-center no-print z-50">
              <button 
                onClick={() => setShowPrintView(false)}
                className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
              
              <div className="flex items-center gap-4">
                <h2 className="text-sm font-black text-gray-900 uppercase tracking-widest">
                  {t('print_preview') || 'Print Preview'}
                </h2>
              </div>

              <button 
                onClick={() => window.print()}
                className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-black text-xs hover:shadow-lg transition-all active:scale-95"
              >
                <Printer className="w-4 h-4" />
                {t('print') || 'Print'}
              </button>
            </div>

            {/* Print Content */}
            <div className="p-8 max-w-[1200px] mx-auto bg-white min-h-screen" id="report-content">
              {/* Header inside report */}
              <div className="mb-8 border-b-2 border-gray-900 pb-6 flex justify-between items-end">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                     <div className="w-12 h-12 bg-gray-900 rounded-xl flex items-center justify-center text-white">
                        <FileText className="w-6 h-6" />
                     </div>
                     <div>
                        <h1 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">
                          {t('monthly_report')}
                        </h1>
                        <p className="text-sm font-bold text-gray-500 uppercase">
                          {months.find(m => m.value === selectedMonth)?.label} {selectedYear}
                        </p>
                     </div>
                  </div>

                     <div className="grid grid-cols-2 gap-x-12 gap-y-2">
                        <div className="flex flex-col">
                           <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('kuttab') || 'Kuttab'}</span>
                           <span className="text-sm font-black text-gray-900 italic">{activeKuttab?.name || t('all_kuttabs')}</span>
                        </div>
                     {manager && (
                        <div className="flex flex-col">
                           <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('manager') || 'Manager'}</span>
                           <span className="text-sm font-black text-indigo-600">{manager.displayName || manager.email}</span>
                        </div>
                     )}
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{t('report_generated') || 'Generated on'}</p>
                  <p className="text-xs font-bold text-gray-900">{format(new Date(), 'yyyy-MM-dd HH:mm')}</p>
                </div>
              </div>

              {/* Table */}
              <div className="border border-gray-900">
                <table className="w-full text-[9px] border-collapse">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="p-2 text-start font-black text-gray-900 border-b border-r bg-white sticky left-0 z-10 min-w-[150px]">
                        {t('student')}
                      </th>
                      {studyDays.map(day => {
                        const dateStr = format(day, 'yyyy-MM-dd');
                        const dayStats = getDayStats(dateStr);
                        return (
                          <th key={day.toISOString()} className="p-1 text-center font-black border-b border-r min-w-[60px]">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[7px] text-gray-400">{format(day, 'EEE')}</span>
                              <span className="text-[10px] text-gray-900">{format(day, 'd')}</span>
                              <div className="flex items-center justify-center gap-1 text-emerald-600 mt-0.5">
                                <span className="text-[8px]">{dayStats.present}</span>
                              </div>
                              <span className="text-[6px] text-gray-400 truncate">{dayStats.timeInfo}</span>
                            </div>
                          </th>
                        );
                      })}
                      <th className="p-2 text-center font-black border-b border-r bg-emerald-50/50 min-w-[40px]">P</th>
                      <th className="p-2 text-center font-black border-b border-r bg-red-50/50 min-w-[40px]">A</th>
                      <th className="p-2 text-center font-black border-b border-r bg-amber-50/50 min-w-[40px]">EV</th>
                      <th className="p-2 text-center font-black border-b bg-indigo-50/50 min-w-[40px]">RV</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.map(student => (
                      <tr key={student.id}>
                        <td className="p-2 font-bold text-gray-900 border-b border-r sticky left-0 bg-white min-w-[150px]">
                          {student.name}
                        </td>
                        {student.daysData.map(day => (
                          <td key={day.date} className="p-1 border-b border-r text-center">
                            <div className="flex items-center justify-center min-h-[20px]">
                              {day.attendance ? (
                                <div className={`text-[12px] font-bold ${
                                  day.attendance.status === 'present' ? 'text-emerald-500' :
                                  day.attendance.status === 'absent' ? 'text-red-500' : 'text-blue-500'
                                }`}>
                                  {day.attendance.status === 'present' ? 'P' :
                                   day.attendance.status === 'absent' ? 'A' : 'E'}
                                </div>
                              ) : null}
                            </div>
                          </td>
                        ))}
                        <td className="p-2 text-center font-black text-emerald-700 border-b border-r bg-emerald-50/20">{student.presentCount}</td>
                        <td className="p-2 text-center font-black text-red-700 border-b border-r bg-red-50/20">{student.absentCount}</td>
                        <td className="p-2 text-center font-black text-amber-700 border-b border-r bg-amber-50/20">{student.evalCount}</td>
                        <td className="p-2 text-center font-black text-indigo-700 border-b bg-indigo-50/20">{student.revCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Legend Footer */}
              <div className="mt-8 grid grid-cols-4 gap-4 text-[9px] font-bold uppercase text-gray-500 no-print">
                <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> P: {t('present')}</div>
                <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-red-500"></div> A: {t('absent')}</div>
                <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-amber-600"></div> EV: {t('evaluations')}</div>
                <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-indigo-600"></div> RV: {t('revisions')}</div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @media print {
          /* Hide everything by default */
          body * {
            visibility: hidden;
          }
          
          /* Only show the report content and its contents */
          .print-overlay,
          .print-overlay *,
          #report-content, 
          #report-content * { 
            visibility: visible !important; 
          }

          /* Position report content at the top left of the printed page */
          #report-content { 
            position: absolute !important; 
            top: 0 !important; 
            left: 0 !important; 
            width: 100% !important; 
            max-width: none !important; 
            padding: 0 !important; 
            margin: 0 !important;
            background: white !important;
            z-index: 9999 !important;
          }

          /* Hide the toolbar/overlay background during print */
          .no-print, 
          .print-overlay { 
            background: transparent !important;
            border: none !important;
          }
          .no-print { display: none !important; }

          table { 
            width: 100% !important;
            table-layout: fixed;
            page-break-inside: auto; 
            border-collapse: collapse !important;
          }
          tr { page-break-inside: avoid; page-break-after: auto; }
          thead { display: table-header-group; }
          tfoot { display: table-footer-group; }
          
          /* Remove shadows and rounded corners for print */
          .shadow-sm, .shadow-xl, .shadow-lg, .shadow-2xl { box-shadow: none !important; }
          .rounded-xl, .rounded-2xl, .rounded-[32px], .rounded-none { border-radius: 0 !important; }
        }
      `}</style>
    </div>
  );
}
