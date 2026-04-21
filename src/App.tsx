import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged, signInAnonymously, signInWithPopup, GoogleAuthProvider, User } from 'firebase/auth';
import { auth } from './lib/firebase';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import StudentsList from './pages/StudentsList';
import StudentProfile from './pages/StudentProfile';
import AttendancePage from './pages/Attendance';
import EvaluationEntry from './pages/EvaluationEntry';
import RankingPage from './pages/RankingPage';
import { BookOpen, LogIn, Chrome, AlertCircle } from 'lucide-react';

function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="flex bg-gray-50 min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}

function Login() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      // Important: Prefer popup for this environment
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      console.error('Login Error:', err);
      if (err.code === 'auth/admin-restricted-operation') {
        setError('This operation is restricted. Please ensure Google Login is enabled in your Firebase Console and you are using a supported browser.');
      } else {
        setError(err.message || 'Failed to sign in with Google');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white rounded-3xl border shadow-2xl p-10 space-y-8">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
            <BookOpen className="w-10 h-10" />
          </div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">Hifdh Hub</h1>
          <p className="text-gray-500">Teacher Dashboard Access</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 p-4 rounded-2xl flex items-start gap-3 text-red-600 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <div className="space-y-4">
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-2xl font-bold transition-all transform hover:scale-[1.01] active:scale-95 flex items-center justify-center gap-3 shadow-lg shadow-emerald-100 disabled:opacity-50"
          >
            {loading ? (
              <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Chrome className="w-6 h-6" />
                Sign in with Google
              </>
            )}
          </button>
        </div>

        <div className="text-center space-y-3">
          <div className="text-xs text-gray-400">
            Secure, real-time Quran memorization tracking for teachers.
          </div>
          <div className="p-3 bg-blue-50 text-blue-700 rounded-xl text-[11px] leading-relaxed font-medium">
            💡 **Tip:** If the popup is blocked or fails, click the **"Open in new tab"** button at the top right of this preview.
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/students" element={<StudentsList />} />
          <Route path="/students/:id" element={<StudentProfile />} />
          <Route path="/attendance" element={<AttendancePage />} />
          <Route path="/evaluation" element={<EvaluationEntry />} />
          <Route path="/ranking" element={<RankingPage />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Layout>
    </Router>
  );
}
