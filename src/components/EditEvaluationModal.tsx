import { useState, FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Save, BookOpen, AlertCircle, MessageCircle, Calendar } from 'lucide-react';
import type { Evaluation } from '../types';

interface EditEvaluationModalProps {
  evaluation: Evaluation;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<Evaluation>) => Promise<void>;
}

export default function EditEvaluationModal({ evaluation, isOpen, onClose, onSave }: EditEvaluationModalProps) {
  const [surahName, setSurahName] = useState(evaluation.surahName || '');
  const [hizbNumber, setHizbNumber] = useState((evaluation.hizbNumber ?? '').toString());
  const [quantity, setQuantity] = useState((evaluation.quantity ?? 1).toString());
  const [fromAyah, setFromAyah] = useState((evaluation.fromAyah ?? 0).toString());
  const [toAyah, setToAyah] = useState((evaluation.toAyah ?? 0).toString());
  const [mistakes, setMistakes] = useState((evaluation.mistakesCount ?? 0).toString());
  const [accuracy, setAccuracy] = useState((evaluation.accuracyScore ?? 0).toString());
  const [notes, setNotes] = useState(evaluation.notes || '');
  const [date, setDate] = useState(evaluation.date);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave({
        surahName,
        hizbNumber: parseInt(hizbNumber) || 0,
        quantity: parseInt(quantity) || 0,
        fromAyah: parseInt(fromAyah) || 0,
        toAyah: parseInt(toAyah) || 0,
        mistakesCount: parseInt(mistakes) || 0,
        accuracyScore: parseInt(accuracy) || 0,
        notes,
        date
      });
      onClose();
    } catch (err) {
      console.error('Error updating evaluation:', err);
      alert('Failed to update evaluation.');
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
            className="bg-white rounded-3xl w-full max-w-lg p-8 relative z-10 shadow-2xl overflow-y-auto max-h-[90vh]"
          >
            <div className="absolute top-0 right-0 p-4 sticky z-20">
              <button onClick={onClose} className="p-2 bg-white/80 backdrop-blur-sm hover:bg-gray-100 rounded-full transition-colors shadow-sm">
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="text-2xl font-black text-gray-900 tracking-tight">Edit Record</h3>
                <p className="text-gray-500 font-medium font-sans">Correct memorization or assessment details</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6 text-black font-sans">
                <div className="space-y-4 pt-4 border-t">
                    <h3 className="font-bold text-gray-400 uppercase text-[10px] tracking-widest">Progress Details</h3>
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700">Surah Name</label>
                        <input 
                            type="text"
                            required
                            value={surahName}
                            onChange={(e) => setSurahName(e.target.value)}
                            className="w-full p-4 bg-gray-50 border rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-700">Hizb</label>
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
                            <label className="text-sm font-bold text-gray-700">Quantity</label>
                            <select 
                                required
                                value={quantity}
                                onChange={(e) => setQuantity(e.target.value)}
                                className="w-full p-4 bg-gray-50 border rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                            >
                                <option value="1">1/8 (Thamin)</option>
                                <option value="2">2/8 (Rubu')</option>
                                <option value="4">4/8 (Nisf)</option>
                                <option value="6">6/8 (Thalatha Rubu')</option>
                                <option value="8">8/8 (Full Hizb)</option>
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-700">From Ayah</label>
                            <input 
                                type="number"
                                required
                                min="1"
                                value={fromAyah}
                                onChange={(e) => setFromAyah(e.target.value)}
                                className="w-full p-4 bg-gray-50 border rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-700">To Ayah</label>
                            <input 
                                type="number"
                                required
                                min="1"
                                value={toAyah}
                                onChange={(e) => setToAyah(e.target.value)}
                                className="w-full p-4 bg-gray-50 border rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                            />
                        </div>
                    </div>
                </div>

                <div className="space-y-4 pt-4 border-t">
                    <h3 className="font-bold text-gray-400 uppercase text-[10px] tracking-widest">Assessment</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 text-red-500" />
                                Mistakes
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
                            <label className="text-sm font-bold text-gray-700">Accuracy (%)</label>
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
                        <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            Date
                        </label>
                        <input 
                            type="date"
                            required
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="w-full p-4 bg-gray-50 border rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                        />
                    </div>
                </div>

                <div className="space-y-2 pt-4 border-t">
                    <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                        <MessageCircle className="w-4 h-4 text-gray-400" />
                        Notes
                    </label>
                    <textarea 
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="w-full p-4 bg-gray-50 border rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 h-24 resize-none font-medium"
                    />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-100 disabled:opacity-50"
                >
                  {loading ? (
                    <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      Update Record
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
