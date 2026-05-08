import { useState, useMemo } from 'react';
import { 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay,
  getDay,
  format
} from 'date-fns';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus,
  Clock,
  X,
  Trash2,
  Calendar as CalendarIcon
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import type { KuttabSchedule } from '../types';

interface KuttabCalendarProps {
  schedule?: KuttabSchedule;
  onUpdateSchedule?: (schedule: KuttabSchedule) => void;
  isAdmin?: boolean;
}

export default function KuttabCalendar({ schedule, onUpdateSchedule, isAdmin }: KuttabCalendarProps) {
  const { t, i18n } = useTranslation();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [editingDay, setEditingDay] = useState<{
    dateStr: string;
    dayOfWeek: number;
    lessons: string[];
    type: 'recurring' | 'specific';
  } | null>(null);

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

  const daySchedule = (day: Date) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    const dayOfWeek = getDay(day);

    // Specific overrides take priority
    if (schedule?.lessons?.[dateStr]) {
      return schedule.lessons[dateStr];
    }
    // Then recurring
    if (schedule?.lessons?.[dayOfWeek.toString()]) {
      return schedule.lessons[dayOfWeek.toString()];
    }
    return null;
  };

  const handleEditDay = (day: Date) => {
    if (!isAdmin) return;
    const dateStr = format(day, 'yyyy-MM-dd');
    const dayOfWeek = getDay(day);
    const existing = daySchedule(day);

    setEditingDay({
      dateStr,
      dayOfWeek,
      lessons: existing?.lessons || [],
      type: existing?.type || 'specific'
    });
  };

  const saveDaySchedule = () => {
    if (!editingDay || !onUpdateSchedule) return;

    const newLessons = { ...(schedule?.lessons || {}) };
    const key = editingDay.type === 'recurring' ? editingDay.dayOfWeek.toString() : editingDay.dateStr;

    if (editingDay.lessons.length === 0) {
      delete newLessons[key];
    } else {
      newLessons[key] = {
        type: editingDay.type,
        lessons: editingDay.lessons
      };
    }

    onUpdateSchedule({ lessons: newLessons });
    setEditingDay(null);
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
          <p className="text-sm text-gray-500 font-medium">{t('kuttab_schedule_overview')}</p>
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
          {weekDays.map((day, idx) => {
            const isToday = new Date().getDay() === idx;
            return (
              <div key={idx} className={`text-center text-[10px] sm:text-xs font-black uppercase tracking-widest py-2 ${
                isToday ? 'text-emerald-600' : 'text-gray-400'
              }`}>
                {day}
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-7 gap-px bg-gray-100 border border-gray-100 rounded-xl overflow-hidden text-black">
          {days.map((day, idx) => {
            const sched = daySchedule(day);
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isToday = isSameDay(day, new Date());

            return (
              <div 
                key={idx}
                onClick={() => handleEditDay(day)}
                className={`min-h-[100px] sm:min-h-[140px] p-2 transition-all group relative cursor-pointer border-2 ${
                  isCurrentMonth 
                    ? isToday 
                      ? 'bg-emerald-50/20 border-emerald-500 z-10 shadow-sm' 
                      : 'bg-white hover:bg-emerald-50/30 border-transparent' 
                    : 'bg-gray-50 text-gray-300 border-transparent'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className={`text-sm font-bold ${isCurrentMonth ? 'text-gray-900' : 'text-gray-300'}`}>
                    {day.getDate()}
                  </span>
                  {sched?.type === 'recurring' && (
                    <div title={t('recurring_day')} className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  )}
                  {sched?.type === 'specific' && (
                    <div title={t('specific_day_override')} className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                  )}
                </div>

                <div className="space-y-1">
                  {sched?.lessons.map((lesson, lIdx) => (
                    <div 
                      key={lIdx}
                      className={`text-[10px] sm:text-xs p-1 px-2 rounded-lg flex items-center gap-1 font-bold ${
                        sched.type === 'recurring' ? 'bg-emerald-50 text-emerald-700' : 'bg-purple-50 text-purple-700'
                      }`}
                    >
                      <Clock className="w-3 h-3 shrink-0" />
                      <span className="truncate">{lesson}</span>
                    </div>
                  ))}
                  {isAdmin && isCurrentMonth && (
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="p-1 px-2 bg-emerald-600 text-white text-[8px] rounded-full font-black uppercase">
                        {t('edit')}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-8 flex flex-wrap gap-6 text-xs font-bold text-gray-500 bg-gray-50 p-6 rounded-[24px] border border-gray-100">
           <div className="flex items-center gap-2">
             <div className="w-3 h-3 rounded-full bg-emerald-400 ring-4 ring-emerald-50" />
             <span className="text-gray-900">{t('recurring_study_day')}</span>
           </div>
           <div className="flex items-center gap-2">
             <div className="w-3 h-3 rounded-full bg-purple-400 ring-4 ring-purple-50" />
             <span className="text-gray-900">{t('one_off_study_day')}</span>
           </div>
           {isAdmin && (
             <div className="ml-auto text-emerald-600 flex items-center gap-1.5">
               <CalendarIcon className="w-4 h-4" />
               {t('click_day_to_edit_schedule')}
             </div>
           )}
        </div>
      </div>

      <AnimatePresence>
        {editingDay && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingDay(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-[32px] w-full max-w-md p-8 relative z-10 shadow-2xl text-black border border-gray-100"
            >
              <button 
                onClick={() => setEditingDay(null)}
                className="absolute top-6 right-6 p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-900"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shadow-inner">
                    <CalendarIcon className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-gray-900">
                      {editingDay.type === 'recurring' ? t('weekly_recurring') : t('specific_day')}
                    </h3>
                    <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest mt-1">
                      {editingDay.type === 'recurring' 
                        ? weekDays[editingDay.dayOfWeek] 
                        : format(new Date(editingDay.dateStr), 'dd MMMM yyyy')
                      }
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 p-1 bg-gray-100 rounded-2xl">
                  <button
                    onClick={() => setEditingDay({ ...editingDay, type: 'recurring' })}
                    className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                      editingDay.type === 'recurring' 
                        ? 'bg-white text-emerald-700 shadow-sm' 
                        : 'text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    {t('recurring')}
                  </button>
                  <button
                    onClick={() => setEditingDay({ ...editingDay, type: 'specific' })}
                    className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                      editingDay.type === 'specific' 
                        ? 'bg-white text-emerald-700 shadow-sm' 
                        : 'text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    {t('specific')}
                  </button>
                </div>

                <div className="space-y-4">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">
                    {t('lessons_max_2')}
                  </label>
                  
                  <div className="space-y-3">
                    {editingDay.lessons.map((lesson, idx) => {
                      const [start = '', end = ''] = lesson.split(' - ');
                      
                      return (
                        <div key={idx} className="flex flex-col gap-2 p-4 bg-gray-50 border border-gray-100 rounded-2xl">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2 text-emerald-600">
                              <Clock className="w-4 h-4" />
                              <span className="text-[10px] font-black uppercase tracking-widest">{t('session')} {idx + 1}</span>
                            </div>
                            <button
                              onClick={() => {
                                const newLessons = editingDay.lessons.filter((_, i) => i !== idx);
                                setEditingDay({ ...editingDay, lessons: newLessons });
                              }}
                              className="p-1.5 text-red-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <div className="flex-1 space-y-1">
                              <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">{t('from')}</label>
                              <input
                                type="time"
                                className="w-full bg-white border border-gray-200 p-2.5 rounded-xl text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                                value={start}
                                onChange={(e) => {
                                  const newLessons = [...editingDay.lessons];
                                  newLessons[idx] = `${e.target.value} - ${end}`;
                                  setEditingDay({ ...editingDay, lessons: newLessons });
                                }}
                              />
                            </div>
                            <div className="flex-1 space-y-1">
                              <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">{t('to')}</label>
                              <input
                                type="time"
                                className="w-full bg-white border border-gray-200 p-2.5 rounded-xl text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                                value={end}
                                onChange={(e) => {
                                  const newLessons = [...editingDay.lessons];
                                  newLessons[idx] = `${start} - ${e.target.value}`;
                                  setEditingDay({ ...editingDay, lessons: newLessons });
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    
                    {editingDay.lessons.length < 2 && (
                      <button
                        onClick={() => setEditingDay({ ...editingDay, lessons: [...editingDay.lessons, '08:00 - 10:00'] })}
                        className="w-full py-4 border-2 border-dashed border-gray-200 rounded-2xl text-sm font-bold text-gray-400 hover:border-emerald-500 hover:text-emerald-500 hover:bg-emerald-50/50 transition-all flex items-center justify-center gap-2"
                      >
                        <Plus className="w-5 h-5" />
                        {t('add_lesson')}
                      </button>
                    )}
                  </div>
                </div>

                <div className="pt-4 flex gap-4">
                   <button
                    onClick={() => {
                      const newLessons = { ...(schedule?.lessons || {}) };
                      const key = editingDay.type === 'recurring' ? editingDay.dayOfWeek.toString() : editingDay.dateStr;
                      delete newLessons[key];
                      onUpdateSchedule?.({ lessons: newLessons });
                      setEditingDay(null);
                    }}
                    className="flex-1 py-4 bg-gray-50 text-gray-400 hover:bg-red-50 hover:text-red-500 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all"
                  >
                    {t('clear_day')}
                  </button>
                  <button
                    onClick={saveDaySchedule}
                    className="flex-[2] py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-100"
                  >
                    {t('save_schedule')}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
