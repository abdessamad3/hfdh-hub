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
import type { Student, Attendance, Evaluation, Revision, UserProfile } from '../types';

import { useTranslation } from 'react-i18next';
import { formatDate } from '../lib/dateUtils';

interface DashboardProps {
  profile: UserProfile | null;
}

export default function Dashboard({ profile }: DashboardProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [students, setStudents] = useState<Student[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<Attendance[]>([]);
  const [performanceData, setPerformanceData] = useState<Evaluation[]>([]);
  const [revisionData, setRevisionData] = useState<Revision[]>([]);
  const [loading, setLoading] = useState(true);

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
      const rate = Math.round((presentCount / dayRecords.length) * 100);
      return { name: label, rate: isNaN(rate) ? 0 : rate, present: presentCount };
    });
  }, [attendanceRecords, t]);

  useEffect(() => {
    if (!auth.currentUser || !profile) return;
    
    setLoading(true);
    const isAdmin = profile.role === 'admin';

    const fetchWeeklyStats = async () => {
      try {
        const [weeklyAttendance, weeklyEval, weeklyRev] = await Promise.all([
          dbService.getWeeklyAttendanceByTeacher(auth.currentUser!.uid, profile.kuttabName, isAdmin),
          dbService.getWeeklyEvaluationsByTeacher(auth.currentUser!.uid, profile.kuttabName, isAdmin),
          dbService.getWeeklyRevisionsByTeacher(auth.currentUser!.uid, profile.kuttabName, isAdmin)
        ]);
        setPerformanceData(weeklyEval);
        setRevisionData(weeklyRev);
        setAttendanceRecords(weeklyAttendance);
      } catch (err) {
        console.error('Error fetching weekly stats:', err);
      }
    };

    fetchWeeklyStats();

    const unsubscribe = dbService.subscribeStudents(
      auth.currentUser.uid,
      profile.kuttabName,
      isAdmin,
      (studentList) => {
        setStudents(studentList);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [auth.currentUser, profile]);

  const activeDaysData = attendanceData.filter(d => d.present > 0 || students.length > 0);
  const activeDaysWithRecords = activeDaysData.length;
  
  const displayAvg = activeDaysWithRecords > 0 
    ? Math.round(attendanceData.reduce((acc, curr) => acc + curr.rate, 0) / attendanceData.length) + '%'
    : '0%';

  const avgAccuracy = performanceData.length > 0
    ? Math.round(performanceData.reduce((acc, curr) => acc + curr.accuracyScore, 0) / performanceData.length) + '%'
    : 'N/A';

  const avgRevision = revisionData.length > 0
    ? Math.round(revisionData.reduce((acc, curr) => acc + curr.qualityScore, 0) / revisionData.length) + '%'
    : 'N/A';

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
                    <th className="pb-4">{t('student')}</th>
                    <th className="pb-4 text-center">{t('kuttab')}</th>
                    <th className="pb-4 text-center">{t('age')}</th>
                    <th className="pb-4 text-right">{t('enrollment_date')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {students.slice(0, 5).map((student) => (
                    <tr 
                      key={student.id} 
                      className="group hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => navigate(`/students/${student.id}`)}
                    >
                      <td className="py-4 font-medium text-gray-900">{student.name}</td>
                      <td className="py-4 text-center text-gray-600">
                        <span className="px-2 py-1 bg-gray-100 rounded-lg text-xs">
                          {student.kuttabName || 'N/A'}
                        </span>
                      </td>
                      <td className="py-4 text-center text-gray-600">{student.age}</td>
                      <td className="py-4 text-right">
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

