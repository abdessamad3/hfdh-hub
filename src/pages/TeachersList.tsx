import { useState, useEffect, useMemo, FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Plus, Search, User, Mail, Shield, Trash2, Edit2, X, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'react-hot-toast';
import { dbService } from '../services/db';
import { UserProfile, UserRole, Kuttab } from '../types';
import { useTranslation } from 'react-i18next';

interface TeachersListProps {
  profile: UserProfile | null;
}

export default function TeachersList({ profile }: TeachersListProps) {
  const { t } = useTranslation();
  const [teachers, setTeachers] = useState<UserProfile[]>([]);
  const [kuttabs, setKuttabs] = useState<Kuttab[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<UserProfile | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [form, setForm] = useState({
    email: '',
    displayName: '',
    role: 'teacher' as UserRole,
    kuttabName: ''
  });

  const [editForm, setEditForm] = useState({
    displayName: '',
    role: 'teacher' as UserRole,
    kuttabName: ''
  });

  const isAdmin = profile?.role === 'admin';

  useEffect(() => {
    fetchTeachers();
  }, [profile]);

  const fetchTeachers = async () => {
    if (!profile) return;
    try {
      const isAdmin = profile.role === 'admin';
      const [teacherData, kuttabData] = await Promise.all([
        dbService.getTeachers(isAdmin ? undefined : profile.kuttabName),
        isAdmin ? dbService.getAllKuttabs() : Promise.resolve([])
      ]);
      setTeachers(teacherData);
      setKuttabs(kuttabData);
    } catch (err) {
      console.error('Error fetching teachers:', err);
      toast.error(t('load_failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleAddTeacher = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await dbService.addTeacher({
        email: form.email.toLowerCase(),
        displayName: form.displayName,
        role: form.role,
        kuttabName: form.kuttabName
      });
      toast.success(t('teacher_created'));
      setIsModalOpen(false);
      setForm({ email: '', displayName: '', role: 'teacher', kuttabName: '' });
      fetchTeachers();
    } catch (err: any) {
      console.error('Error adding teacher:', err);
      toast.error(err.message || t('add_teacher_failed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditTeacher = (teacher: UserProfile) => {
    setSelectedTeacher(teacher);
    setEditForm({
      displayName: teacher.displayName || '',
      role: teacher.role,
      kuttabName: teacher.kuttabName || ''
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateTeacher = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedTeacher) return;
    setIsSubmitting(true);
    try {
      await dbService.updateTeacher(selectedTeacher.uid, {
        displayName: editForm.displayName,
        role: editForm.role,
        kuttabName: editForm.kuttabName
      });
      toast.success(t('teacher_updated'));
      setIsEditModalOpen(false);
      fetchTeachers();
    } catch (err) {
      console.error('Error updating teacher:', err);
      toast.error(t('teacher_update_failed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTeacher = async (uid: string) => {
    if (confirmDeleteId !== uid) {
      setConfirmDeleteId(uid);
      toast(t('click_again_to_confirm'), { icon: '🗑️' });
      setTimeout(() => setConfirmDeleteId(null), 3000);
      return;
    }

    try {
      await dbService.deleteTeacher(uid);
      toast.success(t('teacher_deleted'));
      fetchTeachers();
    } catch (err) {
      console.error('Error deleting teacher:', err);
      toast.error(t('delete_teacher_failed'));
    } finally {
      setConfirmDeleteId(null);
    }
  };

  const filteredTeachers = useMemo(() => {
    return teachers.filter(t => 
      t.displayName?.toLowerCase().includes(search.toLowerCase()) || 
      t.email?.toLowerCase().includes(search.toLowerCase())
    );
  }, [teachers, search]);

  return (
    <div className="p-4 sm:p-8 space-y-8 text-black">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">{t('teachers_management')}</h2>
          <p className="text-gray-500 mt-1">{t('teachers_subtitle')}</p>
        </div>
        {isAdmin && (
          <button 
            onClick={() => setIsModalOpen(true)}
            className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-200"
          >
            <Plus className="w-5 h-5" />
            {t('add_new_teacher')}
          </button>
        )}
      </header>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          type="text"
          placeholder={t('search_teacher_placeholder')}
          className="w-full pl-12 pr-4 py-4 bg-white border rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all shadow-sm"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="bg-white border border-gray-100 rounded-3xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-gray-500 animate-pulse font-medium">{t('loading_teachers')}</div>
        ) : filteredTeachers.length === 0 ? (
          <div className="p-12 text-center text-gray-500 font-medium italic">{t('no_teachers_found')}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 text-[10px] font-black uppercase text-gray-400 tracking-widest border-b">
                  <th className="px-8 py-4">{t('teacher')}</th>
                  <th className="px-8 py-4">{t('role')}</th>
                  <th className="px-8 py-4">{t('responsible_of')}</th>
                  <th className="px-8 py-4 text-right">{t('actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredTeachers.map((teacher, i) => (
                  <motion.tr
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    key={teacher.uid}
                    className="group hover:bg-emerald-50/50 transition-colors"
                  >
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center font-bold">
                          {teacher.displayName?.charAt(0) || <User className="w-5 h-5" />}
                        </div>
                        <div>
                          <Link 
                            to={`/teachers/${teacher.uid}`}
                            className="font-bold text-gray-900 leading-none mb-1 hover:text-emerald-600 transition-colors block"
                          >
                            {teacher.displayName || t('unnamed_teacher')}
                          </Link>
                          <p className="text-xs text-gray-500 flex items-center gap-1.5">
                            <Mail className="w-3 h-3" />
                            {teacher.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                        teacher.role === 'admin' 
                          ? 'bg-purple-100 text-purple-700' 
                          : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {t(`role_${teacher.role}`)}
                      </span>
                    </td>
                    <td className="px-8 py-5">
                      {teacher.kuttabName ? (
                        <div className="flex items-center gap-2 text-gray-700">
                          <Shield className="w-3 h-3 text-emerald-500" />
                          <span className="text-xs font-bold">{teacher.kuttabName}</span>
                        </div>
                      ) : (
                        <span className="text-gray-300 text-[10px] italic">{t('not_assigned')}</span>
                      )}
                    </td>
                    <td className="px-8 py-5 text-right">
                      {(isAdmin || teacher.uid === profile?.uid) && (
                        <div className="flex items-center justify-end gap-2 text-gray-400">
                          <button 
                            onClick={() => handleEditTeacher(teacher)}
                            className="p-2 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                            title={t('edit_details')}
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {isAdmin && (
                            <button 
                              onClick={() => handleDeleteTeacher(teacher.uid)}
                              className={`p-2 rounded-xl transition-all ${
                                confirmDeleteId === teacher.uid 
                                  ? 'bg-red-600 text-white shadow-lg animate-pulse scale-110' 
                                  : 'hover:text-red-600 hover:bg-red-50'
                              }`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Teacher Modal */}
      <AnimatePresence>
        {isEditModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-y-auto max-h-[90vh] relative"
            >
              <button 
                onClick={() => setIsEditModalOpen(false)}
                className="absolute top-8 right-8 p-2 hover:bg-gray-100 rounded-2xl transition-colors text-gray-400"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="p-10">
                <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-[1.25rem] flex items-center justify-center mb-8 shadow-inner">
                  <Edit2 className="w-8 h-8" />
                </div>
                <h3 className="text-3xl font-black text-gray-900 tracking-tight mb-2">{t('edit_teacher')}</h3>
                <p className="text-gray-500 font-medium mb-10">{t('updating_teacher', { email: selectedTeacher?.email })}</p>

                <form onSubmit={handleUpdateTeacher} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">{t('full_name')}</label>
                    <input
                      required
                      type="text"
                      className="w-full p-5 bg-gray-50 border rounded-3xl focus:ring-2 focus:ring-emerald-500 outline-none font-medium transition-all"
                      value={editForm.displayName}
                      onChange={(e) => setEditForm({ ...editForm, displayName: e.target.value })}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">{t('role')}</label>
                    <select
                      className="w-full p-5 bg-gray-50 border rounded-3xl focus:ring-2 focus:ring-emerald-500 outline-none font-black text-sm uppercase tracking-widest transition-all"
                      value={editForm.role}
                      onChange={(e) => setEditForm({ ...editForm, role: e.target.value as UserRole })}
                    >
                      <option value="teacher">{t('role_teacher')}</option>
                      <option value="admin">{t('role_admin')}</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">{t('assigned_kuttab_responsible')}</label>
                    <select
                      className="w-full p-5 bg-gray-50 border rounded-3xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-sm transition-all"
                      value={editForm.kuttabName}
                      onChange={(e) => setEditForm({ ...editForm, kuttabName: e.target.value })}
                    >
                      <option value="">{t('no_assigned_kuttab')}</option>
                      {kuttabs.map(k => (
                        <option key={k.id} value={k.name}>{k.name}</option>
                      ))}
                    </select>
                    <p className="text-[10px] text-gray-400 font-medium px-2 italic">{t('teacher_kuttab_hint')}</p>
                  </div>

                  <button
                    disabled={isSubmitting}
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-5 rounded-3xl font-black transition-all shadow-xl shadow-blue-100 disabled:opacity-50 text-sm uppercase tracking-widest mt-4"
                  >
                    {isSubmitting ? t('saving') : t('update_details')}
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Teacher Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-y-auto max-h-[90vh] relative"
            >
              <button 
                onClick={() => setIsModalOpen(false)}
                className="absolute top-8 right-8 p-2 hover:bg-gray-100 rounded-2xl transition-colors text-gray-400"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="p-10">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-[1.25rem] flex items-center justify-center mb-8 shadow-inner">
                  <Plus className="w-8 h-8" />
                </div>
                <h3 className="text-3xl font-black text-gray-900 tracking-tight mb-2">{t('add_new_teacher')}</h3>
                <p className="text-gray-500 font-medium mb-10">{t('pre_register_teacher')}</p>

                <form onSubmit={handleAddTeacher} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">{t('full_name')}</label>
                    <input
                      required
                      type="text"
                      className="w-full p-5 bg-gray-50 border rounded-3xl focus:ring-2 focus:ring-emerald-500 outline-none font-medium transition-all"
                      placeholder="e.g. Sheikh Omar"
                      value={form.displayName}
                      onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">{t('google_email')}</label>
                    <input
                      required
                      type="email"
                      className="w-full p-5 bg-gray-50 border rounded-3xl focus:ring-2 focus:ring-emerald-500 outline-none font-medium transition-all"
                      placeholder="omar@example.com"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                    />
                    <p className="text-[10px] text-gray-400 font-medium flex items-center gap-1.5 px-1 bg-gray-50/50 py-2 rounded-lg border border-dashed border-gray-100">
                      <AlertCircle className="w-3 h-3" />
                      {t('email_match_hint')}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">{t('role')}</label>
                    <select
                      className="w-full p-5 bg-gray-50 border rounded-3xl focus:ring-2 focus:ring-emerald-500 outline-none font-black text-sm uppercase tracking-widest transition-all"
                      value={form.role}
                      onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}
                    >
                      <option value="teacher">{t('role_teacher')}</option>
                      <option value="admin">{t('role_admin')}</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">{t('assigned_kuttab')}</label>
                    <select
                      className="w-full p-5 bg-gray-50 border rounded-3xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-sm transition-all"
                      value={form.kuttabName}
                      onChange={(e) => setForm({ ...form, kuttabName: e.target.value })}
                    >
                      <option value="">{t('independent_teacher')}</option>
                      {kuttabs.map(k => (
                        <option key={k.id} value={k.name}>{k.name}</option>
                      ))}
                    </select>
                  </div>

                  <button
                    disabled={isSubmitting}
                    type="submit"
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-5 rounded-3xl font-black transition-all shadow-xl shadow-emerald-100 disabled:opacity-50 text-sm uppercase tracking-widest mt-4"
                  >
                    {isSubmitting ? t('registering') : t('add_new_teacher')}
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
