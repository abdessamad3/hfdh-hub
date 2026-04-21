import { useState, useEffect, FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Trash2, Home, MapPin, X, Building } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { dbService } from '../services/db';
import { auth } from '../lib/firebase';
import type { Kuttab } from '../types';

export default function KuttabManagement() {
  const [kuttabs, setKuttabs] = useState<Kuttab[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newKuttab, setNewKuttab] = useState({ name: '', location: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchKuttabs();
  }, []);

  const fetchKuttabs = async () => {
    if (!auth.currentUser) return;
    try {
      const data = await dbService.getKuttabs(auth.currentUser.uid);
      setKuttabs(data);
    } catch (err) {
      console.error('Error fetching kuttabs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddKuttab = async (e: FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    
    // Check if name already exists
    if (kuttabs.some(k => k.name.toLowerCase() === newKuttab.name.toLowerCase())) {
      toast.error('A Kuttab with this name already exists.');
      return;
    }

    setIsSubmitting(true);
    try {
      await dbService.addKuttab({
        name: newKuttab.name,
        location: newKuttab.location,
        teacherId: auth.currentUser.uid
      });
      setIsModalOpen(false);
      setNewKuttab({ name: '', location: '' });
      fetchKuttabs();
      toast.success('Kuttab added successfully!');
    } catch (err) {
      console.error('Error adding kuttab:', err);
      toast.error('Failed to add kuttab.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteKuttab = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"?`)) return;
    try {
      await dbService.deleteKuttab(id);
      fetchKuttabs();
      toast.success('Kuttab removed.');
    } catch (err) {
      console.error('Error deleting kuttab:', err);
      toast.error('Failed to remove kuttab.');
    }
  };

  return (
    <div className="p-4 sm:p-8 space-y-8 max-w-4xl mx-auto">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Kuttabs Management</h2>
          <p className="text-gray-500 mt-1">Manage learning institutions for student classification</p>
        </div>
        <motion.button 
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setIsModalOpen(true)}
          className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 shadow-lg shadow-emerald-200"
        >
          <Plus className="w-5 h-5" />
          Add New Kuttab
        </motion.button>
      </header>

      <div className="bg-white border rounded-3xl shadow-sm overflow-hidden text-black">
        {loading ? (
          <div className="p-12 text-center text-gray-400 font-medium">Loading Kuttabs...</div>
        ) : kuttabs.length === 0 ? (
          <div className="p-16 text-center space-y-4">
            <div className="w-16 h-16 bg-gray-50 text-gray-300 rounded-full flex items-center justify-center mx-auto">
              <Building className="w-8 h-8" />
            </div>
            <div className="text-gray-500 font-medium italic">No Kuttabs added yet. Start by adding one!</div>
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
                <button
                  onClick={() => handleDeleteKuttab(kuttab.id, kuttab.name)}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
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
              className="bg-white rounded-[32px] shadow-2xl w-full max-w-md overflow-hidden relative text-black"
            >
              <button 
                onClick={() => setIsModalOpen(false)}
                className="absolute top-6 right-6 p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-400"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="p-8">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mb-6">
                  <Building className="w-6 h-6" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">New Kuttab</h3>
                <p className="text-gray-500 mb-8">Register a new learning institution to organize your students.</p>

                <form onSubmit={handleAddKuttab} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 ml-1">Kuttab Name</label>
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
                    <label className="text-sm font-bold text-gray-700 ml-1">Location (Optional)</label>
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
                    {isSubmitting ? 'Processing...' : 'Register Kuttab'}
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
