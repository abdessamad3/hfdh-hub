import { useState, useEffect } from 'react';
import { auth } from '../lib/firebase';
import { dbService } from '../services/db';
import { Student, Attendance, Evaluation, Revision, NextRevision, Kuttab } from '../types';
import { 
  BookOpen, 
  CheckCircle, 
  Award, 
  TrendingUp, 
  Calendar, 
  Clock,
  Star,
  History,
  ClipboardList,
  ChevronRight
} from 'lucide-react';
import { motion } from 'motion/react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts';
import { useTranslation } from 'react-i18next';
import { formatDate, isToday } from '../lib/dateUtils';
import { formatQuranProgress } from '../lib/quranUtils';
import MemorizationGrid from '../components/MemorizationGrid';
import StudentCalendar from '../components/StudentCalendar';
import KuttabWeeklyOverview from '../components/KuttabWeeklyOverview';

export default function StudentPortal() {
  const { t } = useTranslation();
  const getPortionLabel = (q: number, identifier?: string) => {
    if (identifier) {
      if (identifier.startsWith('t')) return t(`thumun_${identifier.substring(1)}`);
      if (identifier.startsWith('r')) return t(`rubu_${identifier.substring(1)}`);
      if (identifier.startsWith('n')) return t(`nisf_${identifier.substring(1)}`);
      if (identifier === 'h1') return t('hizb') + ' 1';
    }
    if (q >= 1 && q <= 8) return t(`thumun_${q}`);
    return q > 0 ? `${q} ${t('unit_thumn')}` : '';
  };
  const [data, setData] = useState<{
    student: Student;
    attendance: Attendance[];
    evaluations: Evaluation[];
    revisions: Revision[];
    nextTasks: NextRevision[];
    kuttabs: Kuttab[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribes: (() => void)[] = [];

    const setupSubscriptions = async () => {
      if (!auth.currentUser?.email) return;
      try {
        setLoading(true);
        const email = auth.currentUser.email.toLowerCase();
        
        let currentStudentId: string | null = null;
        let subUnsubscribes: (() => void)[] = [];

        const mainUnsubscribe = dbService.subscribeStudentProfile(email, (student) => {
          if (!student) {
            subUnsubscribes.forEach(u => u());
            subUnsubscribes = [];
            currentStudentId = null;
            setData(null);
            setLoading(false);
            return;
          }

          setData(prev => prev ? { ...prev, student } : { 
            student, 
            attendance: [], 
            evaluations: [], 
            revisions: [], 
            nextTasks: [],
            kuttabs: []
          });

          // Only reset sub-subscriptions if the student ID changed
          if (student.id === currentStudentId) {
            setLoading(false);
            return;
          }

          // Clear previous sub-subscriptions
          subUnsubscribes.forEach(u => u());
          subUnsubscribes = [];
          currentStudentId = student.id;

          const studentId = student.id;
          
          subUnsubscribes.push(dbService.subscribeStudentNextRevisions(studentId, email, (tasks) => {
            setData(prev => prev ? { ...prev, nextTasks: tasks } : null);
          }));

          subUnsubscribes.push(dbService.subscribeStudentAttendance(studentId, email, (attendance) => {
            setData(prev => prev ? { ...prev, attendance } : null);
          }));

          subUnsubscribes.push(dbService.subscribeStudentEvaluations(studentId, email, (evaluations) => {
            setData(prev => prev ? { ...prev, evaluations } : null);
          }));

          subUnsubscribes.push(dbService.subscribeStudentRevisions(studentId, email, (revisions) => {
            setData(prev => prev ? { ...prev, revisions } : null);
          }));

          // Fetch kuttab info
          if (student.kuttabName) {
            dbService.getAllKuttabs().then(allKuttabs => {
              const myKuttab = allKuttabs.filter(k => k.name === student.kuttabName);
              setData(prev => prev ? { ...prev, kuttabs: myKuttab } : null);
            });
          }
          
          setLoading(false);
        });

        unsubscribes.push(mainUnsubscribe);
        // Add a cleanup for subUnsubscribes to the main cleanup too
        unsubscribes.push(() => subUnsubscribes.forEach(u => u()));

      } catch (err) {
        console.error('Error setting up portal subscriptions:', err);
        setLoading(false);
      }
    };

    setupSubscriptions();

    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
        <p className="text-gray-500 font-medium animate-pulse">{t('loading_progress')}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-8 max-w-2xl mx-auto text-center space-y-6">
        <div className="w-20 h-20 bg-amber-50 text-amber-500 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
          <Clock className="w-10 h-10" />
        </div>
        <h2 className="text-3xl font-black text-gray-900">{t('portal_pending')}</h2>
        <p className="text-gray-600 leading-relaxed">
          {t('portal_pending_subtitle', { email: auth.currentUser?.email })}
        </p>
      </div>
    );
  }

  const { student, attendance, evaluations, revisions } = data;
  
  const todaysRevisions = revisions.filter(r => isToday(r.date));
  const recentRevisions = revisions.filter(r => !isToday(r.date)).slice(0, 5);

  const chartData = [...evaluations].reverse().map(e => ({
    date: formatDate(e.date),
    score: e.accuracyScore
  })).slice(-10);

  const stats = [
    { label: t('attendance_rate'), value: `${student.attendanceRate}%`, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: t('total_hizbs'), value: `${(student.totalHizbs || 0).toFixed(2)} ${t('hizbs')}`, icon: BookOpen, color: 'text-emerald-700', bg: 'bg-emerald-50' },
    { label: t('memorization_progress'), value: `${student.memorizationProgress}%`, icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: t('accuracy'), value: `${student.accuracy}%`, icon: Award, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: t('overall_rank'), value: `#${student.totalScore}`, icon: Star, color: 'text-purple-600', bg: 'bg-purple-50' },
  ];

  return (
    <div className="p-4 sm:p-8 space-y-8 max-w-6xl mx-auto text-black">
      <header className="space-y-2">
        <div className="flex items-center gap-3">
           <div className="w-12 h-12 bg-emerald-600 text-white rounded-2xl flex items-center justify-center shadow-lg">
             <TrendingUp className="w-6 h-6" />
           </div>
           <div>
             <h2 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">{t('salaam_name', { name: student.name.split(' ')[0] })}</h2>
             <p className="text-gray-500 font-medium">{t('portal_welcome')}</p>
           </div>
        </div>
      </header>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="p-4 sm:p-6 bg-white border rounded-3xl shadow-sm relative overflow-hidden group hover:shadow-xl hover:shadow-emerald-100/50 transition-all"
          >
            <div className={`w-10 h-10 sm:w-12 sm:h-12 ${stat.bg} ${stat.color} rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110`}>
              <stat.icon className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <p className="text-xs sm:text-sm font-black text-gray-400 uppercase tracking-widest">{stat.label}</p>
            <h4 className="text-xl sm:text-3xl font-black text-gray-900 mt-1">{stat.value}</h4>
          </motion.div>
        ))}
      </div>

      {data.kuttabs.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-8"
        >
          <KuttabWeeklyOverview kuttabs={data.kuttabs} />
        </motion.div>
      )}

      {data.nextTasks && data.nextTasks.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-[32px] p-6 sm:p-10 text-white shadow-xl shadow-emerald-100 relative overflow-hidden group mt-8"
        >
          <div className="absolute top-0 right-0 p-16 bg-white/10 rounded-bl-[120px] -z-0 opacity-20 group-hover:scale-110 transition-transform" />
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
            <div className="space-y-6 flex-1">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-widest border border-white/10">
                <ClipboardList className="w-4 h-4" />
                {t('todays_revision_plan')}
              </div>
              <div className="space-y-2">
                <h3 className="text-3xl sm:text-5xl font-black tracking-tight">{data.nextTasks[0].surahName || `${t('hizb')} ${data.nextTasks[0].hizbNumber}`}</h3>
                <div className="flex flex-wrap items-center gap-4 text-emerald-50 font-bold text-lg opacity-90">
                  <span className="flex items-center gap-2 px-3 py-1 bg-white/10 rounded-lg">
                    <BookOpen className="w-5 h-5" />
                    {t('hizb')} {data.nextTasks[0].hizbNumber}
                  </span>
                  <span className="flex items-center gap-2 px-3 py-1 bg-white/10 rounded-lg">
                    <TrendingUp className="w-5 h-5" />
                    {getPortionLabel(data.nextTasks[0].quantity, data.nextTasks[0].quantityIdentifier)}
                  </span>
                  <span className="flex items-center gap-2 px-3 py-1 bg-white/10 rounded-lg text-emerald-200">
                    <Clock className="w-5 h-5" />
                    {data.nextTasks[0].dueDate}
                  </span>
                </div>
              </div>
              {data.nextTasks[0].notes && (
                <div className="p-5 bg-black/10 rounded-2xl border border-white/10 backdrop-blur-sm">
                  <p className="text-sm text-emerald-50 font-medium leading-relaxed italic">"{data.nextTasks[0].notes}"</p>
                </div>
              )}
            </div>
            <div className="w-full md:w-auto">
              <button 
                onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })}
                className="w-full md:w-auto px-8 py-4 bg-white text-emerald-600 rounded-2xl font-black shadow-lg shadow-emerald-900/20 hover:bg-emerald-50 transition-all active:scale-95"
              >
                {t('view_history')}
              </button>
            </div>
          </div>
        </motion.div>
      )}

      <div className="mt-8">
        <MemorizationGrid evaluations={evaluations} />
      </div>

      <div className="mt-8">
        <h3 className="font-bold text-2xl flex items-center gap-2 text-gray-900 mb-6 px-2">
          <Calendar className="w-8 h-8 text-emerald-600" />
          {t('attendance_eval_timeline')}
        </h3>
        <StudentCalendar 
          attendance={attendance} 
          evaluations={evaluations} 
          revisions={revisions} 
          nextRevisions={data.nextTasks} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Performance Chart */}
        <div className="bg-white p-6 sm:p-8 border rounded-[32px] shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-black text-gray-900">{t('accuracy_trend')}</h3>
            <span className="px-3 py-1 bg-gray-50 text-gray-400 text-[10px] font-black uppercase tracking-widest rounded-full border">{t('last_10_sessions')}</span>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} dy={10} />
                <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', border: 'none', borderRadius: '16px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  labelStyle={{ fontWeight: 'bold', color: '#111827' }}
                />
                <Area type="monotone" dataKey="score" stroke="#10b981" strokeWidth={4} fillOpacity={1} fill="url(#colorScore)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Evaluation & Revision History */}
        <div className="space-y-8">
          <div className="bg-white p-6 sm:p-8 border rounded-[32px] shadow-sm flex flex-col h-fit">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-black text-gray-900">{t('recent_evaluations')}</h3>
              <Award className="w-5 h-5 text-amber-500" />
            </div>
            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin">
              {evaluations.length === 0 ? (
                <p className="text-center py-8 text-gray-400 font-medium italic">{t('no_evals_recorded')}</p>
              ) : evaluations.map((evalRecord) => (
                <div key={evalRecord.id} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between group hover:bg-white hover:shadow-md transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-white border rounded-xl flex items-center justify-center font-bold text-amber-600 shadow-sm">
                      {evalRecord.accuracyScore}
                    </div>
                    <div>
                      <h5 className="font-bold text-gray-900 truncate max-w-[150px]">
                        {evalRecord.surahName ? `${t('surah')} ${evalRecord.surahName}` : `${t('hizb')} ${evalRecord.hizbNumber}`}
                      </h5>
                      <p className="text-[10px] text-gray-400 flex items-center gap-1 font-bold uppercase tracking-wider">
                        <Calendar className="w-3 h-3" />
                        {formatDate(evalRecord.date)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full mt-1 bg-emerald-100 text-emerald-700">
                      {evalRecord.accuracyScore}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-6 sm:p-8 border rounded-[32px] shadow-sm flex flex-col h-fit">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-black text-gray-900">{t('todays_revisions')}</h3>
              <History className="w-5 h-5 text-blue-500" />
            </div>
            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin">
              {todaysRevisions.length === 0 ? (
                <p className="text-center py-8 text-gray-400 font-medium italic">{t('no_eval_data')}</p>
              ) : todaysRevisions.map((rev) => (
                <div key={rev.id} className="p-4 bg-emerald-50 border-emerald-100 rounded-2xl border flex items-center justify-between group hover:bg-white hover:shadow-md transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-white border rounded-xl flex items-center justify-center font-bold text-blue-600 shadow-sm">
                      {rev.qualityScore}
                    </div>
                    <div>
                      <h5 className="font-bold text-gray-900 truncate max-w-[150px]">
                        {rev.surahName ? `${t('surah')} ${rev.surahName}` : `${t('hizb')} ${rev.hizbNumber}`}
                      </h5>
                      <p className="text-[10px] text-emerald-600 flex items-center gap-1 font-bold uppercase tracking-wider">
                        <CheckCircle className="w-3 h-3" />
                        {t('today')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full mt-1 bg-blue-100 text-blue-700">
                      {rev.qualityScore}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {recentRevisions.length > 0 && (
              <div className="mt-6 pt-6 border-t">
                <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">{t('recent_revisions')}</h4>
                <div className="space-y-3">
                  {recentRevisions.map((rev) => (
                    <div key={rev.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                      <div className="flex items-center gap-3">
                         <div className="w-8 h-8 bg-white border rounded-lg flex items-center justify-center text-[10px] font-bold text-blue-500">
                           {rev.qualityScore}
                         </div>
                         <div>
                           <p className="text-xs font-bold text-gray-900 truncate max-w-[120px]">
                             {rev.surahName ? `${t('surah')} ${rev.surahName}` : `${t('hizb')} ${rev.hizbNumber}`}
                           </p>
                           <p className="text-[8px] text-gray-400 font-bold uppercase tracking-wider">
                             {formatDate(rev.date)}
                           </p>
                         </div>
                      </div>
                      <div className="text-[8px] px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-black">
                        {rev.qualityScore}%
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Attendance Log */}
      <div className="bg-white p-6 sm:p-8 border rounded-[32px] shadow-sm">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="text-xl font-black text-gray-900">{t('attendance_mirror')}</h3>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">{t('your_daily_logs')}</p>
          </div>
          <Calendar className="w-6 h-6 text-emerald-500" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 sm:gap-4">
          {[...attendance].slice(0, 7).map((record) => (
            <div key={record.id} className="p-4 bg-gray-50 rounded-2xl border flex flex-col items-center gap-2 text-center">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                {new Date(record.date).toLocaleDateString(undefined, { weekday: 'short' })}
              </span>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                record.status === 'present' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200' :
                record.status === 'absent' ? 'bg-red-500 text-white shadow-lg shadow-red-200' :
                'bg-blue-500 text-white shadow-lg shadow-blue-200'
              }`}>
                {record.status === 'present' ? <CheckCircle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
              </div>
              <span className="text-xs font-bold text-gray-700">{formatDate(record.date)}</span>
              <span className={`text-[8px] font-black uppercase tracking-tighter ${
                record.status === 'present' ? 'text-emerald-500' :
                record.status === 'absent' ? 'text-red-500' :
                'text-blue-500'
              }`}>
                {t(record.status)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
