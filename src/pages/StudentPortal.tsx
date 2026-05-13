import { useState, useEffect, useMemo } from 'react';
import { auth } from '../lib/firebase';
import { dbService } from '../services/db';
import { Link } from 'react-router-dom';
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
  ChevronRight,
  XCircle
} from 'lucide-react';
import { motion } from 'motion/react';
import { 
  subDays, 
  startOfMonth, 
  endOfMonth, 
  subMonths, 
  isWithinInterval, 
  parseISO,
  startOfDay
} from 'date-fns';
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
import KuttabWeeklyOverview from '../components/KuttabWeeklyOverview';

export default function StudentPortal() {
  const { t } = useTranslation();
  const getPortionLabel = (q: number, identifier?: string) => {
    if (identifier) {
      if (identifier.startsWith('t')) return t(`thumun_${identifier.substring(1)}`);
      if (identifier.startsWith('r')) return t(`rubu_${identifier.substring(1)}`);
      if (identifier.startsWith('n')) return t(`nisf_${identifier.substring(1)}`);
      if (identifier === 'h1') return t('hizb');
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
  const [filterPeriod, setFilterPeriod] = useState<'all' | '7days' | '30days' | 'thisMonth' | 'lastMonth'>('all');

  const filteredData = useMemo(() => {
    if (!data) return { attendance: [], evaluations: [], revisions: [] };
    
    const now = new Date();
    const today = startOfDay(now);
    let start: Date | null = null;
    let end: Date = now;

    if (filterPeriod === '7days') {
      start = subDays(today, 7);
    } else if (filterPeriod === '30days') {
      start = subDays(today, 30);
    } else if (filterPeriod === 'thisMonth') {
      start = startOfMonth(today);
      end = endOfMonth(today);
    } else if (filterPeriod === 'lastMonth') {
      const lastMonthDate = subMonths(today, 1);
      start = startOfMonth(lastMonthDate);
      end = endOfMonth(lastMonthDate);
    }

    const filterFn = (dateStr: string) => {
      if (!start) return true;
      try {
        const d = parseISO(dateStr);
        return isWithinInterval(d, { start, end });
      } catch (e) {
        return false;
      }
    };

    return {
      attendance: data.attendance.filter(a => filterFn(a.date)),
      evaluations: data.evaluations.filter(e => filterFn(e.date)),
      revisions: data.revisions.filter(r => filterFn(r.date)),
    };
  }, [data, filterPeriod]);

  const attendanceStats = useMemo(() => {
    const present = filteredData.attendance.filter(a => a.status === 'present').length;
    const absent = filteredData.attendance.filter(a => a.status === 'absent').length;
    const base = present + absent;
    const presentRate = base > 0 ? Math.round((present / base) * 100) : 0;
    const absentRate = base > 0 ? 100 - presentRate : 0;
    return { presentRate, absentRate };
  }, [filteredData.attendance]);

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
  const { attendance: filteredAttendance, evaluations: filteredEvaluations } = filteredData;
  
  const todaysRevisions = revisions.filter(r => isToday(r.date));
  const recentRevisions = revisions.filter(r => !isToday(r.date)).slice(0, 8);

  const chartData = [...filteredEvaluations].reverse().map(e => ({
    date: formatDate(e.date),
    score: e.accuracyScore
  }));

  const stats = [
    { label: t('present_percentage'), value: `${attendanceStats.presentRate}%`, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: t('absent_percentage'), value: `${attendanceStats.absentRate}%`, icon: XCircle, color: 'text-red-600', bg: 'bg-red-50' },
    { label: t('total_hizbs'), value: `${(student.totalHizbs || 0).toFixed(2)} ${t('hizbs')}`, icon: BookOpen, color: 'text-emerald-700', bg: 'bg-emerald-50' },
    { label: t('overall_rank'), value: `#${student.totalScore}`, icon: Star, color: 'text-purple-600', bg: 'bg-purple-50' },
  ];

  return (
    <div className="p-4 sm:p-8 space-y-8 max-w-6xl mx-auto text-black">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-3">
           <div className="w-12 h-12 bg-emerald-600 text-white rounded-2xl flex items-center justify-center shadow-lg">
             <TrendingUp className="w-6 h-6" />
           </div>
           <div>
             <h2 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">{t('salaam_name', { name: student.name.split(' ')[0] })}</h2>
           </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 bg-gray-50 p-1.5 rounded-2xl border border-gray-100">
          {(['all', '7days', '30days', 'thisMonth', 'lastMonth'] as const).map((period) => (
            <button
              key={period}
              onClick={() => setFilterPeriod(period)}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                filterPeriod === period 
                  ? 'bg-white text-emerald-600 shadow-sm border border-emerald-100' 
                  : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
              }`}
            >
              {t(period === 'all' ? 'all_time' : period === '7days' ? 'last_7_days' : period === '30days' ? 'last_30_days' : period === 'thisMonth' ? 'this_month' : 'last_month')}
            </button>
          ))}
        </div>
      </header>

      {/* 1. Next Revision (First) */}
      {data.nextTasks && data.nextTasks.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-[32px] p-6 sm:p-10 text-white shadow-xl shadow-indigo-100 relative overflow-hidden group"
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
                <div className="flex flex-wrap items-center gap-4 text-indigo-50 font-bold text-lg opacity-90">
                  <span className="flex items-center gap-2 px-3 py-1 bg-white/10 rounded-lg">
                    <BookOpen className="w-5 h-5" />
                    {t('hizb')} {data.nextTasks[0].hizbNumber}
                  </span>
                  <span className="flex items-center gap-2 px-3 py-1 bg-white/10 rounded-lg">
                    <TrendingUp className="w-5 h-5" />
                    {getPortionLabel(data.nextTasks[0].quantity, data.nextTasks[0].quantityIdentifier)}
                  </span>
                  <span className="flex items-center gap-2 px-3 py-1 bg-white/10 rounded-lg text-indigo-200">
                    <Clock className="w-5 h-5" />
                    {data.nextTasks[0].dueDate}
                  </span>
                </div>
              </div>
              {data.nextTasks[0].notes && (
                <div className="p-5 bg-black/10 rounded-2xl border border-white/10 backdrop-blur-sm">
                  <p className="text-sm text-indigo-50 font-medium leading-relaxed italic">"{data.nextTasks[0].notes}"</p>
                </div>
              )}
            </div>
            <div className="w-full md:w-auto">
              <Link
                to="/calendar"
                className="w-full md:w-auto px-8 py-4 bg-white text-indigo-600 rounded-2xl flex items-center justify-center gap-2 font-black shadow-lg shadow-indigo-900/20 hover:bg-indigo-50 transition-all active:scale-95"
              >
                <Calendar className="w-5 h-5" />
                {t('open_calendar')}
              </Link>
            </div>
          </div>
        </motion.div>
      )}

      {/* 2. Ranking of Kuttab (Second) */}
      {data.kuttabs.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <KuttabWeeklyOverview kuttabs={data.kuttabs} />
        </motion.div>
      )}

      {/* 3. Last 3 Evaluations (Third) */}
      <div className="bg-white p-6 sm:p-8 border rounded-[32px] shadow-sm">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="text-xl font-black text-gray-900">{t('recent_evaluations')}</h3>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">
              {t('your_latest_achievements')}
            </p>
          </div>
          <Award className="w-6 h-6 text-amber-500" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {evaluations.length === 0 ? (
            <div className="md:col-span-3 text-center py-12 bg-gray-50 rounded-3xl border border-dashed">
              <p className="text-gray-400 font-medium italic">{t('no_evals_recorded')}</p>
            </div>
          ) : evaluations.slice(0, 3).map((evalRecord, idx) => (
            <motion.div 
              key={evalRecord.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + (idx * 0.1) }}
              className="p-5 bg-gray-50 rounded-2xl border border-gray-100 flex items-center gap-4 group hover:bg-white hover:shadow-xl hover:shadow-amber-100/50 transition-all"
            >
              <div className="w-14 h-14 bg-white border rounded-2xl flex items-center justify-center font-black text-xl text-amber-600 shadow-sm group-hover:scale-110 transition-transform">
                {evalRecord.accuracyScore}<span className="text-[10px] ml-0.5">%</span>
              </div>
              <div className="min-w-0">
                <h5 className="font-black text-gray-900 truncate">
                  {evalRecord.surahName ? `${t('surah')} ${evalRecord.surahName}` : `${t('hizb')} ${evalRecord.hizbNumber}`}
                </h5>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">
                    {getPortionLabel(evalRecord.quantity, evalRecord.quantityIdentifier)}
                  </span>
                  <span className="text-gray-300">•</span>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {formatDate(evalRecord.date)}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Stats and other sections moved down */}
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

      {/* Attendance Log */}
      <div className="bg-white p-6 sm:p-8 border rounded-[32px] shadow-sm">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="text-xl font-black text-gray-900">{t('attendance_mirror')}</h3>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">
              {filterPeriod === 'all' ? t('your_daily_logs') : t(filterPeriod === '7days' ? 'last_7_days' : filterPeriod === '30days' ? 'last_30_days' : filterPeriod === 'thisMonth' ? 'this_month' : 'last_month')}
            </p>
          </div>
          <Link to="/attendance" className="p-2 hover:bg-emerald-50 rounded-xl transition-colors group">
            <CheckCircle className="w-6 h-6 text-emerald-500 group-hover:scale-110 transition-transform" />
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 sm:gap-4">
          {[...filteredAttendance].slice(0, 14).map((record) => (
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

      <div className="mt-8">
        <div className="flex items-center justify-between mb-6 px-2">
          <h3 className="font-bold text-2xl flex items-center gap-2 text-gray-900">
            <BookOpen className="w-8 h-8 text-indigo-600" />
            {t('memorization_progress')}
          </h3>
          <Link to="/progress" className="text-sm font-black text-indigo-600 bg-indigo-50 px-4 py-2 rounded-xl hover:bg-indigo-100 transition-colors">
            {t('view_details')}
          </Link>
        </div>
        <MemorizationGrid evaluations={evaluations} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Performance Chart */}
        <div className="bg-white p-6 sm:p-8 border rounded-[32px] shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-black text-gray-900">{t('accuracy_trend')}</h3>
            <span className="px-3 py-1 bg-gray-50 text-gray-400 text-[10px] font-black uppercase tracking-widest rounded-full border">
              {filterPeriod === 'all' ? t('all_time') : t(filterPeriod === '7days' ? 'last_7_days' : filterPeriod === '30days' ? 'last_30_days' : filterPeriod === 'thisMonth' ? 'this_month' : 'last_month')}
            </span>
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

        {/* Revision Historry */}
        <div className="bg-white p-6 sm:p-8 border rounded-[32px] shadow-sm flex flex-col h-fit">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-black text-gray-900">{t('todays_revisions')}</h3>
            <History className="w-5 h-5 text-blue-500" />
          </div>
          <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin">
            {todaysRevisions.length === 0 ? (
              <p className="text-center py-8 text-gray-400 font-medium italic">{t('no_revisions_month')}</p>
            ) : todaysRevisions.map((rev) => (
              <div key={rev.id} className="p-4 bg-blue-50 border-blue-100 rounded-2xl border flex items-center justify-between group hover:bg-white hover:shadow-md transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-white border rounded-xl flex items-center justify-center font-bold text-blue-600 shadow-sm">
                    {rev.qualityScore}
                  </div>
                  <div>
                    <h5 className="font-bold text-gray-900 truncate max-w-[250px]">
                      {rev.surahName 
                        ? `${t('surah')} ${rev.surahName} (${t('hizb')} ${rev.hizbNumber})` 
                        : `${t('hizb')} ${rev.hizbNumber}`}
                    </h5>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-blue-600 font-bold uppercase tracking-wider">
                        {getPortionLabel(rev.quantity, rev.quantityIdentifier)}
                      </span>
                      <span className="text-gray-300">•</span>
                      <p className="text-[10px] text-blue-600 flex items-center gap-1 font-bold uppercase tracking-wider">
                        <CheckCircle className="w-3 h-3" />
                        {t('today')}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="text-right flex flex-col items-end">
                  <div className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                    {rev.qualityScore}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
