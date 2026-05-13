import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, User } from 'firebase/auth';
import { auth } from './lib/firebase';
import { dbService } from './services/db';
import { UserProfile } from './types';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import StudentsList from './pages/StudentsList';
import StudentProfile from './pages/StudentProfile';
import AttendancePage from './pages/Attendance';
import MonthlyReport from './pages/MonthlyReport';
import EvaluationEntry from './pages/EvaluationEntry';
import RankingPage from './pages/RankingPage';
import StudentPortal from './pages/StudentPortal';
import StudentCalendarPage from './pages/StudentCalendarPage';
import StudentAttendancePage from './pages/StudentAttendancePage';
import StudentProgressPage from './pages/StudentProgressPage';
import RevisionEntry from './pages/RevisionEntry';
import NextRevisionTask from './pages/NextRevisionTask';
import KuttabManagement from './pages/KuttabManagement';
import TeachersList from './pages/TeachersList';
import TeacherProfile from './pages/TeacherProfile';
import KuttabProfile from './pages/KuttabProfile';
import LoginHistory from './pages/LoginHistory';
import AdminSearchBar from './components/AdminSearchBar';
import NextRevisionNotifier from './components/NextRevisionNotifier';
import { BookOpen, AlertCircle, Chrome, Menu, Globe } from 'lucide-react';
import { Toaster } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

