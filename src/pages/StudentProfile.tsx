import { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Calendar, BookOpen, Award, ChevronLeft, TrendingUp, AlertCircle, Trash2, Edit2, Mail, Home, Filter } from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area 
} from 'recharts';
import { toast } from 'react-hot-toast';
import { dbService } from '../services/db';
import { auth } from '../lib/firebase';
import type { Student, Evaluation, Attendance, UserProfile, Revision, NextRevision } from '../types';
import EditStudentModal from '../components/EditStudentModal';
import EditEvaluationModal from '../components/EditEvaluationModal';
import StudentCalendar from '../components/StudentCalendar';
import MemorizationGrid from '../components/MemorizationGrid';
import { useTranslation } from 'react-i18next';
import { History, Star, MoreVertical } from 'lucide-react';
import { formatDate } from '../lib/dateUtils';
import { formatQuranProgress } from '../lib/quranUtils';

interface StudentProfileProps {
  profile: UserProfile | null;
}

export default function StudentProfile({ profile }: StudentProfileProps) {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();

  const getPortionLabel = (q: number, identifier?: string) => {
    if (identifier) {
      if (identifier.startsWith('t')) return t(`thumun_${identifier.substring(1)}`);
      if (identifier.startsWith('r')) return t(`rubu_${identifier.substring(1)}`);
      if (identifier.startsWith('n')) return t(`nisf_${identifier.substring(1)}`);
      if (identifier === 'h1') return t('hizb') + ' 1';
    }
    if (q >= 1 && q <= 8) return t(`thumun_${q}`);
    return q > 0 ? `${q} ${t('unit_thumn')}` : '';
  };

  const navigate = useNavigate();
  const [student, setStudent] = useState<Student | null>(null);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [nextRevisions, setNextRevisions] = useState<NextRevision[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [monthFrom, setMonthFrom] = useState<string>('');
  const [monthTo, setMonthTo] = useState<string>('');

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingEvaluation, setEditingEvaluation] = useState<Evaluation | null>(null);

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmDeleteRevisionId, setConfirmDeleteRevisionId] = useState<string | null>(null);
  const [confirmDeleteStudent, setConfirmDeleteStudent] = useState(false);

  const fetchData = async () => {
    if (!id || !auth.currentUser) return;
    setLoading(true);
    setError(null);
    try {
      const [studentData, evalData, revData, attData, nextRevData] = await Promise.all([
        dbService.getStudent(id),
        dbService.getEvaluations(id),
        dbService.getRevisions(id),
        dbService.getStudentAttendance(id),
        dbService.getStudentNextRevisions(id)
      ]);
      setStudent(studentData);
      setEvaluations(evalData);
      setRevisions(revData);
      setAttendance(attData);
      setNextRevisions(nextRevData);
    } catch (err: any) {
      console.error('Error fetching data:', err);
      // Try to extract Firestore error info if it's our JSON format
      try {
        const errorInfo = JSON.parse(err.message);
        setError(errorInfo.error || err.message);
      } catch {
        setError(err.message || 'Failed to load student profile');
      }
    } finally {
      setLoading(false);
    }
  };

  const filteredEvaluations = useMemo(() => {
    return evaluations.filter(e => {
      const dateStr = e.date.substring(0, 7); // YYYY-MM
      if (monthFrom && dateStr < monthFrom) return false;
      if (monthTo && dateStr > monthTo) return false;
      return true;
    });
  }, [evaluations, monthFrom, monthTo]);

  const filteredRevisions = useMemo(() => {
    return revisions.filter(r => {
      const dateStr = r.date.substring(0, 7); // YYYY-MM
      if (monthFrom && dateStr < monthFrom) return false;
      if (monthTo && dateStr > monthTo) return false;
      return true;
    });
  }, [revisions, monthFrom, monthTo]);

  const filteredAttendance = useMemo(() => {
    return attendance.filter(a => {
      const dateStr = a.date.substring(0, 7); // YYYY-MM
      if (monthFrom && dateStr < monthFrom) return false;
      if (monthTo && dateStr > monthTo) return false;
      return true;
    });
  }, [attendance, monthFrom, monthTo]);

  const filteredNextRevisions = useMemo(() => {
    return nextRevisions.filter(nr => {
      const dateStr = nr.dueDate.substring(0, 7); // YYYY-MM
      if (monthFrom && dateStr < monthFrom) return false;
      if (monthTo && dateStr > monthTo) return false;
      return true;
    });
  }, [nextRevisions, monthFrom, monthTo]);

  useEffect(() => {
    fetchData();
  }, [id]);

  const handleUpdateStudent = async (data: Partial<Student>) => {
    if (!id) return;
    try {
      await dbService.updateStudent(id, data);
      await fetchData();
      toast.success(t('student_profile_updated'));
    } catch (err: any) {
      console.error('Error updating student:', err);
      if (err.message === 'email_already_exists') {
        toast(t('email_already_exists'), { icon: '⚠️', duration: 4000 });
      } else {
        toast.error(t('failed_to_update_student'));
      }
      throw err;
    }
  };

  const handleUpdateEvaluation = async (data: Partial<Evaluation>) => {
    if (!id || !auth.currentUser || !editingEvaluation) return;
    try {
      await dbService.updateEvaluation(editingEvaluation.id, data, id, auth.currentUser.uid);
      await fetchData();
      toast.success(t('evaluation_updated'));
    } catch (err) {
      console.error('Error updating evaluation:', err);
      toast.error(t('failed_to_update_evaluation'));
      throw err;
    }
  };

  const handleDeleteEvaluation = async (evalId: string) => {
    if (!id) return;
    
    if (confirmDeleteId !== evalId) {
      setConfirmDeleteId(evalId);
      toast(t('click_again_to_confirm'), { icon: '🗑️' });
      setTimeout(() => setConfirmDeleteId(null), 4000); // 4s for easier confirm
      return;
    }

    if (!auth.currentUser) {
      toast.error(t('session_expired'));
      return;
    }
    
    try {
      await dbService.deleteEvaluation(evalId, id, auth.currentUser.uid);
      setConfirmDeleteId(null);
      await fetchData(); // Refresh data
      toast.success(t('evaluation_deleted'));
    } catch (err) {
      console.error('Error deleting evaluation:', err);
      toast.error(t('failed_to_delete_evaluation'));
    }
  };

  const handleDeleteStudent = async () => {
    if (!id) return;

    if (!confirmDeleteStudent) {
      setConfirmDeleteStudent(true);
      toast(t('click_again_to_confirm'), { icon: '⚠️' });
      setTimeout(() => setConfirmDeleteStudent(false), 4000); // 4s for easier confirm
      return;
    }

    if (!auth.currentUser) {
      toast.error(t('session_expired'));
      return;
    }
    
    try {
      await dbService.deleteStudent(id);
      navigate('/students');
      toast.success(t('student_deleted'));
    } catch (err) {
      console.error('Error deleting student:', err);
      toast.error(t('failed_to_delete_student'));
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500 font-medium">{t('loading')}</div>;
  
  if (error || !student) {
    return (
      <div className="p-8 max-w-2xl mx-auto text-center space-y-4">
        <div className="bg-red-50 text-red-700 p-6 rounded-2xl border border-red-100 shadow-sm">
          <p className="text-lg font-bold mb-2">{t('student_not_found')}</p>
          {error && <p className="text-sm opacity-80 font-mono break-all">{error}</p>}
        </div>
        <button 
          onClick={() => navigate('/students')}
          className="text-emerald-600 hover:underline font-medium"
        >
          &larr; {t('back_to_students')}
        </button>
      </div>
    );
  }

  const chartData = filteredEvaluations.map(e => ({
    date: formatDate(e.date),
    accuracy: e.accuracyScore,
    mistakes: e.mistakesCount
  })).reverse();

  return (
    <div className="p-8 space-y-8 max-w-6xl mx-auto text-black">
      <div className="flex justify-between items-center">
        <Link to="/students" className="inline-flex items-center gap-2 text-emerald-600 font-bold hover:gap-3 transition-all">
          <ChevronLeft className="w-5 h-5" />
          {t('back_to_students')}
        </Link>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsEditModalOpen(true)}
            className="flex items-center gap-2 text-emerald-700 hover:text-emerald-800 font-bold transition-all text-sm px-4 py-2 border border-emerald-100 hover:bg-emerald-50 rounded-xl shadow-sm bg-white"
          >
            <Edit2 className="w-4 h-4" />
            {t('edit_profile')}
          </button>
          <button 
            onClick={handleDeleteStudent}
            className={`flex items-center gap-2 font-bold transition-all text-sm px-4 py-2 rounded-xl border shadow-sm ${
              confirmDeleteStudent 
                ? "bg-red-600 text-white border-red-600 scale-105" 
                : "text-red-700 bg-white border-red-100 hover:bg-red-50 hover:text-red-800"
            }`}
          >
            <Trash2 className="w-4 h-4" />
            {confirmDeleteStudent ? t('confirm_delete_student') : t('delete_student')}
          </button>
        </div>
      </div>

      <div className="bg-white border rounded-3xl p-6 shadow-sm flex flex-wrap gap-6 items-center">
        <div className="flex items-center gap-2 text-gray-500 font-bold uppercase text-[10px] tracking-widest">
          <Filter className="w-4 h-4" />
          {t('filter_by_month')}
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-400 uppercase">{t('from')}</span>
            <input 
              type="month" 
              value={monthFrom}
              onChange={(e) => setMonthFrom(e.target.value)}
              className="bg-gray-50 border rounded-xl px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-400 uppercase">{t('to')}</span>
            <input 
              type="month" 
              value={monthTo}
              onChange={(e) => setMonthTo(e.target.value)}
              className="bg-gray-50 border rounded-xl px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>
          {(monthFrom || monthTo) && (
            <button 
              onClick={() => {
                setMonthFrom('');
                setMonthTo('');
              }}
              className="text-[10px] font-black uppercase text-red-500 hover:text-red-600 transition-colors"
            >
              {t('clear_filter')}
            </button>
          )}
        </div>
      </div>

      <div className="bg-white border rounded-3xl p-8 shadow-sm flex flex-col md:flex-row gap-8 items-start relative overflow-hidden">
        <div className="absolute top-0 right-0 p-12 bg-emerald-50 rounded-bl-[100px] -z-0 opacity-50" />
        
        <div className="w-32 h-32 bg-emerald-100 rounded-3xl flex items-center justify-center text-4xl font-black text-emerald-700 shadow-inner z-10">
          {student.name.substring(0, 2).toUpperCase()}
        </div>

        <div className="space-y-4 flex-1 z-10">
          <div className="text-black">
            <h2 className="text-4xl font-black text-gray-900">{student.name}</h2>
            <div className="flex flex-wrap items-center gap-3 mt-1 cursor-default">
              <p className="text-gray-500 font-medium">
                {t('years_old', { age: student.age })} • {student.enrollmentDate ? t('joined_on', { date: formatDate(student.enrollmentDate) }) : 'N/A'}
              </p>
              {student.gender && (
                <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest border ${
                  student.gender === 'male' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-pink-50 text-pink-600 border-pink-100'
                }`}>
                  {t(student.gender)}
                </span>
              )}
              {student.email ? (
                <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-black uppercase tracking-wider border border-emerald-100/50">
                  <Mail className="w-3 h-3" />
                  {student.email}
                </span>
              ) : (
                <span className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-600 rounded-lg text-[10px] font-black uppercase tracking-wider border border-amber-100/50">
                  <AlertCircle className="w-3 h-3" />
                  {t('no_email_linked')}
                </span>
              )}
              {student.kuttabName && (
                <span className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-black uppercase tracking-wider border border-blue-100/50">
                  <Home className="w-3 h-3" />
                  {t('kuttab')}: {student.kuttabName}
                </span>
              )}
            </div>
          </div>
          
          <div className="flex flex-wrap gap-4 pt-2">
            <div className="px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl font-bold flex items-center gap-2">
              <Award className="w-5 h-5" />
              {t('score')}: {student.totalScore}
            </div>
            <div className="px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl font-bold flex items-center gap-2">
              <Star className="w-5 h-5" />
              {t('total_hizbs')}: {(student.totalHizbs || 0).toFixed(2)} {t('hizbs')}
            </div>
            <div className="px-4 py-2 bg-blue-50 text-blue-700 rounded-xl font-bold flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              {t('sessions_logged', { count: evaluations.length })}
            </div>
            <div className="px-4 py-2 bg-amber-50 text-amber-700 rounded-xl font-bold flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              {t('tracking_active')}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="p-6 bg-white border rounded-3xl shadow-sm space-y-6">
          <h3 className="font-bold text-xl flex items-center gap-2 text-black">
            <TrendingUp className="w-6 h-6 text-emerald-500" />
            {t('accuracy_progress')}
          </h3>
          <div className="h-64 w-full">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorAcc" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" hide />
                  <YAxis unit="%" domain={[0, 100]} />
                  <Tooltip />
                  <Area type="monotone" dataKey="accuracy" stroke="#10b981" fillOpacity={1} fill="url(#colorAcc)" strokeWidth={3} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400">{t('no_eval_data')}</div>
            )}
          </div>
        </div>

        <div className="p-6 bg-white border rounded-3xl shadow-sm space-y-6">
          <h3 className="font-bold text-xl flex items-center gap-2 text-black">
            <AlertCircle className="w-6 h-6 text-red-500" />
            {t('mistakes_history')}
          </h3>
          <div className="h-64 w-full">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" hide />
                  <YAxis />
                  <Tooltip />
                  <Line type="step" dataKey="mistakes" stroke="#ef4444" strokeWidth={3} dot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400">{t('no_eval_data')}</div>
            )}
          </div>
        </div>
      </div>
      
      <div className="mt-8">
        <MemorizationGrid evaluations={filteredEvaluations} />
      </div>
      
      <div className="mt-8">
        <h3 className="font-bold text-2xl flex items-center gap-2 text-gray-900 mb-6 px-2">
          <Calendar className="w-8 h-8 text-emerald-600" />
          {t('attendance_eval_timeline')}
        </h3>
        <StudentCalendar 
          attendance={filteredAttendance} 
          evaluations={filteredEvaluations} 
          revisions={filteredRevisions} 
          nextRevisions={filteredNextRevisions} 
        />
      </div>

      <div className="bg-white border rounded-3xl shadow-sm overflow-hidden text-black mt-8">
        <div className="p-6 bg-gray-50 flex justify-between items-center border-b">
          <h3 className="font-bold flex items-center gap-2 uppercase text-xs tracking-widest text-gray-500">
            <History className="w-4 h-4" />
            {t('revisions_history')}
          </h3>
        </div>
        <div className="divide-y text-black">
          {filteredRevisions.length === 0 ? (
            <div className="p-12 text-center text-gray-500 font-medium">{t('no_eval_data')}</div>
          ) : (
            filteredRevisions
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .map((rev) => (
              <div key={rev.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                  <div className="space-y-4 flex-1">
                    <div className="flex items-center gap-3">
                      <div className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs font-bold uppercase">
                        {t('revision')}
                      </div>
                      <p className="font-bold text-gray-900">
                        {formatDate(rev.date)}
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                        <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">{t('surah_portion')}</p>
                        <p className="font-black text-gray-800">{rev.surahName || 'N/A'}</p>
                        {rev.hizbNumber && (
                          <p className="text-[10px] font-bold text-blue-600 mt-1 uppercase">
                            {t('hizb')} {rev.hizbNumber.toString().padStart(2, '0')} • {getPortionLabel(rev.quantity || 0, rev.quantityIdentifier)}
                          </p>
                        )}
                      </div>
                      <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                        <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">{t('teacher_notes')}</p>
                        <p className="text-sm text-gray-600 line-clamp-2">{rev.notes || t('no_notes_provided')}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 self-center lg:self-start">
                    <div className="text-center px-4 py-3 bg-blue-50 rounded-2xl border border-blue-100 min-w-[110px]">
                      <p className="text-[10px] font-bold text-blue-400 uppercase mb-1">{t('quality_score')}</p>
                      <p className="text-2xl font-black text-blue-600">{rev.qualityScore}%</p>
                    </div>
                    {profile?.role !== 'student' && (
                      <button 
                        onClick={async () => {
                          if (confirmDeleteRevisionId !== rev.id) {
                            setConfirmDeleteRevisionId(rev.id);
                            toast(t('click_again_to_confirm'), { icon: '🗑️' });
                            setTimeout(() => setConfirmDeleteRevisionId(null), 4000);
                            return;
                          }
                          try {
                            await dbService.deleteRevision(rev.id);
                            await fetchData();
                            toast.success(t('revision_deleted'));
                          } catch (err) {
                            toast.error(t('sync_failed'));
                          }
                        }}
                        className={`p-3 rounded-2xl transition-all border shadow-sm ${
                          confirmDeleteRevisionId === rev.id
                            ? "bg-red-600 text-white border-red-600"
                            : "text-red-700 bg-gray-50/50 border-red-100 hover:bg-white"
                        }`}
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="bg-white border rounded-3xl shadow-sm overflow-hidden text-black mt-8">
        <div className="p-6 bg-gray-50 flex justify-between items-center border-b">
          <h3 className="font-bold flex items-center gap-2 uppercase text-xs tracking-widest text-gray-500">
            <BookOpen className="w-4 h-4" />
            {t('combined_history')}
          </h3>
        </div>
        <div className="divide-y text-black">
          {filteredEvaluations.length === 0 ? (
            <div className="p-12 text-center text-gray-500 font-medium">{t('no_unified_records')}</div>
          ) : (
            filteredEvaluations
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .map((evalItem) => (
              <div key={evalItem.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                  <div className="space-y-4 flex-1">
                    <div className="flex items-center gap-3">
                      <div className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold uppercase">
                        {t('progress_log')}
                      </div>
                      <p className="font-bold text-gray-900">
                        {formatDate(evalItem.date)}
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                        <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">{t('surah_portion')}</p>
                        <p className="font-black text-gray-800">{evalItem.surahName || 'N/A'}</p>
                        <p className="text-sm text-gray-500 font-medium">{t('ayah')} {evalItem.fromAyah} {t('to')} {evalItem.toAyah}</p>
                        {evalItem.hizbNumber && (
                          <p className="text-[10px] font-bold text-emerald-600 mt-1 uppercase">
                            {t('hizb')} {evalItem.hizbNumber.toString().padStart(2, '0')} • {getPortionLabel(evalItem.quantity || 0, evalItem.quantityIdentifier)}
                          </p>
                        )}
                      </div>
                      <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                        <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">{t('teacher_notes')}</p>
                        <p className="text-sm text-gray-600 line-clamp-2">{evalItem.notes || t('no_notes_provided')}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-4 self-center lg:self-start">
                    <div className="flex items-center gap-4">
                      <div className="text-center px-4 py-3 bg-red-50 rounded-2xl border border-red-100 min-w-[110px]">
                        <p className="text-[10px] font-bold text-red-400 uppercase mb-1">{t('mistakes')}</p>
                        <p className="text-2xl font-black text-red-600">{evalItem.mistakesCount}</p>
                      </div>
                      <div className="text-center px-4 py-3 bg-emerald-50 rounded-2xl border border-emerald-100 min-w-[110px]">
                        <p className="text-[10px] font-bold text-emerald-400 uppercase mb-1">{t('accuracy')}</p>
                        <p className="text-2xl font-black text-emerald-600">{evalItem.accuracyScore}%</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 relative z-20">
                      <button 
                        onClick={() => setEditingEvaluation(evalItem)}
                        className="p-3 text-emerald-700 hover:bg-white rounded-2xl transition-all border border-emerald-100 shadow-sm bg-gray-50/50"
                        title={t('edit')}
                      >
                        <Edit2 className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={() => handleDeleteEvaluation(evalItem.id)}
                        className={`px-4 py-3 rounded-2xl transition-all border flex items-center gap-2 shadow-sm ${
                          confirmDeleteId === evalItem.id
                            ? "bg-red-600 text-white border-red-600 scale-105 shadow-lg animate-pulse"
                            : "text-red-700 bg-gray-50/50 border-red-100 hover:bg-white"
                        }`}
                        title={confirmDeleteId === evalItem.id ? t('click_again_to_confirm') : t('delete')}
                      >
                        <Trash2 className="w-5 h-5" />
                        {confirmDeleteId === evalItem.id && <span className="text-xs font-bold uppercase">{t('confirm_delete_evaluation')}</span>}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <EditStudentModal 
        student={student}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleUpdateStudent}
        profile={profile}
      />

      {editingEvaluation && (
        <EditEvaluationModal
          evaluation={editingEvaluation}
          isOpen={!!editingEvaluation}
          onClose={() => setEditingEvaluation(null)}
          onSave={handleUpdateEvaluation}
        />
      )}
    </div>
  );
}

