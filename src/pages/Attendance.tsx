import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Calendar as CalendarIcon, Check, X, Save, Clock } from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'react-hot-toast';
import { dbService } from '../services/db';
import { auth } from '../lib/firebase';
import type { Student, UserProfile } from '../types';
import { useTranslation } from 'react-i18next';
import { formatDate } from '../lib/dateUtils';

interface AttendancePageProps {
  profile: UserProfile | null;
}

export default function AttendancePage({ profile }: AttendancePageProps) {
  const { t, i18n } = useTranslation();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(new Date().toLocaleDateString('en-CA')); // YYYY-MM-DD in local time
  const [attendance, setAttendance] = useState<Record<string, { status: 'present' | 'absent' | 'excused', excuse?: string }>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchStudents();
  }, []);

  useEffect(() => {
    if (students.length > 0) {
      fetchExistingAttendance();
    }
  }, [date, students]);

  const fetchStudents = async () => {
    if (!auth.currentUser || !profile) return;
    try {
      const isAdmin = profile.role === 'admin';
      const data = await dbService.getStudents(auth.currentUser.uid, profile.kuttabName, isAdmin);
      setStudents(data);
      // Default to present if no records found later
      setAttendance(Object.fromEntries(data.map(s => [s.id, { status: 'present' }])));
    } catch (err) {
      console.error('Error fetching students:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchExistingAttendance = async () => {
    if (!auth.currentUser || !profile) return;
    try {
      const isAdmin = profile.role === 'admin';
      const existing = await dbService.getAttendanceByDate(auth.currentUser.uid, profile.kuttabName, date, isAdmin);
      if (existing.length > 0) {
        const newAttendance = { ...attendance };
        existing.forEach(record => {
          newAttendance[record.studentId] = { 
            status: record.status, 
            excuse: record.excuse || '' 
          };
        });
        setAttendance(newAttendance);
      } else {
        // If no records for this date, default all to present
        setAttendance(Object.fromEntries(students.map(s => [s.id, { status: 'present' }])));
      }
    } catch (err) {
      console.error('Error fetching historical attendance:', err);
    }
  };

  const setStatus = (id: string, status: 'present' | 'absent' | 'excused') => {
    setAttendance(prev => ({
      ...prev,
      [id]: { 
        ...prev[id],
        status 
      }
    }));
  };

  const setExcuse = (id: string, excuse: string) => {
    setAttendance(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        excuse
      }
    }));
  };

  const formatDisplayDate = (dateStr: string) => {
    return formatDate(dateStr);
  };

  const handleSave = async () => {
    if (!auth.currentUser) return;
    setSaving(true);
    try {
      const records = (Object.entries(attendance) as [string, { status: 'present' | 'absent' | 'excused', excuse?: string }][]).map(([studentId, data]) => ({
        studentId,
        teacherId: auth.currentUser!.uid,
        date,
        status: data.status,
        excuse: data.status === 'excused' ? data.excuse : undefined
      }));
      await dbService.saveAttendance(records);
      toast.success(t('attendance_saved_success'));
    } catch (err) {
      console.error('Error saving attendance:', err);
      toast.error(t('sync_failed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto space-y-8">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-black">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">{t('daily_attendance')}</h2>
          <p className="text-gray-500 mt-1 text-sm sm:text-base">{t('mark_attendance')} {formatDisplayDate(date)}</p>
        </div>
        <div className="w-full sm:w-auto flex items-center gap-3 bg-white border border-gray-100 px-4 py-2.5 rounded-xl shadow-sm">
          <CalendarIcon className="w-5 h-5 text-emerald-500" />
          <input 
            type="date" 
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="flex-1 sm:flex-none outline-none bg-transparent font-bold text-gray-700"
          />
        </div>
      </header>

      <div className="bg-white border rounded-3xl shadow-sm overflow-hidden text-black">
        <div className="p-6 border-b bg-gray-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h3 className="font-bold text-gray-700">{t('student_list')}</h3>
          <div className="flex w-full sm:w-auto gap-2">
            <button 
              onClick={() => setAttendance(Object.fromEntries(students.map(s => [s.id, { status: 'present' }])))}
              className="flex-1 sm:flex-none text-xs font-black text-emerald-600 hover:bg-emerald-50 px-4 py-2 border border-emerald-100 rounded-xl transition-colors uppercase tracking-widest"
            >
              {t('all_present')}
            </button>
            <button 
              onClick={() => setAttendance(Object.fromEntries(students.map(s => [s.id, { status: 'absent' }])))}
              className="flex-1 sm:flex-none text-xs font-black text-red-600 hover:bg-red-50 px-4 py-2 border border-red-100 rounded-xl transition-colors uppercase tracking-widest"
            >
              {t('all_absent')}
            </button>
          </div>
        </div>
        
        {loading ? (
          <div className="p-12 text-center text-gray-500 font-medium">{t('loading_students')}</div>
        ) : students.length === 0 ? (
          <div className="p-12 text-center text-gray-500 font-medium italic">{t('no_students_enrolled')}</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {students.map((student, i) => (
              <motion.div 
                key={student.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between hover:bg-gray-50 transition-colors gap-4"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm ${
                    attendance[student.id]?.status === 'present' 
                      ? 'bg-emerald-100 text-emerald-700' 
                      : attendance[student.id]?.status === 'absent'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-blue-100 text-blue-700'
                  }`}>
                    {student.name.charAt(0)}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <Link 
                      to={`/students/${student.id}`}
                      className="font-bold text-gray-900 hover:text-emerald-600 transition-colors truncate"
                    >
                      {student.name}
                    </Link>
                    {attendance[student.id]?.status === 'excused' && (
                      <input
                        type="text"
                        placeholder={t('reason_for_excuse')}
                        value={attendance[student.id]?.excuse || ''}
                        onChange={(e) => setExcuse(student.id, e.target.value)}
                        className="text-xs bg-transparent border-b border-blue-200 outline-none focus:border-blue-500 text-blue-600 mt-1 pb-0.5 placeholder:text-blue-300 w-full sm:w-48"
                      />
                    )}
                  </div>
                </div>
                
                <div className="flex w-full sm:w-auto bg-gray-100 rounded-2xl p-1 gap-1">
                  <button
                    onClick={() => setStatus(student.id, 'present')}
                    className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold transition-all text-xs sm:text-sm ${
                      attendance[student.id]?.status === 'present' 
                        ? 'bg-white text-emerald-600 shadow-sm' 
                        : 'text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    <Check className="w-4 h-4" />
                    <span>{t('present')}</span>
                  </button>
                  <button
                    onClick={() => setStatus(student.id, 'absent')}
                    className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold transition-all text-xs sm:text-sm ${
                      attendance[student.id]?.status === 'absent' 
                        ? 'bg-white text-red-600 shadow-sm' 
                        : 'text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    <X className="w-4 h-4" />
                    <span>{t('absent')}</span>
                  </button>
                  <button
                    onClick={() => setStatus(student.id, 'excused')}
                    className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold transition-all text-xs sm:text-sm ${
                      attendance[student.id]?.status === 'excused' 
                        ? 'bg-white text-blue-600 shadow-sm' 
                        : 'text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    <Clock className="w-4 h-4" />
                    <span>{t('excused')}</span>
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {students.length > 0 && (
          <div className="p-6 sm:p-8 bg-emerald-50 border-t flex justify-center sm:justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white px-12 py-4 rounded-2xl font-black transition-all flex items-center justify-center gap-3 shadow-xl shadow-emerald-100 disabled:opacity-50 tracking-wide"
            >
              {saving ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  {t('save_attendance')}
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

