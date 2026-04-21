import { useState, useMemo, useEffect, FormEvent } from 'react';
import { Search, Plus, Filter, ChevronRight, X, User as UserIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { dbService } from '../services/db';
import { auth } from '../lib/firebase';
import type { Student } from '../types';

export default function StudentsList() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newStudent, setNewStudent] = useState({ name: '', age: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    if (!auth.currentUser) return;
    try {
      const data = await dbService.getStudents(auth.currentUser.uid);
      setStudents(data);
    } catch (err) {
      console.error('Error fetching students:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddStudent = async (e: FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    setIsSubmitting(true);
    try {
      await dbService.addStudent({
        name: newStudent.name,
        age: parseInt(newStudent.age),
        enrollmentDate: new Date().toISOString(),
        teacherId: auth.currentUser.uid,
        attendanceRate: 0,
        memorizationProgress: 0,
        accuracy: 0,
        totalScore: 0
      });
      setIsModalOpen(false);
      setNewStudent({ name: '', age: '' });
      fetchStudents();
    } catch (err) {
      console.error('Error adding student:', err);
      alert('Failed to add student. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredStudents = useMemo(() => {
    return students.filter(s => s.name.toLowerCase().includes(search.toLowerCase()));
  }, [students, search]);

  return (
    <div className="p-8 space-y-8">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Students Directory</h2>
          <p className="text-gray-500 mt-1">Manage and track individual progress</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl font-medium transition-colors flex items-center gap-2 shadow-lg shadow-emerald-200"
        >
          <Plus className="w-5 h-5" />
          Add New Student
        </button>
      </header>

      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search by name..."
            className="w-full pl-12 pr-4 py-3 bg-white border rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button className="px-6 py-3 border bg-white rounded-xl text-gray-600 hover:bg-gray-50 transition-colors flex items-center gap-2">
          <Filter className="w-5 h-5" />
          More Filters
        </button>
      </div>

      <div className="bg-white border rounded-2xl shadow-sm overflow-hidden text-black">
        {loading ? (
          <div className="p-12 text-center text-gray-500">Loading students...</div>
        ) : filteredStudents.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            {search ? 'No students found matching your search.' : 'No students enrolled yet.'}
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs uppercase text-gray-400 tracking-wider bg-gray-50">
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Age</th>
                <th className="px-6 py-4">Memorization</th>
                <th className="px-6 py-4">Overall Score</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredStudents.map((student, i) => (
                <motion.tr
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  key={student.id}
                  className="group hover:bg-emerald-50/50 transition-colors cursor-pointer"
                >
                  <td className="px-6 py-4">
                    <div className="font-semibold text-gray-900">{student.name}</div>
                  </td>
                  <td className="px-6 py-4 text-gray-600">{student.age} y/o</td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium">
                      Tracking active
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-bold px-3 py-1 rounded-full text-sm bg-emerald-50 text-emerald-700">
                      {student.totalScore}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link 
                      to={`/students/${student.id}`}
                      className="p-2 hover:bg-emerald-100 rounded-lg text-emerald-600 transition-colors inline-block"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </Link>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add Student Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden relative text-black"
            >
              <button 
                onClick={() => setIsModalOpen(false)}
                className="absolute top-6 right-6 p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-500"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="p-8">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mb-6">
                  <UserIcon className="w-6 h-6" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">New Student</h3>
                <p className="text-gray-500 mb-8">Enter student details to add them to your program.</p>

                <form onSubmit={handleAddStudent} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700">Full Name</label>
                    <input
                      required
                      type="text"
                      className="w-full p-4 bg-gray-50 border rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none"
                      placeholder="e.g. Abdullah Ahmad"
                      value={newStudent.name}
                      onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700">Age</label>
                    <input
                      required
                      type="number"
                      min="4"
                      max="20"
                      className="w-full p-4 bg-gray-50 border rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none"
                      placeholder="e.g. 10"
                      value={newStudent.age}
                      onChange={(e) => setNewStudent({ ...newStudent, age: e.target.value })}
                    />
                  </div>
                  <button
                    disabled={isSubmitting}
                    type="submit"
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-2xl font-bold transition-all shadow-lg shadow-emerald-100 disabled:opacity-50"
                  >
                    {isSubmitting ? 'Adding...' : 'Enroll Student'}
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

