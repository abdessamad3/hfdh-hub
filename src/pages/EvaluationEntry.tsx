import { useState, useEffect, FormEvent } from 'react';
import { Award, Save, Calendar, User, MessageCircle, AlertCircle, BookOpen } from 'lucide-react';
import { motion } from 'motion/react';
import { dbService } from '../services/db';
import { auth } from '../lib/firebase';
import type { Student } from '../types';

export default function EvaluationEntry() {
  const [students, setStudents] = useState<Student[]>([]);
  const [studentId, setStudentId] = useState('');
  const [surahName, setSurahName] = useState('');
  const [hizbNumber, setHizbNumber] = useState('');
  const [quantity, setQuantity] = useState('1'); // 1/8 units
  const [fromAyah, setFromAyah] = useState('');
  const [toAyah, setToAyah] = useState('');
  const [mistakes, setMistakes] = useState('0');
  const [accuracy, setAccuracy] = useState('100');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchStudents = async () => {
      if (!auth.currentUser) return;
      try {
        const data = await dbService.getStudents(auth.currentUser.uid);
        setStudents(data);
      } catch (err) {
        console.error('Error fetching students:', err);
      }
    };
    fetchStudents();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    setLoading(true);
    try {
      await dbService.addEvaluation({
        studentId,
        teacherId: auth.currentUser.uid,
        date,
        surahName,
        hizbNumber: parseInt(hizbNumber) || 0,
        quantity: parseInt(quantity) || 0,
        fromAyah: parseInt(fromAyah) || 0,
        toAyah: parseInt(toAyah) || 0,
        mistakesCount: parseInt(mistakes),
        accuracyScore: parseInt(accuracy),
        notes,
      });
      alert('Unified evaluation records saved!');
      setSurahName('');
      setHizbNumber('');
      setQuantity('1');
      setFromAyah('');
      setToAyah('');
      setMistakes('0');
      setAccuracy('100');
      setNotes('');
    } catch (err) {
      console.error('Error saving evaluation:', err);
      alert('Failed to save evaluation.');
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
          <div className="flex gap-4 items-center mb-4">
            <BookOpen className="w-8 h-8 opacity-80" />
            <Award className="w-8 h-8 opacity-80" />
          </div>
          <h2 className="text-3xl font-bold">Memorization & Evaluation</h2>
          <p className="text-emerald-100 mt-2">Log surah progress and assess performance in one step</p>
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

          <div className="space-y-4 pt-4 border-t">
            <h3 className="font-bold text-gray-400 uppercase text-xs tracking-widest">Progress Details</h3>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Surah Name</label>
              <input 
                type="text"
                required
                placeholder="e.g. Al-Baqarah"
                value={surahName}
                onChange={(e) => setSurahName(e.target.value)}
                className="w-full p-4 bg-gray-50 border rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Hizb Number</label>
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
                <label className="text-sm font-bold text-gray-700">Quantity</label>
                <select 
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full p-4 bg-gray-50 border rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="1">1/8 (Thamin)</option>
                  <option value="2">2/8 (Rubu')</option>
                  <option value="3">3/8 (thalatha athman)</option>
                  <option value="4">4/8 (Nisf)</option>
                  <option value="3">/8 (khamsat athman)</option>
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
                  className="w-full p-4 bg-gray-50 border rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500"
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
                  className="w-full p-4 bg-gray-50 border rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t">
            <h3 className="font-bold text-gray-400 uppercase text-xs tracking-widest">Performance Assessment</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  Mistakes Count
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
                <label className="text-sm font-bold text-gray-700">Accuracy Score (%)</label>
                <input 
                  type="number"
                  required
                  min="0"
                  max="100"
                  value={accuracy}
                  onChange={(e) => setAccuracy(e.target.value)}
                  className="w-full p-4 bg-gray-50 border rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
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
                className="w-full p-4 bg-gray-50 border rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
              <MessageCircle className="w-4 h-4" />
              Teacher Notes
            </label>
            <textarea 
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Good progress, watch out for Tajweed on Surah..."
              className="w-full p-4 bg-gray-50 border rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 h-32 resize-none"
            />
          </div>

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
                Save Combined Record
              </>
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
