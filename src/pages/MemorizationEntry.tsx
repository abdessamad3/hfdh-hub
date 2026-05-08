import { useState, useEffect, FormEvent } from 'react';
import { Book, Save, Calendar, User, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'react-hot-toast';
import { dbService } from '../services/db';
import { getDayIndex } from '../lib/dateUtils';
import { auth } from '../lib/firebase';
import type { Student, UserProfile } from '../types';
import { useTranslation } from 'react-i18next';

const surahs = [
  "Al-Fatihah", "Al-Baqarah", "Aal-E-Imran", "An-Nisa", "Al-Ma'idah",
  "Al-An'am", "Al-A'raf", "Al-Anfal", "At-Tawbah", "Yunus", "Hud"
];

interface MemorizationEntryProps {
  profile: UserProfile | null;
}

export default function MemorizationEntry({ profile }: MemorizationEntryProps) {
  const { t } = useTranslation();
  const [students, setStudents] = useState<Student[]>([]);
  const [studentId, setStudentId] = useState('');
  const [surah, setSurah] = useState('');
  const [fromAyah, setFromAyah] = useState('');
  const [toAyah, setToAyah] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [kuttabs, setKuttabs] = useState<Record<string, any>>({});

  useEffect(() => {
    const fetchData = async () => {
      if (!auth.currentUser || !profile) return;
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
  }, [profile]);

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
      toast.error(t('no_session_warning') || 'You cannot add memorization on a non-session day.');
      return;
    }
    setLoading(true);
    try {
      await dbService.addMemorization({
        studentId,
        teacherId: auth.currentUser.uid,
        surahName: surah,
        fromAyah: parseInt(fromAyah),
        toAyah: parseInt(toAyah),
        date
      });
      alert('Memorization record saved!');
      setSurah('');
      setFromAyah('');
      setToAyah('');
    } catch (err) {
      console.error('Error saving memorization:', err);
      alert('Failed to save record.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white border rounded-3xl shadow-xl overflow-hidden"
      >
        <div className="bg-emerald-600 p-8 text-white">
          <Book className="w-12 h-12 mb-4 opacity-80" />
          <h2 className="text-3xl font-bold">New Memorization</h2>
          <p className="text-emerald-100 mt-2">Log a new session for a student</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6 text-black">
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
              <User className="w-4 h-4" />
              Select Student
            </label>
            <select 
              required
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              className="w-full p-4 bg-gray-50 border rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">Choose a student...</option>
              {students.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
              <Book className="w-4 h-4" />
              Surah Name
            </label>
            <select 
              required
              value={surah}
              onChange={(e) => setSurah(e.target.value)}
              className="w-full p-4 bg-gray-50 border rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">Select Surah...</option>
              {surahs.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">From Ayah</label>
              <input 
                type="number"
                required
                min="1"
                placeholder="1"
                value={fromAyah}
                onChange={(e) => setFromAyah(e.target.value)}
                className="w-full p-4 bg-gray-50 border rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">To Ayah</label>
              <input 
                type="number"
                required
                min="1"
                placeholder="10"
                value={toAyah}
                onChange={(e) => setToAyah(e.target.value)}
                className="w-full p-4 bg-gray-50 border rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Session Date
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
                {t('no_session') || 'No session scheduled'}
              </p>
            )}
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
                Submit Record
              </>
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
}

