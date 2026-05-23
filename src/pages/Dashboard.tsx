import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { toast } from 'react-hot-toast';
import { Users, CheckCircle, Award, AlertCircle, TrendingUp, History } from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { dbService } from '../services/db';
import { auth } from '../lib/firebase';
import type { Student, Attendance, Evaluation, Revision, UserProfile, Kuttab, NextRevision } from '../types';

import { useTranslation } from 'react-i18next';
import { formatDate } from '../lib/dateUtils';
import KuttabWeeklyOverview from '../components/KuttabWeeklyOverview';

interface DashboardProps {
  profile: UserProfile | null;
}

export default function Dashboard({ profile }: DashboardProps) {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';
  
  const [students, setStudents] = useState<Student[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<Attendance[]>([]);
  const [performanceData, setPerformanceData] = useState<Evaluation[]>([]);
  const [revisionData, setRevisionData] = useState<Revision[]>([]);
  const [kuttabs, setKuttabs] = useState<Kuttab[]>([]);
  const [nextRevisions, setNextRevisions] = useState<NextRevision[]>([]);
  const [allEvaluations, setAllEvaluations] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(true);

  const isSenior = profile?.role === 'admin' || profile?.role === 'manager';

  const attendanceData = useMemo(() => {
    if (!attendanceRecords) return [];
    
    const dayKeys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const now = new Date();
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now);
      d.setDate(now.getDate() - (6 - i));
      
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      return {
        dateStr: dateStr,
        dayIndex: d.getDay()
      };
    });

    return last7Days.map(day => {
      const allDayRecords = attendanceRecords.filter(r => r.date === day.dateStr);
      
      const uniqueStudentRecords = new Map<string, Attendance>();
      allDayRecords.forEach(record => {
        uniqueStudentRecords.set(record.studentId, record);
      });

      const dayRecords = Array.from(uniqueStudentRecords.values());
      const label = t(`day_${dayKeys[day.dayIndex]}`);
      
      if (dayRecords.length === 0) return { name: label, rate: 0, present: 0 };
      
      const presentCount = dayRecords.filter(r => r.status === 'present').length;
      const absentCount = dayRecords.filter(r => r.status === 'absent').length;
      const base = presentCount + absentCount;
      const rate = base > 0 ? Math.round((presentCount / base) * 100) : 0;
      return { name: label, rate: rate, present: presentCount };
    });
  }, [attendanceRecords, t]);

  useEffect(() => {
    if (!auth.currentUser || !profile) return;
    
    setLoading(true);

    const fetchData = async () => {
      try {
        const [weeklyAttendance, weeklyEval, weeklyRev, allKuttabs] = await Promise.all([
          dbService.getWeeklyAttendanceByTeacher(auth.currentUser!.uid, profile.kuttabName, isSenior),
          dbService.getWeeklyEvaluationsByTeacher(auth.currentUser!.uid, profile.kuttabName, isSenior),
          dbService.getWeeklyRevisionsByTeacher(auth.currentUser!.uid, profile.kuttabName, isSenior),
          (isSenior || profile.kuttabName) ? dbService.getAllKuttabs() : Promise.resolve([])
        ]);
        
        let filteredKuttabs = allKuttabs;
        if (!isSenior && profile.kuttabName) {
          filteredKuttabs = allKuttabs.filter(k => k.name === profile.kuttabName);
        }

        setPerformanceData(weeklyEval);
        setRevisionData(weeklyRev);
        setAttendanceRecords(weeklyAttendance);
        setKuttabs(filteredKuttabs);
      } catch (err) {
        console.error('Error fetching dashboard stats:', err);
      }
    };

    fetchData();

    const unsubStudents = dbService.subscribeStudents(
      auth.currentUser.uid,
      profile.kuttabName,
      isSenior,
      (studentList) => {
        setStudents(studentList);
        setLoading(false);
      }
    );

    const unsubNextRevisions = dbService.subscribeNextRevisions(
      auth.currentUser.uid,
      profile.kuttabName,
      isSenior,
      (revisionsList) => {
        setNextRevisions(revisionsList);
      }
    );

    const unsubAllEvaluations = dbService.subscribeAllEvaluations(
      auth.currentUser.uid,
      profile.kuttabName,
      isSenior,
      (evaluationsList) => {
        setAllEvaluations(evaluationsList);
      }
    );

    return () => {
      unsubStudents();
      unsubNextRevisions();
      unsubAllEvaluations();
    };
  }, [auth.currentUser, profile, isSenior]);

  const activeDaysData = attendanceData.filter(d => d.present > 0 || students.length > 0);
  const activeDaysWithRecords = activeDaysData.length;
  
  const displayAvg = activeDaysWithRecords > 0 
    ? Math.round(attendanceData.reduce((acc, curr) => acc + curr.rate, 0) / attendanceData.length) + '%'
    : '0%';

  const avgAccuracy = performanceData.length > 0
    ? Math.round(performanceData.reduce((acc, curr) => acc + curr.accuracyScore, 0) / performanceData.length) + '%'
    : '0%';

  const avgRevision = revisionData.length > 0
    ? Math.round(revisionData.reduce((acc, curr) => acc + curr.qualityScore, 0) / revisionData.length) + '%'
    : '0%';

  const stats = [
    { label: t('total_students'), value: students.length.toString(), icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: t('avg_attendance'), value: displayAvg, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: t('avg_performance'), value: avgAccuracy, icon: Award, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: t('revision'), value: avgRevision, icon: History, color: 'text-purple-600', bg: 'bg-purple-50' },
  ];

  const syncAllStudents = async () => {
    if (!auth.currentUser || !profile || students.length === 0) return;
    setLoading(true);
    try {
      await Promise.all(students.map(s => dbService.updateStudentStats(s.id)));
      toast.success(t('scores_synced'));
    } catch (err) {
      console.error('Error syncing scores:', err);
      toast.error(t('sync_failed'));
    } finally {
      setLoading(false);
    }
  };

  const getPortionLabel = (q: number, identifier?: string) => {
    if (identifier) {
      if (identifier.startsWith('t')) return t(`thumun_${identifier.substring(1)}`);
      if (identifier.startsWith('r')) return t(`rubu_${identifier.substring(1)}`);
      if (identifier.startsWith('n')) return t(`nisf_${identifier.substring(1)}`);
      if (identifier === 'h1') return t('hizb');
    }
    return isRtl 
      ? `ثمن ${q}` 
      : `${q} portion${q > 1 ? 's' : ''}`;
  };

  const nextRevisionsFiltered = useMemo(() => {
    return nextRevisions
      .map(rev => {
        const student = students.find(s => s.id === rev.studentId);
        return student ? { ...rev, studentName: student.name } : null;
      })
      .filter((rev): rev is (NextRevision & { studentName: string }) => rev !== null);
  }, [nextRevisions, students]);

  const lastEvaluationPerStudent = useMemo(() => {
    return students.map(student => {
      const latestEval = allEvaluations.find(ev => ev.studentId === student.id);
      return {
        studentName: student.name,
        studentId: student.id,
        evaluation: latestEval
      };
    }).filter(item => item.evaluation !== undefined && item.evaluation !== null);
  }, [students, allEvaluations]);

  const getRemainingDays = (dueDateStr: string): { days: number, label: string, color: string } => {
    try {
      const due = new Date(dueDateStr + 'T00:00:00');
      const now = new Date();
      now.setHours(0,0,0,0);
      due.setHours(0,0,0,0);
      const diffTime = due.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      let label = '';
      let color = '';
      if (diffDays === 0) {
        label = isRtl ? 'اليوم' : 'Today';
        color = 'text-amber-600 bg-amber-50 border border-amber-100 font-bold';
      } else if (diffDays < 0) {
        const absDays = Math.abs(diffDays);
        label = absDays === 1 
          ? (isRtl ? 'متأخر يوم' : '1 day ago') 
          : (isRtl ? `متأخر ${absDays} أيام` : `${absDays} days overdue`);
        color = 'text-rose-600 bg-rose-50 border border-rose-100 font-bold';
      } else if (diffDays === 1) {
        label = isRtl ? 'غداً' : 'Tomorrow';
        color = 'text-indigo-600 bg-indigo-50 border border-indigo-100 font-bold';
      } else {
        label = isRtl ? `خلال ${diffDays} أيام` : `In ${diffDays} days`;
        color = 'text-slate-600 bg-slate-50 border border-slate-100 font-bold';
      }
      return { days: diffDays, label, color };
    } catch {
      return { days: 0, label: dueDateStr, color: 'text-gray-600 bg-gray-50' };
    }
  };

  return (
    <div className="p-4 sm:p-8 space-y-8">
      <header className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">{t('program_overview')}</h2>
          <p className="text-gray-500 mt-1">{t('real_time_analytics')}</p>
        </div>
        <button 
          onClick={syncAllStudents}
          disabled={loading}
          className="w-full sm:w-auto px-6 py-2.5 bg-white border border-gray-100 text-gray-600 rounded-xl hover:bg-gray-50 font-bold transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <TrendingUp className="w-5 h-5 text-emerald-500" />
          {t('sync_all')}
        </button>
      </header>

      {/* 1. Next Revision Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-2xl border shadow-sm overflow-hidden flex flex-col text-black font-sans"
      >
        <div className="p-6 bg-slate-50 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
          <div>
            <h3 className="font-black text-lg text-slate-800 tracking-tight">
              {isRtl ? 'مهام المراجعة التالية المجدولة' : 'Next Scheduled Revision Tasks'}
            </h3>
            <p className="text-xs text-slate-400 font-bold mt-1 tracking-wide uppercase">
              {isRtl ? 'مهام المراجعة الدورية القادمة لطلاب الكُتّاب' : 'Upcoming scheduled revision sessions for students'}
            </p>
          </div>
          <span className="text-[10px] font-black text-indigo-650 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100 uppercase">
            {nextRevisionsFiltered.length} {isRtl ? 'مهام مجدولة' : 'Tasks'}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse" dir={isRtl ? 'rtl' : 'ltr'}>
            <thead>
              <tr className="bg-slate-50/50 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100 select-none">
                <th className={`px-6 py-4 ${isRtl ? 'text-right' : 'text-left'}`}>{isRtl ? 'الطالب' : 'Student'}</th>
                <th className={`px-6 py-4 ${isRtl ? 'text-right' : 'text-left'}`}>{isRtl ? 'الموضع المستهدف (سورة / حزب)' : 'Hizb / Surah'}</th>
                <th className={`px-6 py-4 ${isRtl ? 'text-right' : 'text-left'}`}>{isRtl ? 'الكمية' : 'Quantity'}</th>
                <th className={`px-6 py-4 ${isRtl ? 'text-right' : 'text-left'}`}>{isRtl ? 'تاريخ المراجعة' : 'Due Date'}</th>
                <th className={`px-6 py-4 ${isRtl ? 'text-right' : 'text-left'}`}>{isRtl ? 'الوقت المتبقي' : 'Remaining Time'}</th>
                <th className={`px-6 py-4 text-center`}>{isRtl ? 'الأهمية' : 'Priority'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-black">
              {nextRevisionsFiltered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-bold italic">
                    {isRtl ? 'لا توجد مراجعات قادمة مجدولة لطلابك حالياً.' : 'No upcoming scheduled revision tasks.'}
                  </td>
                </tr>
              ) : (
                nextRevisionsFiltered.slice(0, 5).map((rev, idx) => {
                  const rem = getRemainingDays(rev.dueDate);
                  
                  let priorityLabel = isRtl ? 'منخفض' : 'Low';
                  let priorityBadge = 'bg-slate-50 text-slate-655 border-slate-200';
                  
                  if (rem.days <= 0) {
                    priorityLabel = isRtl ? 'عالي جداً' : 'High';
                    priorityBadge = 'bg-rose-50 text-rose-600 border-rose-100 font-black animate-pulse';
                  } else if (rem.days <= 2) {
                    priorityLabel = isRtl ? 'متوسط' : 'Medium';
                    priorityBadge = 'bg-amber-50 text-amber-700 border-amber-100';
                  }

                  return (
                    <tr 
                      key={rev.id || idx} 
                      className="hover:bg-slate-50/50 transition-colors cursor-pointer group"
                      onClick={() => navigate(`/students/${rev.studentId}`)}
                    >
                      <td className="px-6 py-4 font-bold text-slate-900 group-hover:text-emerald-655 transition-colors">
                        {rev.studentName}
                      </td>
                      <td className="px-6 py-4 font-extrabold text-slate-800">
                        {rev.surahName || `${isRtl ? 'الحزب' : 'Hizb'} ${rev.hizbNumber}`}
                      </td>
                      <td className="px-6 py-4 text-slate-500 font-bold">
                        {getPortionLabel(rev.quantity, rev.quantityIdentifier)}
                      </td>
                      <td className="px-6 py-4 text-slate-400 font-bold">
                        {formatDate(rev.dueDate)}
                      </td>
                      <td className="px-6 py-3.5">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold border ${rem.color}`}>
                          {rem.label}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-center">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-black border ${priorityBadge}`}>
                          {priorityLabel}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* 2. Last Evaluation Per Student Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-2xl border shadow-sm overflow-hidden flex flex-col text-black font-sans"
      >
        <div className="p-6 bg-slate-50 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
          <div>
            <h3 className="font-black text-lg text-slate-800 tracking-tight">
              {isRtl ? 'آخر تقييم لكل طالب' : 'Last Evaluation for Each Student'}
            </h3>
            <p className="text-xs text-slate-400 font-bold mt-1 tracking-wide uppercase">
              {isRtl ? 'آخر تقدير ومستوى أداء جرى رصده لكل طالب في الكُتّاب' : 'One latest evaluation score per registered student'}
            </p>
          </div>
          <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100 uppercase">
            {lastEvaluationPerStudent.length} {isRtl ? 'طلاب مقيَّمين' : 'Evaluated'}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse" dir={isRtl ? 'rtl' : 'ltr'}>
            <thead>
              <tr className="bg-slate-50/50 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100 select-none">
                <th className={`px-6 py-4 ${isRtl ? 'text-right' : 'text-left'}`}>{isRtl ? 'الطالب' : 'Student'}</th>
                <th className={`px-6 py-4 ${isRtl ? 'text-right' : 'text-left'}`}>{isRtl ? 'آخر موضع مقيم (سورة / حزب)' : 'Last Evaluated Hizb'}</th>
                <th className={`px-6 py-4 ${isRtl ? 'text-right' : 'text-left'}`}>{isRtl ? 'الكمية' : 'Quantity'}</th>
                <th className={`px-6 py-4 text-center`}>{isRtl ? 'الدرجة والتقييم' : 'Score'}</th>
                <th className={`px-6 py-4 text-center`}>{isRtl ? 'عدد الأخطاء' : 'Mistakes'}</th>
                <th className={`px-6 py-4 ${isRtl ? 'text-right' : 'text-left'}`}>{isRtl ? 'تاريخ التقييم' : 'Evaluation Date'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-black">
              {lastEvaluationPerStudent.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-bold italic">
                    {isRtl ? 'لا توجد تقييمات مسبقة للطلاب في الكُتّاب.' : 'No evaluations recorded yet for students.'}
                  </td>
                </tr>
              ) : (
                lastEvaluationPerStudent.slice(0, 10).map((item, idx) => {
                  const ev = item.evaluation;
                  if (!ev) return null;

                  let scoreBadge = 'bg-rose-50 text-rose-600 border-rose-100';
                  if (ev.accuracyScore >= 95) scoreBadge = 'bg-emerald-50 text-emerald-600 border-emerald-100';
                  else if (ev.accuracyScore >= 85) scoreBadge = 'bg-indigo-50 text-indigo-650 border-indigo-100';
                  else if (ev.accuracyScore >= 75) scoreBadge = 'bg-amber-50 text-amber-700 border-amber-100';

                  return (
                    <tr 
                      key={ev.id || idx} 
                      className="hover:bg-slate-50/50 transition-colors cursor-pointer group"
                      onClick={() => navigate(`/students/${item.studentId}`)}
                    >
                      <td className="px-6 py-4 font-bold text-slate-900 group-hover:text-emerald-655 transition-colors">
                        {item.studentName}
                      </td>
                      <td className="px-6 py-4 font-extrabold text-slate-800">
                        {ev.surahName || `${isRtl ? 'الحزب' : 'Hizb'} ${ev.hizbNumber}`}
                      </td>
                      <td className="px-6 py-4 text-slate-500 font-bold">
                        {getPortionLabel(ev.quantity, ev.quantityIdentifier)}
                      </td>
                      <td className="px-6 py-3.5 text-center">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-black border ${scoreBadge}`}>
                          {ev.accuracyScore}%
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-center">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black ${
                          ev.mistakesCount > 3 
                            ? 'bg-rose-50 text-rose-650 border border-rose-100' 
                            : ev.mistakesCount > 0 
                              ? 'bg-amber-50 text-amber-650 border border-amber-100' 
                              : 'bg-emerald-50 text-emerald-650 border border-emerald-100'
                        }`}>
                          {ev.mistakesCount}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-400 font-bold">
                        {formatDate(ev.date)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-black">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="p-6 bg-white rounded-2xl border flex items-center gap-4 shadow-sm"
          >
            <div className={`p-3 rounded-xl ${stat.bg} ${stat.color}`}>
              <stat.icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">{stat.label}</p>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {kuttabs.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <KuttabWeeklyOverview kuttabs={kuttabs} />
        </motion.div>
      )}

      {/* Engagement graph & Insights section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 text-black">
        <div className="p-6 bg-white rounded-2xl border shadow-sm space-y-4">
          <h3 className="font-bold text-lg">{t('weekly_engagement')}</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={attendanceData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis unit="%" />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: any, name: string, props: any) => {
                    if (name === 'rate') {
                      return [`${props.payload.present} ${t('student')}`, t('attendance')];
                    }
                    return [value, name];
                  }}
                />
                <Bar dataKey="rate" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="p-6 bg-white rounded-2xl border shadow-sm space-y-4 text-black">
          <h3 className="font-bold text-lg">{t('system_insights')}</h3>
          <div className="space-y-4 pt-4">
            <div className="flex items-start gap-4 p-4 bg-emerald-50 rounded-xl">
              <CheckCircle className="w-6 h-6 text-emerald-600 shrink-0" />
              <div>
                <p className="font-bold text-emerald-900">{t('database_healthy')}</p>
                <p className="text-sm text-emerald-700">{t('database_healthy_desc')}</p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-4 bg-blue-50 rounded-xl">
              <Users className="w-6 h-6 text-blue-600 shrink-0" />
              <div>
                <p className="font-bold text-blue-900">{t('user_session')}</p>
                <p className="text-sm text-blue-700">
                  {t('connected_as', { email: auth.currentUser?.isAnonymous ? t('teacher') : auth.currentUser?.email })}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-black">
        <div className="lg:col-span-2 p-6 bg-white rounded-2xl border shadow-sm">
          <h3 className="font-bold text-lg mb-4">{t('recently_enrolled')}</h3>
          <div className="overflow-x-auto">
            {students.length === 0 ? (
              <p className="py-8 text-center text-gray-500">{t('no_data')}</p>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="text-left text-xs uppercase text-gray-400 tracking-wider">
                    <th className={`pb-4 ${isRtl ? 'text-right' : 'text-left'}`}>{t('student')}</th>
                    <th className="pb-4 text-center">{t('kuttab')}</th>
                    <th className="pb-4 text-center">{t('age')}</th>
                    <th className={`pb-4 ${isRtl ? 'text-left' : 'text-right'}`}>{t('enrollment_date')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-black">
                  {students.slice(0, 5).map((student) => (
                    <tr 
                      key={student.id} 
                      className="group hover:bg-gray-55 transition-colors cursor-pointer"
                      onClick={() => navigate(`/students/${student.id}`)}
                    >
                      <td className="py-4 font-medium text-gray-900">{student.name}</td>
                      <td className="py-4 text-center text-gray-600">
                        <span className="px-2 py-1 bg-gray-100 rounded-lg text-xs">
                          {student.kuttabName || 'N/A'}
                        </span>
                      </td>
                      <td className="py-4 text-center text-gray-600">{student.age}</td>
                      <td className={`py-4 ${isRtl ? 'text-left' : 'text-right'}`}>
                        <span className="text-sm text-gray-500">
                          {formatDate(student.enrollmentDate)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="p-6 bg-white rounded-2xl border shadow-sm space-y-4 border-l-4 border-l-amber-400">
          <div className="flex items-center gap-2 text-amber-700">
            <AlertCircle className="w-5 h-5" />
            <h3 className="font-bold text-lg">{t('program_health')}</h3>
          </div>
          <div className="space-y-4">
            <div className="p-3 bg-amber-50 rounded-lg text-sm text-amber-800">
              {t('program_scaling')}
            </div>
            <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-800">
              {t('daily_backup')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
