import { useState, useEffect } from 'react';
import { auth } from '../lib/firebase';
import { dbService } from '../services/db';
import { Evaluation, Student } from '../types';
import { BookOpen, Award, ChevronLeft, Target, TrendingUp, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import MemorizationGrid from '../components/MemorizationGrid';
import { formatQuranProgress } from '../lib/quranUtils';

export default function StudentProgressPage() {
  const { t } = useTranslation();
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribes: (() => void)[] = [];

    const setupSubscriptions = async () => {
      if (!auth.currentUser?.email) return;
      try {
        setLoading(true);
        const email = auth.currentUser.email.toLowerCase();
        
        const mainUnsubscribe = dbService.subscribeStudentProfile(email, (studentData) => {
          if (!studentData) {
            setLoading(false);
            return;
          }
          setStudent(studentData);

          const u1 = dbService.subscribeStudentEvaluations(studentData.id, email, (data) => {
            setEvaluations(data);
            setLoading(false);
          });

          unsubscribes.push(u1);
        });

        unsubscribes.push(mainUnsubscribe);
      } catch (err) {
        console.error('Error setting up progress subscriptions:', err);
        setLoading(false);
      }
    };

    setupSubscriptions();

    return () => unsubscribes.forEach(unsub => unsub());
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
        <p className="text-gray-500 font-medium animate-pulse">{t('loading_progress')}</p>
      </div>
    );
  }

  const progressValue = student?.totalHizbs || 0;
  const percentage = Math.round((progressValue / 60) * 100);

  return (
    <div className="p-4 sm:p-8 space-y-8 max-w-6xl mx-auto text-black">
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <Link to="/" className="inline-flex items-center gap-2 text-emerald-600 font-bold hover:gap-3 transition-all group">
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          {t('back_to_portal')}
        </Link>
        
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 pb-4 border-b border-gray-100">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-indigo-600 text-white rounded-3xl flex items-center justify-center shadow-xl shadow-indigo-200 -rotate-3 hover:rotate-0 transition-transform duration-500">
              <BookOpen className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h2 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight leading-none">{t('memorization_progress')}</h2>
              <div className="flex flex-wrap items-center gap-2">
                <div className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-black uppercase tracking-widest border border-indigo-100">
                  {formatQuranProgress(progressValue, t)}
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end">
            <div className="text-4xl font-black text-indigo-600 leading-none">{percentage}%</div>
            <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-1">{t('overall_completion')}</div>
          </div>
        </div>
      </motion.header>

      {/* Main Progress Visualization */}
      <motion.section 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="bg-white p-8 sm:p-12 border-2 border-indigo-50 rounded-[48px] shadow-sm relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 p-24 bg-indigo-50/30 rounded-bl-[200px] -z-0" />
        
        <div className="relative z-10 space-y-10">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg">
              <Target className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-2xl font-black text-gray-900">{t('hifdh_milestones')}</h3>
              <p className="text-sm text-gray-500 font-bold uppercase tracking-widest">{t('visual_roadmap')}</p>
            </div>
          </div>

          <MemorizationGrid evaluations={evaluations} />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
            <div className="p-6 bg-indigo-50/50 rounded-3xl border border-indigo-100 flex items-center gap-4">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">{t('completed')}</p>
                <h4 className="text-xl font-black text-gray-900">{(student?.totalHizbs || 0).toFixed(2)} {t('ahzab')}</h4>
              </div>
            </div>
            <div className="p-6 bg-emerald-50/50 rounded-3xl border border-emerald-100 flex items-center gap-4">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-emerald-600 shadow-sm">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">{t('avg_accuracy')}</p>
                <h4 className="text-xl font-black text-gray-900">
                  {evaluations.length > 0 
                    ? Math.round(evaluations.reduce((acc, curr) => acc + curr.accuracyScore, 0) / evaluations.length) 
                    : 0}%
                </h4>
              </div>
            </div>
            <div className="p-6 bg-amber-50/50 rounded-3xl border border-amber-100 flex items-center gap-4">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-amber-600 shadow-sm">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">{t('remaining')}</p>
                <h4 className="text-xl font-black text-gray-900">{(60 - (student?.totalHizbs || 0)).toFixed(2)} {t('ahzab')}</h4>
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      {/* Legend / Tips */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 px-4">
        <div className="space-y-4">
          <h4 className="text-sm font-black text-gray-400 uppercase tracking-widest">{t('how_to_read')}</h4>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-emerald-200 border border-emerald-300" />
              <span className="text-xs font-bold text-gray-600">{t('mastered')} (90%+)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-blue-200 border border-blue-300" />
              <span className="text-xs font-bold text-gray-600">{t('good')} (70-89%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-amber-200 border border-amber-300" />
              <span className="text-xs font-bold text-gray-600">{t('review_needed')} (&lt;70%)</span>
            </div>
          </div>
        </div>
        <div className="p-6 bg-gray-50 rounded-3xl border border-dashed text-gray-500 italic text-sm text-center sm:text-left">
           "{t('progress_tip_message')}"
        </div>
      </div>
    </div>
  );
}
