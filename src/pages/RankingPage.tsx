import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Award, TrendingUp, Medal, Star, CheckCircle, Filter, X, Home } from 'lucide-react';
import { dbService } from '../services/db';
import { auth } from '../lib/firebase';
import type { Student, Kuttab } from '../types';

export default function RankingPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [kuttabs, setKuttabs] = useState<Kuttab[]>([]);
  const [selectedKuttab, setSelectedKuttab] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!auth.currentUser) return;
      try {
        const [studentData, kuttabData] = await Promise.all([
          dbService.getAllStudents(),
          dbService.getAllKuttabs()
        ]);
        
        const sorted = studentData.sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0));
        setStudents(sorted);
        setKuttabs(kuttabData);
      } catch (err) {
        console.error('Error fetching rankings:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredStudents = useMemo(() => {
    if (selectedKuttab === 'all') return students;
    return students.filter(s => s.kuttabName === selectedKuttab);
  }, [students, selectedKuttab]);

  return (
    <div className="p-4 sm:p-8 space-y-8 max-w-5xl mx-auto">
      <header className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 rounded-full text-xs sm:text-sm font-bold border border-amber-100">
          <Star className="w-4 h-4 fill-amber-700" />
          Top Performers
        </div>
        <h2 className="text-3xl sm:text-4xl font-black text-gray-900">Student Leaderboard</h2>
        <p className="text-gray-500 max-w-lg mx-auto font-medium text-sm sm:text-base">
          Celebrating excellence in memorization, attendance, and accuracy across all programs.
        </p>

        <div className="pt-4 flex justify-center">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all border ${
              selectedKuttab !== 'all' || showFilters
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-100'
                : 'bg-white text-gray-600 border-gray-100 hover:border-emerald-200'
            }`}
          >
            <Filter className="w-4 h-4" />
            {selectedKuttab === 'all' ? 'Filter by Kuttab' : `Kuttab: ${selectedKuttab}`}
            {(selectedKuttab !== 'all' || showFilters) && (
              <X 
                className="w-4 h-4 ml-2 hover:bg-white/20 rounded-full" 
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedKuttab('all');
                  setShowFilters(false);
                }}
              />
            )}
          </button>
        </div>

        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-4 flex flex-wrap justify-center gap-2 max-w-2xl mx-auto"
            >
              <button
                onClick={() => {
                  setSelectedKuttab('all');
                  setShowFilters(false);
                }}
                className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all border ${
                  selectedKuttab === 'all'
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-white text-gray-400 border-gray-100 hover:border-emerald-100'
                }`}
              >
                All Regions
              </button>
              {kuttabs.map((k) => (
                <button
                  key={k.id}
                  onClick={() => {
                    setSelectedKuttab(k.name);
                    setShowFilters(false);
                  }}
                  className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all border ${
                    selectedKuttab === k.name
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-white text-gray-400 border-gray-100 hover:border-emerald-100'
                  }`}
                >
                  {k.name}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <div className="bg-white border rounded-3xl sm:rounded-[40px] shadow-2xl shadow-emerald-100/50 overflow-hidden text-black transition-all">
        <div className="p-6 sm:p-10 bg-emerald-600 text-white relative overflow-hidden">
          <div className="absolute -right-20 -top-20 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl" />
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-4 sm:gap-6">
              <div className="w-12 h-12 sm:w-20 sm:h-20 bg-white/20 backdrop-blur-md rounded-2xl sm:rounded-3xl flex items-center justify-center border border-white/30">
                <Medal className="w-6 h-6 sm:w-10 sm:h-10" />
              </div>
              <div>
                <h3 className="text-lg sm:text-2xl font-bold">
                  {selectedKuttab === 'all' ? 'Universal Rankings' : `${selectedKuttab} Standings`}
                </h3>
                <p className="text-sm sm:text-base text-emerald-100">
                  {filteredStudents.length} Students Qualified
                </p>
              </div>
            </div>
            <TrendingUp className="w-8 h-8 sm:w-12 sm:h-12 opacity-30" />
          </div>
        </div>

        {loading ? (
          <div className="p-12 sm:p-20 text-center text-gray-500">Calculating rankings...</div>
        ) : filteredStudents.length === 0 ? (
          <div className="p-16 sm:p-24 text-center">
            <p className="text-gray-400 font-medium italic">No performance records found for this selection.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredStudents.map((student, i) => (
              <motion.div
                key={student.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between hover:bg-emerald-50/20 transition-all cursor-default gap-4 ${i < 3 && selectedKuttab === 'all' ? 'bg-gradient-to-r from-emerald-50/50 to-transparent' : ''}`}
              >
                <div className="flex items-center gap-4 sm:gap-8 flex-1">
                  <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center font-black text-lg sm:text-xl border-2 shrink-0 ${
                    i === 0 ? 'bg-amber-100 border-amber-200 text-amber-700' :
                    i === 1 ? 'bg-slate-100 border-slate-200 text-slate-600' :
                    i === 2 ? 'bg-orange-100 border-orange-200 text-orange-700' :
                    'bg-gray-50 border-gray-100 text-gray-400'
                  }`}>
                    {i + 1}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-3 truncate">
                      {student.name}
                      {i === 0 && <Award className="w-5 h-5 text-amber-500 shrink-0" />}
                    </h4>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                      <p className="text-xs sm:text-sm text-gray-500 flex items-center gap-1 font-medium italic">
                        <Home className="w-3.5 h-3.5" />
                        {student.kuttabName || 'Independent'}
                      </p>
                      <p className="text-xs sm:text-sm text-gray-500 flex items-center gap-1 font-medium">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                        {student.attendanceRate || 0}% Att.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="text-left sm:text-right w-full sm:w-auto pt-4 sm:pt-0 border-t sm:border-0 border-gray-50 flex sm:block items-center justify-between">
                  <div className="text-2xl sm:text-3xl font-black text-emerald-600 leading-none">{student.totalScore || 0}</div>
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
