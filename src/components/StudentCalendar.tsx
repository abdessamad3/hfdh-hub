import { useState, useMemo } from 'react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths 
} from 'date-fns';
import { ChevronLeft, ChevronRight, CheckCircle, XCircle, Clock, Award, Info } from 'lucide-react';
import type { Attendance, Evaluation } from '../types';

interface StudentCalendarProps {
  attendance: Attendance[];
  evaluations: Evaluation[];
}

export default function StudentCalendar({ attendance = [], evaluations = [] }: StudentCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

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

  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  const getDayData = (day: Date) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    const dayAttendance = attendance.find(a => a.date === dateStr);
    const dayEvaluations = evaluations.filter(e => e.date === dateStr);
    return { attendance: dayAttendance, evaluations: dayEvaluations };
  };

  return (
    <div className="bg-white border rounded-3xl shadow-sm overflow-hidden">
      <div className="p-6 border-b flex items-center justify-between bg-gray-50">
        <div>
          <h3 className="text-xl font-bold text-gray-900">{format(currentMonth, 'MMMM yyyy')}</h3>
          <p className="text-sm text-gray-500 font-medium">Monthly Progress Overview</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={prevMonth}
            className="p-2 hover:bg-gray-200 rounded-xl transition-colors text-gray-600"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button 
            onClick={nextMonth}
            className="p-2 hover:bg-gray-200 rounded-xl transition-colors text-gray-600"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-7 mb-4">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center text-xs font-black text-gray-400 uppercase tracking-widest py-2">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-px bg-gray-100 border border-gray-100 rounded-xl overflow-hidden">
          {days.map((day, idx) => {
            const { attendance: att, evaluations: dayEvals } = getDayData(day);
            const isCurrentMonth = isSameMonth(day, currentMonth);

            return (
              <div 
                key={idx}
                className={`min-h-[120px] p-2 transition-all group relative ${
                  isCurrentMonth ? 'bg-white' : 'bg-gray-50 text-gray-300'
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className={`text-sm font-bold ${isCurrentMonth ? 'text-gray-900' : 'text-gray-300'}`}>
                    {format(day, 'd')}
                  </span>
                  
                  {att && (
                    <div title={`Attendance: ${att.status}`}>
                      {att.status === 'present' && <CheckCircle className="w-4 h-4 text-emerald-500" />}
                      {att.status === 'absent' && <XCircle className="w-4 h-4 text-red-500" />}
                      {att.status === 'excused' && <Clock className="w-4 h-4 text-blue-500" />}
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  {dayEvals.map((ev, evIdx) => (
                    <div key={ev.id} className={`p-1 px-2 border rounded-lg shadow-sm ${evIdx > 0 ? 'mt-0.5' : ''} bg-emerald-50 border-emerald-100`}>
                      <div className="flex items-center justify-between gap-1 text-[9px] font-black text-emerald-700 uppercase">
                        <div className="flex items-center gap-0.5">
                          <Award className="w-2.5 h-2.5" />
                          {ev.accuracyScore}%
                        </div>
                        {dayEvals.length > 1 && <span className="opacity-40 text-[8px] font-medium">#{evIdx + 1}</span>}
                      </div>
                      <div className="text-[8px] text-emerald-600 font-medium truncate leading-tight mt-0.5">
                        {ev.hizbNumber ? `Hizb ${ev.hizbNumber}` : 'Eval'}
                        {ev.quantity && ` (${ev.quantity}/8)`}
                      </div>
                    </div>
                  ))}
                  {att?.status === 'absent' && dayEvals.length === 0 && (
                    <div className="text-[10px] text-red-400 font-medium italic mt-2 text-center">
                      No Session
                    </div>
                  )}
                </div>

                {/* Detailed Hover Info */}
                {(att || dayEvals.length > 0) && (
                  <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-6 flex flex-wrap gap-4 text-xs font-bold text-gray-500 bg-gray-50 p-4 rounded-2xl border">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-emerald-500" /> Present
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500" /> Absent
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-blue-500" /> Excused
          </div>
          <div className="flex items-center gap-1.5 ml-auto text-emerald-700">
            <Award className="w-4 h-4" /> Evaluated Sessions
          </div>
        </div>
      </div>
    </div>
  );
}
