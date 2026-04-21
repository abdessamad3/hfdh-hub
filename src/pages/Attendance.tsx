import { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Check, X, Save } from 'lucide-react';
import { motion } from 'motion/react';
import { dbService } from '../services/db';
import { auth } from '../lib/firebase';
import type { Student } from '../types';

export default function AttendancePage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(new Date().toLocaleDateString('en-CA')); // YYYY-MM-DD in local time
  const [attendance, setAttendance] = useState<Record<string, 'present' | 'absent'>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchStudents();
  }, []);

  useEffect(() => {
    if (students.length > 0) {
      fetchExistingAttendance();
    }
  }, [date, students]);

  const fetchStudents = async () => {
    if (!auth.currentUser) return;
    try {
      const data = await dbService.getStudents(auth.currentUser.uid);
      setStudents(data);
      // Default to present if no records found later
      setAttendance(Object.fromEntries(data.map(s => [s.id, 'present'])));
    } catch (err) {
      console.error('Error fetching students:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchExistingAttendance = async () => {
    if (!auth.currentUser) return;
    try {
      const existing = await dbService.getAttendanceByDate(auth.currentUser.uid, date);
      if (existing.length > 0) {
        const newAttendance = { ...attendance };
        existing.forEach(record => {
          newAttendance[record.studentId] = record.status;
        });
        setAttendance(newAttendance);
      } else {
        // If no records for this date, default all to present
        setAttendance(Object.fromEntries(students.map(s => [s.id, 'present'])));
      }
    } catch (err) {
      console.error('Error fetching historical attendance:', err);
    }
  };

  const toggleAttendance = (id: string) => {
    setAttendance(prev => ({
      ...prev,
      [id]: prev[id] === 'present' ? 'absent' : 'present'
    }));
  };

  const formatDisplayDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString(undefined, { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const handleSave = async () => {
    if (!auth.currentUser) return;
    setSaving(true);
    try {
      const records = Object.entries(attendance).map(([studentId, status]) => ({
        studentId,
        teacherId: auth.currentUser!.uid,
        date,
        status: status as 'present' | 'absent'
      }));
      await dbService.saveAttendance(records);
      alert('Attendance saved successfully!');
    } catch (err) {
      console.error('Error saving attendance:', err);
      alert('Failed to save attendance.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <header className="flex justify-between items-center text-black">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Daily Attendance</h2>
          <p className="text-gray-500 mt-1">Mark attendance for {formatDisplayDate(date)}</p>
        </div>
        <div className="flex items-center gap-3 bg-white border px-4 py-2 rounded-xl">
          <CalendarIcon className="w-5 h-5 text-gray-400" />
          <input 
            type="date" 
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="outline-none bg-transparent font-medium"
          />
        </div>
      </header>

      <div className="bg-white border rounded-3xl shadow-sm overflow-hidden text-black">
        <div className="p-6 border-bottom bg-gray-50/50 flex justify-between items-center">
          <h3 className="font-bold">Student List</h3>
          <div className="flex gap-2">
            <button 
              onClick={() => setAttendance(Object.fromEntries(students.map(s => [s.id, 'present'])))}
              className="text-xs font-bold text-emerald-600 hover:bg-emerald-50 px-3 py-1.5 rounded-lg transition-colors"
            >
              All Present
            </button>
            <button 
              onClick={() => setAttendance(Object.fromEntries(students.map(s => [s.id, 'absent'])))}
              className="text-xs font-bold text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors"
            >
              All Absent
            </button>
          </div>
        </div>
        
        {loading ? (
          <div className="p-12 text-center text-gray-500">Loading students...</div>
        ) : students.length === 0 ? (
          <div className="p-12 text-center text-gray-500">No students enrolled.</div>
        ) : (
          <div className="divide-y">
            {students.map((student, i) => (
              <motion.div 
                key={student.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="p-6 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                    attendance[student.id] === 'present' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {student.name.charAt(0)}
                  </div>
                  <span className="font-semibold text-gray-900">{student.name}</span>
                </div>
                
                <div className="flex bg-gray-100 rounded-xl p-1">
                  <button
                    onClick={() => toggleAttendance(student.id)}
                    className={`flex items-center gap-2 px-6 py-2 rounded-lg font-bold transition-all ${
                      attendance[student.id] === 'present' 
                        ? 'bg-white text-emerald-600 shadow-sm' 
                        : 'text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    <Check className="w-4 h-4" />
                    Present
                  </button>
                  <button
                    onClick={() => toggleAttendance(student.id)}
                    className={`flex items-center gap-2 px-6 py-2 rounded-lg font-bold transition-all ${
                      attendance[student.id] === 'absent' 
                        ? 'bg-white text-red-600 shadow-sm' 
                        : 'text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    <X className="w-4 h-4" />
                    Absent
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {students.length > 0 && (
          <div className="p-8 bg-emerald-50 border-t flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-10 py-3.5 rounded-2xl font-bold transition-all flex items-center gap-2 shadow-lg shadow-emerald-200 disabled:opacity-50"
            >
              {saving ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Save Attendance
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

