import { useState, useEffect, FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Trash2, Home, MapPin, X, Building, Edit2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { dbService } from '../services/db';
import { auth } from '../lib/firebase';
import type { Kuttab, UserProfile } from '../types';
import { useTranslation } from 'react-i18next';

interface KuttabManagementProps {
  profile: UserProfile | null;
}

export default function KuttabManagement({ profile }: KuttabManagementProps) {
  const { t } = useTranslation();
  const [kuttabs, setKuttabs] = useState<Kuttab[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingKuttab, setEditingKuttab] = useState<Kuttab | null>(null);
  const [newKuttab, setNewKuttab] = useState({ name: '', location: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const isAdmin = profile?.role === 'admin';

  useEffect(() => {
    fetchKuttabs();
  }, [profile]);

  const fetchKuttabs = async () => {
    if (!auth.currentUser || !profile) return;
    try {
      const data = isAdmin 
        ? await dbService.getAllKuttabs()
        : await dbService.getKuttabs(auth.currentUser.uid);
      setKuttabs(data);
    } catch (err) {
      console.error('Error fetching kuttabs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEdit = (kuttab: Kuttab) => {
    setEditingKuttab(kuttab);
    setNewKuttab({ name: kuttab.name, location: kuttab.location || '' });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingKuttab(null);
    setNewKuttab({ name: '', location: '' });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    
    // Check if name already exists (excluding current one if editing)
    if (kuttabs.some(k => k.name.toLowerCase() === newKuttab.name.toLowerCase() && k.id !== editingKuttab?.id)) {
      toast.error(t('kuttab_exists_error'));
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingKuttab) {
        await dbService.updateKuttab(editingKuttab.id, {
          name: newKuttab.name,
          location: newKuttab.location
        });
        toast.success(t('kuttab_updated_success'));
      } else {
        await dbService.addKuttab({
          name: newKuttab.name,
          location: newKuttab.location,
          teacherId: auth.currentUser.uid
        });
        toast.success(t('kuttab_added_success'));
      }
      handleCloseModal();
      fetchKuttabs();
    } catch (err) {
      console.error('Error saving kuttab:', err);
      toast.error(t('sync_failed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteKuttab = async (id: string) => {
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id);
      toast(t('click_again_to_confirm'), { icon: '🗑️' });
      setTimeout(() => setConfirmDeleteId(null), 3000);
      return;
    }

    try {
      await dbService.deleteKuttab(id);
      fetchKuttabs();
      toast.success(t('kuttab_removed'));
    } catch (err) {
      console.error('Error deleting kuttab:', err);
      toast.error(t('failed_to_remove_kuttab'));
    } finally {
      setConfirmDeleteId(null);
    }
  };

  return (
    <div className="p-4 sm:p-8 space-y-8 max-w-4xl mx-auto">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">{t('kuttabs_management')}</h2>
          <p className="text-gray-500 mt-1">{t('kuttabs_subtitle')}</p>
        </div>
        {isAdmin && (
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setIsModalOpen(true)}
            className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 shadow-lg shadow-emerald-200"
          >
            <Plus className="w-5 h-5" />
            {t('add_new_kuttab')}
          </motion.button>
        )}
      </header>

      <div className="bg-white border rounded-3xl shadow-sm overflow-hidden text-black">
        {loading ? (
          <div className="p-12 text-center text-gray-400 font-medium">{t('loading')}</div>
        ) : kuttabs.length === 0 ? (
          <div className="p-16 text-center space-y-4">
            <div className="w-16 h-16 bg-gray-50 text-gray-300 rounded-full flex items-center justify-center mx-auto">
              <Building className="w-8 h-8" />
            </div>
            <div className="text-gray-500 font-medium italic">{t('no_kuttabs_yet')}</div>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {kuttabs.map((kuttab, i) => (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                key={kuttab.id}
                className="group p-6 flex items-center justify-between hover:bg-emerald-50/30 transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white border border-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center shadow-sm">
                    <Home className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 text-lg">{kuttab.name}</h4>
                    {kuttab.location && (
                      <p className="text-sm text-gray-500 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {kuttab.location}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {(isAdmin || kuttab.teacherId === auth.currentUser?.uid) && (
                    <>
                      <button
                        onClick={() => handleOpenEdit(kuttab)}
                        className="p-2 text-gray-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg transition-all"
                        title={t('edit_kuttab')}
                      >
                        <Edit2 className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteKuttab(kuttab.id)}
                        className={`p-2 rounded-lg transition-all ${
                          confirmDeleteId === kuttab.id
                            ? 'bg-red-600 text-white shadow-lg animate-pulse scale-110'
                            : 'text-gray-400 hover:text-red-500 hover:bg-red-50'
                        }`}
                        title={t('delete')}
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Add Kuttab Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[32px] shadow-2xl w-full max-w-md overflow-y-auto max-h-[90vh] relative text-black"
            >
              <button 
                onClick={handleCloseModal}
                className="absolute top-6 right-6 p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-400"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="p-8">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mb-6">
                  <Building className="w-6 h-6" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  {editingKuttab ? t('edit_kuttab') : t('new_kuttab')}
                </h3>
                <p className="text-gray-500 mb-8">
                  {editingKuttab 
                    ? t('edit_kuttab_subtitle') 
                    : t('new_kuttab_subtitle')}
                </p>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 ml-1">{t('kuttab_name')}</label>
                    <input
                      required
                      type="text"
                      className="w-full p-4 bg-gray-50 border rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all placeholder:text-gray-300"
                      placeholder="e.g. Al-Fatah Quran Center"
                      value={newKuttab.name}
                      onChange={(e) => setNewKuttab({ ...newKuttab, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 ml-1">{t('location_optional')}</label>
                    <input
                      type="text"
                      className="w-full p-4 bg-gray-50 border rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all placeholder:text-gray-300"
                      placeholder="e.g. Casablanca, Morocco"
                      value={newKuttab.location}
                      onChange={(e) => setNewKuttab({ ...newKuttab, location: e.target.value })}
                    />
                  </div>
                  <button
                    disabled={isSubmitting}
                    type="submit"
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-2xl font-bold transition-all shadow-lg shadow-emerald-100 disabled:opacity-50"
                  >
                    {isSubmitting ? t('processing') : editingKuttab ? t('update_kuttab') : t('register_kuttab')}
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
