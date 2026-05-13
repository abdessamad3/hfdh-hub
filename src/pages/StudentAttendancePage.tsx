import { useState, useEffect, useMemo } from 'react';
import { auth } from '../lib/firebase';
import { dbService } from '../services/db';
import { Attendance, Student } from '../types';
import { Calendar as CalendarIcon, CheckCircle, XCircle, Clock, Filter, ChevronLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { formatDate, isToday } from '../lib/dateUtils';
import { Link } from 'react-router-dom';

type FilterPeriod = '7days' | '30days' | 'thisMonth' | 'lastMonth' | 'all';

export default function StudentAttendancePage() {
  const { t } = useTranslation();
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterPeriod, setFilterPeriod] = useState<FilterPeriod>('30days');

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

  const filteredAttendance = useMemo(() => {
    const now = new Date();
    return attendance.filter(record => {
      const recordDate = new Date(record.date);
      if (filterPeriod === '7days') {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(now.getDate() - 7);
        return recordDate >= sevenDaysAgo;
      }
      if (filterPeriod === '30days') {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(now.getDate() - 30);
        return recordDate >= thirtyDaysAgo;
      }
      if (filterPeriod === 'thisMonth') {
        return recordDate.getMonth() === now.getMonth() && recordDate.getFullYear() === now.getFullYear();
      }
      if (filterPeriod === 'lastMonth') {
        const lastMonth = new Date();
        lastMonth.setMonth(now.getMonth() - 1);
        return recordDate.getMonth() === lastMonth.getMonth() && recordDate.getFullYear() === lastMonth.getFullYear();
      }
      return true;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [attendance, filterPeriod]);

  const stats = useMemo(() => {
    const presentCount = filteredAttendance.filter(r => r.status === 'present').length;
    const rate = filteredAttendance.length > 0 ? Math.round((presentCount / filteredAttendance.length) * 100) : 0;
    return { presentCount, rate, total: filteredAttendance.length };
  }, [filteredAttendance]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
        <p className="text-gray-500 font-medium animate-pulse">{t('loading_progress')}</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 space-y-8 max-w-6xl mx-auto text-black">
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <Link to="/" className="inline-flex items-center gap-2 text-emerald-600 font-bold hover:gap-3 transition-all group">
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          {t('back_to_portal')}
        </Link>
        
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 pb-4 border-b border-gray-100">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-emerald-600 text-white rounded-3xl flex items-center justify-center shadow-xl shadow-emerald-200 rotate-3 hover:rotate-0 transition-transform duration-500">
              <CheckCircle className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h2 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight leading-none">{t('attendance_mirror')}</h2>
            </div>
          </div>

          <div className="flex items-center gap-1.5 bg-gray-100/50 p-1.5 rounded-2xl border border-gray-200/50 backdrop-blur-sm self-start lg:self-auto overflow-x-auto no-scrollbar">
            {(['7days', '30days', 'thisMonth', 'lastMonth', 'all'] as FilterPeriod[]).map((p) => (
              <button
                key={p}
                onClick={() => setFilterPeriod(p)}
                className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.1em] whitespace-nowrap transition-all duration-300 ${
                  filterPeriod === p 
                    ? 'bg-white text-emerald-600 shadow-sm border border-emerald-100 scale-105' 
                    : 'text-gray-400 hover:text-gray-600 hover:bg-white/50'
                }`}
              >
                {t(p === '7days' ? 'last_7_days' : p === '30days' ? 'last_30_days' : p === 'thisMonth' ? 'this_month' : p === 'lastMonth' ? 'last_month' : 'all')}
              </button>
            ))}
          </div>
        </div>
      </motion.header>

      {/* Stats Cards - Bento Grid Inspired */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-white p-8 rounded-[40px] border shadow-sm flex flex-col justify-between gap-6 group hover:shadow-xl hover:shadow-emerald-100/50 transition-all border-emerald-50"
        >
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">{t('days_present')}</p>
            <h4 className="text-4xl font-black text-gray-900 group-hover:text-emerald-600 transition-colors">{stats.presentCount}</h4>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-white p-8 rounded-[40px] border shadow-sm flex flex-col justify-between gap-6 group hover:shadow-xl hover:shadow-blue-100/50 transition-all border-blue-50"
        >
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
            <Filter className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">{t('total_sessions')}</p>
            <h4 className="text-4xl font-black text-gray-900 group-hover:text-blue-600 transition-colors">{stats.total}</h4>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-white p-8 rounded-[40px] border shadow-sm flex flex-col justify-between gap-6 group hover:shadow-xl hover:shadow-amber-100/50 transition-all border-amber-50"
        >
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">{t('attendance_rate')}</p>
            <h4 className="text-4xl font-black text-gray-900 group-hover:text-amber-600 transition-colors">{stats.rate}%</h4>
          </div>
        </motion.div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white border-2 border-gray-100 rounded-[40px] shadow-sm overflow-hidden"
      >
        <div className="p-8 border-b bg-gray-50/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <CalendarIcon className="w-6 h-6 text-emerald-600" />
             <h3 className="text-xl font-black text-gray-900 tracking-tight">
               {t('attendance_history')}
             </h3>
          </div>
          <span className="px-4 py-1.5 bg-white border rounded-full text-[10px] font-black uppercase tracking-widest text-emerald-600 shadow-sm">
            {filteredAttendance.length} {t('records')}
          </span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/30">
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 border-b">{t('date')}</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 border-b">{t('status')}</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 border-b">{t('notes')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredAttendance.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center gap-4 text-gray-300">
                      <Clock className="w-16 h-16 opacity-20" />
                      <p className="font-bold text-lg">{t('no_attendance_records')}</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredAttendance.map((record, index) => (
                  <tr key={record.id} className="hover:bg-emerald-50/30 transition-all group">
                    <td className="px-8 py-6 font-black text-gray-900 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                        {formatDate(record.date)}
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                        record.status === 'present' 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-100 group-hover:bg-emerald-600 group-hover:text-white' 
                          : 'bg-red-50 text-red-700 border-red-100 group-hover:bg-red-600 group-hover:text-white'
                      }`}>
                        {record.status === 'present' ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                        {t(record.status)}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="max-w-md">
                        <p className="text-sm text-gray-500 font-medium leading-relaxed italic group-hover:text-gray-900 transition-colors">
                          {record.notes ? `"${record.notes}"` : '-'}
                        </p>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}

function TrendingUp(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  );
}
