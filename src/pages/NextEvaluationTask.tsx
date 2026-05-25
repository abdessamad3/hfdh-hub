import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { 
  Calendar, 
  Search, 
  Plus, 
  Trash2, 
  Edit2, 
  User, 
  BookOpen, 
  Clock,
  CheckCircle2,
  AlertCircle,
  ClipboardList
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { auth } from '../lib/firebase';
import { dbService } from '../services/db';
import { Student, NextEvaluation, UserProfile } from '../types';
import toast from 'react-hot-toast';

interface NextEvaluationTaskProps {
  profile: UserProfile | null;
}

export default function NextEvaluationTask({ profile }: NextEvaluationTaskProps) {
  const { t } = useTranslation();
  const [students, setStudents] = useState<Student[]>([]);
  const [studentId, setStudentId] = useState('');
  const [surahName, setSurahName] = useState('');
  const [hizbNumber, setHizbNumber] = useState('');
  const [quantity, setQuantity] = useState('t1');
  const [dueDate, setDueDate] = useState(new Date(Date.now() + 86400000).toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [nextEvaluations, setNextEvaluations] = useState<NextEvaluation[]>([]);
  const [editingEvaluation, setEditingEvaluation] = useState<NextEvaluation | null>(null);
  const [studentFilter, setStudentFilter] = useState('');
  const [fetching, setFetching] = useState(false);
  const [approvingTask, setApprovingTask] = useState<NextEvaluation | null>(null);
  const [approvalScore, setApprovalScore] = useState(100);
  const [approvalMistakes, setApprovalMistakes] = useState(0);
  const [approvalNotes, setApprovalNotes] = useState('');

  useEffect(() => {
    if (!auth.currentUser || !profile) return;

    const isAdmin = profile.role === 'admin';
    const unsubscribeStudents = dbService.subscribeStudents(
      auth.currentUser.uid,
      profile.kuttabName,
      isAdmin,
      setStudents
    );

    const unsubscribeNext = dbService.subscribeNextEvaluations(
      auth.currentUser.uid,
      profile.kuttabName,
      isAdmin,
      (data) => {
        setNextEvaluations(data);
        setFetching(false);
        // Automatically check for overdue tasks whenever the list updates
        dbService.checkAndCleanupOverdueEvaluationTasks(auth.currentUser!.uid, isAdmin, profile.kuttabName);
      }
    );

    return () => {
      unsubscribeStudents();
      unsubscribeNext();
    };
  }, [auth.currentUser, profile]);

  const resetForm = () => {
    setEditingEvaluation(null);
    setStudentId('');
    setSurahName('');
    setHizbNumber('');
    setQuantity('t1');
    setNotes('');
    setDueDate(new Date(Date.now() + 86400000).toISOString().split('T')[0]);
  };

  const handleEdit = (ev: NextEvaluation) => {
    setEditingEvaluation(ev);
    setStudentId(ev.studentId);
    setSurahName(ev.surahName || '');
    setHizbNumber(ev.hizbNumber.toString());
    setQuantity(ev.quantityIdentifier || 't1');
    setDueDate(ev.dueDate);
    setNotes(ev.notes);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleApprove = async () => {
    if (!approvingTask) return;
    setLoading(true);
    try {
      await dbService.approveNextEvaluation(approvingTask, approvalScore, approvalMistakes, approvalNotes);
      toast.success(t('evaluation_approved_success'));
      setApprovingTask(null);
      setApprovalNotes('');
      setApprovalScore(100);
      setApprovalMistakes(0);
    } catch (err) {
      console.error('Error approving evaluation:', err);
      toast.error(t('failed_to_approve_evaluation'));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (deleteConfirmId !== id) {
      setDeleteConfirmId(id);
      setTimeout(() => setDeleteConfirmId(null), 3000);
      return;
    }
    try {
      await dbService.deleteNextEvaluation(id);
      toast.success(t('task_deleted'));
      setDeleteConfirmId(null);
    } catch (err) {
      console.error('Error:', err);
      toast.error(t('failed_to_delete_evaluation'));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || !profile) return;

    setLoading(true);
    try {
      const isAdminFlag = profile.role === 'admin';
      let qUnit = 0;
      if (quantity.startsWith('t')) {
        qUnit = parseInt(quantity.substring(1));
      } else if (quantity.startsWith('r')) {
        qUnit = parseInt(quantity.substring(1)) * 2;
      } else if (quantity.startsWith('n')) {
        qUnit = parseInt(quantity.substring(1)) * 4;
      } else if (quantity === 'h1') {
        qUnit = 8;
      }

      if (editingEvaluation) {
        const student = students.find(s => s.id === studentId);
        await dbService.updateNextEvaluation(editingEvaluation.id, {
          studentId,
          studentEmail: student?.email || '',
          surahName,
          hizbNumber: parseInt(hizbNumber),
          quantity: qUnit,
          quantityIdentifier: quantity,
          dueDate,
          notes
        });
        toast.success(t('task_updated'));
      } else {
        const student = students.find(s => s.id === studentId);
        await dbService.addNextEvaluation({
          studentId,
          studentEmail: student?.email || '',
          teacherId: auth.currentUser.uid,
          kuttabResponsibleId: isAdminFlag ? auth.currentUser.uid : (student?.kuttabResponsibleId || auth.currentUser.uid),
          surahName,
          hizbNumber: parseInt(hizbNumber),
          quantity: qUnit,
          quantityIdentifier: quantity,
          dueDate,
          notes
        });
        toast.success(t('task_scheduled'));
      }
      resetForm();
    } catch (err) {
      console.error('Error:', err);
      toast.error(t('failed_to_save'));
    } finally {
      setLoading(false);
    }
  };

  const getPortionLabel = (q: number, identifier?: string) => {
    if (identifier) {
      if (identifier.startsWith('t')) return t(`thumun_${identifier.substring(1)}`);
      if (identifier.startsWith('r')) return t(`rubu_${identifier.substring(1)}`);
      if (identifier.startsWith('n')) return t(`nisf_${identifier.substring(1)}`);
      if (identifier === 'h1') return t('hizb');
    }
    if (q >= 1 && q <= 8) return t(`thumun_${q}`);
    return q > 0 ? `${q} ${t('unit_thumn')}` : '';
  };

  const filteredEvaluations = studentFilter
    ? nextEvaluations.filter(r => r.studentId === studentFilter)
    : nextEvaluations;

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8 text-black">
      <motion.div 
         initial={{ opacity: 0, y: 20 }}
         animate={{ opacity: 1, y: 0 }}
         className="flex flex-col md:flex-row md:items-center justify-between gap-6"
      >
        <div className="space-y-1">
          <h1 className="text-4xl font-black tracking-tight">{t('next_evaluation_task')}</h1>
          <p className="text-emerald-600 font-bold uppercase tracking-widest text-xs">{t('scheduled_plan')}</p>
        </div>
        <div className="px-6 py-3 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center gap-3">
          <Calendar className="w-5 h-5 text-emerald-600" />
          <span className="font-black text-emerald-700">{new Date().toLocaleDateString('default', { month: 'long', day: 'numeric' })}</span>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white border rounded-[32px] shadow-sm overflow-hidden"
      >
        <div className="bg-emerald-600 p-8 text-white">
          <div className="flex items-center gap-3 mb-2">
            <ClipboardList className="w-6 h-6 opacity-80" />
            <h2 className="text-xl font-bold">{editingEvaluation ? t('edit_plan') : t('set_next_evaluation')}</h2>
          </div>
          <p className="text-emerald-50 opacity-80 text-sm font-medium">{t('scheduled_plan_desc')}</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">{t('student')}</label>
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-emerald-600 transition-colors" />
                <select
                  required
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 border rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 font-bold transition-all appearance-none"
                >
                  <option value="">{t('select_student')}</option>
                  {students.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">{t('surah')}</label>
              <div className="relative group">
                <BookOpen className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-emerald-600 transition-colors" />
                <input
                  type="text"
                  required
                  placeholder={t('choose_surah') || 'Enter Surah...'}
                  value={surahName}
                  onChange={(e) => setSurahName(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 border rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 font-bold transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">{t('hizb_number')}</label>
              <input
                type="number"
                min="1"
                max="60"
                required
                value={hizbNumber}
                onChange={(e) => setHizbNumber(e.target.value)}
                className="w-full px-4 py-4 bg-gray-50 border rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 font-bold transition-all"
                placeholder="1 - 60"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">{t('quantity')}</label>
              <select
                required
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full px-4 py-4 bg-gray-50 border rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 font-bold transition-all appearance-none"
              >
                <optgroup label={t('thumun') || 'Thumun'}>
                  <option value="t1">{t('thumun_1')}</option>
                  <option value="t2">{t('thumun_2')}</option>
                  <option value="t3">{t('thumun_3')}</option>
                </optgroup>
                <optgroup label={t('rubu') || 'Rubu'}>
                  <option value="r1">{t('rubu_1')}</option>
                  <option value="r2">{t('rubu_2')}</option>
                  <option value="r3">{t('rubu_3')}</option>
                </optgroup>
                <optgroup label={t('nisf') || 'Nisf'}>
                  <option value="n1">{t('nisf_1')}</option>
                  <option value="n2">{t('nisf_2')}</option>
                  <option value="n3">{t('nisf_3')}</option>
                </optgroup>
                <option value="h1">{t('hizb_1')}</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">{t('due_date')}</label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-4 py-4 bg-gray-50 border rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 font-bold transition-all"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">{t('notes')}</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t('add_notes_placeholder') || 'Optional notes...'}
                rows={3}
                className="w-full p-4 bg-gray-50 border rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 font-bold transition-all resize-none"
              />
            </div>
          </div>

          <div className="flex gap-4 pt-4 border-t border-gray-100">
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-4 bg-emerald-600 text-white hover:bg-emerald-700 rounded-2xl font-black shadow-lg shadow-emerald-100 transition-all active:scale-95 disabled:opacity-50"
            >
              {loading ? t('processing') : (editingEvaluation ? t('update') : t('save'))}
            </button>
            {editingEvaluation && (
              <button
                type="button"
                onClick={resetForm}
                className="px-6 py-4 bg-gray-100 text-gray-600 hover:bg-gray-250 rounded-2xl font-black transition-all"
              >
                {t('cancel')}
              </button>
            )}
          </div>
        </form>
      </motion.div>

      <motion.div 
         initial={{ opacity: 0 }}
         animate={{ opacity: 1 }}
         className="space-y-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-2xl font-black tracking-tight">{t('scheduled_tasks')}</h2>
          
          <div className="flex gap-2 max-w-xs w-full">
            <div className="relative flex-1 group">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                value={studentFilter}
                onChange={(e) => setStudentFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-xs transition-colors appearance-none"
              >
                <option value="">{t('all_students')}</option>
                {students.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {filteredEvaluations.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredEvaluations.map((ev) => {
              const student = students.find(s => s.id === ev.studentId);
              const isPast = new Date(ev.dueDate) < new Date(new Date().setHours(0,0,0,0));
              return (
                <div key={ev.id} className="p-5 bg-white rounded-2xl border border-gray-100 hover:border-emerald-200 transition-all shadow-sm group">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center font-bold text-emerald-600 border border-emerald-100 shadow-sm">
                        {student?.name?.charAt(0) || <User className="w-4 h-4" />}
                      </div>
                      <div>
                        <Link 
                          to={student ? `/students/${student.id}` : '#'}
                          className="font-bold text-gray-900 hover:text-emerald-600 transition-colors"
                        >
                          {student?.name || t('student')}
                        </Link>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${isPast ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
                            {isPast ? t('overdue') : t('upcoming')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-emerald-600" />
                        <span className="text-sm font-bold">{ev.surahName || '-'}</span>
                      </div>
                      <span className="text-xs font-bold text-gray-400">{t('hizb')} {ev.hizbNumber}</span>
                    </div>
                    
                    <div className="flex items-center justify-between text-xs px-1">
                      <div className="flex items-center gap-2 text-gray-500">
                        <Clock className="w-3 h-3" />
                        <span className="font-bold">{ev.dueDate}</span>
                      </div>
                      <span className="font-bold text-emerald-600">{getPortionLabel(ev.quantity || 0, ev.quantityIdentifier)}</span>
                    </div>

                    {ev.notes && (
                      <p className="text-xs text-gray-500 bg-gray-50 p-2 rounded-lg border border-gray-100 italic">
                        "{ev.notes}"
                      </p>
                    )}

                    <div className="flex items-center justify-between pt-3 border-t border-gray-100 mt-2">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleEdit(ev)}
                          className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                          title={t('edit')}
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(ev.id)}
                          className={`p-2 rounded-lg transition-all ${
                            deleteConfirmId === ev.id 
                              ? 'bg-red-600 text-white animate-pulse' 
                              : 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                          }`}
                          title={t('delete')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      
                      <button
                        onClick={() => setApprovingTask(ev)}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl transition-all font-bold text-xs shadow-md shadow-emerald-100 active:scale-95"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{t('validate')}</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
            <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">{t('no_scheduled_tasks')}</p>
          </div>
        )}
      </motion.div>

      {/* Approval Modal */}
      {approvingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setApprovingTask(null)}
          />
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-[32px] w-full max-w-sm p-8 relative z-10 shadow-2xl border"
          >
            <h3 className="text-xl font-bold mb-4">{t('validate')}</h3>
            <p className="text-sm text-gray-500 mb-6">{t('approve_evaluation_desc')}</p>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">{t('accuracy_score_label')} ({approvalScore}%)</label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={approvalScore}
                  onChange={(e) => setApprovalScore(parseInt(e.target.value))}
                  className="w-full h-2 bg-emerald-100 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                />
                <div className="flex justify-between text-[10px] font-bold text-gray-400 px-1">
                  <span>0%</span>
                  <span>50%</span>
                  <span>100%</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">{t('mistakes_count_label')}</label>
                <input
                  type="number"
                  min="0"
                  value={approvalMistakes}
                  onChange={(e) => setApprovalMistakes(parseInt(e.target.value) || 0)}
                  className="w-full p-4 bg-gray-50 border rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 font-bold transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">{t('notes')}</label>
                <textarea
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  placeholder={t('add_notes_placeholder')}
                  rows={2}
                  className="w-full p-4 bg-gray-50 border rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 font-bold transition-all resize-none"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleApprove}
                  disabled={loading}
                  className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold transition-all active:scale-95 disabled:opacity-50"
                >
                  {loading ? t('processing') : t('validate')}
                </button>
                <button
                  onClick={() => setApprovingTask(null)}
                  className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold"
                >
                  {t('cancel')}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
