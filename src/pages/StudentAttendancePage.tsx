import { useState, useEffect, useMemo } from 'react';
import { auth } from '../lib/firebase';
import { dbService } from '../services/db';
import { Attendance, Student } from '../types';
import { 
  Calendar as CalendarIcon, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Bell, 
  Flame, 
  Award, 
  ChevronLeft, 
  ChevronRight, 
  FileDown, 
  Search, 
  List, 
  Layers,
  ArrowRight,
  TrendingUp
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import { formatDate } from '../lib/dateUtils';
import { Link } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

export default function StudentAttendancePage() {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';

  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);

  // States for interactive navigation
  const [currentYear, setCurrentYear] = useState<number>(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(new Date().getMonth()); // 0-indexed
  const [viewMode, setViewMode] = useState<'month' | 'list'>('month');
  const [searchQuery, setSearchQuery] = useState('');
  const [overviewRange, setOverviewRange] = useState<'thisMonth' | 'all'>('thisMonth');

  // Load subscriptions
  useEffect(() => {
    let unsubscribes: (() => void)[] = [];

    const setupSubscriptions = async () => {
      if (!auth.currentUser?.email) return;
      try {
        setLoading(true);
        const email = auth.currentUser.email.toLowerCase();
        
        const mainUnsubscribe = dbService.subscribeStudentProfile(email, (studentData) => {
          if (!studentData) {
            setLoading(false);
            return;
          }
          setStudent(studentData);

          const u1 = dbService.subscribeStudentAttendance(studentData.id, email, (data) => {
            setAttendance(data);
            setLoading(false);
          });

          unsubscribes.push(u1);
        });

        unsubscribes.push(mainUnsubscribe);
      } catch (err) {
        console.error('Error setting up attendance subscriptions:', err);
        setLoading(false);
      }
    };

    setupSubscriptions();

    return () => unsubscribes.forEach(unsub => unsub());
  }, []);

  // List of years and months for selectors
  const years = useMemo(() => {
    const current = new Date().getFullYear();
    const result = [];
    for (let y = current - 3; y <= current + 1; y++) {
      result.push(y);
    }
    return result;
  }, []);

  const months = useMemo(() => [
    { value: 0, label: t('january', 'January') },
    { value: 1, label: t('february', 'February') },
    { value: 2, label: t('march', 'March') },
    { value: 3, label: t('april', 'April') },
    { value: 4, label: t('may', 'May') },
    { value: 5, label: t('june', 'June') },
    { value: 6, label: t('july', 'July') },
    { value: 7, label: t('august', 'August') },
    { value: 8, label: t('september', 'September') },
    { value: 9, label: t('october', 'October') },
    { value: 10, label: t('november', 'November') },
    { value: 11, label: t('december', 'December') }
  ], [t]);

  // Navigate month
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  // Compute stats based on the ALL-TIME or current MONTH view based on user selection
  const stats = useMemo(() => {
    // Filter records according to overview range selector (This Month vs All Time)
    const records = attendance.filter(r => {
      if (overviewRange === 'thisMonth') {
        const d = new Date(r.date);
        return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
      }
      return true;
    });

    const presentCount = records.filter(r => r.status === 'present').length;
    const absentCount = records.filter(r => r.status === 'absent').length;
    const lateCount = records.filter(r => r.status === 'excused').length; // map excused to Late
    const totalCount = presentCount + absentCount + lateCount;

    const rate = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;
    
    // Evaluate status rating
    let rateLabel = t('neutral', 'Balanced');
    if (rate >= 85) rateLabel = t('excellent_grade', 'Excellent');
    else if (rate >= 70) rateLabel = t('very_good', 'Very Good');
    else if (rate >= 50) rateLabel = t('good_rating', 'Good');
    else if (rate > 0) rateLabel = t('action_required', 'Needs Work');

    // Count weekends in the displaying month
    let weekendCount = 0;
    const totalDaysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    for (let day = 1; day <= totalDaysInMonth; day++) {
      const d = new Date(currentYear, currentMonth, day);
      if (d.getDay() === 0 || d.getDay() === 6) { // Sun OR Sat
        weekendCount++;
      }
    }

    // Interactive continuous streak calculation
    let currentStreak = 0;
    const sortedPresentDates = [...attendance]
      .filter(r => r.status === 'present')
      .map(r => r.date)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    if (sortedPresentDates.length > 0) {
      const todayStr = new Date().toISOString().split('T')[0];
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      if (sortedPresentDates[0] === todayStr || sortedPresentDates[0] === yesterdayStr) {
        currentStreak = 1;
        let lastDate = new Date(sortedPresentDates[0]);
        for (let i = 1; i < sortedPresentDates.length; i++) {
          const d = new Date(sortedPresentDates[i]);
          const diffDays = Math.ceil((lastDate.getTime() - d.getTime()) / (1000 * 30 * 24 * 60 * 60)); // soft diff
          const exactDiff = Math.abs(Math.round((lastDate.getTime() - d.getTime()) / (1000 * 30 * 25))); // day count
          
          if (exactDiff <= 2) {
            currentStreak++;
            lastDate = d;
          } else {
            break;
          }
        }
      }
    }

    return {
      presentCount,
      absentCount,
      lateCount,
      totalCount,
      rate,
      rateLabel,
      weekendCount,
      currentStreak
    };
  }, [attendance, currentYear, currentMonth, overviewRange, t]);

  // Generate calendar days
  const calendarCells = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const startDayOfWeek = firstDay.getDay(); // 0 indicates Sunday

    const daysInCurMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

    const cells = [];

    // Prior Month Padding Cells
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const prevDayNum = daysInPrevMonth - i;
      const prevDate = new Date(currentYear, currentMonth - 1, prevDayNum);
      const dateStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}-${String(prevDayNum).padStart(2, '0')}`;
      const dayOfWeek = prevDate.getDay();
      
      cells.push({
        dateStr,
        dayNum: prevDayNum,
        isPadding: true,
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6
      });
    }

    // Active Month Cells
    for (let d = 1; d <= daysInCurMonth; d++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const curDate = new Date(currentYear, currentMonth, d);
      const dayOfWeek = curDate.getDay();

      cells.push({
        dateStr,
        dayNum: d,
        isPadding: false,
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6
      });
    }

    // Future Month Padding Cells
    const totalGridSize = cells.length > 35 ? 42 : 35;
    const remainingCount = totalGridSize - cells.length;
    for (let d = 1; d <= remainingCount; d++) {
      const nextDate = new Date(currentYear, currentMonth + 1, d);
      const dateStr = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayOfWeek = nextDate.getDay();

      cells.push({
        dateStr,
        dayNum: d,
        isPadding: true,
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6
      });
    }

    return cells;
  }, [currentYear, currentMonth]);

  // Handle export event beautifully
  const handleExport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(attendance, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `attendance_mirror_${student?.name || 'student'}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Recharts Pie Chart settings
  const donutChartData = useMemo(() => {
    return [
      { name: t('present_days', 'Present'), value: stats.presentCount, color: '#10b981' },
      { name: t('absent_days', 'Absent'), value: stats.absentCount, color: '#f43f5e' },
      { name: t('late_days', 'Late'), value: stats.lateCount, color: '#f59e0b' },
      { name: t('weekend_holiday', 'Weekend/Holiday'), value: stats.weekendCount, color: '#e5e7eb' }
    ];
  }, [stats, t]);

  // Sorted real logs matching list view query
  const searchedLogs = useMemo(() => {
    return attendance
      .filter(record => {
        const d = new Date(record.date);
        const matchesQuery = record.notes?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                             record.date.includes(searchQuery);
        const matchesMonth = d.getFullYear() === currentYear && d.getMonth() === currentMonth;
        return matchesQuery && matchesMonth;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [attendance, searchQuery, currentYear, currentMonth]);

  const recentLogsList = useMemo(() => {
    return [...attendance]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  }, [attendance]);

  // Current formatted full localized date
  const todayFormatted = useMemo(() => {
    return new Date().toLocaleDateString(isRtl ? 'ar-EG' : 'en-US', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }, [isRtl]);

  const weekdays = isRtl 
    ? ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
    : ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[75vh] bg-[#f8f9fa] gap-4">
        <div className="w-12 h-12 border-4 border-emerald-100 border-t-[#10b981] rounded-full animate-spin" />
        <p className="text-gray-400 font-medium text-xs tracking-widest uppercase">{t('loading_data', 'Loading data...')}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa] py-8 px-4 sm:px-8 space-y-8 text-slate-800" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Top Breadcrumb Navigation */}
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ChevronLeft className={`w-4 h-4 ${isRtl ? 'rotate-180' : ''}`} />
          {t('back_to_portal', 'Back to Portal')}
        </Link>
      </div>

      {/* Main Top Header Wrapper */}
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-slate-200/60">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">{t('attendance_mirror', 'Attendance Mirror')}</h1>
          <p className="text-sm text-slate-500 mt-1">{t('attendance_subtitle', 'Track your daily attendance and maintain consistency.')}</p>
        </div>

        {/* Real-time Current Indicators Grid */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="bg-white px-4 py-2.5 rounded-2xl border border-slate-200/50 shadow-sm flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-[#10b981]">
              <CalendarIcon className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('today_date', 'Today')}</p>
              <p className="text-xs font-bold text-slate-700">{todayFormatted}</p>
            </div>
          </div>

          <button className="relative w-10 h-10 rounded-2xl bg-white border border-slate-200/50 shadow-sm hover:bg-slate-50 flex items-center justify-center text-slate-500 transition-colors">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-rose-500" />
          </button>

          <div className="flex items-center gap-2 bg-white pl-4 pr-1.5 py-1.5 rounded-2xl border border-slate-200/50 shadow-sm">
            <span className="text-xs font-semibold text-slate-600">{student?.name || t('student', 'Student')}</span>
            <div className="w-8 h-8 rounded-xl bg-[#10b981] text-white flex items-center justify-center font-black text-sm uppercase">
              {student?.name ? student.name[0] : 'S'}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards Bento Bar */}
      <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-5 gap-4 sm:gap-6">
        {/* Card 1: Present */}
        <div className="bg-white p-5 rounded-3xl border border-emerald-50/70 shadow-sm hover:shadow-md transition-all flex flex-col justify-between min-h-[120px] relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/5 rounded-full blur-2xl group-hover:scale-150 transition-all" />
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 animate-pulse" />
            </div>
            <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              {stats.totalCount > 0 ? Math.round((stats.presentCount / stats.totalCount) * 100) : 0}%
            </span>
          </div>
          <div className="mt-4">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('present_days', 'Present Days')}</p>
            <h3 className="text-2xl font-black text-slate-800 tracking-tight mt-0.5">{stats.presentCount} {t('days_count', 'Days')}</h3>
          </div>
        </div>

        {/* Card 2: Absent */}
        <div className="bg-white p-5 rounded-3xl border border-rose-50/70 shadow-sm hover:shadow-md transition-all flex flex-col justify-between min-h-[120px] relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-20 h-20 bg-rose-500/5 rounded-full blur-2xl group-hover:scale-150 transition-all" />
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <XCircle className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">
              {stats.totalCount > 0 ? Math.round((stats.absentCount / stats.totalCount) * 100) : 0}%
            </span>
          </div>
          <div className="mt-4">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('absent_days', 'Absent Days')}</p>
            <h3 className="text-2xl font-black text-slate-800 tracking-tight mt-0.5">{stats.absentCount} {t('days_count', 'Days')}</h3>
          </div>
        </div>

        {/* Card 3: Late */}
        <div className="bg-white p-5 rounded-3xl border border-amber-50/70 shadow-sm hover:shadow-md transition-all flex flex-col justify-between min-h-[120px] relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-20 h-20 bg-amber-500/5 rounded-full blur-2xl group-hover:scale-150 transition-all" />
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
              {stats.totalCount > 0 ? Math.round((stats.lateCount / stats.totalCount) * 100) : 0}%
            </span>
          </div>
          <div className="mt-4">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('late_days', 'Late Days')}</p>
            <h3 className="text-2xl font-black text-slate-800 tracking-tight mt-0.5">{stats.lateCount} {t('days_count', 'Days')}</h3>
          </div>
        </div>

        {/* Card 4: Attendance Rate */}
        <div className="bg-white p-5 rounded-3xl border border-blue-50/70 shadow-sm hover:shadow-md transition-all flex flex-col justify-between min-h-[120px] relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/5 rounded-full blur-2xl group-hover:scale-150 transition-all" />
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Award className="w-5 h-5" />
            </div>
            <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full uppercase tracking-wider">
              {stats.rateLabel}
            </span>
          </div>
          <div className="mt-4">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('attendance_rate_label', 'Attendance Rate')}</p>
            <h3 className="text-2xl font-black text-slate-800 tracking-tight mt-0.5">{stats.rate}%</h3>
          </div>
        </div>

        {/* Card 5: Current Streak */}
        <div className="bg-white p-5 rounded-3xl border border-purple-50/70 shadow-sm hover:shadow-md transition-all flex flex-col justify-between col-span-2 md:col-span-1 min-h-[120px] relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-20 h-20 bg-purple-500/5 rounded-full blur-2xl group-hover:scale-150 transition-all" />
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Flame className="w-5 h-5 animate-bounce" />
            </div>
            <span className="text-[10px] font-black text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">
              {t('streak', 'Streak')}
            </span>
          </div>
          <div className="mt-4">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('current_streak', 'Current Streak')}</p>
            <h3 className="text-2xl font-black text-slate-800 tracking-tight mt-0.5">{stats.currentStreak} {t('days_count', 'Days')}</h3>
          </div>
        </div>
      </div>

      {/* Middle Split layout */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Side: Calendar / List Panel (col-span 2) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-[32px] border border-slate-200/55 p-6 shadow-sm">
            {/* Calendar Control Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
              {/* Navigate Arrows & Label */}
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-slate-800 tracking-tight whitespace-nowrap min-w-[130px]">
                  {months[currentMonth].label} {currentYear}
                </h2>
                <div className="flex items-center gap-1">
                  <button 
                    onClick={handlePrevMonth}
                    className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-200/40 flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={handleNextMonth}
                    className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-200/40 flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Select dropdowns and ViewMode switches */}
              <div className="flex flex-wrap items-center gap-2">
                <select 
                  value={currentYear}
                  onChange={(e) => setCurrentYear(parseInt(e.target.value))}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold bg-white text-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  {years.map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>

                <select 
                  value={currentMonth}
                  onChange={(e) => setCurrentMonth(parseInt(e.target.value))}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold bg-white text-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  {months.map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>

                <div className="h-4 w-[1px] bg-slate-200 mx-1Hidden sm:block" />

                <div className="bg-slate-100/70 p-1 rounded-xl flex items-center gap-1 border border-slate-200/20">
                  <button 
                    onClick={() => setViewMode('month')}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-wider uppercase transition-all ${
                      viewMode === 'month' 
                        ? 'bg-white text-[#10b981] shadow-sm' 
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    {t('month', 'Month')}
                  </button>
                  <button 
                    onClick={() => setViewMode('list')}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-wider uppercase transition-all ${
                      viewMode === 'list' 
                        ? 'bg-white text-[#10b981] shadow-sm' 
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    {t('list', 'List')}
                  </button>
                </div>
              </div>
            </div>

            {/* Display Body according to toggle selection */}
            <AnimatePresence mode="wait">
              {viewMode === 'month' ? (
                <motion.div 
                  key="month-view"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="mt-6"
                >
                  {/* Calendar Weekday titles */}
                  <div className="grid grid-cols-7 gap-1.5 text-center mb-2">
                    {weekdays.map((day, idx) => (
                      <div 
                        key={idx} 
                        className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest py-2"
                      >
                        {day}
                      </div>
                    ))}
                  </div>

                  {/* Calendar Cell Grid */}
                  <div className="grid grid-cols-7 gap-1.5">
                    {calendarCells.map((cell, idx) => {
                      const record = attendance.find(r => r.date === cell.dateStr);

                      return (
                        <div 
                          key={idx}
                          className={`min-h-[64px] sm:min-h-[76px] p-2 rounded-2xl border flex flex-col justify-between transition-all ${
                            cell.isPadding 
                              ? 'bg-slate-50/40 border-slate-100 text-slate-300' 
                              : record?.status === 'present' 
                                ? 'bg-[#edfbf4] border-emerald-100/70 text-emerald-800'
                                : record?.status === 'absent'
                                  ? 'bg-[#fdf2f2] border-rose-100/70 text-rose-800'
                                  : record?.status === 'excused'
                                    ? 'bg-[#fffbeb] border-amber-100/70 text-amber-800'
                                    : cell.isWeekend
                                      ? 'bg-slate-50 border-slate-100 text-slate-450'
                                      : 'bg-white border-slate-200/40 text-slate-600 hover:border-slate-300'
                          }`}
                        >
                          {/* Inner day identifier */}
                          <span className={`text-[11px] font-black ${cell.isPadding ? 'opacity-40' : 'opacity-85'}`}>
                            {cell.dayNum}
                          </span>

                          {/* Render indicators matching status precisely */}
                          <div className="flex justify-center mt-1">
                            {cell.isPadding ? (
                              <div className="w-1 h-1 rounded-full bg-slate-300/40" />
                            ) : record?.status === 'present' ? (
                              <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-sm shadow-emerald-200">
                                <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
                              </div>
                            ) : record?.status === 'absent' ? (
                              <div className="w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-sm shadow-rose-200">
                                <XCircle className="w-3.5 h-3.5 stroke-[2.5]" />
                              </div>
                            ) : record?.status === 'excused' ? (
                              <div className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-sm shadow-amber-200">
                                <Clock className="w-3.5 h-3.5 stroke-[2.5]" />
                              </div>
                            ) : cell.isWeekend ? (
                              <div className="w-2.5 h-2.5 rounded-full bg-slate-200" />
                            ) : (
                              <div className="w-1 h-1 rounded-full bg-slate-300" />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Bottom Legends Panel */}
                  <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-6">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                        <span className="w-3 h-3 rounded-full bg-emerald-500" />
                        {t('present', 'Present')}
                      </div>
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                        <span className="w-3 h-3 rounded-full bg-rose-500" />
                        {t('absent', 'Absent')}
                      </div>
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                        <span className="w-3 h-3 rounded-full bg-amber-500" />
                        {t('late', 'Late')}
                      </div>
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                        <span className="w-3 h-3 rounded-full bg-slate-200" />
                        {t('weekend_holiday', 'Weekend / Holiday')}
                      </div>
                    </div>

                    <button 
                      onClick={handleExport}
                      className="inline-flex items-center gap-2 bg-slate-900 text-white hover:bg-slate-800 transition-colors px-4 py-2 rounded-2xl text-xs font-bold shadow-sm"
                    >
                      <FileDown className="w-4 h-4" />
                      {t('export', 'Export')}
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.div 
                  key="list-view"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="mt-6 space-y-4"
                >
                  {/* Search Input inline query */}
                  <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type="text"
                      placeholder={t('search_logs_placeholder', 'Search notes or dates (e.g. 2026)...')}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-slate-50 pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200/50 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  {/* List View Details Table */}
                  <div className="overflow-hidden rounded-2xl border border-slate-200/40">
                    <table className="w-full text-left border-collapse" dir={isRtl ? 'rtl' : 'ltr'}>
                      <thead>
                        <tr className="bg-slate-55/40 text-slate-400 text-[10px] font-black uppercase tracking-wider">
                          <th className="px-6 py-4">{t('date', 'Date')}</th>
                          <th className="px-6 py-4">{t('status', 'Status')}</th>
                          <th className="px-6 py-4">{t('notes', 'Notes')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {searchedLogs.length === 0 ? (
                          <tr>
                            <td colSpan={3} className="text-center py-12 text-slate-400 font-bold text-xs">
                              {t('no_matching_records', 'No matching records found for this period.')}
                            </td>
                          </tr>
                        ) : (
                          searchedLogs.map((record) => (
                            <tr key={record.id} className="hover:bg-slate-50 transition-colors">
                              <td className="px-6 py-4 text-xs font-bold text-slate-800">
                                {formatDate(record.date)}
                              </td>
                              <td className="px-6 py-4">
                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest border ${
                                  record.status === 'present' 
                                    ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
                                    : record.status === 'absent'
                                      ? 'bg-rose-50 border-rose-100 text-rose-700'
                                      : 'bg-amber-50 border-amber-100 text-amber-700'
                                }`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${
                                    record.status === 'present' ? 'bg-emerald-500' :
                                    record.status === 'absent' ? 'bg-rose-500' : 'bg-amber-500'
                                  }`} />
                                  {record.status === 'excused' ? t('late', 'Late') : t(record.status)}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-xs text-slate-500 italic max-w-xs truncate">
                                {record.notes || '-'}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Right Side: Overview & Activity panel (col-span 1) */}
        <div className="space-y-6">
          {/* Card 1: Attendance Overview */}
          <div className="bg-white rounded-[32px] border border-slate-200/55 p-6 shadow-sm">
            <div className="flex items-center justify-between pb-6 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-800">{t('attendance_overview', 'Attendance Overview')}</h3>
              
              <select 
                value={overviewRange}
                onChange={(e) => setOverviewRange(e.target.value as 'thisMonth' | 'all')}
                className="px-2.5 py-1.5 rounded-xl border border-slate-200 text-[10px] font-black uppercase tracking-wider bg-white text-slate-500 focus:outline-none"
              >
                <option value="thisMonth">{t('this_month_choice', 'This Month')}</option>
                <option value="all">{t('all_time', 'All Time')}</option>
              </select>
            </div>

            {/* Recharts Pie Donut Chart */}
            <div className="relative h-44 flex items-center justify-center mt-6">
              {stats.totalCount > 0 || stats.holidayCount > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={donutChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={70}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {donutChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  
                  {/* Central Text Panel */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-black text-slate-800">{stats.totalCount + stats.weekendCount}</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('total_days', 'Total Days')}</span>
                  </div>
                </>
              ) : (
                <div className="text-xs text-slate-400 font-bold">{t('empty_logs', 'No data registered')}</div>
              )}
            </div>

            {/* Structured Pie Chart Legend */}
            <div className="mt-6 space-y-3">
              {/* Present Row */}
              <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]" />
                  <span>{t('present', 'Present')}</span>
                </div>
                <span>
                  {stats.presentCount} ({stats.totalCount > 0 ? Math.round((stats.presentCount / stats.totalCount) * 100) : 0}%)
                </span>
              </div>

              {/* Absent Row */}
              <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#f43f5e]" />
                  <span>{t('absent', 'Absent')}</span>
                </div>
                <span>
                  {stats.absentCount} ({stats.totalCount > 0 ? Math.round((stats.absentCount / stats.totalCount) * 100) : 0}%)
                </span>
              </div>

              {/* Late Row */}
              <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]" />
                  <span>{t('late', 'Late')}</span>
                </div>
                <span>
                  {stats.lateCount} ({stats.totalCount > 0 ? Math.round((stats.lateCount / stats.totalCount) * 100) : 0}%)
                </span>
              </div>

              {/* Weekend / Holiday Row */}
              <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-200" />
                  <span>{t('weekend_holiday_label', 'Weekend / Holiday')}</span>
                </div>
                <span>{stats.weekendCount}</span>
              </div>
            </div>
          </div>

          {/* Card 2: Recent Activity */}
          <div className="bg-white rounded-[32px] border border-slate-200/55 p-6 shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-800">{t('recent_activity', 'Recent Activity')}</h3>
              
              <button 
                onClick={() => setViewMode('list')}
                className="text-[10px] font-black text-emerald-600 hover:text-emerald-700 uppercase tracking-widest"
              >
                {t('view_all', 'View all')}
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {recentLogsList.length === 0 ? (
                <p className="text-xs text-slate-400 font-semibold text-center py-4">{t('no_activity', 'No recent logs')}</p>
              ) : (
                recentLogsList.map((log) => (
                  <div key={log.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0 hover:bg-slate-50/50 px-2 rounded-xl transition-colors">
                    <span className="text-xs font-bold text-slate-500">{formatDate(log.date)}</span>
                    <span className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg ${
                      log.status === 'present' ? 'text-emerald-600' :
                      log.status === 'absent' ? 'text-rose-600' : 'text-amber-600'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        log.status === 'present' ? 'bg-emerald-500' :
                        log.status === 'absent' ? 'bg-rose-500' : 'bg-amber-500'
                      }`} />
                      {log.status === 'excused' ? t('late', 'Late') : t(log.status)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
