import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { 
  Building, 
  MapPin, 
  ArrowLeft, 
  Users, 
  Calendar as CalendarIcon,
  BookOpen
} from 'lucide-react';
import { dbService } from '../services/db';
import type { Kuttab, UserProfile, Student, KuttabSchedule } from '../types';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import KuttabCalendar from '../components/KuttabCalendar';

interface KuttabProfileProps {
  profile: UserProfile | null;
}

export default function KuttabProfile({ profile }: KuttabProfileProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [kuttab, setKuttab] = useState<Kuttab | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  const isAdmin = profile?.role === 'admin' || profile?.role === 'manager' || profile?.uid === kuttab?.teacherId;

  useEffect(() => {
    if (!id) return;

    const unsubscribeKuttab = dbService.subscribeKuttab(id, (k) => {
      if (k) {
        setKuttab(k);
        fetchStudents(k.name);
      } else {
        toast.error(t('kuttab_not_found'));
        navigate('/kuttabs');
      }
      setLoading(false);
    });

    return () => {
      unsubscribeKuttab();
    };
  }, [id, navigate]);

  const fetchStudents = async (kuttabName: string) => {
    try {
      const data = await dbService.getStudentsByKuttab(kuttabName);
      setStudents(data);
    } catch (err) {
      console.error('Error fetching students:', err);
    }
  };

  const handleUpdateSchedule = async (newSchedule: KuttabSchedule) => {
    if (!id || !kuttab) return;
    try {
      await dbService.updateKuttabSchedule(id, newSchedule);
      toast.success(t('schedule_updated'));
    } catch (err) {
      console.error('Error updating schedule:', err);
      toast.error(t('failed_to_update_schedule'));
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500 font-bold animate-pulse">{t('loading_kuttab')}</p>
      </div>
    );
  }

  if (!kuttab) return null;

  return (
    <div className="p-4 sm:p-8 space-y-8 max-w-6xl mx-auto">
      <button 
        onClick={() => navigate('/kuttabs')}
        className="flex items-center gap-2 text-gray-500 hover:text-emerald-600 transition-colors font-bold group"
      >
        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
        {t('back_to_kuttabs')}
      </button>

      {/* Header Card */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white border rounded-[40px] shadow-sm p-8 sm:p-12 relative overflow-hidden text-black"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-50 rounded-full -mr-32 -mt-32 opacity-50" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-8">
          <div className="w-24 h-24 sm:w-32 sm:h-32 bg-emerald-600 text-white rounded-[32px] flex items-center justify-center shadow-2xl shadow-emerald-200 shrink-0">
            <Building className="w-12 h-12 sm:w-16 sm:h-16" />
          </div>
          
          <div className="flex-1 text-center md:text-left space-y-4">
            <div>
              <h1 className="text-3xl sm:text-5xl font-black text-gray-900 leading-tight">{kuttab.name}</h1>
              {kuttab.location && (
                <p className="text-emerald-600 flex items-center justify-center md:justify-start gap-2 font-black uppercase text-xs tracking-widest mt-2">
                  <MapPin className="w-4 h-4" />
                  {kuttab.location}
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
              <div className="px-6 py-3 bg-gray-50 rounded-2xl border flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-600" />
                <span className="font-black text-gray-900">{students.length} {t('students')}</span>
              </div>
              <div className="px-6 py-3 bg-gray-50 rounded-2xl border flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-emerald-600" />
                <span className="font-black text-gray-900">{Object.keys(kuttab.schedule?.lessons || {}).length} {t('active_days')}</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Calendar Section */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">
              <CalendarIcon className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">{t('study_schedule')}</h2>
          </div>
          <KuttabCalendar 
            schedule={kuttab.schedule} 
            onUpdateSchedule={handleUpdateSchedule}
            isAdmin={isAdmin}
          />
        </div>

        {/* Sidebar Section */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">{t('students')}</h2>
          </div>
          
          <div className="bg-white border rounded-[32px] shadow-sm overflow-hidden text-black">
            {students.length === 0 ? (
              <div className="p-12 text-center text-gray-400 font-medium italic">
                {t('no_students')}
              </div>
            ) : (
              <div className="divide-y max-h-[600px] overflow-y-auto">
                {students.map(student => (
                  <button 
                    key={student.id}
                    onClick={() => navigate(`/students/${student.id}`)}
                    className="w-full p-4 hover:bg-gray-50 transition-colors flex items-center gap-4 text-left"
                  >
                    <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center font-black text-gray-400">
                      {student.name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-bold text-gray-900">{student.name}</div>
                      <div className="text-[10px] font-black text-gray-400 uppercase">{student.gender === 'male' ? t('male') : t('female')}</div>
                    </div>
                    <BookOpen className="w-4 h-4 text-gray-300 ml-auto" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
