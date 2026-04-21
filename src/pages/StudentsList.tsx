import { useState, useMemo, useEffect, FormEvent } from 'react';
import { Search, Plus, Filter, ChevronRight, X, User as UserIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'react-hot-toast';
import { dbService } from '../services/db';
import { auth } from '../lib/firebase';
import type { Student } from '../types';

export default function StudentsList() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  
  // Filter States
  const [ageRange, setAgeRange] = useState({ min: '', max: '' });
  const [minScore, setMinScore] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'age' | 'totalScore'>('name');
  
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
      toast.success('Student enrolled successfully!');
    } catch (err) {
      console.error('Error adding student:', err);
      toast.error('Failed to add student. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const processedStudents = useMemo(() => {
    let result = [...students];

    // Search Filter
    if (search) {
      result = result.filter(s => s.name.toLowerCase().includes(search.toLowerCase()));
    }

    // Age Filter
    if (ageRange.min) {
      result = result.filter(s => s.age >= parseInt(ageRange.min));
    }
    if (ageRange.max) {
      result = result.filter(s => s.age <= parseInt(ageRange.max));
    }

    // Score Filter
    if (minScore) {
      result = result.filter(s => (s.totalScore || 0) >= parseInt(minScore));
    }

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'age') return a.age - b.age;
      if (sortBy === 'totalScore') return (b.totalScore || 0) - (a.totalScore || 0);
      return 0;
    });

    return result;
  }, [students, search, ageRange, minScore, sortBy]);

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

      <div className="space-y-4">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by name..."
              className="w-full pl-12 pr-4 py-3 bg-white border rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`px-6 py-3 border rounded-xl transition-all flex items-center gap-2 font-medium ${
              showFilters 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Filter className={`w-5 h-5 ${showFilters ? 'text-emerald-500' : ''}`} />
            More Filters
          </button>
        </div>

        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="p-6 bg-white border rounded-2xl flex flex-wrap gap-8 shadow-sm">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Age Range</label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="number"
                      placeholder="Min"
                      className="w-20 p-2 bg-gray-50 border rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                      value={ageRange.min}
                      onChange={(e) => setAgeRange({ ...ageRange, min: e.target.value })}
                    />
                    <span className="text-gray-300">-</span>
                    <input 
                      type="number"
                      placeholder="Max"
                      className="w-20 p-2 bg-gray-50 border rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                      value={ageRange.max}
                      onChange={(e) => setAgeRange({ ...ageRange, max: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Min. Total Score</label>
                  <input 
                    type="number"
                    placeholder="e.g. 80"
                    className="w-32 p-2 bg-gray-50 border rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                    value={minScore}
                    onChange={(e) => setMinScore(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Sort By</label>
                  <select 
                    className="p-2 bg-gray-50 border rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-medium"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                  >
                    <option value="name">Portion: Name (A-Z)</option>
                    <option value="age">Portion: Age (Youngest)</option>
                    <option value="totalScore">Portion: Rank (Highest Score)</option>
                  </select>
                </div>

                <div className="flex items-end pb-1">
                  <button 
                    onClick={() => {
                      setAgeRange({ min: '', max: '' });
                      setMinScore('');
                      setSortBy('name');
                    }}
                    className="text-xs font-bold text-red-400 hover:text-red-500 uppercase tracking-widest underline underline-offset-4"
                  >
                    Clear All
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="bg-white border rounded-2xl shadow-sm overflow-hidden text-black">
        {loading ? (
          <div className="p-12 text-center text-gray-500 font-medium">Loading students...</div>
        ) : processedStudents.length === 0 ? (
          <div className="p-12 text-center text-gray-500 font-medium italic">
            No students match your current filters.
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
              {processedStudents.map((student, i) => (
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

