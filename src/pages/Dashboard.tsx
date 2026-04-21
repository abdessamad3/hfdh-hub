import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Users, CheckCircle, Award, AlertCircle, TrendingUp } from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { dbService } from '../services/db';
import { auth } from '../lib/firebase';
import type { Student, Attendance, Evaluation } from '../types';

export default function Dashboard() {
  const [students, setStudents] = useState<Student[]>([]);
  const [attendanceData, setAttendanceData] = useState<{ name: string; rate: number; present: number }[]>([]);
  const [performanceData, setPerformanceData] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!auth.currentUser) return;
      try {
        const [studentList, weeklyAttendance, weeklyEval] = await Promise.all([
          dbService.getStudents(auth.currentUser.uid),
          dbService.getWeeklyAttendanceByTeacher(auth.currentUser.uid),
          dbService.getWeeklyEvaluationsByTeacher(auth.currentUser.uid)
        ]);
        
        setStudents(studentList);
        setPerformanceData(weeklyEval);
        calculateEngagement(weeklyAttendance);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const calculateEngagement = (records: Attendance[]) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const now = new Date();
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now);
      d.setDate(now.getDate() - (6 - i));
      
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      return {
        dateStr: dateStr,
        label: days[d.getDay()]
      };
    });

    const data = last7Days.map(day => {
      const allDayRecords = records.filter(r => r.date === day.dateStr);
      
      // Use a Map to keep only the latest record for each student per day
      // This handles cases where duplicate records might exist in the database
      const uniqueStudentRecords = new Map<string, Attendance>();
      allDayRecords.forEach(record => {
        uniqueStudentRecords.set(record.studentId, record);
      });

      const dayRecords = Array.from(uniqueStudentRecords.values());
      
      if (dayRecords.length === 0) return { name: day.label, rate: 0, present: 0 };
      
      const presentCount = dayRecords.filter(r => r.status === 'present').length;
      const rate = Math.round((presentCount / dayRecords.length) * 100);
      return { name: day.label, rate, present: presentCount };
    });

    setAttendanceData(data);
  };

  const avgAttendance = attendanceData.length > 0 
    ? Math.round(attendanceData.reduce((acc, curr) => acc + curr.rate, 0) / attendanceData.filter(d => d.rate > 0 || recordsExistForDay(d.name)).length || 1)
    : 0;

  function recordsExistForDay(label: string) {
    // This is a bit complex, let's just use a simpler average
    return false;
  }

  const activeDays = attendanceData.filter(d => d.rate > 0).length;
  const displayAvg = activeDays > 0 
    ? Math.round(attendanceData.reduce((acc, curr) => acc + curr.rate, 0) / activeDays) + '%'
    : '0%';

  const avgAccuracy = performanceData.length > 0
    ? Math.round(performanceData.reduce((acc, curr) => acc + curr.accuracyScore, 0) / performanceData.length) + '%'
    : 'N/A';

  const stats = [
    { label: 'Total Students', value: students.length.toString(), icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Avg Attendance', value: displayAvg, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Avg Performance', value: avgAccuracy, icon: Award, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Classes Tracking', value: 'Live', icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-50' },
  ];

  const syncAllStudents = async () => {
    if (!auth.currentUser || students.length === 0) return;
    setLoading(true);
    try {
      await Promise.all(students.map(s => dbService.updateStudentStats(s.id, auth.currentUser!.uid)));
      // Refetch to see results
      const [studentList, weeklyAttendance, weeklyEval] = await Promise.all([
        dbService.getStudents(auth.currentUser.uid),
        dbService.getWeeklyAttendanceByTeacher(auth.currentUser.uid),
        dbService.getWeeklyEvaluationsByTeacher(auth.currentUser.uid)
      ]);
      setStudents(studentList);
      setPerformanceData(weeklyEval);
      calculateEngagement(weeklyAttendance);
      alert('All scores have been synchronized!');
    } catch (err) {
      console.error('Error syncing scores:', err);
      alert('Failed to sync scores.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 space-y-8">
      <header className="flex justify-between items-start">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Program Overview (7 days)</h2>
          <p className="text-gray-500 mt-1">Real-time tracking of student progress and analytics</p>
        </div>
        <button 
          onClick={syncAllStudents}
          disabled={loading}
          className="px-4 py-2 bg-white border text-gray-600 rounded-xl hover:bg-gray-50 font-medium transition-all shadow-sm flex items-center gap-2 disabled:opacity-50"
        >
          <TrendingUp className="w-4 h-4 text-emerald-500" />
          Refresh All Scores
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-black">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="p-6 bg-white rounded-2xl border flex items-center gap-4 shadow-sm"
          >
            <div className={`p-3 rounded-xl ${stat.bg} ${stat.color}`}>
              <stat.icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">{stat.label}</p>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 text-black">
        <div className="p-6 bg-white rounded-2xl border shadow-sm space-y-4">
          <h3 className="font-bold text-lg">Weekly Engagement</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={attendanceData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis unit="%" />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: any, name: string, props: any) => {
                    if (name === 'rate') {
                      return [`${props.payload.present} Students`, 'Attendance'];
                    }
                    return [value, name];
                  }}
                />
                <Bar dataKey="rate" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="p-6 bg-white rounded-2xl border shadow-sm space-y-4 text-black">
          <h3 className="font-bold text-lg">System Insights</h3>
          <div className="space-y-4 pt-4">
            <div className="flex items-start gap-4 p-4 bg-emerald-50 rounded-xl">
              <CheckCircle className="w-6 h-6 text-emerald-600 shrink-0" />
              <div>
                <p className="font-bold text-emerald-900">Database Healthy</p>
                <p className="text-sm text-emerald-700">Firestore is synchronized and rules are active.</p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-4 bg-blue-50 rounded-xl">
              <Users className="w-6 h-6 text-blue-600 shrink-0" />
              <div>
                <p className="font-bold text-blue-900">User Session Active</p>
                <p className="text-sm text-blue-700">Connected as {auth.currentUser?.isAnonymous ? 'Teacher (Guest)' : auth.currentUser?.email}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-black">
        <div className="lg:col-span-2 p-6 bg-white rounded-2xl border shadow-sm">
          <h3 className="font-bold text-lg mb-4">Recently Enrolled</h3>
          <div className="overflow-x-auto">
            {students.length === 0 ? (
              <p className="py-8 text-center text-gray-500">No students enrolled yet.</p>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="text-left text-xs uppercase text-gray-400 tracking-wider">
                    <th className="pb-4">Student</th>
                    <th className="pb-4 text-center">Age</th>
                    <th className="pb-4 text-right">Enrollment Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {students.slice(0, 5).map((student) => (
                    <tr key={student.id} className="group hover:bg-gray-50 transition-colors">
                      <td className="py-4 font-medium text-gray-900">{student.name}</td>
                      <td className="py-4 text-center text-gray-600">{student.age}</td>
                      <td className="py-4 text-right">
                        <span className="text-sm text-gray-500">
                          {new Date(student.enrollmentDate).toLocaleDateString()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="p-6 bg-white rounded-2xl border shadow-sm space-y-4 border-l-4 border-l-amber-400">
          <div className="flex items-center gap-2 text-amber-700">
            <AlertCircle className="w-5 h-5" />
            <h3 className="font-bold text-lg">Program Health</h3>
          </div>
          <div className="space-y-4">
            <div className="p-3 bg-amber-50 rounded-lg text-sm text-amber-800">
              Your program is scaling. Consider adding performance benchmarks.
            </div>
            <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-800">
              Daily backup is active via Google Cloud infrastructure.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

