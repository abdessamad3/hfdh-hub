import { useState, useMemo } from 'react';
import { 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay 
} from 'date-fns';
import { 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Award, 
  History, 
  X, 
  BookOpen, 
  Calendar as CalendarIcon,
  Quote,
  TrendingUp
} from 'lucide-react';
import type { Attendance, Evaluation, Revision, NextRevision } from '../types';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import { formatDate } from '../lib/dateUtils';

interface StudentCalendarProps {
  attendance: Attendance[];
  evaluations: Evaluation[];
  revisions?: Revision[];
  nextRevisions?: NextRevision[];
}

export default function StudentCalendar({ attendance = [], evaluations = [], revisions = [], nextRevisions = [] }: StudentCalendarProps) {
  const { t, i18n } = useTranslation();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDetail, setSelectedDetail] = useState<{
    type: 'evaluation' | 'revision' | 'nextRevision';
    data: Evaluation | Revision | NextRevision;
  } | null>(null);

  const getPortionLabel = (q: number) => {
    if (q >= 1 && q <= 8) return t(`thumun_${q}`);
    return q > 0 ? `${q} ${t('unit_thumn')}` : '';
  };

  const days = useMemo(() => {
    try {
      const start = startOfWeek(startOfMonth(currentMonth));
      const end = endOfWeek(endOfMonth(currentMonth));
      return eachDayOfInterval({ start, end });
    } catch (e) {
      console.error('Calendar interval error:', e);
      return [];
    }
  }, [currentMonth]);

  const prevMonth = () => {
    const d = new Date(currentMonth);
    d.setMonth(d.getMonth() - 1);
    setCurrentMonth(d);
  };
  const nextMonth = () => {
    const d = new Date(currentMonth);
    d.setMonth(d.getMonth() + 1);
    setCurrentMonth(d);
  };

  const getDayData = (day: Date) => {
    const year = day.getFullYear();
    const month = String(day.getMonth() + 1).padStart(2, '0');
    const date = String(day.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${date}`;
    const dayAttendance = attendance.find(a => a.date === dateStr);
    const dayEvaluations = evaluations.filter(e => e.date === dateStr);
    const dayRevisions = revisions.filter(r => r.date === dateStr);
    const dayNextRevisions = nextRevisions.filter(r => r.dueDate === dateStr);
    return { 
      attendance: dayAttendance, 
      evaluations: dayEvaluations, 
      revisions: dayRevisions,
      nextRevisions: dayNextRevisions
    };
  };

  const monthYearLabel = currentMonth.toLocaleDateString(i18n.language === 'ar' ? 'ar-EG' : 'en-US', {
    month: 'long',
    year: 'numeric'
  });

  const weekDays = i18n.language === 'ar' 
    ? ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="bg-white border rounded-3xl shadow-sm overflow-hidden text-black">
      <div className="p-6 border-b flex items-center justify-between bg-gray-50">
        <div>
          <h3 className="text-xl font-bold text-gray-900">{monthYearLabel}</h3>
          <p className="text-sm text-gray-500 font-medium">{t('monthly_progress_overview')}</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={prevMonth}
            className="p-2 hover:bg-gray-200 rounded-xl transition-colors text-gray-600"
          >
            {i18n.language === 'ar' ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          </button>
          <button 
            onClick={nextMonth}
            className="p-2 hover:bg-gray-200 rounded-xl transition-colors text-gray-600"
          >
            {i18n.language === 'ar' ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
          </button>
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-7 mb-4">
          {weekDays.map(day => (
            <div key={day} className="text-center text-[10px] sm:text-xs font-black text-gray-400 uppercase tracking-widest py-2">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-px bg-gray-100 border border-gray-100 rounded-xl overflow-hidden">
          {days.map((day, idx) => {
            const { 
              attendance: att, 
              evaluations: dayEvals, 
              revisions: dayRevisions,
              nextRevisions: dayNextRevisions
            } = getDayData(day);
            const isCurrentMonth = isSameMonth(day, currentMonth);

            return (
              <div 
                key={idx}
                className={`min-h-[90px] sm:min-h-[120px] p-1 sm:p-2 transition-all group relative ${
                  isCurrentMonth ? 'bg-white' : 'bg-gray-50 text-gray-300'
                }`}
              >
                <div className="flex justify-between items-start mb-0.5 sm:mb-1">
                  <span className={`text-xs sm:text-sm font-bold ${isCurrentMonth ? 'text-gray-900' : 'text-gray-300'}`}>
                    {day.getDate()}
                  </span>
                  
                  {att && (
                    <div title={`${t('status')}: ${t(att.status)}${att.excuse ? ` (${att.excuse})` : ''}`}>
                      {att.status === 'present' && <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-emerald-500" />}
                      {att.status === 'absent' && <XCircle className="w-3 h-3 sm:w-4 sm:h-4 text-red-500" />}
                      {att.status === 'excused' && (
                        <div className="flex flex-col items-end gap-1">
                          <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-blue-500" />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-0.5 sm:space-y-1">
                  {dayEvals.map((ev) => (
                    <button 
                      key={ev.id} 
                      onClick={() => setSelectedDetail({ type: 'evaluation', data: ev })}
                      className="w-full text-left p-0.5 sm:p-1 px-1 sm:px-2 border rounded-md sm:rounded-lg shadow-sm bg-emerald-50 border-emerald-100 hover:border-emerald-300 hover:shadow-md transition-all"
                    >
                      <div className="flex items-center justify-between gap-1 text-[7px] sm:text-[9px] font-black text-emerald-700 uppercase">
                        <div className="flex items-center gap-0.5">
                          <Award className="w-2 sm:w-2.5 h-2 sm:h-2.5" />
                          {ev.accuracyScore}%
                        </div>
                      </div>
                      <div className="text-[7px] sm:text-[8px] text-emerald-600 font-medium truncate leading-tight mt-0.5">
                        <span className="hidden sm:inline">{ev.hizbNumber ? `${t('hizb')} ${ev.hizbNumber}` : 'Eval'}</span>
                        <span className="sm:hidden">{ev.hizbNumber ? `H${ev.hizbNumber}` : 'E'}</span>
                        {ev.quantity && ` (${getPortionLabel(ev.quantity)})`}
                      </div>
                    </button>
                  ))}
                  {dayRevisions.map((rev) => (
                    <button 
                      key={rev.id} 
                      onClick={() => setSelectedDetail({ type: 'revision', data: rev })}
                      className="w-full text-left p-0.5 sm:p-1 px-1 sm:px-2 border rounded-md sm:rounded-lg shadow-sm bg-blue-50 border-blue-100 hover:border-blue-300 hover:shadow-md transition-all"
                    >
                      <div className="flex items-center justify-between gap-1 text-[7px] sm:text-[9px] font-black text-blue-700 uppercase">
                        <div className="flex items-center gap-0.5">
                          <History className="w-2 sm:w-2.5 h-2 sm:h-2.5" />
                          {rev.qualityScore}%
                        </div>
                      </div>
                      <div className="text-[7px] sm:text-[8px] text-blue-600 font-medium truncate leading-tight mt-0.5">
                        <span className="hidden sm:inline">{rev.hizbNumber ? `${t('hizb')} ${rev.hizbNumber}` : 'Rev'}</span>
                        <span className="sm:hidden">{rev.hizbNumber ? `H${rev.hizbNumber}` : 'R'}</span>
                        {rev.quantity && ` (${getPortionLabel(rev.quantity)})`}
                      </div>
                    </button>
                  ))}
                  {dayNextRevisions.map((rev) => (
                    <button 
                      key={rev.id} 
                      onClick={() => setSelectedDetail({ type: 'nextRevision', data: rev })}
                      className="w-full text-left p-0.5 sm:p-1 px-1 sm:px-2 border rounded-md sm:rounded-lg shadow-sm bg-purple-50 border-purple-100 hover:border-purple-300 hover:shadow-md transition-all"
                    >
                      <div className="flex items-center justify-between gap-1 text-[7px] sm:text-[9px] font-black text-purple-700 uppercase">
                        <div className="flex items-center gap-0.5">
                          <CheckCircle className="w-2 sm:w-2.5 h-2 sm:h-2.5" />
                          {t('upcoming')}
                        </div>
                      </div>
                      <div className="text-[7px] sm:text-[8px] text-purple-600 font-medium truncate leading-tight mt-0.5">
                        <span className="hidden sm:inline">{rev.hizbNumber ? `${t('hizb')} ${rev.hizbNumber}` : 'Next'}</span>
                        <span className="sm:hidden">{rev.hizbNumber ? `H${rev.hizbNumber}` : 'N'}</span>
                        {rev.quantity && ` (${getPortionLabel(rev.quantity)})`}
                      </div>
                    </button>
                  ))}
                  {att?.status === 'absent' && dayEvals.length === 0 && dayRevisions.length === 0 && dayNextRevisions.length === 0 && (
                    <div className="text-[7px] sm:text-[9px] text-red-400 font-medium italic mt-1 text-center">
                      {t('no_session')}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 flex flex-wrap gap-4 text-[10px] sm:text-xs font-bold text-gray-500 bg-gray-50 p-4 rounded-2xl border">
          <div className="flex items-center gap-1.5 text-black">
            <div className="w-3 h-3 rounded-full bg-emerald-500" /> {t('present')}
          </div>
          <div className="flex items-center gap-1.5 text-black">
            <div className="w-3 h-3 rounded-full bg-red-500" /> {t('absent')}
          </div>
          <div className="flex items-center gap-1.5 text-black">
            <div className="w-3 h-3 rounded-full bg-blue-500" /> {t('excused')}
          </div>
          <div className="flex items-center gap-1.5 sm:ml-auto text-emerald-700">
            <Award className="w-4 h-4" /> {t('evaluated_sessions')}
          </div>
          <div className="flex items-center gap-1.5 text-blue-700">
            <History className="w-4 h-4" /> {t('revision')}
          </div>
          <div className="flex items-center gap-1.5 text-purple-700">
            <CheckCircle className="w-4 h-4" /> {t('upcoming_task')}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {selectedDetail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedDetail(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-[32px] w-full max-w-sm p-8 relative z-10 shadow-2xl text-black border border-gray-100"
            >
              <button 
                onClick={() => setSelectedDetail(null)}
                className="absolute top-6 right-6 p-2 hover:bg-gray-100 rounded-full transition-colors group"
              >
                <X className="w-5 h-5 text-gray-400 group-hover:text-gray-900" />
              </button>

              <div className="flex flex-col items-center text-center space-y-6">
                <div className={`w-20 h-20 rounded-[24px] flex items-center justify-center shadow-lg ${
                  selectedDetail.type === 'evaluation' 
                    ? 'bg-emerald-50 text-emerald-600 shadow-emerald-100' 
                    : selectedDetail.type === 'revision'
                    ? 'bg-blue-50 text-blue-600 shadow-blue-100'
                    : 'bg-purple-50 text-purple-600 shadow-purple-100'
                }`}>
                  {selectedDetail.type === 'evaluation' ? <Award className="w-10 h-10" /> : selectedDetail.type === 'revision' ? <History className="w-10 h-10" /> : <CheckCircle className="w-10 h-10" />}
                </div>

                <div className="space-y-1">
                  <h3 className="text-xl font-black uppercase tracking-tight text-gray-900">
                    {selectedDetail.type === 'evaluation' ? t('evaluation_details') : selectedDetail.type === 'revision' ? t('revision_details') : t('task_details')}
                  </h3>
                  <div className="flex items-center justify-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                    <CalendarIcon className="w-3 h-3" />
                    {formatDate(selectedDetail.type === 'nextRevision' ? (selectedDetail.data as NextRevision).dueDate : selectedDetail.data.date)}
                  </div>
                </div>

                <div className="w-full grid grid-cols-2 gap-4">
                  <div className="p-5 bg-gray-50 rounded-[24px] space-y-1 text-left border border-gray-100/50">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('score')}</span>
                    <div className="flex items-center gap-2 text-xl font-black text-gray-900">
                      <TrendingUp className={`w-4 h-4 ${selectedDetail.type === 'evaluation' ? 'text-emerald-500' : selectedDetail.type === 'revision' ? 'text-blue-500' : 'text-purple-500'}`} />
                      {selectedDetail.type === 'evaluation' 
                        ? (selectedDetail.data as Evaluation).accuracyScore 
                        : selectedDetail.type === 'revision'
                        ? (selectedDetail.data as Revision).qualityScore
                        : '---'}%
                    </div>
                  </div>
                  <div className="p-5 bg-gray-50 rounded-[24px] space-y-1 text-left border border-gray-100/50">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('portion')}</span>
                    <div className="flex items-center gap-2 text-xl font-black text-gray-900">
                      <BookOpen className={`w-4 h-4 ${selectedDetail.type === 'evaluation' ? 'text-emerald-500' : selectedDetail.type === 'revision' ? 'text-blue-500' : 'text-purple-500'}`} />
                      {selectedDetail.data.hizbNumber ? `${t('hizb')} ${selectedDetail.data.hizbNumber}` : 'N/A'}
                    </div>
                  </div>
                </div>

                <div className="w-full space-y-4">
                  {selectedDetail.data.quantity && (
                    <div className="flex items-center justify-between px-6 py-4 bg-white border border-gray-100 rounded-[20px] shadow-sm">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('quantity')}</span>
                      <span className="font-black text-gray-900">{getPortionLabel(selectedDetail.data.quantity)}</span>
                    </div>
                  )}
                  {selectedDetail.data.notes && (
                    <div className="p-6 bg-amber-50/50 border border-amber-100 rounded-[24px] text-left space-y-3 relative overflow-hidden">
                       <div className="absolute top-0 right-0 p-4 opacity-5">
                         <Quote className="w-12 h-12 text-amber-900" />
                       </div>
                       <div className="flex items-center gap-2 text-[10px] font-black text-amber-700 uppercase tracking-widest relative z-10">
                         <Quote className="w-3 h-3" />
                         {t('notes')}
                       </div>
                       <p className="text-sm font-bold text-amber-900 leading-relaxed italic relative z-10">
                         "{selectedDetail.data.notes}"
                       </p>
                    </div>
                  )}
                </div>

                <button 
                  onClick={() => setSelectedDetail(null)}
                  className="w-full py-5 bg-gray-900 text-white rounded-[20px] font-black uppercase tracking-[0.2em] text-[10px] hover:bg-black transition-all active:scale-95 shadow-xl shadow-gray-200"
                >
                  {t('close')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
