import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate, Link } from 'react-router-dom';
import { Award, TrendingUp, Medal, Star, CheckCircle, Filter, X, Home, BookOpen } from 'lucide-react';
import { dbService } from '../services/db';
import { auth } from '../lib/firebase';
import type { Student, Kuttab, UserProfile } from '../types';
import { useTranslation } from 'react-i18next';

import { formatQuranProgress } from '../lib/quranUtils';

interface RankingPageProps {
  profile: UserProfile | null;
}

export default function RankingPage({ profile }: RankingPageProps) {
  const { t } = useTranslation();
  const [students, setStudents] = useState<Student[]>([]);
  const [kuttabs, setKuttabs] = useState<Kuttab[]>([]);
  const [selectedKuttab, setSelectedKuttab] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'score' | 'hizbs'>('score');
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  const isAdmin = profile?.role === 'admin' || profile?.role === 'manager' || auth.currentUser?.email === 'abdessamadjibrane2@gmail.com';

  useEffect(() => {
    const fetchData = async () => {
      if (!auth.currentUser || !profile) return;
      setLoading(true);
      try {
        let studentData: Student[] = [];
        
        if (selectedKuttab === 'all') {
          // If all regions, fetch global top 50
          studentData = await dbService.getTopRankingStudents(50);
        } else {
          // If specific kuttab, fetch all for that kuttab (limited to 100 in service)
          studentData = await dbService.getStudentsByKuttab(selectedKuttab);
        }

        const [kuttabData] = await Promise.all([
          dbService.getAllKuttabs()
        ]);
        
        let finalKuttabs = [...kuttabData];
        // Ensure the profile's kuttab is in the list just in case
        if (profile.kuttabName && !finalKuttabs.some(k => k.name === profile.kuttabName)) {
           const k = await dbService.getKuttabByName(profile.kuttabName);
           if (k) finalKuttabs.push(k);
        }

        const sorted = studentData.sort((a, b) => {
          if (sortBy === 'hizbs') return (b.totalHizbs || 0) - (a.totalHizbs || 0);
          return (b.totalScore || 0) - (a.totalScore || 0);
        });
        setStudents(sorted);
        setKuttabs(finalKuttabs);
      } catch (err) {
        console.error('Error fetching rankings:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [profile, isAdmin, sortBy, selectedKuttab]);

  const filteredStudents = useMemo(() => {
    return [...students].slice(0, 50);
  }, [students]);

  const distributionData = useMemo(() => {
    const counts: Record<number, number> = {};
    for (let i = 1; i <= 60; i++) counts[i] = 0;
    
    const relevantStudents = selectedKuttab === 'all' 
      ? students 
      : students.filter(s => s.kuttabName === selectedKuttab);

    relevantStudents.forEach(s => {
      const h = Math.floor(s.totalHizbs || 0);
      if (h >= 1 && h <= 60) counts[h]++;
      else if (h > 60) counts[60]++;
    });
    return counts;
  }, [students, selectedKuttab]);

  const distributionStats = useMemo(() => {
    const vals = Object.values(distributionData);
    const total = vals.reduce((a: number, b: number) => a + b, 0);
    const completed = distributionData[60] || 0;
    const half = Object.entries(distributionData)
      .filter(([lvl]) => parseInt(lvl) >= 30)
      .reduce((acc: number, entry: [string, number]) => acc + entry[1], 0);
      
    return { total, completed, half };
  }, [distributionData]);

  return (
    <div className="p-4 sm:p-8 space-y-8 max-w-5xl mx-auto">
      <header className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 rounded-full text-xs sm:text-sm font-bold border border-amber-100">
          <Star className="w-4 h-4 fill-amber-700" />
          {t('top_performers')}
        </div>
        <h2 className="text-3xl sm:text-4xl font-black text-gray-900">{t('leaderboard')}</h2>
        
        <div className="flex justify-center gap-2 mt-4">
          <button 
            onClick={() => setSortBy('score')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${sortBy === 'score' ? 'bg-emerald-600 text-white shadow-lg' : 'bg-white text-gray-500 border border-gray-100'}`}
          >
            {t('sort_rank')}
          </button>
          <button 
            onClick={() => setSortBy('hizbs')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${sortBy === 'hizbs' ? 'bg-emerald-600 text-white shadow-lg' : 'bg-white text-gray-500 border border-gray-100'}`}
          >
            {t('total_hizbs')}
          </button>
        </div>

        <p className="text-gray-500 max-w-lg mx-auto font-medium text-sm sm:text-base">
          {sortBy === 'hizbs' ? t('ranking_by_hizbs') : t('overall_lead')}
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
            {selectedKuttab === 'all' ? t('filter_by_kuttab') : `${t('kuttab')}: ${selectedKuttab}`}
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
                {t('all_regions')}
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
                  {selectedKuttab === 'all' ? t('universal_rankings') : t('standings', { name: selectedKuttab })}
                </h3>
                <p className="text-sm sm:text-base text-emerald-100">
                  {t('qualified_students', { count: filteredStudents.length })}
                </p>
              </div>
            </div>
            <TrendingUp className="w-8 h-8 sm:w-12 sm:h-12 opacity-30" />
          </div>
        </div>

        {loading ? (
          <div className="p-12 sm:p-20 text-center text-gray-500">{t('calculating_rankings')}</div>
        ) : filteredStudents.length === 0 ? (
          <div className="p-16 sm:p-24 text-center">
            <p className="text-gray-400 font-medium italic">{t('no_ranking_data')}</p>
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
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3 truncate">
                      {profile?.role !== 'student' ? (
                        <Link 
                          to={`/students/${student.id}`}
                          className="text-lg sm:text-xl font-bold text-gray-900 hover:text-emerald-600 transition-colors"
                        >
                          {student.name}
                        </Link>
                      ) : (
                        <h4 className="text-lg sm:text-xl font-bold text-gray-900">
                          {student.name}
                        </h4>
                      )}
                      {i === 0 && <Award className="w-5 h-5 text-amber-500 shrink-0" />}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                      <p className="text-xs sm:text-sm text-gray-500 flex items-center gap-1 font-medium italic">
                        <Home className="w-3.5 h-3.5" />
                        {student.kuttabName || t('independent')}
                      </p>
                      <p className="text-xs sm:text-sm text-gray-500 flex items-center gap-1 font-medium">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                        {student.attendanceRate || 0}% {t('attendance')}
                      </p>
                      <p className="text-xs sm:text-sm text-gray-500 flex items-center gap-1 font-bold text-emerald-700">
                        <BookOpen className="w-3.5 h-3.5" />
                        {(student.totalHizbs || 0).toFixed(2)} {t('hizbs')}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="text-left sm:text-right w-full sm:w-auto pt-4 sm:pt-0 border-t sm:border-0 border-gray-50 flex sm:block items-center justify-between">
                  <div className="text-2xl sm:text-3xl font-black text-emerald-600 leading-none">{student.totalScore || 0}</div>
                  <div className="text-[10px] uppercase font-black text-emerald-400 tracking-widest mt-1">{t('overall_score')}</div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {distributionStats.total > 0 && (
        <div className="space-y-6">
          <div className="flex flex-col items-center text-center space-y-2 px-4">
            <h3 className="text-2xl font-black text-gray-900">{t('memorization_distribution')}</h3>
            <p className="text-gray-500 font-medium text-sm max-w-lg">{t('memorization_distribution_desc')}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-6 border rounded-[32px] shadow-sm text-center space-y-1">
              <div className="text-3xl font-black text-emerald-600">{distributionStats.completed}</div>
              <div className="text-[10px] uppercase font-black text-gray-400 tracking-widest">{t('completed_quran')}</div>
            </div>
            <div className="bg-white p-6 border rounded-[32px] shadow-sm text-center space-y-1">
              <div className="text-3xl font-black text-blue-600">{distributionStats.half}</div>
              <div className="text-[10px] uppercase font-black text-gray-400 tracking-widest">{t('half_quran')}</div>
            </div>
            <div className="bg-white p-6 border rounded-[32px] shadow-sm text-center space-y-1">
              <div className="text-3xl font-black text-purple-600">{distributionStats.total}</div>
              <div className="text-[10px] uppercase font-black text-gray-400 tracking-widest">{t('active_learners')}</div>
            </div>
          </div>

          <div className="bg-white border rounded-[40px] shadow-sm overflow-hidden p-8 sm:p-12">
            <div className="grid grid-cols-2 md:grid-cols-5 lg:grid-cols-10 gap-3 sm:gap-4">
              {Array.from({ length: 60 }, (_, i) => i + 1)
                .filter(lvl => (distributionData[lvl] || 0) > 0)
                .map((lvl) => {
                  const count = distributionData[lvl] || 0;
                  return (
                    <div 
                      key={lvl} 
                      className="p-3 sm:p-4 rounded-3xl border flex flex-col items-center justify-center gap-1 transition-all group hover:scale-105 bg-emerald-50 border-emerald-100 text-emerald-700 shadow-sm shadow-emerald-50"
                    >
                      <span className="text-[10px] font-black uppercase tracking-tighter opacity-60">H{lvl}</span>
                      <div className="text-xl sm:text-2xl font-black line-height-none">{count}</div>
                      <span className="text-[8px] font-bold uppercase opacity-60 tracking-wider">
                        {count === 1 ? t('students_count_one') : t('students_count_other', { count })}
                      </span>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
