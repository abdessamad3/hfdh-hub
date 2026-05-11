import { useState, useEffect, FormEvent } from 'react';
import { Award, Save, Calendar, User, MessageCircle, AlertCircle, BookOpen, Trash2, Edit2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'react-hot-toast';
import { dbService } from '../services/db';
import { getDayIndex } from '../lib/dateUtils';
import { auth } from '../lib/firebase';
import type { Student, Evaluation, UserProfile } from '../types';
import { useTranslation } from 'react-i18next';
import { formatDate } from '../lib/dateUtils';

interface EvaluationEntryProps {
  profile: UserProfile | null;
}

export default function EvaluationEntry({ profile }: EvaluationEntryProps) {
  const { t } = useTranslation();
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
  const [students, setStudents] = useState<Student[]>([]);
  const [studentId, setStudentId] = useState('');
  const [surahName, setSurahName] = useState('');
  const [hizbNumber, setHizbNumber] = useState('');
  const [quantity, setQuantity] = useState('t1'); // distinct units
  const [fromAyah, setFromAyah] = useState('');
  const [toAyah, setToAyah] = useState('');
  const [mistakes, setMistakes] = useState('0');
  const [accuracy, setAccuracy] = useState('100');

  useEffect(() => {
    const mistakesCount = parseInt(mistakes) || 0;
    const calculatedAccuracy = Math.max(0, 100 - (mistakesCount * 25));
    setAccuracy(calculatedAccuracy.toString());
  }, [mistakes]);

  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [recentEvals, setRecentEvals] = useState<Evaluation[]>([]);
  const [editingEval, setEditingEval] = useState<Evaluation | null>(null);
  const [kuttabs, setKuttabs] = useState<Record<string, any>>({});

  useEffect(() => {
    if (!auth.currentUser || !profile) return;
    
    const fetchData = async () => {
      try {
        const isAdmin = profile.role === 'admin';
        const [studentsData, kuttabsData] = await Promise.all([
          isAdmin 
            ? dbService.getAllStudents()
            : dbService.getStudents(auth.currentUser.uid, profile.kuttabName),
          dbService.getAllKuttabs()
        ]);
        setStudents(studentsData);
        setKuttabs(Object.fromEntries(kuttabsData.map(k => [k.name.trim().toLowerCase(), k])));
      } catch (err) {
        console.error('Error fetching data:', err);
      }
    };

    fetchData();
    
    const isAdmin = profile.role === 'admin';
    const unsubscribe = dbService.subscribeWeeklyEvaluations(
      auth.currentUser.uid,
      profile.kuttabName,
      isAdmin,
      (data) => {
        setRecentEvals(data.slice(0, 5));
      }
    );

    return () => unsubscribe();
  }, [auth.currentUser, profile]);

  const resetForm = () => {
    setEditingEval(null);
    setStudentId('');
    setSurahName('');
    setHizbNumber('');
    setQuantity('t1');
    setFromAyah('');
    setToAyah('');
    setMistakes('0');
    setAccuracy('100');
    setNotes('');
  };

  const handleEdit = (ev: Evaluation) => {
    setEditingEval(ev);
    setStudentId(ev.studentId);
    setSurahName(ev.surahName || '');
    setHizbNumber(ev.hizbNumber.toString());
    
    // Map quantity identifier or fallback to default mapping
    if (ev.quantityIdentifier) {
      setQuantity(ev.quantityIdentifier);
    } else {
      if (ev.quantity === 1) setQuantity('t1');
      else if (ev.quantity === 2) setQuantity('r1');
      else if (ev.quantity === 4) setQuantity('n1');
      else if (ev.quantity === 8) setQuantity('h1');
    }
    
    setFromAyah(ev.fromAyah?.toString() || '');
    setToAyah(ev.toAyah?.toString() || '');
    setMistakes(ev.mistakesCount.toString());
    setAccuracy(ev.accuracyScore.toString());
    setNotes(ev.notes);
    setDate(ev.date);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleDelete = async (id: string, sId: string) => {
    if (!auth.currentUser) return;
    
    if (deleteConfirmId !== id) {
      setDeleteConfirmId(id);
      toast(t('click_again_to_confirm'), { icon: '🗑️' });
      setTimeout(() => setDeleteConfirmId(null), 3000);
      return;
    }

    try {
      await dbService.deleteEvaluation(id, sId, auth.currentUser.uid);
      toast.success(t('evaluation_deleted'));
      setDeleteConfirmId(null);
    } catch (err) {
      console.error('Error deleting evaluation:', err);
      toast.error(t('failed_to_delete_evaluation'));
    }
  };

  const isSessionDay = () => {
    const student = students.find(s => s.id === studentId);
    const kName = student?.kuttabName?.trim().toLowerCase();
    if (!kName || !kuttabs[kName]) return false;
    const kuttab = kuttabs[kName];
    const schedule = kuttab.schedule?.lessons;
    if (!schedule) return false;

    if (schedule[date]) {
      return schedule[date].lessons.length > 0;
    }

    const dayIdx = getDayIndex(date);
    const recurring = schedule[dayIdx.toString()];
    return recurring && recurring.type === 'recurring' && recurring.lessons.length > 0;
  };

  const isValidSession = isSessionDay();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    if (!isValidSession) {
      toast.error(t('no_session_warning') || 'You cannot add an evaluation on a non-session day.');
      return;
    }
    setLoading(true);
    try {
      const hNumber = parseInt(hizbNumber) || 0;
      
      // Map selection string to numerical units
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

      // Check for duplicates/overlaps
      const isDuplicate = await dbService.checkOverlappingEvaluation(
        studentId,
        hNumber,
        quantity,
        editingEval?.id
      );

      if (isDuplicate) {
        toast.error(t('thumun_already_evaluated'));
        setLoading(false);
        return;
      }

      if (editingEval) {
        await dbService.updateEvaluation(editingEval.id, {
          studentId,
          date,
          hizbNumber: hNumber,
          quantity: qUnit,
          quantityIdentifier: quantity,
          mistakesCount: parseInt(mistakes),
          accuracyScore: parseInt(accuracy),
          notes,
          surahName: surahName || undefined,
          fromAyah: fromAyah ? parseInt(fromAyah) : undefined,
          toAyah: toAyah ? parseInt(toAyah) : undefined,
        }, studentId, auth.currentUser.uid);
        toast.success(t('evaluation_updated'));
      } else {
        const evalData: any = {
          studentId,
          teacherId: auth.currentUser.uid,
          date,
          hizbNumber: hNumber,
          quantity: qUnit,
          quantityIdentifier: quantity,
          mistakesCount: parseInt(mistakes),
          accuracyScore: parseInt(accuracy),
          notes,
        };

        if (surahName) evalData.surahName = surahName;
        if (fromAyah) evalData.fromAyah = parseInt(fromAyah);
        if (toAyah) evalData.toAyah = parseInt(toAyah);

        await dbService.addEvaluation(evalData);
        toast.success(t('evaluation_saved'));
      }

      resetForm();
    } catch (err) {
      console.error('Error saving evaluation:', err);
      toast.error(t('sync_failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white border rounded-3xl shadow-xl overflow-hidden"
      >
        <div className="bg-emerald-600 p-8 text-white relative">
          <div className="flex gap-4 items-center mb-4">
            <BookOpen className="w-8 h-8 opacity-80" />
            <Award className="w-8 h-8 opacity-80" />
          </div>
          <h2 className="text-3xl font-bold">{editingEval ? t('edit') : t('memorization_evaluation')}</h2>
          <p className="text-emerald-100 mt-2">{t('eval_subtitle')}</p>
          
          {editingEval && (
            <button 
              onClick={resetForm}
              className="absolute top-8 right-8 bg-white/20 hover:bg-white/30 p-2 rounded-xl transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6 text-black">
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
              <User className="w-4 h-4" />
              {t('select_student')}
            </label>
            <select 
              required
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              className="w-full p-4 bg-gray-50 border rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">{t('choose_student')}</option>
              {students.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-4 pt-4 border-t">
            <h3 className="font-bold text-gray-400 uppercase text-xs tracking-widest">{t('progress_details')}</h3>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">{t('surah_name_optional')}</label>
              <input 
                type="text"
                placeholder={t('surah_placeholder') || "e.g. Al-Baqarah"}
                value={surahName}
                onChange={(e) => setSurahName(e.target.value)}
                className="w-full p-4 bg-gray-50 border rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">{t('hizb_number')}</label>
                <input 
                  type="number"
                  required
                  min="1"
                  max="60"
                  placeholder="1-60"
                  value={hizbNumber}
                  onChange={(e) => setHizbNumber(e.target.value)}
                  className="w-full p-4 bg-gray-50 border rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">{t('quantity')}</label>
                <select 
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full p-4 bg-gray-50 border rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="t1">{t('thumun_1')}</option>
                  <option value="t2">{t('thumun_2')}</option>
                  <option value="t3">{t('thumun_3')}</option>
                  <option value="t4">{t('thumun_4')}</option>
                  <option value="t5">{t('thumun_5')}</option>
                  <option value="t6">{t('thumun_6')}</option>
                  <option value="t7">{t('thumun_7')}</option>
                  <option value="t8">{t('thumun_8')}</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">{t('from_ayah_optional')}</label>
                <input 
                  type="number"
                  value={fromAyah}
                  onChange={(e) => setFromAyah(e.target.value)}
                  className="w-full p-4 bg-gray-50 border rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">{t('to_ayah_optional')}</label>
                <input 
                  type="number"
                  value={toAyah}
                  onChange={(e) => setToAyah(e.target.value)}
                  className="w-full p-4 bg-gray-50 border rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t">
            <h3 className="font-bold text-gray-400 uppercase text-xs tracking-widest">{t('performance_assessment')}</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  {t('mistakes_count')}
                </label>
                <input 
                  type="number"
                  required
                  min="0"
                  value={mistakes}
                  onChange={(e) => setMistakes(e.target.value)}
                  className="w-full p-4 bg-gray-50 border rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">{t('accuracy_score')}</label>
                <input 
                  type="number"
                  required
                  readOnly
                  min="0"
                  max="100"
                  value={accuracy}
                  className="w-full p-4 bg-gray-100 border rounded-2xl outline-none cursor-not-allowed opacity-70"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {t('session_date')}
              </label>
              <input 
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={`w-full p-4 bg-gray-50 border rounded-2xl outline-none focus:ring-2 ${!isValidSession ? 'border-red-300 focus:ring-red-500' : 'focus:ring-emerald-500'}`}
              />
              {!isValidSession && studentId && (
                <p className="text-xs font-bold text-red-500 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {t('no_session')}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
              <MessageCircle className="w-4 h-4" />
              {t('teacher_notes')}
            </label>
            <textarea 
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('notes_placeholder') || "Good progress, watch out for Tajweed on Surah..."}
              className="w-full p-4 bg-gray-50 border rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 h-32 resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !isValidSession}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-100 disabled:opacity-50 mt-4"
          >
            {loading ? (
              <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Save className="w-5 h-5" />
                {t('save_combined_record')}
              </>
            )}
          </button>
        </form>
      </motion.div>

      {recentEvals.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-white border rounded-3xl shadow-lg p-8"
        >
          <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-emerald-600" />
            {t('recent_evaluations')}
          </h3>
          <div className="space-y-4">
            {recentEvals.map((ev) => {
              const student = students.find(s => s.id === ev.studentId);
              return (
                <div key={ev.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-gray-50 rounded-2xl hover:bg-emerald-50 transition-colors border border-transparent hover:border-emerald-100 gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center font-bold text-emerald-600 border shadow-sm">
                      {student?.name?.charAt(0) || <User className="w-4 h-4" />}
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">{student?.name || t('student')}</p>
                      <p className="text-xs text-gray-500">
                        {t('hizb')} {ev.hizbNumber}, {getPortionLabel(ev.quantity || 0, ev.quantityIdentifier)} • {formatDate(ev.date)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEdit(ev)}
                      className="p-2 text-gray-500 hover:text-emerald-600 hover:bg-white rounded-xl transition-all shadow-sm"
                      title={t('edit')}
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(ev.id, ev.studentId)}
                      className={`p-2 rounded-xl transition-all shadow-sm ${
                        deleteConfirmId === ev.id 
                          ? 'bg-red-600 text-white animate-pulse' 
                          : 'text-gray-500 hover:text-red-600 hover:bg-white'
                      }`}
                      title={deleteConfirmId === ev.id ? t('click_again_to_confirm') : t('delete')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}
    </div>
  );
}
