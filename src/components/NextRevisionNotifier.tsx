import React, { useEffect, useState, useRef } from 'react';
import { dbService } from '../services/db';
import { auth } from '../lib/firebase';
import { NextRevision, Student, UserProfile } from '../types';
import toast from 'react-hot-toast';
import { Bell, BookOpen, User, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface NextRevisionNotifierProps {
  profile: UserProfile | null;
}

export default function NextRevisionNotifier({ profile }: NextRevisionNotifierProps) {
  const { t } = useTranslation();
  const shownRef = useRef<Set<string>>(new Set());
  const [students, setStudents] = useState<Student[]>([]);
  const [nextRevisions, setNextRevisions] = useState<NextRevision[]>([]);

  const getPortionLabel = (q: number, identifier?: string) => {
    if (identifier) {
      if (identifier.startsWith('t')) return t(`thumun_${identifier.substring(1)}`);
      if (identifier.startsWith('r')) return t(`rubu_${identifier.substring(1)}`);
      if (identifier.startsWith('n')) return t(`nisf_${identifier.substring(1)}`);
      if (identifier === 'h1') return t('hizb');
    }
    if (q >= 1 && q <= 8) return t(`thumun_${q}`);
    return q > 0 ? `${q} ${t('unit_thumn')}` : '';
  };

  // 1. Subscribe to students and revisions based on role
  useEffect(() => {
    if (!auth.currentUser || !profile) return;
    
    const isStudent = profile.role === 'student';
    const isAdmin = profile.role === 'admin';
    const uid = auth.currentUser.uid;
    const kuttabName = profile.kuttabName;
    const studentId = profile.studentId;

    let unsubscribeStudents = () => {};
    let unsubscribeNext = () => {};

    if (isStudent && studentId) {
      // Subscribe to student's own next revisions
      unsubscribeNext = dbService.subscribeStudentNextRevisions(
        studentId,
        auth.currentUser.email || '',
        setNextRevisions
      );
      
      // Also get student data for self if needed (for name display consistency)
      unsubscribeStudents = dbService.subscribeStudents(uid, undefined, false, (sList) => {
        const me = sList.find(s => s.id === studentId);
        if (me) setStudents([me]);
      });
    } else if (!isStudent) {
      unsubscribeStudents = dbService.subscribeStudents(
        uid,
        kuttabName,
        isAdmin,
        setStudents
      );

      unsubscribeNext = dbService.subscribeNextRevisions(
        uid,
        kuttabName,
        isAdmin,
        setNextRevisions
      );
    }

    return () => {
      unsubscribeStudents();
      unsubscribeNext();
    };
  }, [profile?.role, profile?.kuttabName, profile?.studentId]);

  // 2. Trigger notifications when data changes
  useEffect(() => {
    if (nextRevisions.length === 0) return;

    const isStudent = profile?.role === 'student';

    // Calculate tomorrow's date string YYYY-MM-DD
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    nextRevisions.forEach(rev => {
      // Check if due tomorrow and not shown in current session
      if (rev.dueDate === tomorrowStr && !shownRef.current.has(rev.id)) {
        shownRef.current.add(rev.id);
        
        const student = students.find(s => s.id === rev.studentId);
        const displayName = isStudent ? t('you') : (student?.name || t('loading_student'));
        
        toast.custom((t_toast) => (
          <div
            className={`${
              t_toast.visible ? 'animate-enter' : 'animate-leave'
            } max-w-md w-full bg-white shadow-2xl rounded-2xl pointer-events-auto flex ring-1 ring-black ring-opacity-5 border-l-4 border-l-indigo-600 overflow-hidden translate-y-0 opacity-100 transition-all duration-300 shadow-indigo-100/50`}
          >
            <div className="flex-1 w-0 p-5">
              <div className="flex items-start">
                <div className="flex-shrink-0 pt-0.5">
                  <div className="h-12 w-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 border border-indigo-100 shadow-sm">
                    <Bell className="h-6 w-6" />
                  </div>
                </div>
                <div className="ml-4 flex-1">
                  <p className="text-sm font-black text-gray-900 mb-1">
                    {isStudent ? t('your_revision_due_tomorrow') : t('revision_due_tomorrow')}
                  </p>
                  <div className="flex items-center gap-2 text-[10px] text-indigo-600 font-black uppercase tracking-wider mb-3">
                    <User className="h-3 w-3" />
                    {displayName}
                  </div>
                  <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-2xl border border-gray-100 font-bold space-y-2">
                    <div className="flex items-center gap-2 text-indigo-700">
                       <BookOpen className="h-4 w-4" />
                       <span>{rev.surahName || '-'}</span>
                       <span className="text-gray-300 mx-1">•</span>
                       <span className="text-xs">{t('hizb')} {rev.hizbNumber}</span>
                       <span className="text-gray-300 mx-1">•</span>
                       <span className="text-[10px] text-indigo-500 font-black uppercase tracking-wider">{getPortionLabel(rev.quantity || 0, rev.quantityIdentifier)}</span>
                    </div>
                    {rev.notes && (
                      <p className="text-[11px] text-gray-400 italic font-medium leading-relaxed">
                        "{rev.notes}"
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex border-l border-gray-100">
              <button
                onClick={() => toast.dismiss(t_toast.id)}
                className="w-full border border-transparent rounded-none p-4 flex items-center justify-center text-gray-400 hover:text-indigo-600 hover:bg-gray-50 transition-all focus:outline-none"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        ), {
           duration: 8000,
           id: `rev-${rev.id}`
        });
      }
    });
  }, [nextRevisions, students, t]);

  return null;
}
