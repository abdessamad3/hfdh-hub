import { useState, useEffect, useMemo } from 'react';
import { auth } from '../lib/firebase';
import { dbService } from '../services/db';
import { Link } from 'react-router-dom';
import { Student, Attendance, Evaluation, Revision, NextRevision, Kuttab, Memorization } from '../types';
import { 
  BookOpen, 
  CheckCircle, 
  Award, 
  TrendingUp, 
  Calendar, 
  Clock,
  Star,
  ClipboardList,
  XCircle,
  Trophy,
  Flame,
  AlertTriangle,
  User,
  ChevronRight,
  Sparkles,
  Zap,
  Check,
  FlameIcon,
  HelpCircle,
  Activity,
  Brain
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  subDays, 
  startOfDay, 
  startOfMonth, 
  endOfMonth, 
  isWithinInterval, 
  parseISO 
} from 'date-fns';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line
} from 'recharts';
import { useTranslation } from 'react-i18next';
import { formatDate } from '../lib/dateUtils';
import { getCoveredThumns } from '../lib/quranUtils';
import MemorizationGrid from '../components/MemorizationGrid';

export default function StudentPortal() {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';
  
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

  // State
  const [data, setData] = useState<{
    student: Student;
    attendance: Attendance[];
    evaluations: Evaluation[];
    revisions: Revision[];
    nextTasks: NextRevision[];
    memorizations: Memorization[];
    kuttabs: Kuttab[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterPeriod, setFilterPeriod] = useState<'all' | '7days' | '30days' | 'thisMonth'>('all');

  // Load real data from subscriptions
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
            memorizations: [],
            kuttabs: []
          });

          // Re-subscribe to inner collections only if student id changed
          if (student.id === currentStudentId) {
            setLoading(false);
            return;
          }

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

          subUnsubscribes.push(dbService.subscribeStudentMemorizations(studentId, email, (memorizations) => {
            setData(prev => prev ? { ...prev, memorizations } : null);
          }));

          // Fetch Kuttab details
          if (student.kuttabName) {
            dbService.getAllKuttabs().then(allKuttabs => {
              const myKuttab = allKuttabs.filter(k => k.name === student.kuttabName);
              setData(prev => prev ? { ...prev, kuttabs: myKuttab } : null);
            });
          }
          
          setLoading(false);
        });

        unsubscribes.push(mainUnsubscribe);
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

  // Filter dynamic analytics items based on period
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

  // Streak derived based on selected periods attendance count
  const currentStreak = useMemo(() => {
    const list = filteredData.attendance;
    if (!list || list.length === 0) return 0;
    
    // sorted desc by date
    const sorted = [...list]
      .filter(a => a.status !== 'excused')
      .sort((a, b) => b.date.localeCompare(a.date));
      
    let streak = 0;
    for (const att of sorted) {
      if (att.status === 'present') {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  }, [filteredData.attendance]);

  // Overall calculations for display
  const attendanceStats = useMemo(() => {
    const present = filteredData.attendance.filter(a => a.status === 'present').length;
    const absent = filteredData.attendance.filter(a => a.status === 'absent').length;
    const base = present + absent;
    const presentRate = base > 0 ? Math.round((present / base) * 105) : 100; // soft adjusted or raw
    return {
      presentRate: Math.min(100, base > 0 ? Math.round((present / base) * 100) : 0),
      count: present,
      total: base
    };
  }, [filteredData.attendance]);

  const revisionStats = useMemo(() => {
    const periodRevs = filteredData.revisions;
    const totalScore = periodRevs.reduce((acc, curr) => acc + (curr.qualityScore || 0), 0);
    const rate = periodRevs.length > 0 ? Math.round(totalScore / periodRevs.length) : (data?.student.accuracy || 95);
    return { rate, count: periodRevs.length };
  }, [filteredData.revisions, data]);

  const evaluationAverage = useMemo(() => {
    const periodEvals = filteredData.evaluations;
    if (periodEvals.length > 0) {
      return Math.round(periodEvals.reduce((sum, e) => sum + e.accuracyScore, 0) / periodEvals.length);
    }
    return data?.student.accuracy || 88;
  }, [filteredData.evaluations, data]);

  // Sparklines calculations
  const sparkStreak = useMemo(() => {
    if (filteredData.attendance.length === 0) return [];
    return [...filteredData.attendance].reverse().map((a, idx) => ({ v: a.status === 'present' ? idx + 1 : 0 }));
  }, [filteredData.attendance]);

  const sparkMemorized = useMemo(() => {
    if (filteredData.evaluations.length === 0) return [];
    const uniqueUnitsSet = new Set<string>();
    // Sort ascending by date to calculate progress growing over time
    const sortedTimeline = [...filteredData.evaluations].sort((a, b) => a.date.localeCompare(b.date));
    
    return sortedTimeline.map(ev => {
      const covered = getCoveredThumns(ev.hizbNumber, ev.quantityIdentifier || '');
      covered.forEach(unit => {
        uniqueUnitsSet.add(`${ev.hizbNumber}-${unit}`);
      });
      if (covered.length === 0 && ev.quantity > 0) {
        for (let i = 1; i <= Math.min(8, ev.quantity); i++) {
          uniqueUnitsSet.add(`${ev.hizbNumber}-${i}`);
        }
      }
      return { v: uniqueUnitsSet.size / 8 }; // actual total hizbs at that point in time
    });
  }, [filteredData.evaluations]);

  const sparkRevision = useMemo(() => {
    if (filteredData.revisions.length === 0) return [];
    return [...filteredData.revisions].reverse().map(r => ({ v: r.qualityScore }));
  }, [filteredData.revisions]);

  const sparkEvaluation = useMemo(() => {
    if (filteredData.evaluations.length === 0) return [];
    return [...filteredData.evaluations].reverse().map(e => ({ v: e.accuracyScore }));
  }, [filteredData.evaluations]);

  const sparkAttendanceRate = useMemo(() => {
    if (filteredData.attendance.length === 0) return [];
    let pres = 0;
    return [...filteredData.attendance].reverse().map((a, i) => {
      if (a.status === 'present') pres++;
      return { v: Math.round((pres / (i + 1)) * 100) };
    });
  }, [filteredData.attendance]);

  const sparkHizbCompleted = useMemo(() => {
    if (!data?.student) return [];
    const count = Math.floor(data.student.totalHizbs || 0);
    return [{ v: count - 2 > 0 ? count - 2 : 0 }, { v: count - 1 > 0 ? count - 1 : 0 }, { v: count }];
  }, [data]);

  // Last 10 Lists (Critical Section: UNFILTERED ALWAYS)
  const last10Evaluations = useMemo(() => {
    return (data?.evaluations || []).slice(0, 10);
  }, [data?.evaluations]);

  const last10Revisions = useMemo(() => {
    return (data?.revisions || []).slice(0, 10);
  }, [data?.revisions]);

  // Next Revision task helper
  const nextRevisionInfo = useMemo(() => {
    const tasks = data?.nextTasks || [];
    if (tasks.length > 0) {
      const task = tasks[0];
      const now = startOfDay(new Date());
      let daysDecimal = null;
      try {
        const due = startOfDay(parseISO(task.dueDate));
        const diff = due.getTime() - now.getTime();
        daysDecimal = Math.ceil(diff / (1000 * 60 * 60 * 24));
      } catch (e) {}

      let priority: 'High' | 'Medium' | 'Low' = 'Low';
      if (daysDecimal !== null) {
        if (daysDecimal <= 0) priority = 'High';
        else if (daysDecimal <= 2) priority = 'Medium';
      }

      return {
        hasTask: true,
        dueDate: formatDate(task.dueDate),
        hizb: task.hizbNumber,
        surahName: task.surahName || (isRtl ? `الحزب ${task.hizbNumber}` : `Hizb ${task.hizbNumber}`),
        quantityLabel: getPortionLabel(task.quantity, task.quantityIdentifier),
        remainingDays: daysDecimal,
        priority,
        notes: task.notes || (isRtl ? 'بانتظار المراجعة الدورية' : 'Pending scheduled revision')
      };
    }
    return {
      hasTask: false,
      dueDate: '',
      hizb: 0,
      surahName: '',
      quantityLabel: '',
      remainingDays: null,
      priority: 'Low' as const,
      notes: ''
    };
  }, [data?.nextTasks, isRtl]);

  // Problematic evaluations (>4 mistakes alert)
  const alertEvaluations = useMemo(() => {
    return (data?.evaluations || []).filter(ev => (ev.mistakesCount || 0) > 4).slice(0, 5);
  }, [data?.evaluations]);

  // Chart data formatting (for dynamic charts & analytics)
  const accuracyTrendData = useMemo(() => {
    const evals = [...filteredData.evaluations].reverse();
    return evals.map(e => ({
      date: formatDate(e.date),
      score: e.accuracyScore,
      mistakes: e.mistakesCount
    }));
  }, [filteredData.evaluations]);

  // Memorization Consistency Data
  const memorizationConsistencyData = useMemo(() => {
    const memos = [...(data?.memorizations || [])]
      .filter(m => {
        if (filterPeriod === 'all') return true;
        const now = new Date();
        const today = startOfDay(now);
        let start = subDays(today, 30);
        if (filterPeriod === '7days') start = subDays(today, 7);
        else if (filterPeriod === 'thisMonth') start = startOfMonth(today);
        
        try {
          const d = parseISO(m.date);
          return isWithinInterval(d, { start, end: now });
        } catch(e) { return false; }
      })
      .reverse();

    if (memos.length > 0) {
      return memos.slice(0, 8).map(m => ({
        date: formatDate(m.date),
        quantity: m.quantity || 4
      }));
    }
    return [];
  }, [data?.memorizations, filterPeriod]);

  // Revision performance data
  const revisionPerformanceData = useMemo(() => {
    const revs = [...filteredData.revisions].reverse();
    if (revs.length > 0) {
      return revs.slice(0, 10).map(r => ({
        date: formatDate(r.date),
        score: r.qualityScore
      }));
    }
    return [];
  }, [filteredData.revisions]);

  // Contribution matrix (last 30 days) for contribution heatmap
  const heatmapData = useMemo(() => {
    const arr = [];
    const now = new Date();
    // 35 days (5 weeks grid) to fit visually beautifully on mobile up to desktop
    for (let i = 34; i >= 0; i--) {
      const d = subDays(now, i);
      const dateStr = d.toISOString().split('T')[0];
      const record = data?.attendance.find(a => a.date === dateStr);
      let value = 0; // Empty
      if (record) {
        if (record.status === 'present') {
          // Check if there was an evaluation or memorization on same date to hike intensity
          const evOnDay = data?.evaluations.some(ev => ev.date === dateStr);
          value = evOnDay ? 4 : 2; // Level 2 for normal presence, 4 for active evaluation session
        } else if (record.status === 'excused') {
          value = 1; // Level 1
        } else {
          value = 10; // Absent custom color mapping
        }
      }
      arr.push({
        date: d,
        dateStr,
        record,
        value
      });
    }
    return arr;
  }, [data?.attendance, data?.evaluations]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[75vh] gap-4 bg-[#fcfdfe] px-4">
        <div className="relative flex items-center justify-center">
          <div className="w-16 h-16 border-4 border-emerald-100 border-t-[#16C47F] rounded-full animate-spin" />
          <BookOpen className="w-6 h-6 text-[#16C47F] absolute animate-pulse" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-slate-800 font-extrabold text-lg tracking-tight">{t('loading_progress', 'Retrieving Quranic Profile...')}</p>
          <p className="text-xs text-slate-400 font-semibold max-w-xs">{t('loading_sub', 'Establishing a secure persistent interface with your teacher records.')}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-8 max-w-2xl mx-auto text-center space-y-8 min-h-[80vh] flex flex-col justify-center items-center select-none" dir={isRtl ? 'rtl' : 'ltr'}>
        <div className="w-24 h-24 bg-amber-50/50 text-amber-500 rounded-3xl flex items-center justify-center shadow-inner border border-amber-100 animate-bounce">
          <Clock className="w-12 h-12" />
        </div>
        <div className="space-y-3">
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">{t('portal_pending', 'Portal Access Pending Approval')}</h2>
          <p className="text-slate-500 font-medium max-w-md mx-auto leading-relaxed">
            {t('portal_pending_subtitle', { email: auth.currentUser?.email })}
            Your registered account is awaiting teacher linked assignment inside the system.
          </p>
        </div>
        <div className="p-4 bg-slate-50 border border-slate-200/50 rounded-2xl text-xs text-slate-400 font-bold tracking-wide">
          Logged in: <span className="text-slate-700">{auth.currentUser?.email}</span>
        </div>
      </div>
    );
  }

  const { student } = data;

  return (
    <div className="min-h-screen bg-[#fcfdfe] text-slate-800 pb-20 select-none selection:bg-[#16C47F]/15 selection:text-[#16C47F]" dir={isRtl ? 'rtl' : 'ltr'}>
      
      {/* 1. Header Section */}
      <div className="border-b border-slate-100 bg-white/70 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-8 py-5 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          
          <div className="flex items-center gap-4">
            {/* Elegant Premium Student Avatar */}
            <div className="relative group">
              <div className="absolute -inset-1 rounded-3xl bg-gradient-to-tr from-[#16C47F] to-indigo-500 opacity-20 blur-sm group-hover:opacity-40 transition duration-500" />
              <div className="relative w-14 h-14 bg-slate-100 rounded-2xl border border-slate-200/45 flex items-center justify-center text-slate-700 shadow-sm overflow-hidden">
                {student.gender === 'female' ? '🌸' : '⭐'}
              </div>
              <div className="absolute -bottom-1 -right-1 bg-[#16C47F] border-2 border-white w-4.5 h-4.5 rounded-full flex items-center justify-center shadow-sm">
                <Check className="w-2.5 h-2.5 text-white stroke-[4px]" />
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                  {isRtl ? `سلام، ${student.name.split(' ')[0]}` : `Salam, ${student.name.split(' ')[0]}`}
                </h1>
                <span className="inline-flex self-center items-center rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-700/10">
                  {student.kuttabName || 'Rawda'}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-bold mt-1 tracking-wide uppercase">
                {isRtl ? 'بوابة الطالب المتميزة' : 'Premium SaaS Student Dashboard'}
              </p>
            </div>
          </div>

          {/* Elegant dynamic segmented filter controls */}
          <div className="flex items-center gap-2 bg-slate-100/70 p-1.5 rounded-2xl border border-slate-200/30 w-full sm:w-auto overflow-x-auto scrollbar-none">
            {[
              { id: '7days', label: isRtl ? '٧ أيام' : 'Last 7 Days' },
              { id: 'thisMonth', label: isRtl ? 'هذا الشهر' : 'This Month' },
              { id: '30days', label: isRtl ? '٣٠ يوماً' : 'Last 30 Days' },
              { id: 'all', label: isRtl ? 'الكل' : 'All Time' }
            ].map((period) => {
              const active = filterPeriod === period.id;
              return (
                <button
                  key={period.id}
                  onClick={() => setFilterPeriod(period.id as any)}
                  className={`relative flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-300 ${
                    active 
                      ? 'bg-white text-slate-800 shadow-sm font-black' 
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {period.label}
                </button>
              );
            })}
          </div>

        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 sm:px-8 py-8 space-y-10">
        
        {/* 2. KPI Statistics Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
          
          {/* Card 1: Attendance Day Streak */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200/45 shadow-sm hover:shadow-md transition-all flex flex-col justify-between min-h-[150px] relative overflow-hidden group">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('attendance_streak', 'Day Streak')}</span>
                <h3 className="text-3xl font-black text-slate-800 tracking-tight">{currentStreak} {isRtl ? 'أيام' : 'days'}</h3>
              </div>
              <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center">
                <Flame className="w-4.5 h-4.5 fill-current" />
              </div>
            </div>
            
            <div className="h-10 mt-3">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sparkStreak}>
                  <defs>
                    <linearGradient id="gpStreak" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="v" stroke="#f97316" strokeWidth={2.5} fill="url(#gpStreak)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-between text-[9px] font-bold text-slate-400 mt-2">
              <span>{isRtl ? 'السلسلة الحالية' : 'Periods active streak'}</span>
              <span className="text-orange-500">{isRtl ? 'نشط 🔥' : 'Active 🔥'}</span>
            </div>
          </div>

          {/* Card 2: Total Memorized */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200/45 shadow-sm hover:shadow-md transition-all flex flex-col justify-between min-h-[150px] relative overflow-hidden group">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('total_memorized', 'Total Memorized')}</span>
                <h3 className="text-3xl font-black text-slate-800 tracking-tight">{student.memorizationProgress}%</h3>
              </div>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-[#16C47F] flex items-center justify-center">
                <TrendingUp className="w-4.5 h-4.5" />
              </div>
            </div>

            <div className="h-10 mt-3">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sparkMemorized}>
                  <defs>
                    <linearGradient id="gpMems" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#16C47F" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#16C47F" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="v" stroke="#16C47F" strokeWidth={2.5} fill="url(#gpMems)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            
            <div className="flex items-center justify-between text-[9px] font-bold text-slate-400 mt-2">
              <span>{isRtl ? 'إجمالي الأحزاب المنجزة' : 'Total hizbs memorized'}</span>
              <span className="text-[#16C47F]">{(student.totalHizbs || 0).toFixed(2)} {isRtl ? 'أحزاب' : 'Hizbs'}</span>
            </div>
          </div>

          {/* Card 3: Revision Progress */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200/45 shadow-sm hover:shadow-md transition-all flex flex-col justify-between min-h-[150px] relative overflow-hidden group">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('revision', 'Revision Progress')}</span>
                <h3 className="text-3xl font-black text-slate-800 tracking-tight">{revisionStats.rate}%</h3>
              </div>
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-500 flex items-center justify-center">
                <ClipboardList className="w-4.5 h-4.5" />
              </div>
            </div>

            <div className="h-10 mt-3">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sparkRevision}>
                  <defs>
                    <linearGradient id="gpRvs" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="v" stroke="#6366f1" strokeWidth={2.5} fill="url(#gpRvs)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="flex items-center justify-between text-[9px] font-bold text-slate-400 mt-2">
              <span>{revisionStats.count} {isRtl ? 'سجلات مراجعة' : 'period revisions'}</span>
              <span className="text-indigo-500">Perfect 🟢</span>
            </div>
          </div>

          {/* Card 4: Evaluation Average */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200/45 shadow-sm hover:shadow-md transition-all flex flex-col justify-between min-h-[150px] relative overflow-hidden group">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('evaluation_average', 'Evaluation Avg')}</span>
                <h3 className="text-3xl font-black text-slate-800 tracking-tight">{evaluationAverage}%</h3>
              </div>
              <div className="w-8 h-8 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">
                <Award className="w-4.5 h-4.5" />
              </div>
            </div>

            <div className="h-10 mt-3">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sparkEvaluation}>
                  <defs>
                    <linearGradient id="gpEvs" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="v" stroke="#8b5cf6" strokeWidth={2.5} fill="url(#gpEvs)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="flex items-center justify-between text-[9px] font-bold text-slate-400 mt-2">
              <span>{isRtl ? 'معدل التقييمات الآني' : 'Average accuracy score'}</span>
              <span className="text-violet-600">{evaluationAverage >= 90 ? 'A+' : 'A'}</span>
            </div>
          </div>

          {/* Card 5: Present Percentage */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200/45 shadow-sm hover:shadow-md transition-all flex flex-col justify-between min-h-[150px] relative overflow-hidden group">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('present_percentage', 'Present Rate')}</span>
                <h3 className="text-3xl font-black text-slate-800 tracking-tight">{attendanceStats.presentRate}%</h3>
              </div>
              <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-650 flex items-center justify-center">
                <CheckCircle className="w-4.5 h-4.5" />
              </div>
            </div>

            <div className="h-10 mt-3">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sparkAttendanceRate}>
                  <defs>
                    <linearGradient id="gpAtts" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0d9488" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#0d9488" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="v" stroke="#0d9488" strokeWidth={2.5} fill="url(#gpAtts)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="flex items-center justify-between text-[9px] font-bold text-slate-400 mt-2">
              <span>{attendanceStats.count}/{attendanceStats.total} {isRtl ? 'حضور' : 'attended sessions'}</span>
              <span className="text-[#16C47F]">{isRtl ? 'ممتاز' : 'Stable'}</span>
            </div>
          </div>

          {/* Card 6: Total Hizb Completed */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200/45 shadow-sm hover:shadow-md transition-all flex flex-col justify-between min-h-[150px] relative overflow-hidden group">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('hizbs', 'completed ahzab')}</span>
                <h3 className="text-3xl font-black text-slate-800 tracking-tight">{(student.totalHizbs || 0).toFixed(2)}</h3>
              </div>
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center">
                <Trophy className="w-4.5 h-4.5" />
              </div>
            </div>

            <div className="h-10 mt-3">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sparkHizbCompleted}>
                  <defs>
                    <linearGradient id="gpHizb" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#d97706" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#d97706" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="v" stroke="#d97706" strokeWidth={2.5} fill="url(#gpHizb)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="flex items-center justify-between text-[9px] font-bold text-slate-400 mt-2">
              <span>{isRtl ? 'الأحزاب المنجزة بالكامل' : 'Out of 60 Ahzab completed'}</span>
              <span className="text-amber-500">{isRtl ? 'مستمر 🏆' : 'Rising 🏆'}</span>
            </div>
          </div>

        </div>

        {/* Play Smart Challenge Entry Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 sm:p-8 rounded-[32px] border border-indigo-500/10 shadow-lg relative overflow-hidden group flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(99,102,241,0.08),transparent_50%)] pointer-events-none" />
          
          <div className="space-y-2.5 max-w-2xl relative z-10">
            <span className="text-[9px] uppercase font-black tracking-widest text-amber-400 bg-amber-400/10 border border-amber-400/20 px-3 py-1 rounded-full inline-block">
              ⚡ {isRtl ? 'ميزة تفاعلية جديدة' : 'Interactive Hifdh Feature'}
            </span>
            <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-tight">
              {isRtl ? 'تحدي الذكاء التفاعلي المخصص لحفظك' : 'Play Smart Challenge Trained on Your Memorization'}
            </h3>
            <p className="text-xs font-semibold text-slate-300 leading-relaxed">
              {isRtl 
                ? 'جولة من ١٠ أسئلة مخصصة بالكامل لمجموع السور والأجزاء التي قمت بحفظها. اختبر قوة الضبط التلقائي، إكمال فواصل السور، وملء الكلمات المفقودة لورش.'
                : 'Accelerate memory consolidation! Practice an adaptive run of 10 customized questions generated directly from your evaluated Surahs.'}
            </p>
          </div>

          <div className="shrink-0 relative z-10 w-full md:w-auto">
            <Link
              to="/smart-challenge"
              className="w-full md:w-auto inline-flex items-center justify-center gap-2.5 bg-[#16C47F] hover:bg-[#14b071] text-white px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-950/25 transition-all transform hover:scale-[1.02] active:scale-95 duration-300"
            >
              <Brain className="w-5 h-5 fill-current animate-pulse text-white" />
              <span>{isRtl ? 'ابدأ تحدي الذكاء الآن' : 'Start Play Smart Challenge'}</span>
            </Link>
          </div>
        </div>

        {/* Inline Grid Row: Charts & Next Revision & Warning Alerts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* 5. Next Revision Card Section */}
          <div className="bg-gradient-to-br from-[#4f46e5] via-[#3730a3] to-[#1e1b4b] rounded-[32px] p-8 text-white relative overflow-hidden shadow-lg border border-slate-900 shadow-indigo-150 flex flex-col justify-between min-h-[350px] group transition-all">
            <div className="absolute top-0 right-0 p-36 bg-white/5 rounded-br-[180px] -z-0 opacity-20 filter blur-xl group-hover:scale-110 transition-transform duration-1000" />
            <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-[#6366f1]/25 rounded-full blur-3xl" />

            <div className="relative z-10 space-y-6 flex-1 flex flex-col justify-between">
              
              <div className="flex items-center justify-between">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 backdrop-blur-md rounded-full text-[9px] font-black uppercase tracking-wider border border-white/20">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                  <span>{isRtl ? 'الجلسة القادمة المستهدفة' : 'UPCOMING PLANNING TASK'}</span>
                </div>
                
                {nextRevisionInfo.hasTask && (
                  <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${
                    nextRevisionInfo.priority === 'High' 
                      ? 'bg-rose-500/80 text-white' 
                      : nextRevisionInfo.priority === 'Medium'
                        ? 'bg-amber-500/80 text-white'
                        : 'bg-white/15 text-white'
                  }`}>
                    {nextRevisionInfo.priority} {isRtl ? 'أهمية' : 'Priority'}
                  </span>
                )}
              </div>

              {nextRevisionInfo.hasTask ? (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <p className="text-[10px] text-white/60 font-black uppercase tracking-widest">{isRtl ? 'المنهج المستهدف للمراجعة' : 'REVISION TARGET'}</p>
                    <h3 className="text-3xl font-extrabold tracking-tight text-white leading-tight">
                      {nextRevisionInfo.surahName}
                    </h3>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 bg-white/5 p-4 rounded-2xl border border-white/10 backdrop-blur-sm">
                    <div>
                      <p className="text-[9px] text-white/50 font-black uppercase tracking-wider">{isRtl ? 'المقدار المحدد' : 'Quantity'}</p>
                      <p className="font-extrabold text-sm text-indigo-100">{nextRevisionInfo.quantityLabel || 'Not declared'}</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-white/50 font-black uppercase tracking-wider">{isRtl ? 'التاريخ المحدد' : 'Scheduled Due'}</p>
                      <p className="font-extrabold text-sm text-indigo-100">{nextRevisionInfo.dueDate}</p>
                    </div>
                  </div>

                  <p className="text-xs text-white/70 italic font-medium leading-relaxed bg-[#000000]/10 p-3 rounded-xl border-l-[3px] border-indigo-400">
                    "{nextRevisionInfo.notes}"
                  </p>
                </div>
              ) : (
                <div className="text-center py-12 space-y-3">
                  <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center mx-auto text-white">
                    <CheckCircle className="w-6 h-6" />
                  </div>
                  <h4 className="font-black text-lg">{isRtl ? 'جميع المراجعات منجزة' : 'All caught up!'}</h4>
                  <p className="text-xs text-indigo-200">{isRtl ? 'لا توجد مهام مراجعة مجدولة قادمة.' : 'No pending revisions requiring immediate action.'}</p>
                </div>
              )}

              {nextRevisionInfo.hasTask && nextRevisionInfo.remainingDays !== null && (
                <div className="flex items-center justify-between pt-2 border-t border-white/10">
                  <div className="flex items-center gap-2 text-xs font-semibold text-white/80">
                    <Clock className="w-4 h-4 text-indigo-300" />
                    <span>
                      {nextRevisionInfo.remainingDays < 0 
                        ? (isRtl ? 'متأخرة عن الموعد' : 'Overdue task') 
                        : nextRevisionInfo.remainingDays === 0 
                          ? (isRtl ? 'مستحقة اليوم' : 'Due today') 
                          : `${isRtl ? 'متبقي' : 'Due in'} ${nextRevisionInfo.remainingDays} ${isRtl ? 'أيام' : 'days'}`}
                    </span>
                  </div>
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                </div>
              )}

            </div>
          </div>

          {/* 6. Evaluations With More Than 4 Mistakes Section */}
          <div className="bg-white p-6 rounded-[32px] border border-slate-200/45 shadow-sm flex flex-col justify-between min-h-[350px]">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-50">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 bg-rose-50 text-rose-500 rounded-xl flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 fill-rose-50" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-800 text-sm tracking-tight">{isRtl ? 'تنبيه الأخطاء المتكررة' : 'Attention: High Mistakes (>4)'}</h3>
                    <p className="text-[10px] text-slate-400 font-bold">{isRtl ? 'تقييمات تتطلب تركيزاً ومراجعة' : 'Critical feedback requiring immediate revision'}</p>
                  </div>
                </div>
                <span className="text-[10px] font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded-lg">
                  {alertEvaluations.length} {isRtl ? 'تنبيهات' : 'alerts'}
                </span>
              </div>

              <div className="space-y-3.5 max-h-[220px] overflow-y-auto scrollbar-thin pr-1">
                {alertEvaluations.length === 0 ? (
                  <div className="text-center py-14 space-y-2 select-none">
                    <span className="text-2xl">🎉</span>
                    <h5 className="font-bold text-xs text-slate-700">{isRtl ? 'عمل استثنائي!' : 'Exceptional precision!'}</h5>
                    <p className="text-[10px] text-slate-400 font-semibold">{isRtl ? 'جميع مراجعاتك وتقييماتك الأخيرة ممتازة' : 'No evaluations recorded with over 4 mistakes!'}</p>
                  </div>
                ) : (
                  alertEvaluations.map((ev, idx) => (
                    <div key={ev.id || idx} className="p-3 bg-rose-50/40 border border-rose-100 rounded-2xl flex flex-col gap-2 hover:bg-rose-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-rose-600 bg-rose-50 px-2.5 py-0.5 rounded-lg border border-rose-100 flex items-center gap-1">
                          ⚠️ {ev.mistakesCount} {isRtl ? 'أخطاء' : 'mistakes'}
                        </span>
                        <span className="text-[9px] text-slate-400 font-bold">{formatDate(ev.date)}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <div className="font-extrabold text-slate-800">
                          {ev.surahName || `${isRtl ? 'الحزب' : 'Hizb'} ${ev.hizbNumber}`}
                        </div>
                        <div className="font-black text-[10px] text-[#16C47F]">
                          {ev.accuracyScore}% {isRtl ? 'دقة' : 'Accuracy'}
                        </div>
                      </div>
                      {ev.notes && (
                        <p className="text-[10px] text-slate-500 font-medium italic mt-1 pl-2 border-l border-rose-200">
                          "{ev.notes}"
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-50 text-[9px] text-slate-400 font-bold">
              * {isRtl ? 'المهام يتم إدراجها آلياً بناء على سجلات التقييم' : 'Alert lists are aggregated directly from the evaluation database.'}
            </div>
          </div>

          {/* 7. Charts & Analytics: Accuracy curves */}
          <div className="bg-white p-6 rounded-[32px] border border-slate-200/45 shadow-sm space-y-4 flex flex-col justify-between min-h-[350px]">
            <div className="space-y-1">
              <div className="flex items-center justify-between pb-2">
                <h3 className="text-sm font-black text-slate-800 tracking-tight">{isRtl ? 'منحنى دقة الحفظ والتقييم' : 'Performance Accuracy Trend'}</h3>
                <span className="px-2.5 py-0.5 text-[9px] font-black text-[#16C47F] bg-emerald-50 rounded-lg uppercase tracking-wider">
                  {filterPeriod}
                </span>
              </div>
              
              <div className="h-[210px] mt-4 flex items-center justify-center">
                {accuracyTrendData.length === 0 ? (
                  <div className="text-center py-10 space-y-2 select-none">
                    <span className="text-3xl">📊</span>
                    <h5 className="font-bold text-xs text-slate-500">{isRtl ? 'لا توجد تقييمات لهذه الفترة' : 'No evaluations for this period'}</h5>
                    <p className="text-[10px] text-slate-400 font-semibold">{isRtl ? 'بمجرد تسجيل تقييمات جديدة، سيظهر المنحنى البياني هنا' : 'Once new evaluations are registered, the trend will plot here'}</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={accuracyTrendData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                      <defs>
                        <linearGradient id="gpCore" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#16C47F" stopOpacity={0.25}/>
                          <stop offset="95%" stopColor="#16C47F" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="date" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 600 }} 
                      />
                      <YAxis 
                        domain={[0, 100]} 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 600 }} 
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#fff', 
                          border: 'none', 
                          borderRadius: '16px', 
                          boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)',
                          padding: '12px'
                        }}
                        itemStyle={{ 
                          fontWeight: '950', 
                          fontSize: '12px',
                          color: '#16C47F'
                        }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="score" 
                        stroke="#16C47F" 
                        strokeWidth={3} 
                        fillOpacity={1} 
                        fill="url(#gpCore)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="bg-slate-50 p-2.5 rounded-2xl flex items-center justify-between text-[11px] font-bold text-slate-500">
              <span className="flex items-center gap-1.5 text-slate-400">
                <CheckCircle className="w-3.5 h-3.5 text-[#16C47F]" />
                {isRtl ? 'المنحنى يعبر عن الدرجات المسجلة بفترة الفلترة' : 'Values represent accuracy rating over active sessions'}
              </span>
            </div>
          </div>

        </div>

        {/* Dynamic Secondary Chart Section: Memorization Consistency + Revision Performance + Heatmap */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          
          {/* Latest 10 Evaluations Feed */}
          <div className="bg-white p-6 rounded-[32px] border border-slate-200/45 shadow-sm flex flex-col justify-between min-h-[350px]">
            <div className="space-y-4 h-full flex flex-col w-full">
              <div className="flex items-center justify-between pb-2 border-b border-slate-50">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-800 text-sm tracking-tight">{isRtl ? 'آخر تقييمات الحفظ' : 'Latest 10 Evaluations'}</h3>
                    <p className="text-[10px] text-slate-400 font-bold">{isRtl ? 'سجل تقييم الحفظ والضبط' : 'Quran recitation & precision score'}</p>
                  </div>
                </div>
                <span className="text-[10px] font-black text-[#16C47F] bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100">
                  {last10Evaluations.length} {isRtl ? 'تقاييم' : 'items'}
                </span>
              </div>

              <div className="space-y-3.5 overflow-y-auto scrollbar-thin pr-1 flex-1 max-h-[220px]">
                {last10Evaluations.length === 0 ? (
                  <div className="text-center py-14 space-y-2 select-none">
                    <span className="text-2xl">🌱</span>
                    <h5 className="font-bold text-xs text-slate-705">{isRtl ? 'لا توجد تقييمات' : 'No evaluations yet'}</h5>
                    <p className="text-[10px] text-slate-400 font-semibold">{isRtl ? 'سيظهر سجل تقييماتك الأخيرة هنا' : 'Your recitation scores will appear here'}</p>
                  </div>
                ) : (
                  last10Evaluations.map((ev, idx) => {
                    let scoreBadge = 'bg-rose-50 text-rose-600 border-rose-100';
                    if (ev.accuracyScore >= 95) scoreBadge = 'bg-emerald-50 text-emerald-600 border-emerald-100';
                    else if (ev.accuracyScore >= 85) scoreBadge = 'bg-indigo-50 text-indigo-600 border-indigo-100';
                    else if (ev.accuracyScore >= 75) scoreBadge = 'bg-amber-50 text-amber-600 border-amber-100';

                    return (
                      <div key={ev.id || idx} className="p-3 bg-slate-50/50 border border-slate-100 rounded-2xl flex flex-col gap-2 hover:bg-slate-50 transition-colors">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] text-slate-400 font-bold">{formatDate(ev.date)}</span>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[9px] font-black border ${scoreBadge}`}>
                            {ev.accuracyScore}%
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs font-bold text-slate-750">
                          <div className="font-extrabold text-slate-800">
                            {ev.surahName || `${isRtl ? 'الحزب' : 'Hizb'} ${ev.hizbNumber}`}
                          </div>
                          <div className="text-[10px] text-slate-400 font-bold">
                            {getPortionLabel(ev.quantity, ev.quantityIdentifier)}
                          </div>
                        </div>
                        {ev.notes && (
                          <p className="text-[10px] text-slate-500 font-semibold italic mt-1 pl-2 border-l border-indigo-200">
                            "{ev.notes}"
                          </p>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Latest 10 Revisions Feed */}
          <div className="bg-white p-6 rounded-[32px] border border-slate-200/45 shadow-sm flex flex-col justify-between min-h-[350px]">
            <div className="space-y-4 h-full flex flex-col w-full">
              <div className="flex items-center justify-between pb-2 border-b border-slate-50">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                    <ClipboardList className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-800 text-sm tracking-tight">{isRtl ? 'آخر مراجعات المنهج' : 'Latest 10 Revisions'}</h3>
                    <p className="text-[10px] text-slate-400 font-bold">{isRtl ? 'سجل تكرار المنهج والمقاطع' : 'Recent revision task performances'}</p>
                  </div>
                </div>
                <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100">
                  {last10Revisions.length} {isRtl ? 'مراجعات' : 'items'}
                </span>
              </div>

              <div className="space-y-3.5 overflow-y-auto scrollbar-thin pr-1 flex-1 max-h-[220px]">
                {last10Revisions.length === 0 ? (
                  <div className="text-center py-14 space-y-2 select-none">
                    <span className="text-2xl">📖</span>
                    <h5 className="font-bold text-xs text-slate-705">{isRtl ? 'لا توجد مراجعات' : 'No revisions yet'}</h5>
                    <p className="text-[10px] text-slate-400 font-semibold">{isRtl ? 'سلسلة المراجعات المنجزة ستظهر هنا' : 'Your Revision tasks logs will appear here'}</p>
                  </div>
                ) : (
                  last10Revisions.map((rev, idx) => {
                    let scoreBadge = 'bg-rose-50 text-rose-600 border-rose-100';
                    if (rev.qualityScore >= 95) scoreBadge = 'bg-emerald-50 text-emerald-600 border-emerald-100';
                    else if (rev.qualityScore >= 85) scoreBadge = 'bg-indigo-50 text-indigo-100 border-indigo-100';
                    else if (rev.qualityScore >= 75) scoreBadge = 'bg-amber-50 text-amber-650 border-amber-100';

                    return (
                      <div key={rev.id || idx} className="p-3 bg-slate-50/50 border border-slate-100 rounded-2xl flex flex-col gap-2 hover:bg-slate-50 transition-colors">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] text-slate-400 font-bold">{formatDate(rev.date)}</span>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[9px] font-black border ${scoreBadge}`}>
                            {rev.qualityScore}%
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs font-bold text-slate-750">
                          <div className="font-extrabold text-slate-800">
                            {rev.surahName || `${isRtl ? 'الحزب' : 'Hizb'} ${rev.hizbNumber}`}
                          </div>
                          <div className="text-[10px] text-slate-400 font-bold">
                            {getPortionLabel(rev.quantity, rev.quantityIdentifier)}
                          </div>
                        </div>
                        {rev.notes && (
                          <p className="text-[10px] text-slate-500 font-semibold italic mt-1 pl-2 border-l border-rose-200">
                            "{rev.notes}"
                          </p>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* 8. Attendance Visualization Heatmap */}
          <div className="bg-white p-6 rounded-[32px] border border-slate-200/45 shadow-sm space-y-4 flex flex-col justify-between">
            <div className="space-y-1">
              <h4 className="text-sm font-black text-slate-850 tracking-tight flex items-center gap-2">
                <Activity className="w-4.5 h-4.5 text-[#16C47F]" />
                {isRtl ? 'مصفوفة الحضور والنشاط اليومي' : 'Attendance Contribution Matrix'}
              </h4>
              <p className="text-[10px] text-slate-400 font-bold">{isRtl ? 'سجل الالتزام خلال الـ ٣٥ يوماً الأخيرة' : 'Activity intensity over the last 35 days'}</p>
            </div>

            {/* Matrix Layout */}
            <div className="flex flex-wrap gap-2.5 justify-center py-4 bg-slate-50/55 rounded-2xl p-4 border border-slate-100">
              {heatmapData.map((day, idx) => {
                let cellClass = 'bg-slate-100 hover:ring-1 hover:ring-slate-350';
                if (day.value === 1) cellClass = 'bg-amber-300 hover:ring-1 hover:ring-amber-500';
                else if (day.value === 2) cellClass = 'bg-emerald-300 hover:ring-1 hover:ring-emerald-500';
                else if (day.value === 4) cellClass = 'bg-[#16C47F] hover:ring-1 hover:ring-emerald-600';
                else if (day.value === 10) cellClass = 'bg-rose-450 text-white hover:ring-1 hover:ring-rose-500';

                // Display formatting
                let tooltipText = `${formatDate(day.dateStr)}`;
                if (day.record) {
                  const statusLabel = day.record.status === 'present' ? 'Present' : day.record.status === 'excused' ? 'Excused' : 'Absent';
                  tooltipText += `: ${statusLabel}`;
                } else {
                  tooltipText += ': No session / No record';
                }

                return (
                  <div
                    key={idx}
                    title={tooltipText}
                    className={`w-6.5 h-6.5 rounded-md cursor-pointer transition-all duration-200 ${cellClass}`}
                  />
                );
              })}
            </div>

            {/* Heatmap Legend */}
            <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-2.5 h-2.5 bg-rose-400 rounded-sm" />
                <span>{isRtl ? 'غياب' : 'Absent'}</span>
              </span>
              <div className="flex items-center gap-1">
                <span>Less</span>
                <div className="w-2.5 h-2.5 bg-slate-100 rounded-sm" />
                <div className="w-2.5 h-2.5 bg-amber-200 rounded-sm" />
                <div className="w-2.5 h-2.5 bg-emerald-300 rounded-sm" />
                <div className="w-2.5 h-2.5 bg-[#16C47F] rounded-sm" />
                <span>More</span>
              </div>
            </div>

          </div>

        </div>

        {/* 3. Last 10 Evaluations Table (CRITICAL SECTION: STAYS UNFILTERED ALWAYS) */}
        <div className="bg-white rounded-[32px] border border-slate-200/45 shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 bg-slate-50 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
            <div>
              <h3 className="font-black text-lg text-slate-800 tracking-tight">{isRtl ? 'آخر ١٠ تقييمات حفظ' : 'Last 10 Quran Evaluations'}</h3>
              <p className="text-xs text-slate-400 font-bold mt-1 tracking-wide uppercase">{isRtl ? 'ترتيب تقييمي ثابت غير متأثر بالفلترة الزاوية' : 'Static summary. This section is robustly unaffected by period filters.'}</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse" dir={isRtl ? 'rtl' : 'ltr'}>
              <thead>
                <tr className="bg-slate-50/50 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100 select-none">
                  <th className="px-6 py-4">{t('date', 'Date')}</th>
                  <th className="px-6 py-4">{isRtl ? 'المنهج (الحزب / السورة)' : 'Hizb Number'}</th>
                  <th className="px-6 py-4">{isRtl ? 'المقدار' : 'Quantity / Portion'}</th>
                  <th className="px-6 py-4 text-center">{t('accuracy', 'Score')}</th>
                  <th className="px-6 py-4 text-center">{isRtl ? 'عدد الأخطاء' : 'Mistakes count'}</th>
                  <th className="px-6 py-4">{isRtl ? 'ملاحظة المعلم' : 'Teacher note'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {last10Evaluations.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-bold italic">
                      No matching evaluations captured in student profile database.
                    </td>
                  </tr>
                ) : (
                  last10Evaluations.map((ev, idx) => {
                    // Color-code scores:
                    let scoreBadge = 'bg-rose-50 text-rose-600 border-rose-100';
                    if (ev.accuracyScore >= 95) scoreBadge = 'bg-emerald-50 text-emerald-600 border-emerald-100';
                    else if (ev.accuracyScore >= 85) scoreBadge = 'bg-indigo-50 text-indigo-600 border-indigo-100';
                    else if (ev.accuracyScore >= 75) scoreBadge = 'bg-amber-50 text-amber-600 border-amber-100';

                    return (
                      <tr key={ev.id || idx} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4.5 font-bold text-slate-400 whitespace-nowrap">
                          {formatDate(ev.date)}
                        </td>
                        <td className="px-6 py-4.5 font-extrabold text-slate-800 whitespace-nowrap">
                          {ev.surahName || `${isRtl ? 'الحزب' : 'Hizb'} ${ev.hizbNumber}`}
                        </td>
                        <td className="px-6 py-4.5 text-slate-500 font-bold">
                          {getPortionLabel(ev.quantity, ev.quantityIdentifier)}
                        </td>
                        <td className="px-6 py-4.5 text-center">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-[10px] font-black border ${scoreBadge}`}>
                            {ev.accuracyScore}%
                          </span>
                        </td>
                        <td className="px-6 py-4.5 text-center whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black ${
                            ev.mistakesCount > 2 ? 'bg-rose-50 text-rose-500' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {ev.mistakesCount || 0} {isRtl ? 'أخطاء' : 'mistakes'}
                          </span>
                        </td>
                        <td className="px-6 py-4.5 text-slate-500 italic max-w-sm truncate" title={ev.notes}>
                          {ev.notes || '---'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>


        {/* Dynamic Complete Quranic Hizb Grid Progress Mapping */}
        <div className="space-y-6 pt-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-4">
            <div className="space-y-1">
              <h3 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                <ClipboardList className="w-7 h-7 text-[#16C47F]" />
                {isRtl ? 'مصفوفة تتبع وإتقان الأحزاب الـ ٦٠' : 'Quran 60 Hizbs Completion Grid'}
              </h3>
              <p className="text-sm text-slate-400 font-semibold">
                {(student.totalHizbs || 0).toFixed(2)} / 60 {t('hizbs', 'Hizbs')} {t('memorized', 'Memorized')}
              </p>
            </div>
            <div className="w-full sm:w-72 h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200/30">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${(student.totalHizbs || 0) / 60 * 100}%` }}
                transition={{ duration: 1.8 }}
                className="h-full bg-gradient-to-r from-emerald-400 to-[#16C47F]"
              />
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-[32px] border border-slate-200/40 shadow-soft">
            <MemorizationGrid evaluations={data.evaluations} />
          </div>
        </div>

      </div>

    </div>
  );
}
