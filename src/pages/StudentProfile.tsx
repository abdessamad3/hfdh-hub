import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Calendar, BookOpen, Award, ChevronLeft, TrendingUp, AlertCircle, Trash2, Edit2 } from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area 
} from 'recharts';
import { dbService } from '../services/db';
import { auth } from '../lib/firebase';
import type { Student, Evaluation } from '../types';
import EditStudentModal from '../components/EditStudentModal';
import EditEvaluationModal from '../components/EditEvaluationModal';

export default function StudentProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [student, setStudent] = useState<Student | null>(null);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingEvaluation, setEditingEvaluation] = useState<Evaluation | null>(null);

  const fetchData = async () => {
    if (!id || !auth.currentUser) return;
    try {
      const [studentData, evalData] = await Promise.all([
        dbService.getStudent(id),
        dbService.getEvaluations(id, auth.currentUser!.uid)
      ]);
      setStudent(studentData);
      setEvaluations(evalData);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const handleUpdateStudent = async (data: Partial<Student>) => {
    if (!id) return;
    try {
      await dbService.updateStudent(id, data);
      await fetchData();
    } catch (err) {
      console.error('Error updating student:', err);
      throw err;
    }
  };

  const handleUpdateEvaluation = async (data: Partial<Evaluation>) => {
    if (!id || !auth.currentUser || !editingEvaluation) return;
    try {
      await dbService.updateEvaluation(editingEvaluation.id, data, id, auth.currentUser.uid);
      await fetchData();
    } catch (err) {
      console.error('Error updating evaluation:', err);
      throw err;
    }
  };

  const handleDeleteEvaluation = async (evalId: string) => {
    if (!id || !auth.currentUser) return;
    if (!window.confirm('Are you sure you want to delete this evaluation? This will also update the student\'s score.')) return;
    
    try {
      await dbService.deleteEvaluation(evalId, id, auth.currentUser.uid);
      await fetchData(); // Refresh data
    } catch (err) {
      console.error('Error deleting evaluation:', err);
      alert('Failed to delete evaluation.');
    }
  };

  const handleDeleteStudent = async () => {
    if (!id || !window.confirm('Are you sure you want to delete this student and ALL their data? This cannot be undone.')) return;
    
    try {
      await dbService.deleteStudent(id);
      navigate('/students');
    } catch (err) {
      console.error('Error deleting student:', err);
      alert('Failed to delete student.');
    }
  };

  if (loading) return <div className="p-8 text-center">Loading profile...</div>;
  if (!student) return <div className="p-8 text-center">Student not found.</div>;

  const chartData = evaluations.map(e => ({
    date: new Date(e.date).toLocaleDateString(),
    accuracy: e.accuracyScore,
    mistakes: e.mistakesCount
  })).reverse();

  return (
    <div className="p-8 space-y-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center">
        <Link to="/students" className="inline-flex items-center gap-2 text-emerald-600 font-bold hover:gap-3 transition-all">
          <ChevronLeft className="w-5 h-5" />
          Back to Students
        </Link>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsEditModalOpen(true)}
            className="flex items-center gap-2 text-emerald-600 hover:text-emerald-700 font-bold transition-all text-sm px-4 py-2 hover:bg-emerald-50 rounded-xl"
          >
            <Edit2 className="w-4 h-4" />
            Edit Profile
          </button>
          <button 
            onClick={handleDeleteStudent}
            className="flex items-center gap-2 text-red-500 hover:text-red-700 font-bold transition-all text-sm px-4 py-2 hover:bg-red-50 rounded-xl"
          >
            <Trash2 className="w-4 h-4" />
            Delete Student
          </button>
        </div>
      </div>

      <div className="bg-white border rounded-3xl p-8 shadow-sm flex flex-col md:flex-row gap-8 items-start relative overflow-hidden">
        <div className="absolute top-0 right-0 p-12 bg-emerald-50 rounded-bl-[100px] -z-0 opacity-50" />
        
        <div className="w-32 h-32 bg-emerald-100 rounded-3xl flex items-center justify-center text-4xl font-black text-emerald-700 shadow-inner z-10">
          {student.name.substring(0, 2).toUpperCase()}
        </div>

        <div className="space-y-4 flex-1 z-10">
          <div>
            <h2 className="text-4xl font-black text-gray-900">{student.name}</h2>
            <p className="text-gray-500 font-medium">
              Joined {new Date(student.enrollmentDate).toLocaleDateString()} • {student.age} Years Old
            </p>
          </div>
          
          <div className="flex flex-wrap gap-4 pt-2">
            <div className="px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl font-bold flex items-center gap-2">
              <Award className="w-5 h-5" />
              Score: {student.totalScore}
            </div>
            <div className="px-4 py-2 bg-blue-50 text-blue-700 rounded-xl font-bold flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              {evaluations.length} Sessions Logged
            </div>
            <div className="px-4 py-2 bg-amber-50 text-amber-700 rounded-xl font-bold flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Tracking Active
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="p-6 bg-white border rounded-3xl shadow-sm space-y-6">
          <h3 className="font-bold text-xl flex items-center gap-2 text-black">
            <TrendingUp className="w-6 h-6 text-emerald-500" />
            Accuracy Progress
          </h3>
          <div className="h-64 w-full">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorAcc" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" hide />
                  <YAxis unit="%" domain={[0, 100]} />
                  <Tooltip />
                  <Area type="monotone" dataKey="accuracy" stroke="#10b981" fillOpacity={1} fill="url(#colorAcc)" strokeWidth={3} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400">No evaluation data yet.</div>
            )}
          </div>
        </div>

        <div className="p-6 bg-white border rounded-3xl shadow-sm space-y-6">
          <h3 className="font-bold text-xl flex items-center gap-2 text-black">
            <AlertCircle className="w-6 h-6 text-red-500" />
            Mistakes History
          </h3>
          <div className="h-64 w-full">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" hide />
                  <YAxis />
                  <Tooltip />
                  <Line type="step" dataKey="mistakes" stroke="#ef4444" strokeWidth={3} dot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400">No evaluation data yet.</div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white border rounded-3xl shadow-sm overflow-hidden text-black mt-8">
        <div className="p-6 bg-gray-50 flex justify-between items-center border-b">
          <h3 className="font-bold flex items-center gap-2 uppercase text-xs tracking-widest text-gray-500">
            <BookOpen className="w-4 h-4" />
            Combined Memorization & Evaluation History
          </h3>
        </div>
        <div className="divide-y text-black">
          {evaluations.length === 0 ? (
            <div className="p-12 text-center text-gray-500 font-medium">No unified records found.</div>
          ) : (
            evaluations.map((evalItem) => (
              <div key={evalItem.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                  <div className="space-y-4 flex-1">
                    <div className="flex items-center gap-3">
                      <div className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold uppercase">
                        Progress Log
                      </div>
                      <p className="font-bold text-gray-900">
                        {new Date(evalItem.date).toLocaleDateString(undefined, { dateStyle: 'long' })}
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                        <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Surah & Portion</p>
                        <p className="font-black text-gray-800">{evalItem.surahName || 'N/A'}</p>
                        <p className="text-sm text-gray-500 font-medium">Ayah {evalItem.fromAyah} to {evalItem.toAyah}</p>
                        {evalItem.hizbNumber && (
                          <p className="text-[10px] font-bold text-emerald-600 mt-1 uppercase">
                            Hizb {evalItem.hizbNumber} • {evalItem.quantity}/8 Quantity
                          </p>
                        )}
                      </div>
                      <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                        <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Teacher Notes</p>
                        <p className="text-sm text-gray-600 line-clamp-2">{evalItem.notes || 'No notes provided.'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-4 self-center lg:self-start">
                    <div className="flex items-center gap-4">
                      <div className="text-center px-4 py-3 bg-red-50 rounded-2xl border border-red-100 min-w-[110px]">
                        <p className="text-[10px] font-bold text-red-400 uppercase mb-1">Mistakes</p>
                        <p className="text-2xl font-black text-red-600">{evalItem.mistakesCount}</p>
                      </div>
                      <div className="text-center px-4 py-3 bg-emerald-50 rounded-2xl border border-emerald-100 min-w-[110px]">
                        <p className="text-[10px] font-bold text-emerald-400 uppercase mb-1">Accuracy</p>
                        <p className="text-2xl font-black text-emerald-600">{evalItem.accuracyScore}%</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => setEditingEvaluation(evalItem)}
                        className="p-3 text-emerald-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-2xl transition-all border border-transparent hover:border-emerald-100"
                        title="Edit Record"
                      >
                        <Edit2 className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={() => handleDeleteEvaluation(evalItem.id)}
                        className="p-3 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-all border border-transparent hover:border-red-100"
                        title="Delete Record"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <EditStudentModal 
        student={student}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleUpdateStudent}
      />

      {editingEvaluation && (
        <EditEvaluationModal
          evaluation={editingEvaluation}
          isOpen={!!editingEvaluation}
          onClose={() => setEditingEvaluation(null)}
          onSave={handleUpdateEvaluation}
        />
      )}
    </div>
  );
}

