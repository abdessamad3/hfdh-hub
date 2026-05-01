import { useState, FormEvent, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Save, User, Hash, Mail, Building } from 'lucide-react';
import { dbService } from '../services/db';
import { auth } from '../lib/firebase';
import type { Student, Kuttab, UserProfile } from '../types';
import { useTranslation } from 'react-i18next';

interface EditStudentModalProps {
  student: Student;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<Student>) => Promise<void>;
  profile: UserProfile | null;
}

export default function EditStudentModal({ student, isOpen, onClose, onSave, profile }: EditStudentModalProps) {
  const { t } = useTranslation();
  const [name, setName] = useState(student.name);
  const [age, setAge] = useState((student.age ?? '').toString());
  const [email, setEmail] = useState(student.email || '');
  const [kuttabName, setKuttabName] = useState(student.kuttabName || '');
  const [kuttabs, setKuttabs] = useState<Kuttab[]>([]);
  const [loading, setLoading] = useState(false);

  const isAdmin = profile?.role === 'admin';

  useEffect(() => {
    if (isOpen && auth.currentUser) {
      if (isAdmin) {
        dbService.getAllKuttabs().then(setKuttabs);
      } else {
        dbService.getKuttabs(auth.currentUser.uid).then(setKuttabs);
      }
    }
  }, [isOpen, isAdmin]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave({ 
        name, 
        age: parseInt(age), 
        email: email.toLowerCase(),
        kuttabName: isAdmin ? kuttabName : (student.kuttabName || profile?.kuttabName || '')
      });
      onClose();
    } catch (err) {
      console.error('Error updating student:', err);
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
            className="bg-white rounded-3xl w-full max-w-md p-8 relative z-10 shadow-2xl overflow-y-auto max-h-[90vh] text-black"
          >
            <div className="absolute top-0 right-0 p-4">
              <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-black">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="text-2xl font-black text-gray-900 tracking-tight">{t('edit_student_title')}</h3>
                <p className="text-gray-500 font-medium">{t('edit_student_subtitle')}</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                    <User className="w-4 h-4" />
                    {t('student_name')}
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full p-4 bg-gray-50 border rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 text-black font-medium"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 flex items-center gap-2 text-black">
                    <Hash className="w-4 h-4" />
                    {t('age')}
                  </label>
                  <input
                    type="number"
                    required
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    className="w-full p-4 bg-gray-50 border rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 text-black font-medium"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 flex items-center gap-2 text-black">
                    <Mail className="w-4 h-4" />
                    {t('student_email')}
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. student@example.com"
                    className="w-full p-4 bg-gray-50 border rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 text-black font-medium"
                  />
                  <p className="text-[10px] text-gray-400 font-bold px-1 uppercase tracking-wider">{t('required_for_portal')}</p>
                </div>

                {isAdmin && (
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 flex items-center gap-2 text-black">
                      <Building className="w-4 h-4" />
                      {t('assigned_kuttab')}
                    </label>
                    <select
                      value={kuttabName}
                      onChange={(e) => setKuttabName(e.target.value)}
                      className="w-full p-4 bg-gray-50 border rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 text-black font-medium"
                    >
                      <option value="">{t('none_independent')}</option>
                      {kuttabs.map(k => (
                        <option key={k.id} value={k.name}>{k.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-100 disabled:opacity-50 mt-4"
                >
                  {loading ? (
                    <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      {t('save_changes')}
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