function Layout({ children, profile }: { children: ReactNode; profile: UserProfile | null }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { i18n, t } = useTranslation();

  useEffect(() => {
    const dir = i18n.language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.dir = dir;
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  return (
    <div className={`flex bg-gray-50 min-h-screen ${i18n.language === 'ar' ? 'font-arabic' : ''}`}>
      <NextRevisionNotifier profile={profile} />
      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
        profile={profile}
      />
      <div className={`flex-1 flex flex-col min-w-0 ${i18n.language === 'ar' ? 'lg:mr-64' : 'lg:ml-64'}`}>
        {/* Mobile Header */}
        <header className="lg:hidden bg-white border-b px-6 py-4 flex items-center justify-between sticky top-0 z-30 shadow-sm">
          <div className="flex items-center gap-2 text-emerald-700 font-bold">
            <BookOpen className="w-8 h-8" />
            <span className="text-xl tracking-tight">{t('app_name')}</span>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 hover:bg-emerald-50 rounded-xl text-emerald-600 transition-colors"
          >
            <Menu className="w-8 h-8" />
          </button>
        </header>
        
        {/* Admin Search Bar - Desktop & Mobile */}
        {(profile?.role === 'admin' || profile?.role === 'manager') && (
          <div className="bg-white border-b px-4 py-3 sticky top-0 lg:static z-20 shadow-sm lg:shadow-none">
            <AdminSearchBar profile={profile} />
          </div>
        )}

        <main className="flex-1 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}

function Login({ externalError }: { externalError?: string | null }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { t, i18n } = useTranslation();

  useEffect(() => {
    if (externalError) {
      setError(t('unauthorized_access'));
    }
  }, [externalError, t]);

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
        setError('Google Login requires a supported browser. If on mobile, please try opening in a native browser or ensure Google Auth is active.');
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
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">{t('app_name')}</h1>
          <p className="text-gray-500 font-medium italic">{t('quranic_excellence')}</p>
        </div>

        <div className="flex justify-center gap-2 mb-4">
          <button 
            onClick={() => i18n.changeLanguage('en')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${i18n.language === 'en' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-500'}`}
          >
            EN
          </button>
          <button 
            onClick={() => i18n.changeLanguage('ar')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${i18n.language === 'ar' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-500'}`}
          >
            عربي
          </button>
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
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-2xl font-black transition-all transform hover:scale-[1.01] active:scale-95 flex items-center justify-center gap-3 shadow-xl shadow-emerald-100 disabled:opacity-50 tracking-wide"
          >
            {loading ? (
              <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Chrome className="w-6 h-6" />
                {t('continue_with_google')}
              </>
            )}
          </button>
        </div>

        <div className="text-center space-y-3">
          <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-loose">
            {t('one_platform')}
          </div>
          <div className="text-[11px] text-gray-500 bg-gray-50 p-3 rounded-xl border border-dashed">
            <p><strong>{t('teachers')}:</strong> {t('teachers_instruction')}</p>
            <p><strong>{t('students')}:</strong> {t('students_instruction')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const ADMIN_EMAIL = 'abdessamadjibrane2@gmail.com';

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setAuthError(null);
      if (u) {
        try {
          const email = (u.email || '').toLowerCase();
          const [studentDoc, teacherDoc] = await Promise.all([
            dbService.getStudentByEmail(email),
            dbService.getUserByEmail(email)
          ]);
          
          const isAdmin = email === ADMIN_EMAIL.toLowerCase();

          if (!isAdmin && !studentDoc && !teacherDoc) {
            setAuthError('Unauthorized access. Only authorized teachers and enrolled students can log in.');
            await auth.signOut();
            setUser(null);
            setProfile(null);
            setLoading(false);
            return;
          }

          // Determine role and robust name selection
          const initialRole = isAdmin ? 'admin' : (teacherDoc?.role || 'student');
          
          // CRITICAL: Prioritize the name from the database (Students collection or Users collection)
          // to prevent overwriting by external providers (Google display names).
          // We look in studentDoc first if they are a student, then teacherDoc.
          let finalDisplayName = '';
          
          if (initialRole === 'student' && studentDoc?.name) {
            finalDisplayName = studentDoc.name;
          } else if (teacherDoc?.displayName) {
            finalDisplayName = teacherDoc.displayName;
          } else if (studentDoc?.name) { // Fallback if they have a student record but role is something else
            finalDisplayName = studentDoc.name;
          } else {
            finalDisplayName = u.displayName || '';
          }
          
          const finalPhotoURL = teacherDoc?.photoURL || u.photoURL || '';

          const userProfile = await dbService.upsertUserProfile(u.uid, {
            email: email,
            displayName: finalDisplayName,
            photoURL: finalPhotoURL,
            role: initialRole,
            studentId: studentDoc?.id
          });
          setProfile(userProfile);
          setUser(u);
          
          // Log sign in
          await dbService.logSignIn(u.uid, email, finalDisplayName);
        } catch (err: any) {
          console.error('Profile Load Error:', err);
          let errorMessage = 'Failed to load profile.';
          try {
            // Check if it's our JSON error format
            const parsed = JSON.parse(err.message);
            if (parsed.error) errorMessage = `Profile Load Error: ${parsed.error}`;
          } catch {
            errorMessage = `Profile Load Error: ${err.message || String(err)}`;
          }
          setAuthError(errorMessage);
          await auth.signOut();
          setUser(null);
          setProfile(null);
        }
        setLoading(false);
      } else {
        setProfile(null);
        setUser(null);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <BookOpen className="w-12 h-12 text-emerald-600 animate-bounce" />
          <div className="w-32 h-1 bg-gray-100 rounded-full overflow-hidden">
            <div className="w-1/2 h-full bg-emerald-600 animate-progress origin-left" />
          </div>
        </div>
      </div>
    );
  }

  if (!user || authError) {
    return <Login externalError={authError} />;
  }

  const isStudent = profile?.role === 'student';

  return (
    <Router>
      <Layout profile={profile}>
        <Routes>
          {isStudent ? (
            <>
              <Route path="/" element={<StudentPortal />} />
              <Route path="/calendar" element={<StudentCalendarPage />} />
              <Route path="/attendance" element={<StudentAttendancePage />} />
              <Route path="/progress" element={<StudentProgressPage />} />
              <Route path="/ranking" element={<RankingPage profile={profile} />} />
              <Route path="*" element={<Navigate to="/" />} />
            </>
          ) : (
            <>
              <Route path="/" element={<Dashboard profile={profile} />} />
              <Route path="/teachers/:id" element={<TeacherProfile profile={profile} />} />
              <Route path="/kuttabs/:id" element={<KuttabProfile profile={profile} />} />
              {(profile?.role === 'admin' || profile?.role === 'manager') && (
                <>
                  <Route path="/kuttabs" element={<KuttabManagement profile={profile} />} />
                  <Route path="/teachers" element={<TeachersList profile={profile} />} />
                </>
              )}
              {profile?.role === 'admin' && (
                <Route path="/login-history" element={<LoginHistory profile={profile} />} />
              )}
              <Route path="/students" element={<StudentsList profile={profile} />} />
              <Route path="/students/:id" element={<StudentProfile profile={profile} />} />
              <Route path="/attendance" element={<AttendancePage profile={profile} />} />
              <Route path="/monthly-report" element={<MonthlyReport profile={profile} />} />
              <Route path="/evaluation" element={<EvaluationEntry profile={profile} />} />
              <Route path="/revision" element={<RevisionEntry profile={profile} />} />
              <Route path="/next-revision" element={<NextRevisionTask profile={profile} />} />
              <Route path="/ranking" element={<RankingPage profile={profile} />} />
              <Route path="*" element={<Navigate to="/" />} />
            </>
          )}
        </Routes>
      </Layout>
      <Toaster position="bottom-right" />
    </Router>
  );
}
