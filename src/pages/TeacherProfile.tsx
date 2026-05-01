import { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  User, 
  Mail, 
  Shield, 
  ChevronLeft, 
  Users, 
  TrendingUp, 
  Award, 
  Calendar,
  Search,
  BookOpen,
  Home
} from 'lucide-react';
import { dbService } from '../services/db';
import { UserProfile, Student } from '../types';
import { useTranslation } from 'react-i18next';

interface TeacherProfileProps {
  profile: UserProfile | null;
}

export default function TeacherProfile({ profile }: TeacherProfileProps) {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [teacher, setTeacher] = useState<UserProfile | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchTeacherData = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const [teacherData, studentData] = await Promise.all([
          dbService.getUserById(id),
          dbService.getStudents(id, undefined, false)
        ]);
        
        // If not admin, the security rules will filter students anyway
        // But getStudents already handles some filtering if it's not admin
        
        setTeacher(teacherData);
        // Filter students to only show those belonging to the teacher's assigned kuttab
        setStudents(studentData.filter(s => {
          if (teacherData?.kuttabName) {
            return s.kuttabName === teacherData.kuttabName;
          }
          return s.teacherId === id || s.kuttabResponsibleId === id;
        }));
      } catch (err) {
        console.error('Error fetching teacher data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTeacherData();
  }, [id]);

  const filteredStudents = useMemo(() => {
    return students.filter(s => 
      s.name.toLowerCase().includes(search.toLowerCase()) || 
      (s.email && s.email.toLowerCase().includes(search.toLowerCase()))
    );
  }, [students, search]);

  const stats = useMemo(() => {
    if (students.length === 0) return { avgAttendance: 0, avgAccuracy: 0, totalHizbs: 0 };
    
    const totalAttendance = students.reduce((acc, s) => acc + (s.attendanceRate || 0), 0);
    const totalAccuracy = students.reduce((acc, s) => acc + (s.accuracy || 0), 0);
    const totalHizbs = students.reduce((acc, s) => acc + (s.totalHizbs || 0), 0);

    return {
      avgAttendance: Math.round(totalAttendance / students.length),
      avgAccuracy: Math.round(totalAccuracy / students.length),
      totalHizbs: Math.round(totalHizbs * 10) / 10
    };
  }, [students]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <User className="w-12 h-12 text-emerald-600 animate-bounce" />
          <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">{t('loading_profile')}</p>
        </div>
      </div>
    );
  }

  if (!teacher) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500">{t('teacher_not_found')}</p>
        <button onClick={() => navigate(-1)} className="mt-4 text-emerald-600 font-bold flex items-center justify-center gap-2 mx-auto">
          <ChevronLeft className="w-4 h-4" />
          {t('go_back')}
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 space-y-8 max-w-7xl mx-auto text-black">
      {/* Back Header */}
      <button 
        onClick={() => navigate(-1)}
        className="group flex items-center gap-2 text-gray-400 hover:text-emerald-600 transition-colors font-bold text-sm"
      >
        <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
        {t('back')}
      </button>

      {/* Profile Card */}
      <div className="bg-white border border-gray-100 rounded-[40px] shadow-sm overflow-hidden">
        <div className="h-32 bg-gradient-to-r from-emerald-500 to-teal-600" />
        <div className="px-8 pb-8">
          <div className="relative -mt-16 flex flex-col sm:flex-row items-end gap-6 mb-8">
            <div className="w-32 h-32 bg-white rounded-full p-2 shadow-xl border">
              <div className="w-full h-full bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 text-4xl font-black">
                {teacher.displayName?.charAt(0) || <User className="w-16 h-16" />}
              </div>
            </div>
            <div className="flex-1 pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-black text-gray-900 tracking-tight">{teacher.displayName}</h1>
                  <div className="flex flex-wrap gap-4 mt-2">
                    <span className="flex items-center gap-2 text-gray-500 text-sm font-medium">
                      <Mail className="w-4 h-4" />
                      {teacher.email}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                      teacher.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      {t(`role_${teacher.role}`)}
                    </span>
                  </div>
                </div>
                {teacher.kuttabName && (
                  <div className="bg-gray-50 px-6 py-3 rounded-2xl border border-gray-100">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{t('kuttab_affiliation')}</p>
                    <div className="flex items-center gap-2 text-emerald-700 font-bold">
                      <Shield className="w-4 h-4" />
                      {teacher.kuttabName}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-emerald-50/50 p-6 rounded-3xl border border-emerald-100 flex items-center gap-4 group hover:bg-emerald-50 transition-colors">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <p className="text-2xl font-black text-emerald-700">{students.length}</p>
                <p className="text-[10px] font-black text-emerald-600/70 uppercase tracking-widest">{t('assigned_students')}</p>
              </div>
            </div>
            <div className="bg-blue-50/50 p-6 rounded-3xl border border-blue-100 flex items-center gap-4 group hover:bg-blue-50 transition-colors">
              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <Calendar className="w-6 h-6" />
              </div>
              <div>
                <p className="text-2xl font-black text-blue-700">{stats.avgAttendance}%</p>
                <p className="text-[10px] font-black text-blue-600/70 uppercase tracking-widest">{t('avg_attendance_rate')}</p>
              </div>
            </div>
            <div className="bg-amber-50/50 p-6 rounded-3xl border border-amber-100 flex items-center gap-4 group hover:bg-amber-50 transition-colors tooltip" title={t('avg_accuracy_desc')}>
              <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <p className="text-2xl font-black text-amber-700">{stats.avgAccuracy}%</p>
                <p className="text-[10px] font-black text-amber-600/70 uppercase tracking-widest">{t('overall_performance')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Breakdown Info (Simple explanation) */}
      <div className="bg-gray-50/50 border border-gray-100 rounded-3xl p-6 flex flex-col sm:flex-row items-center gap-4">
        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-gray-400 border shrink-0">
          <BookOpen className="w-5 h-5" />
        </div>
        <p className="text-sm text-gray-500 font-medium leading-relaxed">
          <span className="font-bold text-gray-700">{t('how_calculated')}:</span> {t('stats_explanation_desc', { count: students.length })}
        </p>
      </div>

      {/* Students List Section */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h3 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            <Users className="w-6 h-6 text-emerald-600" />
            {t('assigned_students')}
          </h3>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text"
              placeholder={t('search_students')}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-100 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm transition-all"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStudents.length === 0 ? (
            <div className="col-span-full py-12 text-center text-gray-400 font-medium italic bg-white border border-dashed rounded-3xl">
              {t('no_students_found')}
            </div>
          ) : (
            filteredStudents.map((student, i) => (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                key={student.id}
                className="bg-white p-6 border border-gray-100 rounded-3xl hover:border-emerald-200 transition-all hover:shadow-lg hover:shadow-emerald-50 group border-b-4 border-b-transparent hover:border-b-emerald-400"
              >
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center font-black text-emerald-600 border group-hover:bg-emerald-50 transition-colors">
                    {student.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <Link 
                      to={`/students/${student.id}`}
                      className="font-black text-gray-900 truncate block group-hover:text-emerald-700 transition-colors"
                    >
                      {student.name}
                    </Link>
                    <p className="text-[10px] font-bold text-gray-400 flex items-center gap-1 mt-0.5">
                      <Home className="w-3 h-3" />
                      {student.kuttabName || t('independent')}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100 flex flex-col items-center">
                    <span className="text-[8px] font-black uppercase tracking-widest text-gray-400 mb-1">{t('progress')}</span>
                    <span className="text-sm font-black text-indigo-600">{student.memorizationProgress}%</span>
                    <div className="w-full h-1 bg-gray-200 rounded-full mt-2 overflow-hidden">
                      <div 
                        className="h-full bg-indigo-500 rounded-full" 
                        style={{ width: `${student.memorizationProgress}%` }}
                      />
                    </div>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100 flex flex-col items-center">
                    <span className="text-[8px] font-black uppercase tracking-widest text-gray-400 mb-1">{t('accuracy')}</span>
                    <span className="text-sm font-black text-emerald-600">{student.accuracy}%</span>
                    <div className="w-full h-1 bg-gray-200 rounded-full mt-2 overflow-hidden">
                      <div 
                        className="h-full bg-emerald-500 rounded-full" 
                        style={{ width: `${student.accuracy}%` }}
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
