import { useState, useEffect } from 'react';
import { auth } from '../lib/firebase';
import { dbService } from '../services/db';
import { Student, Attendance, Evaluation, Revision, NextRevision } from '../types';
import { Calendar as CalendarIcon, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import StudentCalendar from '../components/StudentCalendar';

export default function StudentCalendarPage() {
  const { t } = useTranslation();
  const [data, setData] = useState<{
    attendance: Attendance[];
    evaluations: Evaluation[];
    revisions: Revision[];
    nextTasks: NextRevision[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribes: (() => void)[] = [];

    const setupSubscriptions = async () => {
      if (!auth.currentUser?.email) return;
      try {
        setLoading(true);
        const email = auth.currentUser.email.toLowerCase();
        
        const mainUnsubscribe = dbService.subscribeStudentProfile(email, (student) => {
          if (!student) {
            setData(null);
            setLoading(false);
            return;
          }

          const studentId = student.id;
          
          const u1 = dbService.subscribeStudentNextRevisions(studentId, email, (tasks) => {
            setData(prev => ({ ...prev, nextTasks: tasks, attendance: prev?.attendance || [], evaluations: prev?.evaluations || [], revisions: prev?.revisions || [] }));
          });

          const u2 = dbService.subscribeStudentAttendance(studentId, email, (attendance) => {
            setData(prev => ({ ...prev, attendance, evaluations: prev?.evaluations || [], revisions: prev?.revisions || [], nextTasks: prev?.nextTasks || [] }));
          });

          const u3 = dbService.subscribeStudentEvaluations(studentId, email, (evaluations) => {
            setData(prev => ({ ...prev, evaluations, attendance: prev?.attendance || [], revisions: prev?.revisions || [], nextTasks: prev?.nextTasks || [] }));
          });

          const u4 = dbService.subscribeStudentRevisions(studentId, email, (revisions) => {
            setData(prev => ({ ...prev, revisions, attendance: prev?.attendance || [], evaluations: prev?.evaluations || [], nextTasks: prev?.nextTasks || [] }));
          });

          unsubscribes.push(u1, u2, u3, u4);
          setLoading(false);
        });

        unsubscribes.push(mainUnsubscribe);
      } catch (err) {
        console.error('Error setting up calendar subscriptions:', err);
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

  if (!data) {
    return (
      <div className="p-8 max-w-2xl mx-auto text-center space-y-6">
        <div className="w-20 h-20 bg-amber-50 text-amber-500 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
          <Clock className="w-10 h-10" />
        </div>
        <h2 className="text-3xl font-black text-gray-900">{t('portal_pending')}</h2>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 space-y-8 max-w-6xl mx-auto text-black">
      <header className="flex items-center gap-3">
        <div className="w-12 h-12 bg-emerald-600 text-white rounded-2xl flex items-center justify-center shadow-lg">
          <CalendarIcon className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">{t('attendance_eval_timeline')}</h2>
        </div>
      </header>

      <StudentCalendar 
        attendance={data.attendance} 
        evaluations={data.evaluations} 
        revisions={data.revisions} 
        nextRevisions={data.nextTasks} 
      />
    </div>
  );
}
