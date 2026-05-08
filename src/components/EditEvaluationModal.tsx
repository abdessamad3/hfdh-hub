import { useState, useEffect, FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Save, AlertCircle, MessageCircle, Calendar } from 'lucide-react';
import { dbService } from '../services/db';
import { getDayIndex } from '../lib/dateUtils';
import type { Evaluation } from '../types';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';

interface EditEvaluationModalProps {
  evaluation: Evaluation;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<Evaluation>) => Promise<void>;
}

export default function EditEvaluationModal({ evaluation, isOpen, onClose, onSave }: EditEvaluationModalProps) {
  const { t } = useTranslation();
  const [surahName, setSurahName] = useState(evaluation.surahName || '');
  const [hizbNumber, setHizbNumber] = useState((evaluation.hizbNumber ?? '').toString());
  // Map identifier or fall back to numerical mapping
  const getInitialQuantity = () => {
    if (evaluation.quantityIdentifier) return evaluation.quantityIdentifier;
    const q = evaluation.quantity ?? 1;
    if (q === 1) return 't1';
    if (q === 2) return 'r1';
    if (q === 4) return 'n1';
    if (q === 8) return 'h1';
    return 't1';
  };
  const [quantity, setQuantity] = useState(getInitialQuantity());
  const [fromAyah, setFromAyah] = useState((evaluation.fromAyah ?? 0).toString());
  const [toAyah, setToAyah] = useState((evaluation.toAyah ?? 0).toString());
  const [mistakes, setMistakes] = useState((evaluation.mistakesCount ?? 0).toString());
  const [accuracy, setAccuracy] = useState((evaluation.accuracyScore ?? 0).toString());
  const [notes, setNotes] = useState(evaluation.notes || '');
  const [date, setDate] = useState(evaluation.date);
  const [loading, setLoading] = useState(false);
  const [kuttab, setKuttab] = useState<any>(null);

  useEffect(() => {
    const fetchKuttab = async () => {
      try {
        const student = await dbService.getStudent(evaluation.studentId);
        const kName = student?.kuttabName?.trim().toLowerCase();
        if (kName) {
          const kuttabsData = await dbService.getAllKuttabs();
          const kData = kuttabsData.find(k => k.name.trim().toLowerCase() === kName);
          setKuttab(kData);
        }
      } catch (err) {
        console.error('Error fetching kuttab for session check:', err);
      }
    };
    fetchKuttab();
  }, [evaluation.studentId]);

  const isSessionDay = () => {
    const schedule = kuttab?.schedule?.lessons;
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
    if (!isValidSession) {
      toast.error(t('no_session_warning') || 'You cannot update an evaluation to a non-session day.');
      return;
    }
    setLoading(true);
    try {
      const hNumber = parseInt(hizbNumber) || 0;
      
      // Check for duplicates/overlaps
      const isDuplicate = await dbService.checkOverlappingEvaluation(
        evaluation.studentId,
        hNumber,
        quantity,
        evaluation.id
      );

      if (isDuplicate) {
        toast.error(t('thumun_already_evaluated'));
        setLoading(false);
        return;
      }

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

      const updateData: any = {
        surahName,
        hizbNumber: hNumber,
        quantity: qUnit,
        quantityIdentifier: quantity,
        mistakesCount: parseInt(mistakes) || 0,
        accuracyScore: parseInt(accuracy) || 0,
        notes,
        date
      };

      if (fromAyah) updateData.fromAyah = parseInt(fromAyah);
      if (toAyah) updateData.toAyah = parseInt(toAyah);

      await onSave(updateData);
      onClose();
    } catch (err) {
      console.error('Error updating evaluation:', err);
      alert(t('failed_to_update_evaluation'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="bg-white rounded-3xl w-full max-w-lg p-8 relative z-10 shadow-2xl overflow-y-auto max-h-[90vh] text-black"
          >
            <div className="absolute top-0 right-0 p-4 sticky z-20">
              <button onClick={onClose} className="p-2 bg-white/80 backdrop-blur-sm hover:bg-gray-100 rounded-full transition-colors shadow-sm text-gray-400">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="text-2xl font-black text-gray-900 tracking-tight">{t('edit_record_title')}</h3>
                <p className="text-gray-500 font-medium font-sans">{t('edit_record_subtitle')}</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6 text-black font-sans">
                <div className="space-y-4 pt-4 border-t">
                    <h3 className="font-bold text-gray-400 uppercase text-[10px] tracking-widest">{t('progress_details')}</h3>
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700">{t('surah_name_optional')}</label>
                        <input 
                            type="text"
                            value={surahName}
                            onChange={(e) => setSurahName(e.target.value)}
                            className="w-full p-4 bg-gray-50 border rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-700">{t('hizb')}</label>
                            <input 
                                type="number"
                                required
                                min="1"
                                max="60"
                                value={hizbNumber}
                                onChange={(e) => setHizbNumber(e.target.value)}
                                className="w-full p-4 bg-gray-50 border rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-700">{t('quantity')}</label>
                            <select 
                                required
                                value={quantity}
                                onChange={(e) => setQuantity(e.target.value)}
                                className="w-full p-4 bg-gray-50 border rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-black"
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
                            className="w-full p-4 bg-gray-50 border rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700">{t('to_ayah_optional')}</label>
                        <input 
                            type="number"
                            value={toAyah}
                            onChange={(e) => setToAyah(e.target.value)}
                            className="w-full p-4 bg-gray-50 border rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                        />
                    </div>
                    </div>
                </div>

                <div className="space-y-4 pt-4 border-t">
                    <h3 className="font-bold text-gray-400 uppercase text-[10px] tracking-widest">{t('performance_assessment')}</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 text-red-500" />
                                {t('mistakes')}
                            </label>
                            <input 
                                type="number"
                                required
                                min="0"
                                value={mistakes}
                                onChange={(e) => setMistakes(e.target.value)}
                                className="w-full p-4 bg-gray-50 border rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-700">{t('accuracy')} (%)</label>
                            <input 
                                type="number"
                                required
                                min="0"
                                max="100"
                                value={accuracy}
                                onChange={(e) => setAccuracy(e.target.value)}
                                className="w-full p-4 bg-gray-50 border rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                            />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700 flex items-center gap-2 text-black">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            {t('session_date')}
                        </label>
                        <input 
                            type="date"
                            required
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className={`w-full p-4 bg-gray-50 border rounded-2xl outline-none focus:ring-2 ${!isValidSession ? 'border-red-300 focus:ring-red-500' : 'focus:ring-emerald-500'} font-medium`}
                        />
                        {!isValidSession && (
                            <p className="text-xs font-bold text-red-500 mt-1 flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" />
                                {t('no_session')}
                            </p>
                        )}
                    </div>
                </div>

                <div className="space-y-2 pt-4 border-t">
                    <label className="text-sm font-bold text-gray-700 flex items-center gap-2 text-black">
                        <MessageCircle className="w-4 h-4 text-gray-400" />
                        {t('teacher_notes')}
                    </label>
                    <textarea 
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="w-full p-4 bg-gray-50 border rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 h-24 resize-none font-medium"
                    />
                </div>

                <button
                  type="submit"
                  disabled={loading || !isValidSession}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-100 disabled:opacity-50"
                >
                  {loading ? (
                    <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      {t('update_record')}
                    </>
                  )}
                </button>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
