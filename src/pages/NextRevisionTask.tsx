import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { 
  Calendar, 
  Search, 
  Plus, 
  History, 
  Trash2, 
  Edit2, 
  User, 
  BookOpen, 
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  ClipboardList
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { auth } from '../lib/firebase';
import { dbService } from '../services/db';
import { Student, NextRevision, UserProfile } from '../types';
import toast from 'react-hot-toast';

interface NextRevisionTaskProps {
  profile: UserProfile | null;
}

export default function NextRevisionTask({ profile }: NextRevisionTaskProps) {
  const { t } = useTranslation();
  const [students, setStudents] = useState<Student[]>([]);
  const [studentId, setStudentId] = useState('');
  const [surahName, setSurahName] = useState('');
  const [hizbNumber, setHizbNumber] = useState('');
  const [quantity, setQuantity] = useState('t1');
  const [dueDate, setDueDate] = useState(new Date(Date.now() + 86400000).toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [nextRevisions, setNextRevisions] = useState<NextRevision[]>([]);
  const [editingRevision, setEditingRevision] = useState<NextRevision | null>(null);
  const [studentFilter, setStudentFilter] = useState('');
  const [fetching, setFetching] = useState(false);
  const [approvingTask, setApprovingTask] = useState<NextRevision | null>(null);
  const [approvalScore, setApprovalScore] = useState(100);
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

    const unsubscribeNext = dbService.subscribeNextRevisions(
      auth.currentUser.uid,
      profile.kuttabName,
      isAdmin,
      (data) => {
        setNextRevisions(data);
        setFetching(false);
        // Automatically check for overdue tasks whenever the list updates
        dbService.checkAndCleanupOverdueTasks(auth.currentUser!.uid, isAdmin, profile.kuttabName);
      }
    );

    return () => {
      unsubscribeStudents();
      unsubscribeNext();
    };
  }, [auth.currentUser, profile]);

  const resetForm = () => {
    setEditingRevision(null);
    setStudentId('');
    setSurahName('');
    setHizbNumber('');
    setQuantity('t1');
    setNotes('');
    setDueDate(new Date(Date.now() + 86400000).toISOString().split('T')[0]);
  };

  const handleEdit = (rev: NextRevision) => {
    setEditingRevision(rev);
    setStudentId(rev.studentId);
    setSurahName(rev.surahName || '');
    setHizbNumber(rev.hizbNumber.toString());
    setQuantity(rev.quantityIdentifier || 't1');
    setDueDate(rev.dueDate);
    setNotes(rev.notes);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleApprove = async () => {
    if (!approvingTask) return;
    setLoading(true);
    try {
      await dbService.approveNextRevision(approvingTask, approvalScore, approvalNotes);
      toast.success(t('revision_approved_success'));
      setApprovingTask(null);
      setApprovalNotes('');
      setApprovalScore(100);
    } catch (err) {
      console.error('Error approving revision:', err);
      toast.error(t('failed_to_approve'));
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
      await dbService.deleteNextRevision(id);
      toast.success(t('task_deleted'));
      setDeleteConfirmId(null);
    } catch (err) {
      console.error('Error:', err);
      toast.error(t('failed_to_delete_revision'));
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

      if (editingRevision) {
        const student = students.find(s => s.id === studentId);
        await dbService.updateNextRevision(editingRevision.id, {
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
        await dbService.addNextRevision({
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
      if (identifier === 'h1') return t('hizb') + ' 1';
    }
    if (q >= 1 && q <= 8) return t(`thumun_${q}`);
    return q > 0 ? `${q} ${t('unit_thumn')}` : '';
  };

  const filteredRevisions = studentFilter
    ? nextRevisions.filter(r => r.studentId === studentFilter)
    : nextRevisions;

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8 text-black">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-6"
      >
        <div className="space-y-1">
          <h1 className="text-4xl font-black tracking-tight">{t('next_revision_task')}</h1>
          <p className="text-indigo-600 font-bold uppercase tracking-widest text-xs">{t('scheduled_plan')}</p>
        </div>
        <div className="px-6 py-3 bg-indigo-50 rounded-2xl border border-indigo-100 flex items-center gap-3">
          <Calendar className="w-5 h-5 text-indigo-600" />
          <span className="font-black text-indigo-700">{new Date().toLocaleDateString('default', { month: 'long', day: 'numeric' })}</span>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white border rounded-[32px] shadow-sm overflow-hidden"
      >
        <div className="bg-indigo-600 p-8 text-white">
          <div className="flex items-center gap-3 mb-2">
            <ClipboardList className="w-6 h-6 opacity-80" />
            <h2 className="text-xl font-bold">{editingRevision ? t('edit_plan') : t('set_next_revision')}</h2>
          </div>
          <p className="text-indigo-50 opacity-80 text-sm font-medium">{t('scheduled_plan_desc')}</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">{t('student')}</label>
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-indigo-600 transition-colors" />
                <select
                  required
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 border rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold appearance-none"
                >
                  <option value="">{t('select_student')}</option>
                  {students.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.kuttabName})</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">{t('due_date')}</label>
              <div className="relative group">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-indigo-600 transition-colors" />
                <input
                  type="date"
                  required
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 border rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">{t('surah')}</label>
              <div className="relative group">
                <BookOpen className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-indigo-600 transition-colors" />
                <input
                  type="text"
                  // required removed to make surah optional
                  placeholder="e.g. Al-Baqarah"
                  value={surahName}
                  onChange={(e) => setSurahName(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 border rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">{t('hizb')}</label>
                <div className="relative group">
                  <TrendingUp className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-indigo-600 transition-colors" />
                  <input
                    type="number"
                    required
                    min="1"
                    max="60"
                    placeholder="1"
                    value={hizbNumber}
                    onChange={(e) => setHizbNumber(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-gray-50 border rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">{t('quantity')}</label>
                <select
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full p-4 bg-gray-50 border rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold"
                >
                  <option value="t1">{t('thumun_1')}</option>
                  <option value="t2">{t('thumun_2')}</option>
                  <option value="t3">{t('thumun_3')}</option>
                  <option value="t4">{t('thumun_4')}</option>
                  <option value="t5">{t('thumun_5')}</option>
                  <option value="t6">{t('thumun_6')}</option>
                  <option value="t7">{t('thumun_7')}</option>
                  <option value="t8">{t('thumun_8')}</option>
                  <optgroup label={t('unit_rubu')}>
                    <option value="r1">{t('rubu_1')}</option>
                    <option value="r2">{t('rubu_2')}</option>
                    <option value="r3">{t('rubu_3')}</option>
                    <option value="r4">{t('rubu_4')}</option>
                  </optgroup>
                  <optgroup label={t('unit_nisf')}>
                    <option value="n1">{t('nisf_1')}</option>
                    <option value="n2">{t('nisf_2')}</option>
                  </optgroup>
                  <optgroup label={t('hizb')}>
                    <option value="h1">{t('hizb')} 1</option>
                  </optgroup>
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">{t('notes')}</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="..."
              rows={2}
              className="w-full p-4 bg-gray-50 border rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold resize-none"
            />
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Plus className="w-5 h-5" />
              )}
              {editingRevision ? t('save_plan') : t('save_plan')}
            </button>
            {editingRevision && (
              <button
                type="button"
                onClick={resetForm}
                className="px-8 py-4 bg-gray-100 text-gray-600 rounded-2xl font-black hover:bg-gray-200 transition-all active:scale-95"
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
        className="bg-white border rounded-[32px] shadow-sm p-8"
      >
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <h3 className="text-xl font-bold flex items-center gap-3">
            <History className="w-5 h-5 text-indigo-600" />
            {t('scheduled_tasks')}
          </h3>
          <div className="relative group min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-indigo-600" />
            <select
              value={studentFilter}
              onChange={(e) => setStudentFilter(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
            >
              <option value="">{t('all_students')}</option>
              {students.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        </div>

        {fetching ? (
          <div className="flex justify-center p-12">
            <div className="w-10 h-10 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
          </div>
        ) : filteredRevisions.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredRevisions.map((rev) => {
              const student = students.find(s => s.id === rev.studentId);
              const isPast = new Date(rev.dueDate) < new Date(new Date().setHours(0,0,0,0));
              return (
                <div key={rev.id} className="p-5 bg-white rounded-2xl border border-gray-100 hover:border-indigo-200 transition-all shadow-sm group">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center font-bold text-indigo-600 border border-indigo-100 shadow-sm">
                        {student?.name?.charAt(0) || <User className="w-4 h-4" />}
                      </div>
                      <div>
                        <Link 
                          to={student ? `/students/${student.id}` : '#'}
                          className="font-bold text-gray-900 hover:text-indigo-600 transition-colors"
                        >
                          {student?.name || t('student')}
                        </Link>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${isPast ? 'bg-red-100 text-red-600' : 'bg-indigo-100 text-indigo-600'}`}>
                            {isPast ? t('overdue') : t('upcoming')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-indigo-600" />
                        <span className="text-sm font-bold">{rev.surahName || '-'}</span>
                      </div>
                      <span className="text-xs font-bold text-gray-400">{t('hizb')} {rev.hizbNumber}</span>
                    </div>
                    
                    <div className="flex items-center justify-between text-xs px-1">
                      <div className="flex items-center gap-2 text-gray-500">
                        <Clock className="w-3 h-3" />
                        <span className="font-bold">{rev.dueDate}</span>
                      </div>
                      <span className="font-bold text-indigo-600">{getPortionLabel(rev.quantity || 0, rev.quantityIdentifier)}</span>
                    </div>

                    {rev.notes && (
                      <p className="text-xs text-gray-500 bg-gray-50 p-2 rounded-lg border border-gray-100 italic">
                        "{rev.notes}"
                      </p>
                    )}

                    <div className="flex items-center justify-between pt-3 border-t border-gray-100 mt-2">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleEdit(rev)}
                          className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                          title={t('edit')}
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(rev.id)}
                          className={`p-2 rounded-lg transition-all ${
                            deleteConfirmId === rev.id 
                              ? 'bg-red-600 text-white animate-pulse' 
                              : 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                          }`}
                          title={t('delete')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      
                      <button
                        onClick={() => setApprovingTask(rev)}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl transition-all font-bold text-xs shadow-md shadow-indigo-100 active:scale-95"
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
            <p className="text-sm text-gray-500 mb-6">{t('approve_revision_desc')}</p>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">{t('quality_score')} ({approvalScore}%)</label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={approvalScore}
                  onChange={(e) => setApprovalScore(parseInt(e.target.value))}
                  className="w-full h-2 bg-indigo-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
                <div className="flex justify-between text-[10px] font-bold text-gray-400 px-1">
                  <span>0%</span>
                  <span>50%</span>
                  <span>100%</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">{t('notes')}</label>
                <textarea
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  placeholder={t('add_notes_placeholder')}
                  rows={2}
                  className="w-full p-4 bg-gray-50 border rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold transition-all resize-none"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleApprove}
                  disabled={loading}
                  className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold transition-all active:scale-95 disabled:opacity-50"
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
