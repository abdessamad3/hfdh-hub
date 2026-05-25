import { Home, Users, Calendar, BookOpen, BarChart2, Award, LogOut, X, LayoutDashboard, Building, Globe, History, ClipboardList, FileText, CheckCircle, Book, Brain } from 'lucide-react';
import { NavLink, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { UserProfile } from '../types';
import { useTranslation } from 'react-i18next';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile | null;
}

export default function Sidebar({ isOpen, onClose, profile }: SidebarProps) {
  const { t, i18n } = useTranslation();
  const isAdmin = profile?.role === 'admin';
  const isManager = profile?.role === 'manager';
  const isSenior = isAdmin || isManager;
  const isStudent = profile?.role === 'student' || (!isAdmin && !isSenior && profile?.role !== 'teacher');
  
  const quranDbItem = { 
    icon: Book, 
    label: i18n.language === 'ar' ? 'البوابة القرآنية' : 'Quran Database', 
    path: '/quran-database' 
  };

  const teacherItems = [
    { icon: Home, label: t('dashboard'), path: '/' },
    { icon: Users, label: t('students_list'), path: '/students' },
    { icon: Calendar, label: t('attendance'), path: '/attendance' },
    { icon: Award, label: t('evaluations'), path: '/evaluation' },
    { icon: ClipboardList, label: t('next_evaluation_task'), path: '/next-evaluation' },
    { icon: History, label: t('revision'), path: '/revision' },
    { icon: ClipboardList, label: t('next_revision_task'), path: '/next-revision' },
    { icon: FileText, label: t('monthly_report'), path: '/monthly-report' },
    { icon: BarChart2, label: t('rankings'), path: '/ranking' },
    quranDbItem,
  ];

  const studentItems = [
    { icon: LayoutDashboard, label: t('my_portal'), path: '/' },
    { icon: Calendar, label: t('calendar'), path: '/calendar' },
    { icon: BookOpen, label: t('memorization_progress'), path: '/progress' },
    { icon: Globe, label: t('global_ranking'), path: '/ranking' },
    { icon: Brain, label: i18n.language === 'ar' ? 'تحدي الذكاء التفاعلي' : 'Smart Challenge', path: '/smart-challenge' },
    quranDbItem,
  ];
  
  const seniorItems = [
    { icon: Home, label: t('dashboard'), path: '/' },
    { icon: Building, label: t('kuttabs'), path: '/kuttabs' },
    { icon: Users, label: t('teachers'), path: '/teachers' },
    { icon: Users, label: t('students_list'), path: '/students' },
    { icon: Calendar, label: t('attendance'), path: '/attendance' },
    { icon: Award, label: t('evaluations'), path: '/evaluation' },
    { icon: ClipboardList, label: t('next_evaluation_task'), path: '/next-evaluation' },
    { icon: History, label: t('revision'), path: '/revision' },
    { icon: ClipboardList, label: t('next_revision_task'), path: '/next-revision' },
    { icon: FileText, label: t('monthly_report'), path: '/monthly-report' },
    { icon: BarChart2, label: t('rankings'), path: '/ranking' },
    quranDbItem,
  ];

  if (isAdmin) {
    seniorItems.push({ icon: History, label: t('login_history'), path: '/login-history' });
    seniorItems.push({ 
      icon: Brain, 
      label: i18n.language === 'ar' ? 'إدارة أسئلة التحدي' : 'Manage Smart Questions', 
      path: '/admin/smart-questions' 
    });
  }

  const navItems = isStudent 
    ? studentItems 
    : (isSenior 
        ? seniorItems
        : teacherItems);

  return (
    <>
      {/* Mobile Overlay */}
      <div 
        className={`fixed inset-0 bg-black/50 z-40 transition-opacity lg:hidden ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Sidebar Drawer */}
      <div className={`
        fixed inset-y-0 z-50 w-64 bg-white transition-transform duration-300 ease-in-out h-screen flex flex-col
        ${i18n.language === 'ar' ? 'right-0 border-l' : 'left-0 border-r'}
        ${isOpen 
          ? 'translate-x-0' 
          : (i18n.language === 'ar' ? 'translate-x-full lg:translate-x-0' : '-translate-x-full lg:translate-x-0')}
      `}>
        <div className="p-8 pb-4 flex items-center justify-between shrink-0 bg-white">
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-200">
               <BookOpen className="w-6 h-6" />
            </div>
            <span className="tracking-tighter">{t('app_name')}</span>
          </h1>
          <button 
            onClick={onClose}
            className="p-2 lg:hidden hover:bg-gray-100 rounded-xl text-gray-500"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <nav className="flex-1 px-6 space-y-2 mt-8 overflow-y-auto custom-scrollbar pb-6">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => {
                if (window.innerWidth < 1024) onClose();
              }}
              className={({ isActive }) =>
                `flex items-center gap-4 px-5 py-4 rounded-[22px] transition-all duration-300 font-black relative group ${
                  isActive 
                    ? 'bg-emerald-600 text-white shadow-feature' 
                    : 'text-gray-400 hover:bg-gray-50 hover:text-emerald-600'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon className={`w-5 h-5 transition-transform group-hover:scale-110 ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-emerald-500'}`} />
                  <span className="text-sm tracking-tight">{item.label}</span>
                  {isActive && (
                    <motion.div 
                      layoutId="sidebar-active"
                      className="absolute left-1 w-1.5 h-6 bg-white rounded-full lg:hidden"
                    />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="p-6 space-y-5 bg-gray-50/30 shrink-0 border-t border-gray-100">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2 text-gray-400">
              <Globe className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-widest">{t('language')}</span>
            </div>
            <div className="flex bg-white p-1 rounded-xl border border-gray-100">
              <button 
                onClick={() => i18n.changeLanguage('en')}
                className={`px-3 py-1 rounded-lg text-[10px] font-black transition-all ${i18n.language === 'en' ? 'bg-emerald-600 text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
              >
                EN
              </button>
              <button 
                onClick={() => i18n.changeLanguage('ar')}
                className={`px-3 py-1 rounded-lg text-[10px] font-black transition-all ${i18n.language === 'ar' ? 'bg-emerald-600 text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
              >
                AR
              </button>
            </div>
          </div>
          
          <Link 
            to={isStudent ? "/" : (profile?.uid ? `/teachers/${profile.uid}` : '#')}
            className="flex items-center gap-3 p-4 bg-white border border-gray-100 rounded-[28px] shadow-soft hover:shadow-feature hover:border-emerald-200 transition-all group"
          >
            <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-400 font-black group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors">
              {profile?.displayName?.charAt(0) || 'U'}
            </div>
            <div className="min-w-0">
              <p className="text-[10px] uppercase font-black text-emerald-500 tracking-widest mb-0.5">
                {t(`role_${profile?.role || 'user'}`)}
              </p>
              <p className="text-xs font-black text-gray-900 truncate tracking-tight">
                {profile?.displayName || auth.currentUser?.email}
              </p>
            </div>
          </Link>

          <button 
            onClick={() => signOut(auth)}
            className="flex items-center justify-center gap-3 px-6 py-4 w-full bg-white border border-gray-100 text-gray-400 hover:bg-red-50 hover:text-red-600 hover:border-red-100 rounded-[24px] transition-all font-black text-[11px] uppercase tracking-widest"
          >
            <LogOut className="w-4 h-4" />
            {t('sign_out')}
          </button>
        </div>
      </div>
    </>
  );
}
