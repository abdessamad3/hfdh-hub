import { useState, useMemo, useEffect, FormEvent } from 'react';
import { Search, Plus, Filter, ChevronRight, X, User as UserIcon, Building, Edit2, Trash2, Hash, UserCircle, Mail, Calendar } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'react-hot-toast';
import { dbService } from '../services/db';
import { auth } from '../lib/firebase';
import type { Student, Kuttab, UserProfile } from '../types';
import EditStudentModal from '../components/EditStudentModal';
import { useTranslation } from 'react-i18next';
import { formatQuranProgress } from '../lib/quranUtils';
import { formatDate } from '../lib/dateUtils';

interface StudentsListProps {
  profile: UserProfile | null;
}

export default function StudentsList({ profile }: StudentsListProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [students, setStudents] = useState<Student[]>([]);
  const [kuttabs, setKuttabs] = useState<Kuttab[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  
  // Filter States
  const [ageRange, setAgeRange] = useState({ min: '', max: '' });
  const [minScore, setMinScore] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'age' | 'totalScore'>('name');
  
  const [newStudent, setNewStudent] = useState({ 
    name: '', 
    age: '', 
    email: '', 
    kuttabName: profile?.kuttabName || '', 
    gender: 'male' as 'male' | 'female',
    enrollmentDate: new Date().toISOString().split('T')[0]
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  
  const isSenior = profile?.role === 'admin' || profile?.role === 'manager';

  useEffect(() => {
    if (!auth.currentUser || !profile) return;
    
    setLoading(true);

    const fetchKuttabs = async () => {
      try {
        const kuttabData = isSenior 
          ? await dbService.getAllKuttabs() 
          : await dbService.getKuttabs(auth.currentUser.uid);
        
        let finalKuttabs = [...kuttabData];
        if (!isSenior && profile.kuttabName && !finalKuttabs.some(k => k.name === profile.kuttabName)) {
          const k = await dbService.getKuttabByName(profile.kuttabName);
          if (k) finalKuttabs.push(k);
        }
        setKuttabs(finalKuttabs);
      } catch (err) {
        console.error('Error fetching kuttabs:', err);
      }
    };

    fetchKuttabs();

    const unsubscribe = dbService.subscribeStudents(
      auth.currentUser.uid,
      profile.kuttabName,
      isSenior,
      (studentList) => {
        setStudents(studentList);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [profile]);

  const handleAddStudent = async (e: FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    setIsSubmitting(true);
    try {
      await dbService.addStudent({
        name: newStudent.name,
        age: parseInt(newStudent.age),
        gender: newStudent.gender,
        email: newStudent.email.toLowerCase(),
        kuttabName: isSenior ? newStudent.kuttabName : (profile?.kuttabName || ''),
        enrollmentDate: new Date(newStudent.enrollmentDate).toISOString(),
        teacherId: auth.currentUser.uid,
        attendanceRate: 0,
        memorizationProgress: 0,
        totalHizbs: 0,
        accuracy: 0,
        totalScore: 0
      });
      setIsModalOpen(false);
      setNewStudent({ 
        name: '', 
        age: '', 
        email: '', 
        kuttabName: profile?.kuttabName || '', 
        gender: 'male',
        enrollmentDate: new Date().toISOString().split('T')[0]
      });
      toast.success(t('student_enrolled_success'));
    } catch (err: any) {
      console.error('Error adding student:', err);
      if (err.message === 'email_already_exists') {
        toast(t('email_already_exists'), { icon: '⚠️', duration: 4000 });
      } else {
        toast.error(t(err.message) || t('failed_to_add_student'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStudent = async (data: Partial<Student>) => {
    if (!editingStudent) return;
    try {
      await dbService.updateStudent(editingStudent.id, data);
      toast.success(t('student_updated_success'));
    } catch (err: any) {
      console.error('Error updating student:', err);
      if (err.message === 'email_already_exists') {
        toast(t('email_already_exists'), { icon: '⚠️', duration: 4000 });
      } else {
        toast.error(t(err.message) || t('failed_to_update_student'));
      }
      throw err;
    }
  };

  const handleDeleteStudent = async (id: string) => {
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id);
      toast(t('click_again_to_confirm'), { icon: '🗑️' });
      setTimeout(() => setConfirmDeleteId(null), 3000);
      return;
    }

    if (!auth.currentUser) return;
    try {
      await dbService.deleteStudent(id);
      toast.success(t('student_deleted'));
    } catch (err) {
      console.error('Error deleting student:', err);
      toast.error(t('failed_to_delete_student'));
    } finally {
      setConfirmDeleteId(null);
    }
  };

  const processedStudents = useMemo(() => {
    let result = [...students];

    // Search Filter
    if (search) {
      result = result.filter(s => s.name.toLowerCase().includes(search.toLowerCase()));
    }

    // Age Filter
    if (ageRange.min) {
      result = result.filter(s => s.age >= parseInt(ageRange.min));
    }
    if (ageRange.max) {
      result = result.filter(s => s.age <= parseInt(ageRange.max));
    }

    // Score Filter
    if (minScore) {
      result = result.filter(s => (s.totalScore || 0) >= parseInt(minScore));
    }

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'age') return a.age - b.age;
      if (sortBy === 'totalScore') return (b.totalScore || 0) - (a.totalScore || 0);
      return 0;
    });

    return result;
  }, [students, search, ageRange, minScore, sortBy]);

  return (
    <div className="p-4 sm:p-8 space-y-8">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">{t('students_directory')}</h2>
          <p className="text-gray-500 mt-1">{t('manage_track_progress')}</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 shadow-lg shadow-emerald-200"
        >
          <Plus className="w-5 h-5" />
          {t('add_new_student')}
        </button>
      </header>

      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder={t('search_by_name')}
              className="w-full pl-12 pr-4 py-3 bg-white border rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`w-full sm:w-auto px-6 py-3 border rounded-xl transition-all flex items-center justify-center gap-2 font-medium ${
              showFilters 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Filter className={`w-5 h-5 ${showFilters ? 'text-emerald-500' : ''}`} />
            {t('more_filters')}
          </button>
        </div>

        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="p-6 bg-white border rounded-2xl flex flex-col sm:flex-row flex-wrap gap-6 sm:gap-8 shadow-sm">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t('age_range')}</label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="number"
                      placeholder="Min"
                      className="w-full sm:w-20 p-2 bg-gray-50 border rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                      value={ageRange.min}
                      onChange={(e) => setAgeRange({ ...ageRange, min: e.target.value })}
                    />
                    <span className="text-gray-300">-</span>
                    <input 
                      type="number"
                      placeholder="Max"
                      className="w-full sm:w-20 p-2 bg-gray-50 border rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                      value={ageRange.max}
                      onChange={(e) => setAgeRange({ ...ageRange, max: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t('min_total_score')}</label>
                  <input 
                    type="number"
                    placeholder="e.g. 80"
                    className="w-full sm:w-32 p-2 bg-gray-50 border rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                    value={minScore}
                    onChange={(e) => setMinScore(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t('sort_by')}</label>
                  <select 
                    className="w-full sm:w-auto p-2 bg-gray-50 border rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-medium"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                  >
                    <option value="name">{t('sort_name')}</option>
                    <option value="age">{t('sort_age')}</option>
                    <option value="totalScore">{t('sort_rank')}</option>
                  </select>
                </div>

                <div className="flex items-end pb-1">
                  <button 
                    onClick={() => {
                      setAgeRange({ min: '', max: '' });
                      setMinScore('');
                      setSortBy('name');
                    }}
                    className="text-xs font-bold text-red-400 hover:text-red-500 uppercase tracking-widest underline underline-offset-4"
                  >
                    {t('clear_all')}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="bg-white border rounded-2xl shadow-sm border-gray-100 text-black">
        {loading ? (
          <div className="p-12 text-center text-gray-500 font-medium">{t('loading_students')}</div>
        ) : processedStudents.length === 0 ? (
          <div className="p-12 text-center text-gray-500 font-medium italic">
            {t('no_students_match')}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] table-fixed">
              <thead>
                <tr className="text-left text-xs uppercase text-gray-400 tracking-wider bg-gray-50">
                  <th className="px-6 py-4 font-black w-1/3">{t('name')}</th>
                  <th className="px-6 py-4 font-black w-24">{t('age')}</th>
                  <th className="px-6 py-4 font-black w-28">{t('gender')}</th>
                  <th className="px-6 py-4 font-black w-32">{t('enrollment_date')}</th>
                  <th className="px-6 py-4 font-black w-40">{t('kuttab')}</th>
                  <th className="px-6 py-4 font-black w-40">{t('total_hizbs')}</th>
                  <th className="px-6 py-4 font-black w-32">{t('overall_score')}</th>
                  <th className="px-6 py-4 text-right w-32">{t('actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {processedStudents.map((student, i) => (
                <motion.tr
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  key={student.id}
                  className="group hover:bg-emerald-50/50 transition-colors"
                >
                  <td onClick={() => navigate(`/students/${student.id}`)} className="px-6 py-4 cursor-pointer whitespace-normal break-words">
                    <div className="font-semibold text-gray-900">{student.name}</div>
                  </td>
                  <td onClick={() => navigate(`/students/${student.id}`)} className="px-6 py-4 text-gray-600 cursor-pointer">{t('years_old', { age: student.age })}</td>
                  <td onClick={() => navigate(`/students/${student.id}`)} className="px-6 py-4 text-gray-600 cursor-pointer">
                    <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider ${
                      student.gender === 'male' ? 'bg-blue-50 text-blue-700' : 
                      student.gender === 'female' ? 'bg-pink-50 text-pink-700' : 
                      'bg-gray-100 text-gray-500'
                    }`}>
                      {student.gender ? t(student.gender) : '—'}
                    </span>
                  </td>
                  <td onClick={() => navigate(`/students/${student.id}`)} className="px-6 py-4 text-gray-600 cursor-pointer text-xs">
                    {student.enrollmentDate ? formatDate(student.enrollmentDate) : '—'}
                  </td>
                  <td onClick={() => navigate(`/students/${student.id}`)} className="px-6 py-4 cursor-pointer truncate">
                    <span className="font-medium text-gray-500 italic truncate">
                      {student.kuttabName || '—'}
                    </span>
                  </td>
                  <td onClick={() => navigate(`/students/${student.id}`)} className="px-6 py-4 cursor-pointer">
                    <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-lg text-sm font-bold">
                      {(student.totalHizbs || 0).toFixed(2)} {t('hizbs')}
                    </span>
                  </td>
                  <td onClick={() => navigate(`/students/${student.id}`)} className="px-6 py-4 cursor-pointer">
                    <span className="font-bold px-3 py-1 rounded-full text-sm bg-emerald-50 text-emerald-700">
                      {student.totalScore}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingStudent(student);
                        }}
                        className="p-2 text-gray-700 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-all border border-transparent hover:border-emerald-100"
                        title={t('edit')}
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteStudent(student.id);
                        }}
                        className={`p-2 rounded-lg transition-all border border-transparent ${
                          confirmDeleteId === student.id
                            ? 'bg-red-600 text-white shadow-lg animate-pulse scale-110'
                            : 'text-gray-700 hover:text-red-700 hover:bg-red-50 hover:border-red-100'
                        }`}
                        title={t('delete')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <Link 
                        to={`/students/${student.id}`}
                        className="p-2 hover:bg-emerald-100 rounded-lg text-emerald-600 transition-colors inline-block"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </Link>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {editingStudent && (
        <EditStudentModal
          student={editingStudent}
          isOpen={!!editingStudent}
          onClose={() => setEditingStudent(null)}
          onSave={handleUpdateStudent}
          profile={profile}
        />
      )}

      {/* Add Student Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-y-auto max-h-[90vh] relative text-black"
            >
              <button 
                onClick={() => setIsModalOpen(false)}
                className="absolute top-6 right-6 p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-500"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="p-8">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mb-6">
                  <UserIcon className="w-6 h-6" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{t('new_student')}</h3>
                <p className="text-gray-500 mb-8">{t('enter_student_details')}</p>

                <form onSubmit={handleAddStudent} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                      <UserIcon className="w-4 h-4" />
                      {t('full_name')}
                    </label>
                    <input
                      required
                      type="text"
                      className="w-full p-4 bg-gray-50 border rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none"
                      placeholder="e.g. Abdullah Ahmad"
                      value={newStudent.name}
                      onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                      <Hash className="w-4 h-4" />
                      {t('age')}
                    </label>
                    <input
                      required
                      type="number"
                      className="w-full p-4 bg-gray-50 border rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none"
                      placeholder="e.g. 10"
                      value={newStudent.age}
                      onChange={(e) => setNewStudent({ ...newStudent, age: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                      <UserCircle className="w-4 h-4" />
                      {t('gender')}
                    </label>
                    <select
                      required
                      className="w-full p-4 bg-gray-50 border rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none"
                      value={newStudent.gender}
                      onChange={(e) => setNewStudent({ ...newStudent, gender: e.target.value as 'male' | 'female' })}
                    >
                      <option value="male">{t('male')}</option>
                      <option value="female">{t('female')}</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      {t('enrollment_date')}
                    </label>
                    <input
                      required
                      type="date"
                      className="w-full p-4 bg-gray-50 border rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none"
                      value={newStudent.enrollmentDate}
                      onChange={(e) => setNewStudent({ ...newStudent, enrollmentDate: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      {t('student_email')}
                    </label>
                    <input
                      type="email"
                      className="w-full p-4 bg-gray-50 border rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none"
                      placeholder="e.g. student@example.com"
                      value={newStudent.email}
                      onChange={(e) => setNewStudent({ ...newStudent, email: e.target.value })}
                    />
                    <p className="text-[10px] text-gray-400">{t('required_for_portal')}</p>
                  </div>
                  {isSenior && (
                    <div className="space-y-2">
                      <div className="flex justify-between items-center ml-1 uppercase tracking-wider">
                        <label className="text-[10px] font-black text-gray-400">{t('assigned_kuttab')}</label>
                        <button 
                          type="button"
                          onClick={() => navigate('/kuttabs')}
                          className="text-[10px] font-black text-emerald-600 hover:underline"
                        >
                          {t('manage')}
                        </button>
                      </div>
                      <select
                        className="w-full p-4 bg-gray-50 border rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none shadow-sm text-black font-medium"
                        value={newStudent.kuttabName}
                        onChange={(e) => setNewStudent({ ...newStudent, kuttabName: e.target.value })}
                      >
                        <option value="">{t('none_independent')}</option>
                        {kuttabs.map(k => (
                          <option key={k.id} value={k.name}>{k.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <button
                    disabled={isSubmitting}
                    type="submit"
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-2xl font-bold transition-all shadow-lg shadow-emerald-100 disabled:opacity-50"
                  >
                    {isSubmitting ? t('adding') : t('enroll_student')}
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

