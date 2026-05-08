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
  Check
} from 'lucide-react';
import { motion } from 'motion/react';
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
  const [loading, setLoading] = useState(true);

  const isSenior = profile?.role === 'admin' || profile?.role === 'manager';

  const daysInMonth = useMemo(() => {
    const date = new Date(selectedYear, selectedMonth - 1, 1);
    return eachDayOfInterval({
      start: startOfMonth(date),
      end: new Date(selectedYear, selectedMonth - 1, getDaysInMonth(date))
    });
  }, [selectedYear, selectedMonth]);

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
          allKuttabsData
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
          dbService.getAllKuttabs()
        ]);

        let filteredStudents = allStudents;
        if (!isSenior && profile.kuttabName) {
           filteredStudents = allStudents.filter(s => s.kuttabName === profile.kuttabName);
        }

        setStudents(filteredStudents);
        setAttendance(monthAttendance);
        setEvaluations(monthEvals);
        setRevisions(monthRevs);
        setKuttabs(allKuttabsData);
      } catch (err) {
        console.error('Error fetching monthly report data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [auth.currentUser, profile, selectedMonth, selectedYear, isSenior]);

  const reportData = useMemo(() => {
    return students.map(student => {
      const rawStudentAttendance = attendance.filter(a => a.studentId === student.id);
      
      // Deduplicate by date, prioritizing 'present' for legacy data consistency
      const attendanceMap: Record<string, Attendance> = {};
      rawStudentAttendance.forEach(a => {
        const existing = attendanceMap[a.date];
        if (!existing || (a.status === 'present' && existing.status !== 'present')) {
          attendanceMap[a.date] = a;
        }
      });
      const studentAttendance = Object.values(attendanceMap);
      
      const studentEvals = evaluations.filter(e => e.studentId === student.id);
      const studentRevs = revisions.filter(r => r.studentId === student.id);

      const daysData = daysInMonth.map(day => {
        const dateStr = format(day, 'yyyy-MM-dd');
        const dayIdx = day.getDay();
        
        // Find kuttab for this student to check if it's a study day
        const kName = student.kuttabName?.trim().toLowerCase();
        const studentKuttab = kuttabs.find(k => k.name.trim().toLowerCase() === kName);
        const dateStrKey = format(day, 'yyyy-MM-dd');
        
        let isSessionDay = false;
        const schedule = studentKuttab?.schedule?.lessons;
        if (schedule) {
          // Specific overrides first
          const specific = schedule[dateStrKey];
          if (specific) {
            isSessionDay = specific.lessons.length > 0;
          } else {
            // Then recurring
            const recurring = schedule[dayIdx.toString()];
            isSessionDay = recurring && recurring.type === 'recurring' && recurring.lessons.length > 0;
          }
        }

        return {
          date: dateStr,
          attendance: attendanceMap[dateStr],
          isSessionDay
        };
      });

      const presentCount = studentAttendance.filter(a => a.status === 'present').length;
      const absentCount = studentAttendance.filter(a => a.status === 'absent').length;
      const excusedCount = studentAttendance.filter(a => a.status === 'excused').length;

      return {
        ...student,
        daysData,
        presentCount,
        absentCount,
        excusedCount,
        evalCount: studentEvals.length,
        revCount: studentRevs.length,
      };
    }).sort((a, b) => a.name.localeCompare(b.name, i18n.language));
  }, [students, attendance, evaluations, revisions, daysInMonth, kuttabs, i18n.language]);

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
          <p className="text-gray-500 font-medium ml-12">
            {months.find(m => m.value === selectedMonth)?.label} {selectedYear}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 bg-white p-2 rounded-2xl border shadow-sm no-print">
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
                {daysInMonth.map(day => {
                  const isToday = isSameDay(day, new Date());
                  return (
                    <th key={day.toISOString()} className={`p-2 text-center font-black border-r min-w-[40px] ${isToday ? 'text-emerald-600 bg-emerald-50/50' : 'text-gray-400'}`}>
                      <div className="flex flex-col items-center">
                        <span className="text-[8px] opacity-70">{format(day, 'EEE')}</span>
                        <span>{format(day, 'd')}</span>
                      </div>
                    </th>
                  );
                })}
                <th className="p-4 text-center font-black text-emerald-600 uppercase tracking-widest min-w-[60px] border-l bg-emerald-50/30">
                  P
                </th>
                <th className="p-4 text-center font-black text-red-600 uppercase tracking-widest min-w-[60px] bg-red-50/30">
                  A
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
                  <td className="p-2 text-center font-black text-red-700 bg-red-50/20">
                    {student.absentCount}
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
                  <td colSpan={daysInMonth.length + 6} className="p-12 text-center">
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
          onClick={() => window.print()}
          className="flex items-center gap-2 px-6 py-3 bg-white border border-gray-200 text-gray-700 rounded-2xl font-black text-sm hover:bg-gray-50 transition-all shadow-sm"
        >
          <Printer className="w-4 h-4" />
          {t('print_report') || 'Print Report'}
        </button>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; padding: 0 !important; }
          .max-w-7xl, .max-w-\[100vw\] { max-width: none !important; margin: 0 !important; overflow: visible !important; }
          .shadow-sm, .shadow-xl { shadow: none !important; }
          .rounded-[32px] { border-radius: 0 !important; }
          table { width: 100% !important; border-collapse: collapse !important; font-size: 8px !important; }
          th, td { border: 1px solid #eee !important; padding: 2px !important; }
          .sticky { position: static !important; }
        }
      `}</style>
    </div>
  );
}
