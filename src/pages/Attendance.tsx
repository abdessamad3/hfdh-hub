import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Calendar as CalendarIcon, Check, X, Save, Clock, Users, GraduationCap } from 'lucide-react';
import { motion } from 'motion/react';
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
  
  const [saving, setSaving] = useState(false);

  const isSenior = profile?.role === 'admin' || profile?.role === 'manager';

  useEffect(() => {
    fetchData();
  }, [activeTab, date]);

  const fetchData = async () => {
    if (!auth.currentUser || !profile) return;
    setLoading(true);
    try {
      // Fetch kuttabs first to ensure session checks work during initialization
      const kuttabsData = await dbService.getAllKuttabs();
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
                initialMap[s.id][idx] = { status: 'present' };
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
    if (!kName || !lookup[kName]) return [];
    
    const kuttab = lookup[kName];
    const schedule = kuttab.schedule?.lessons;
    if (!schedule) return [];

    if (schedule[dateStr]) {
      return schedule[dateStr].lessons;
    }

    const dayIdx = getDayIndex(dateStr);
    const recurring = schedule[dayIdx.toString()];
    if (recurring && recurring.type === 'recurring') {
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
      setStudentAttendance(prev => ({
        ...prev,
        [id]: { 
          ...prev[id], 
          [sessionIndex]: { ...(prev[id]?.[sessionIndex] || {}), status }
        }
      }));
    } else {
      setTeacherAttendance(prev => ({
        ...prev,
        [id]: { 
          ...prev[id], 
          [sessionIndex]: { ...(prev[id]?.[sessionIndex] || {}), status }
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
  const currentAttendance = activeTab === 'students' ? studentAttendance : teacherAttendance;

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto space-y-8">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-black">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">{t('daily_attendance')}</h2>
          <p className="text-gray-500 mt-1 text-sm sm:text-base">{t('mark_attendance')} {formatDate(date)}</p>
        </div>
        <div className={`w-full sm:w-auto flex items-center gap-3 bg-white border px-4 py-2.5 rounded-xl shadow-sm transition-all ${
          date === new Date().toLocaleDateString('en-CA') 
            ? 'border-emerald-500 ring-2 ring-emerald-50' 
            : 'border-gray-100'
        }`}>
          <CalendarIcon className="w-5 h-5 text-emerald-500" />
          <input 
            type="date" 
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="flex-1 sm:flex-none outline-none bg-transparent font-bold text-gray-700"
          />
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
            {displayList.length > 0 && (
              <>
                <button 
                  onClick={() => {
                    const updated = { ...currentAttendance };
                    displayList.forEach(item => {
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
                    displayList.forEach(item => {
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
        ) : displayList.length === 0 ? (
          <div className="p-12 text-center text-gray-500 font-medium italic">
            {activeTab === 'students' 
              ? (students.length > 0 ? t('no_students_with_sessions') : t('no_students_enrolled'))
              : t('no_teachers_enrolled')
            }
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {/* Headers for two columns logic */}
            {activeTab === 'students' && (
              <div className="hidden sm:grid grid-cols-12 px-6 py-3 bg-gray-50 text-[10px] uppercase font-black text-gray-400 tracking-widest border-b">
                <div className="col-span-4">{t('student')}</div>
                <div className="col-span-4 text-center border-x border-gray-100">{t('morning')}</div>
                <div className="col-span-4 text-center">{t('afternoon')}</div>
              </div>
            )}
            
            {displayList.map((item, i) => {
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
                  <div className="flex items-center gap-4 min-w-0 col-span-4 w-full">
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
                      <div className="col-span-4 w-full flex flex-col items-center gap-2 border-r-0 sm:border-r border-gray-100 px-2 min-h-[60px] justify-center">
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
                      {/* Session 1 Column */}
                      <div className="col-span-4 w-full flex flex-col items-center gap-2 px-2 min-h-[60px] justify-center">
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

        {displayList.length > 0 && (
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
    </div>
  );
}

