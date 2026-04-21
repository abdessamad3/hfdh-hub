import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Award, TrendingUp, Medal, Star, CheckCircle } from 'lucide-react';
import { dbService } from '../services/db';
import { auth } from '../lib/firebase';
import type { Student } from '../types';

export default function RankingPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRankings = async () => {
      if (!auth.currentUser) return;
      try {
        const data = await dbService.getStudents(auth.currentUser.uid);
        const sorted = data.sort((a, b) => (b.stats?.totalScore || 0) - (a.stats?.totalScore || 0));
        setStudents(sorted);
      } catch (err) {
        console.error('Error fetching rankings:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchRankings();
  }, []);

  return (
    <div className="p-8 space-y-8 max-w-5xl mx-auto">
      <header className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 rounded-full text-sm font-bold border border-amber-100 mb-4">
          <Star className="w-4 h-4 fill-amber-700" />
          Top Performers
        </div>
        <h2 className="text-4xl font-black text-gray-900">Student Leaderboard</h2>
        <p className="text-gray-500 max-w-lg mx-auto font-medium">
          Celebrating excellence in memorization, attendance, and accuracy.
        </p>
      </header>

      <div className="bg-white border rounded-[40px] shadow-2xl shadow-emerald-100/50 overflow-hidden text-black">
        <div className="p-10 bg-emerald-600 text-white relative overflow-hidden">
          <div className="absolute -right-20 -top-20 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl" />
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-3xl flex items-center justify-center border border-white/30">
                <Medal className="w-10 h-10" />
              </div>
              <div>
                <h3 className="text-2xl font-bold">Top Rankings</h3>
                <p className="text-emerald-100">Updated in real-time from sessions</p>
              </div>
            </div>
            <TrendingUp className="w-12 h-12 opacity-30" />
          </div>
        </div>

        {loading ? (
          <div className="p-20 text-center text-gray-500">Calculating rankings...</div>
        ) : students.length === 0 ? (
          <div className="p-20 text-center text-gray-500">No students enrolled yet.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {students.map((student, i) => (
              <motion.div
                key={student.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className={`p-8 flex items-center justify-between hover:bg-emerald-50/30 transition-all cursor-default ${i < 3 ? 'bg-gradient-to-r from-emerald-50/50 to-transparent' : ''}`}
              >
                <div className="flex items-center gap-8">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl border-2 ${
                    i === 0 ? 'bg-amber-100 border-amber-200 text-amber-700' :
                    i === 1 ? 'bg-slate-100 border-slate-200 text-slate-600' :
                    i === 2 ? 'bg-orange-100 border-orange-200 text-orange-700' :
                    'bg-gray-50 border-gray-100 text-gray-400'
                  }`}>
                    {i + 1}
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                      {student.name}
                      {i === 0 && <Award className="w-5 h-5 text-amber-500" />}
                    </h4>
                    <div className="flex gap-4 mt-1">
                      <p className="text-sm text-gray-500 flex items-center gap-1 font-medium">
                        <CheckCircle className="w-4 h-4 text-emerald-500" />
                        {student.stats?.attendanceRate || 0}% Attendance
                      </p>
                      <p className="text-sm text-gray-500 flex items-center gap-1 font-medium">
                        <Star className="w-4 h-4 text-blue-500" />
                        {student.stats?.memorizationProgress || 0} Juz Progress
                      </p>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-3xl font-black text-emerald-600">{student.stats?.totalScore || 0}</div>
                  <div className="text-[10px] uppercase font-black text-emerald-400 tracking-widest mt-1">Overall Score</div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
