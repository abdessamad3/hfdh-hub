import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Calendar as CalendarIcon, Check, X, Save, Clock, Users, GraduationCap, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'react-hot-toast';
import { dbService } from '../services/db';
import { auth } from '../lib/firebase';
import type { Student, UserProfile, TeacherAttendance } from '../types';
import { useTranslation } from 'react-i18next';
import { formatDate, getDayIndex } from '../lib/dateUtils';

interface AttendancePageProps {
  profile: UserProfile | null;
}

type AttendanceStatus = 'present' | 'absent' | 'excused';

export default function AttendancePage({ profile }: AttendancePageProps) {
  const { t, i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState<'students' | 'teachers'>('students');
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(new Date().toLocaleDateString('en-CA')); // YYYY-MM-DD in local time
  
  const [studentAttendance, setStudentAttendance] = useState<Record<string, Record<number, { status: AttendanceStatus, excuse?: string }>>>({});
  const [teacherAttendance, setTeacherAttendance] = useState<Record<string, Record<number, { status: AttendanceStatus, excuse?: string }>>>({});
  const [studentsWithActivity, setStudentsWithActivity] = useState<Record<string, boolean>>({});
  const [kuttabs, setKuttabs] = useState<Record<string, any>>({});
  const [kuttabsLoaded, setKuttabsLoaded] = useState(false);
  const [kuttabList, setKuttabList] = useState<any[]>([]);
  const [selectedKuttab, setSelectedKuttab] = useState<string>(profile?.kuttabName || 'all');
  const [selectedShift, setSelectedShift] = useState<'all' | 'morning' | 'afternoon'>('all');
  
  const [saving, setSaving] = useState(false);

  // Lesson Modal States
  const [isLessonModalOpen, setIsLessonModalOpen] = useState(false);
  const [modalKuttabId, setModalKuttabId] = useState('');
  const [modalDate, setModalDate] = useState(date);
  const [modalType, setModalType] = useState<'specific' | 'recurring'>('specific');
  const [session1Enabled, setSession1Enabled] = useState(true);
  const [session1From, setSession1From] = useState('08:00');
  const [session1To, setSession1To] = useState('10:00');
  const [session2Enabled, setSession2Enabled] = useState(false);
  const [session2From, setSession2From] = useState('14:00');
  const [session2To, setSession2To] = useState('16:00');
  const [savingLesson, setSavingLesson] = useState(false);

  const isSenior = profile?.role === 'admin' || profile?.role === 'manager';
  const isRtl = i18n.language === 'ar';
  const canAddLesson = isSenior || (profile?.role === 'teacher' && profile?.kuttabName);

  const openLessonModal = () => {
    setModalDate(date);
    setModalType('specific');
    setSession1Enabled(true);
    setSession1From('08:00');
    setSession1To('10:00');
    setSession2Enabled(false);
    setSession2From('14:00');
    setSession2To('16:00');
    
    const teacherKuttab = kuttabList.find(k => k.name.trim().toLowerCase() === profile?.kuttabName?.trim().toLowerCase());
    if (teacherKuttab) {
      setModalKuttabId(teacherKuttab.id);
    } else if (kuttabList.length > 0) {
      // Find currently filtered kuttab or default to first
      const matchedFilterKuttab = kuttabList.find(k => k.name.trim().toLowerCase() === selectedKuttab.trim().toLowerCase());
      setModalKuttabId(matchedFilterKuttab?.id || kuttabList[0]?.id || '');
    } else {
      setModalKuttabId('');
    }
    
    setIsLessonModalOpen(true);
  };

  const handleSaveLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalKuttabId) {
      toast.error(isRtl ? 'يرجى اختيار الكُتّاب أولاً' : 'Please select a Kuttab first');
      return;
    }

    const finalLessons: string[] = [];
    if (session1Enabled) {
      finalLessons.push(`${session1From} - ${session1To}`);
    }
    if (session2Enabled) {
      finalLessons.push(`${session2From} - ${session2To}`);
    }

    if (finalLessons.length === 0) {
      toast.error(isRtl ? 'يجب تفعيل حصة واحدة على الأقل' : 'Please enable at least one session');
      return;
    }

    setSavingLesson(true);
    try {
      const selectedKuttabObj = kuttabList.find(k => k.id === modalKuttabId);
      if (!selectedKuttabObj) {
        toast.error(isRtl ? 'لم يتم العثور على الكُتّاب المحدد' : 'Selected Kuttab not found');
        setSavingLesson(false);
        return;
      }

      const currentSchedule = selectedKuttabObj.schedule || { lessons: {} };
      const key = modalType === 'recurring' 
        ? getDayIndex(modalDate).toString() 
        : modalDate;

      const updatedLessons = { ...currentSchedule.lessons };
      updatedLessons[key] = {
        type: modalType,
        lessons: finalLessons
      };

      await dbService.updateKuttabSchedule(selectedKuttabObj.id, { lessons: updatedLessons });
      toast.success(isRtl ? 'تمت إضافة الحصة بنجاح!' : 'Session added successfully!');
      
      await fetchData();
      setIsLessonModalOpen(false);
    } catch (err) {
      console.error('Error saving lesson:', err);
      toast.error(isRtl ? 'فشل حِفظ الحّصة المجدولة.' : 'Failed to save scheduled lesson.');
    } finally {
      setSavingLesson(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab, date]);

  const fetchData = async () => {
    if (!auth.currentUser || !profile) return;
    setLoading(true);
    try {
      // Fetch kuttabs first to ensure session checks work during initialization
      const kuttabsData = await dbService.getAllKuttabs();
      setKuttabList(kuttabsData);
      const kuttabsMap = Object.fromEntries(kuttabsData.map(k => [k.name.trim().toLowerCase(), k]));
      setKuttabs(kuttabsMap);
      setKuttabsLoaded(true);

      if (activeTab === 'students') {
        const data = await dbService.getStudents(auth.currentUser.uid, profile.kuttabName, isSenior);
        setStudents(data);
        
        // Check for existing attendance
        const existing = await dbService.getAttendanceByDate(auth.currentUser.uid, profile.kuttabName, date, isSenior);
        
        // Initialize attendance state manually with nested structure
        const initialMap: Record<string, Record<number, { status: AttendanceStatus, excuse?: string }>> = {};
        
        for (const s of data) {
          initialMap[s.id] = {};
          const sessions = getSessionsForStudent(s, date, kuttabsMap);
          
          if (sessions.length > 0) {
            sessions.forEach((_, idx) => {
              const record = existing.find(r => r.studentId === s.id && (r.sessionIndex === idx || (idx === 0 && r.sessionIndex === undefined)));
              if (record) {
                initialMap[s.id][idx] = { status: record.status, excuse: record.excuse || '' };
              } else {
                initialMap[s.id][idx] = { status: undefined as any };
              }
            });
          }
        }
        setStudentAttendance(initialMap);
        
        // Fetch student activities - only force present for the first session if found
        const [evals, revs, memos] = await Promise.all([
          dbService.getEvaluationsByDate(auth.currentUser.uid, profile.kuttabName, date, isSenior),
          dbService.getRevisionsByDate(auth.currentUser.uid, profile.kuttabName, date, isSenior),
          dbService.getMemorizationsByDate(auth.currentUser.uid, profile.kuttabName, date, isSenior)
        ]);
        
        const activityMap: Record<string, boolean> = {};
        evals.forEach(e => { activityMap[e.studentId] = true; });
        revs.forEach(r => { activityMap[r.studentId] = true; });
        memos.forEach(m => { activityMap[m.studentId] = true; });
        setStudentsWithActivity(activityMap);

        setStudentAttendance(prev => {
          const next = { ...prev };
          let changed = false;
          Object.keys(activityMap).forEach(sid => {
            // For now, if there is ANY activity, mark the FIRST session as present if it was something else
            if (next[sid] && next[sid][0] && next[sid][0].status !== 'present') {
              next[sid][0] = { ...next[sid][0], status: 'present', excuse: undefined };
              changed = true;
            }
          });
          return changed ? next : prev;
        });
      } else {
        const data = await dbService.getTeachers(isSenior ? undefined : profile.kuttabName);
        setTeachers(data);
        const existing = await dbService.getTeacherAttendanceByDate(date);
        
        const initialMap: Record<string, Record<number, { status: AttendanceStatus, excuse?: string }>> = {};
        data.forEach(t => {
          const record = existing.find(r => r.teacherId === t.uid);
          initialMap[t.uid] = {
            0: record ? { status: record.status, excuse: record.excuse || '' } : { status: 'present' }
          };
        });
        setTeacherAttendance(initialMap);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getSessionsForStudent = (student: Student, dateStr: string, kuttabsLookup?: Record<string, any>) => {
    const lookup = kuttabsLookup || kuttabs;
    const kName = student.kuttabName?.trim().toLowerCase();
    
    // If no kuttab name or kuttab not found, assume it's a general study day with one session
    // This allows independent students to appear in the attendance list
    if (!kName || !lookup[kName]) return ["Session"];
    
    const kuttab = lookup[kName];
    const schedule = kuttab.schedule?.lessons;
    if (!schedule) return ["Session"];

    // Check for specific override first (YYYY-MM-DD)
    if (schedule[dateStr]) {
      return schedule[dateStr].lessons;
    }

    // Check recurring schedule (0-6)
    const dayIdx = getDayIndex(dateStr);
    const recurring = schedule[dayIdx.toString()];
    if (recurring && (recurring.type === 'recurring' || recurring.lessons)) {
      return recurring.lessons;
    }
    
    return [];
  };

  const isSessionDayForStudent = (student: Student, dateStr: string, kuttabsLookup?: Record<string, any>) => {
    const sessions = getSessionsForStudent(student, dateStr, kuttabsLookup);
    return sessions.length > 0;
  };

  const setStatus = (id: string, status: AttendanceStatus, sessionIndex: number = 0) => {
    if (activeTab === 'students') {
      const student = students.find(s => s.id === id);
      const sessions = student ? getSessionsForStudent(student, date) : [];
      if (!sessions[sessionIndex]) {
        toast.error(t('no_session_warning') || 'No session scheduled for this student.');
        return;
      }
      const currentVal = studentAttendance[id]?.[sessionIndex]?.status;
      const newStatus = currentVal === status ? undefined as any : status;
      
      setStudentAttendance(prev => ({
        ...prev,
        [id]: { 
          ...prev[id], 
          [sessionIndex]: { ...(prev[id]?.[sessionIndex] || {}), status: newStatus }
        }
      }));
    } else {
      const currentVal = teacherAttendance[id]?.[sessionIndex]?.status;
      const newStatus = currentVal === status ? undefined as any : status;
      
      setTeacherAttendance(prev => ({
        ...prev,
        [id]: { 
          ...prev[id], 
          [sessionIndex]: { ...(prev[id]?.[sessionIndex] || {}), status: newStatus }
        }
      }));
    }
  };

  const setExcuse = (id: string, excuse: string, sessionIndex: number = 0) => {
    if (activeTab === 'students') {
      setStudentAttendance(prev => ({
        ...prev,
        [id]: { 
          ...prev[id], 
          [sessionIndex]: { ...(prev[id]?.[sessionIndex] || {}), excuse }
        }
      }));
    } else {
      setTeacherAttendance(prev => ({
        ...prev,
        [id]: { 
          ...prev[id], 
          [sessionIndex]: { ...(prev[id]?.[sessionIndex] || {}), excuse }
        }
      }));
    }
  };

  const handleSave = async () => {
    if (!auth.currentUser) return;
    setSaving(true);
    try {
      if (activeTab === 'students') {
        const records: any[] = [];
        Object.entries(studentAttendance).forEach(([studentId, sessionsData]) => {
          const student = students.find(s => s.id === studentId);
          if (!student) return;
          
          const sessions = getSessionsForStudent(student, date);
          Object.entries(sessionsData).forEach(([sIdxStr, data]) => {
            const sIdx = parseInt(sIdxStr);
            if (sessions[sIdx]) {
              records.push({
                studentId,
                teacherId: auth.currentUser!.uid,
                date,
                sessionIndex: sIdx,
                status: data.status,
                excuse: data.status === 'excused' ? data.excuse : undefined
              });
            }
          });
        });
        
        if (records.length === 0) {
          toast.error(t('no_students_with_sessions') || 'No students have scheduled sessions on this day.');
          setSaving(false);
          return;
        }

        await dbService.saveAttendance(records);
      } else {
        const records: any[] = [];
        Object.entries(teacherAttendance).forEach(([teacherId, sessionsData]) => {
          const teacher = teachers.find(t => t.uid === teacherId);
          if (!teacher) return;

          Object.entries(sessionsData).forEach(([sIdxStr, data]) => {
            records.push({
              teacherId,
              teacherEmail: teacher.email || '',
              markedById: auth.currentUser!.uid,
              kuttabName: profile?.kuttabName || '',
              date,
              sessionIndex: parseInt(sIdxStr),
              status: data.status,
              excuse: data.status === 'excused' ? data.excuse : undefined
            });
          });
        });
        await dbService.saveTeacherAttendance(records);
      }
      toast.success(t('attendance_saved_success'));
    } catch (err) {
      console.error('Error saving attendance:', err);
      toast.error(t('sync_failed'));
    } finally {
      setSaving(false);
    }
  };

  const displayList = activeTab === 'students' 
    ? students.filter(s => isSessionDayForStudent(s, date))
    : teachers;

  const filteredDisplayList = displayList.filter(item => {
    // 1. Kuttab Filter
    if (selectedKuttab !== 'all') {
      const itemKuttab = activeTab === 'students' 
        ? (item as Student).kuttabName 
        : (item as UserProfile).kuttabName;
      if (itemKuttab?.trim().toLowerCase() !== selectedKuttab.trim().toLowerCase()) {
        return false;
      }
    }

    // 2. Shift Filter (only applicable to students)
    if (activeTab === 'students' && selectedShift !== 'all') {
      const sessions = getSessionsForStudent(item as Student, date);
      if (selectedShift === 'morning' && !sessions[0]) {
        return false;
      }
      if (selectedShift === 'afternoon' && !sessions[1]) {
        return false;
      }
    }

    return true;
  });

  const currentAttendance = activeTab === 'students' ? studentAttendance : teacherAttendance;

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 text-black border-b border-gray-100 pb-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">{t('daily_attendance')}</h2>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
          {/* Kuttab Filter Select Dropdown */}
          <div className="flex items-center gap-2 bg-white border border-gray-100 px-4 py-2.5 rounded-xl shadow-sm">
            <span className="text-xs font-black text-gray-400 uppercase tracking-wider">{t('kuttab') || 'Kuttab'}:</span>
            <select
              value={selectedKuttab}
              onChange={(e) => setSelectedKuttab(e.target.value)}
              className="outline-none bg-transparent font-bold text-gray-700 text-sm cursor-pointer"
            >
              <option value="all">{t('all') || 'All'}</option>
              {kuttabList.map(k => (
                <option key={k.id} value={k.name}>{k.name}</option>
              ))}
            </select>
          </div>

          {/* Shift Filter Select Dropdown (Only for students) */}
          {activeTab === 'students' && (
            <div className="flex items-center gap-2 bg-white border border-gray-100 px-4 py-2.5 rounded-xl shadow-sm">
              <span className="text-xs font-black text-gray-400 uppercase tracking-wider">{t('shift', 'Shift') || 'Shift'}:</span>
              <select
                value={selectedShift}
                onChange={(e) => setSelectedShift(e.target.value as any)}
                className="outline-none bg-transparent font-bold text-gray-700 text-sm cursor-pointer"
              >
                <option value="all">{t('all') || 'All'}</option>
                <option value="morning">{t('morning') || 'Morning'}</option>
                <option value="afternoon">{t('afternoon') || 'Evening'}</option>
              </select>
            </div>
          )}

          <div className={`flex items-center gap-3 bg-white border px-4 py-2.5 rounded-xl shadow-sm transition-all ${
            date === new Date().toLocaleDateString('en-CA') 
              ? 'border-emerald-500 ring-2 ring-emerald-50' 
              : 'border-gray-100'
          }`}>
            <CalendarIcon className="w-5 h-5 text-emerald-500" />
            <input 
              type="date" 
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="outline-none bg-transparent font-bold text-gray-700"
            />
          </div>
        </div>
      </header>

      {isSenior && (
        <div className="flex bg-gray-100 p-1.5 rounded-2xl gap-1 shadow-inner">
          <button
            onClick={() => setActiveTab('students')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${
              activeTab === 'students' 
                ? 'bg-white text-emerald-600 shadow-sm' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            {t('students_attendance')}
          </button>
          <button
            onClick={() => setActiveTab('teachers')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${
              activeTab === 'teachers' 
                ? 'bg-white text-emerald-600 shadow-sm' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Users className="w-4 h-4" />
            {t('teachers_attendance')}
          </button>
        </div>
      )}

      <div className="bg-white border rounded-3xl shadow-sm overflow-hidden text-black">
        <div className="p-6 border-b bg-gray-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h3 className="font-bold text-gray-700">
            {activeTab === 'students' ? t('student_list') : t('teacher_list')}
          </h3>
          <div className="flex w-full sm:w-auto gap-2">
            {filteredDisplayList.length > 0 && (
              <>
                <button 
                  onClick={() => {
                    const updated = { ...currentAttendance };
                    filteredDisplayList.forEach(item => {
                      const id = activeTab === 'students' ? (item as Student).id : (item as UserProfile).uid;
                      const sessions = activeTab === 'students' ? getSessionsForStudent(item as Student, date) : ["Default"];
                      
                      if (sessions.length > 0) {
                        if (!updated[id]) updated[id] = {};
                        sessions.forEach((_, idx) => {
                          updated[id][idx] = { status: 'present' };
                        });
                      }
                    });
                    if (activeTab === 'students') setStudentAttendance(updated);
                    else setTeacherAttendance(updated);
                  }}
                  className="flex-1 sm:flex-none text-xs font-black text-emerald-600 hover:bg-emerald-50 px-4 py-2 border border-emerald-100 rounded-xl transition-colors uppercase tracking-widest"
                >
                  {t('all_present')}
                </button>
                <button 
                  onClick={() => {
                    const updated = { ...currentAttendance };
                    filteredDisplayList.forEach(item => {
                      const id = activeTab === 'students' ? (item as Student).id : (item as UserProfile).uid;
                      const sessions = activeTab === 'students' ? getSessionsForStudent(item as Student, date) : ["Default"];
                      
                      if (sessions.length > 0) {
                        if (!updated[id]) updated[id] = {};
                        sessions.forEach((_, idx) => {
                          updated[id][idx] = { status: 'absent' };
                        });
                      }
                    });
                    if (activeTab === 'students') setStudentAttendance(updated);
                    else setTeacherAttendance(updated);
                  }}
                  className="flex-1 sm:flex-none text-xs font-black text-red-600 hover:bg-red-50 px-4 py-2 border border-red-100 rounded-xl transition-colors uppercase tracking-widest"
                >
                  {t('all_absent')}
                </button>
              </>
            )}
          </div>
        </div>
        
        {loading ? (
          <div className="p-12 text-center text-gray-500 font-medium">
            {activeTab === 'students' ? t('loading_students') : t('loading_teachers_attendance')}
          </div>
        ) : filteredDisplayList.length === 0 ? (
          <div className="p-12 flex flex-col items-center justify-center text-center gap-4">
            <span className="text-gray-500 font-medium italic">
              {activeTab === 'students' 
                ? (students.length > 0 ? t('no_students_with_sessions') : t('no_students_enrolled'))
                : t('no_teachers_enrolled')
              }
            </span>
            {activeTab === 'students' && students.length > 0 && canAddLesson && (
              <button
                onClick={openLessonModal}
                className="flex items-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-[20px] transition-all shadow-md shadow-emerald-100 cursor-pointer"
              >
                <Plus className="w-5 h-5" />
                {isRtl ? 'إضافة حصة مجدولة لهذا اليوم' : 'Add Scheduled Lesson for Today'}
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {/* Headers for two columns logic */}
            {activeTab === 'students' && (
              <div className="hidden sm:grid grid-cols-12 px-6 py-3 bg-gray-50 text-[10px] uppercase font-black text-gray-400 tracking-widest border-b">
                <div className={selectedShift === 'all' ? "col-span-4" : "col-span-6"}>{t('student')}</div>
                {selectedShift !== 'afternoon' && (
                  <div className={`${selectedShift === 'all' ? "col-span-4 border-x border-gray-100" : "col-span-6"} text-center`}>{t('morning')}</div>
                )}
                {selectedShift !== 'morning' && (
                  <div className={`${selectedShift === 'all' ? "col-span-4" : "col-span-6"} text-center`}>{t('afternoon')}</div>
                )}
              </div>
            )}
            
            {filteredDisplayList.map((item, i) => {
              const id = activeTab === 'students' ? (item as Student).id : (item as UserProfile).uid;
              const name = activeTab === 'students' ? (item as Student).name : ((item as UserProfile).displayName || (item as UserProfile).email.split('@')[0]);
              const path = activeTab === 'students' ? `/students/${id}` : `/teachers/${id}`;
              
              const sessions = activeTab === 'students' ? getSessionsForStudent(item as Student, date) : ["Default"];
              const isSession = sessions.length > 0;

              return (
                <motion.div 
                  key={id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={`px-6 py-4 flex flex-col sm:grid sm:grid-cols-12 items-center hover:bg-gray-50 transition-colors gap-4 relative ${!isSession ? 'opacity-60 grayscale-[0.5]' : ''}`}
                >
                  <div className={`flex items-center gap-4 min-w-0 ${activeTab === 'students' && selectedShift !== 'all' ? 'col-span-6' : 'col-span-4'} w-full`}>
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                      !isSession ? 'bg-gray-200 text-gray-400' :
                      Object.values(currentAttendance[id] || {}).every((s: any) => s.status === 'present') 
                        ? 'bg-emerald-100 text-emerald-700' 
                        : Object.values(currentAttendance[id] || {}).some((s: any) => s.status === 'absent')
                          ? 'bg-red-100 text-red-700'
                          : 'bg-blue-100 text-blue-700'
                    }`}>
                      {name.charAt(0)}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <Link 
                        to={path}
                        className="font-bold text-gray-900 hover:text-emerald-600 transition-colors truncate text-sm"
                      >
                        {name}
                      </Link>
                      {!isSession && (
                        <span className="text-[10px] uppercase font-black text-gray-400 tracking-widest mt-0.5">
                          {t('no_session')}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {activeTab === 'students' ? (
                    <>
                      {/* Session 0 Column */}
                      {selectedShift !== 'afternoon' && (
                        <div className={`${selectedShift === 'all' ? 'col-span-4 border-r-0 sm:border-r border-gray-100' : 'col-span-6'} w-full flex flex-col items-center gap-2 px-2 min-h-[60px] justify-center`}>
                          {sessions[0] && (
                            <>
                              <div className={`flex w-full bg-gray-100 rounded-xl p-1 gap-1 ${!isSession ? 'pointer-events-none opacity-40' : ''}`}>
                                {['present', 'absent', 'excused'].map((status) => {
                                  const isActive = currentAttendance[id]?.[0]?.status === status;
                                  const color = status === 'present' ? 'emerald' : status === 'absent' ? 'red' : 'blue';
                                  
                                  return (
                                    <button
                                      key={status}
                                      onClick={() => setStatus(id, status as AttendanceStatus, 0)}
                                      className={`flex-1 flex items-center justify-center p-1.5 rounded-lg transition-all ${
                                        isActive 
                                          ? 'bg-white shadow-sm' 
                                          : 'text-gray-400 hover:text-gray-600'
                                      }`}
                                    >
                                      {status === 'present' ? <Check className={`w-4 h-4 ${isActive ? 'text-emerald-600' : ''}`} /> : 
                                       status === 'absent' ? <X className={`w-4 h-4 ${isActive ? 'text-red-600' : ''}`} /> :
                                       <Clock className={`w-4 h-4 ${isActive ? 'text-blue-600' : ''}`} />}
                                    </button>
                                  );
                                })}
                              </div>
                              {currentAttendance[id]?.[0]?.status === 'excused' && (
                                <input
                                  type="text"
                                  placeholder={t('reason_for_excuse')}
                                  value={currentAttendance[id]?.[0]?.excuse || ''}
                                  onChange={(e) => setExcuse(id, e.target.value, 0)}
                                  className="text-[10px] bg-transparent border-b border-blue-200 outline-none focus:border-blue-500 text-blue-600 pb-0.5 placeholder:text-blue-300 w-full text-center"
                                />
                              )}
                            </>
                          )}
                        </div>
                      )}
                      {/* Session 1 Column */}
                      {selectedShift !== 'morning' && (
                        <div className={`${selectedShift === 'all' ? 'col-span-4' : 'col-span-6'} w-full flex flex-col items-center gap-2 px-2 min-h-[60px] justify-center`}>
                          {sessions[1] && (
                            <>
                              <div className={`flex w-full bg-gray-100 rounded-xl p-1 gap-1 ${!isSession ? 'pointer-events-none opacity-40' : ''}`}>
                                {['present', 'absent', 'excused'].map((status) => {
                                  const isActive = currentAttendance[id]?.[1]?.status === status;
                                  const color = status === 'present' ? 'emerald' : status === 'absent' ? 'red' : 'blue';
                                  
                                  return (
                                    <button
                                      key={status}
                                      onClick={() => setStatus(id, status as AttendanceStatus, 1)}
                                      className={`flex-1 flex items-center justify-center p-1.5 rounded-lg transition-all ${
                                        isActive 
                                          ? 'bg-white shadow-sm' 
                                          : 'text-gray-400 hover:text-gray-600'
                                      }`}
                                    >
                                      {status === 'present' ? <Check className={`w-4 h-4 ${isActive ? 'text-emerald-600' : ''}`} /> : 
                                       status === 'absent' ? <X className={`w-4 h-4 ${isActive ? 'text-red-600' : ''}`} /> :
                                       <Clock className={`w-4 h-4 ${isActive ? 'text-blue-600' : ''}`} />}
                                    </button>
                                  );
                                })}
                              </div>
                              {currentAttendance[id]?.[1]?.status === 'excused' && (
                                <input
                                  type="text"
                                  placeholder={t('reason_for_excuse')}
                                  value={currentAttendance[id]?.[1]?.excuse || ''}
                                  onChange={(e) => setExcuse(id, e.target.value, 1)}
                                  className="text-[10px] bg-transparent border-b border-blue-200 outline-none focus:border-blue-500 text-blue-600 pb-0.5 placeholder:text-blue-300 w-full text-center"
                                />
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="col-span-8 w-full flex items-center justify-center gap-3">
                      <div className="flex bg-gray-100 rounded-2xl p-1 gap-1">
                        {['present', 'absent', 'excused'].map((status) => {
                          const isActive = currentAttendance[id]?.[0]?.status === status;
                          return (
                            <button
                              key={status}
                              onClick={() => setStatus(id, status as AttendanceStatus, 0)}
                              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all text-xs ${
                                isActive 
                                  ? 'bg-white shadow-sm text-emerald-600' 
                                  : 'text-gray-400 hover:text-gray-600'
                              }`}
                            >
                              {status === 'present' ? <Check className="w-4 h-4" /> : 
                               status === 'absent' ? <X className="w-4 h-4" /> :
                               <Clock className="w-4 h-4" />}
                              {t(status)}
                            </button>
                          );
                        })}
                      </div>
                      {currentAttendance[id]?.[0]?.status === 'excused' && (
                        <input
                          type="text"
                          placeholder={t('reason_for_excuse')}
                          value={currentAttendance[id]?.[0]?.excuse || ''}
                          onChange={(e) => setExcuse(id, e.target.value, 0)}
                          className="text-xs bg-transparent border-b border-blue-200 outline-none focus:border-blue-500 text-blue-600 pb-0.5 placeholder:text-blue-300 w-48"
                        />
                      )}
                    </div>
                  )}
                  
                  {activeTab === 'students' && studentsWithActivity[id] && (
                    <div className="absolute top-1 right-1">
                      <span className="flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}

        {filteredDisplayList.length > 0 && (
          <div className="p-6 sm:p-8 bg-emerald-50 border-t flex justify-center sm:justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white px-12 py-4 rounded-2xl font-black transition-all flex items-center justify-center gap-3 shadow-xl shadow-emerald-100 disabled:opacity-50 tracking-wide"
            >
              {saving ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  {t('save_attendance')}
                </>
              )}
            </button>
          </div>
        )}
      </div>

      <AnimatePresence>
        {isLessonModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsLessonModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white rounded-3xl w-full max-w-md p-8 relative z-10 shadow-2xl overflow-y-auto max-h-[90vh] text-black"
            >
              <div className="absolute top-0 right-0 p-4">
                <button 
                  type="button"
                  onClick={() => setIsLessonModalOpen(false)} 
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors text-black"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSaveLesson} className="space-y-6">
                <div>
                  <h3 className="text-2xl font-black text-gray-900 tracking-tight">
                    {isRtl ? 'إضافة حصة مجدولة لطلاب الكُتّاب' : 'Add Scheduled Lesson'}
                  </h3>
                  <p className="text-gray-500 font-medium text-sm mt-1">
                    {isRtl ? 'تحديد مواعيد الحصص وجدول دراسة الطلاب لتسجيل الحضور' : 'Configure lesson schedule for students to enable attendance tracking'}
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Kuttab Select */}
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700">
                      {isRtl ? 'الكُتّاب' : 'Kuttab'}
                    </label>
                    {isSenior ? (
                      <select
                        value={modalKuttabId}
                        onChange={(e) => setModalKuttabId(e.target.value)}
                        className="w-full p-4 bg-gray-50 border rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 text-black font-medium text-sm"
                      >
                        <option value="" disabled>{isRtl ? 'اختر الكُتّاب' : 'Select Kuttab'}</option>
                        {kuttabList.map(k => (
                          <option key={k.id} value={k.id}>{k.name}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        readOnly
                        disabled
                        value={profile?.kuttabName || ''}
                        className="w-full p-4 bg-gray-100 border rounded-2xl outline-none text-gray-500 font-medium text-sm cursor-not-allowed"
                      />
                    )}
                  </div>

                  {/* Date Pick */}
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700">
                      {isRtl ? 'تاريخ الحصة' : 'Lesson Date'}
                    </label>
                    <input
                      type="date"
                      required
                      value={modalDate}
                      onChange={(e) => setModalDate(e.target.value)}
                      className="w-full p-4 bg-gray-50 border rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 text-black font-medium text-sm"
                    />
                  </div>

                  {/* Schedule Type Toggle */}
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700">
                      {isRtl ? 'نوع الجدولة' : 'Schedule Type'}
                    </label>
                    <div className="flex gap-2 p-1 bg-gray-100 rounded-2xl">
                      <button
                        type="button"
                        onClick={() => setModalType('specific')}
                        className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                          modalType === 'specific' 
                            ? 'bg-white text-emerald-700 shadow-sm' 
                            : 'text-gray-500 hover:text-gray-900'
                        }`}
                      >
                        {isRtl ? 'هذا اليوم فقط' : 'This Day Only'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setModalType('recurring')}
                        className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                          modalType === 'recurring' 
                            ? 'bg-white text-emerald-700 shadow-sm' 
                            : 'text-gray-500 hover:text-gray-900'
                        }`}
                      >
                        {isRtl ? 'متكرر أسبوعياً' : 'Weekly Recurring'}
                      </button>
                    </div>
                  </div>

                  {/* Sessions Pickers (Max 2) */}
                  <div className="space-y-4 pt-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest">
                      {isRtl ? 'الحصص الدراسية (بحد أقصى حصتين يومياً)' : 'Study Sessions (Max 2 per day)'}
                    </label>

                    {/* Session 1 */}
                    <div className="p-4 bg-gray-50 border border-gray-100 rounded-2xl space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm">
                          <Clock className="w-4 h-4" />
                          <span>{isRtl ? 'الحصة الأولى (الصباح)' : 'Session 1 (Morning)'}</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={session1Enabled}
                          onChange={(e) => setSession1Enabled(e.target.checked)}
                          className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500 cursor-pointer"
                        />
                      </div>
                      {session1Enabled && (
                        <div className="flex gap-3">
                          <div className="flex-1 space-y-1">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{isRtl ? 'من' : 'From'}</span>
                            <input
                              type="time"
                              required
                              value={session1From}
                              onChange={(e) => setSession1From(e.target.value)}
                              className="w-full bg-white border border-gray-250 p-2 rounded-xl text-xs font-bold outline-none"
                            />
                          </div>
                          <div className="flex-1 space-y-1">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{isRtl ? 'إلى' : 'To'}</span>
                            <input
                              type="time"
                              required
                              value={session1To}
                              onChange={(e) => setSession1To(e.target.value)}
                              className="w-full bg-white border border-gray-250 p-2 rounded-xl text-xs font-bold outline-none"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Session 2 */}
                    <div className="p-4 bg-gray-50 border border-gray-100 rounded-2xl space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-indigo-600 font-bold text-sm">
                          <Clock className="w-4 h-4" />
                          <span>{isRtl ? 'الحصة الثانية (المساء)' : 'Session 2 (Evening)'}</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={session2Enabled}
                          onChange={(e) => setSession2Enabled(e.target.checked)}
                          className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-emerald-500 cursor-pointer"
                        />
                      </div>
                      {session2Enabled && (
                        <div className="flex gap-3">
                          <div className="flex-1 space-y-1">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{isRtl ? 'من' : 'From'}</span>
                            <input
                              type="time"
                              required
                              value={session2From}
                              onChange={(e) => setSession2From(e.target.value)}
                              className="w-full bg-white border border-gray-250 p-2 rounded-xl text-xs font-bold outline-none"
                            />
                          </div>
                          <div className="flex-1 space-y-1">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{isRtl ? 'إلى' : 'To'}</span>
                            <input
                              type="time"
                              required
                              value={session2To}
                              onChange={(e) => setSession2To(e.target.value)}
                              className="w-full bg-white border border-gray-250 p-2 rounded-xl text-xs font-bold outline-none"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsLessonModalOpen(false)}
                    className="flex-1 py-3 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-2xl font-bold text-sm transition-all text-center cursor-pointer"
                  >
                    {isRtl ? 'إلغاء' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    disabled={savingLesson}
                    className="flex-[2] py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black uppercase text-xs tracking-widest transition-all shadow-xl shadow-emerald-100 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {savingLesson ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        {isRtl ? 'حفظ الحصة المجدولة' : 'Save Scheduled Lesson'}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

