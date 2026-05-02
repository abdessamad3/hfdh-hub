import { Home, Users, Calendar, BookOpen, BarChart2, Award, LogOut, X, LayoutDashboard, Building, Globe, History, ClipboardList } from 'lucide-react';
import { NavLink, Link } from 'react-router-dom';
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
  const isStudent = profile?.role === 'student';
  const isAdmin = profile?.role === 'admin';
  
  const teacherItems = [
    { icon: Home, label: t('dashboard'), path: '/' },
    { icon: Users, label: t('students_list'), path: '/students' },
    { icon: Calendar, label: t('attendance'), path: '/attendance' },
    { icon: Award, label: t('evaluations'), path: '/evaluation' },
    { icon: History, label: t('revision'), path: '/revision' },
    { icon: ClipboardList, label: t('next_revision_task'), path: '/next-revision' },
    { icon: BarChart2, label: t('rankings'), path: '/ranking' },
  ];

  const studentItems = [
    { icon: LayoutDashboard, label: t('my_portal'), path: '/' },
    { icon: BarChart2, label: t('global_ranking'), path: '/ranking' },
  ];
  
  const navItems = isStudent 
    ? studentItems 
    : (isAdmin 
        ? [
            { icon: Home, label: t('dashboard'), path: '/' },
            { icon: Building, label: t('kuttabs'), path: '/kuttabs' },
            { icon: Users, label: t('teachers'), path: '/teachers' },
            { icon: Users, label: t('students_list'), path: '/students' },
            { icon: Calendar, label: t('attendance'), path: '/attendance' },
            { icon: Award, label: t('evaluations'), path: '/evaluation' },
            { icon: History, label: t('revision'), path: '/revision' },
            { icon: ClipboardList, label: t('next_revision_task'), path: '/next-revision' },
            { icon: BarChart2, label: t('rankings'), path: '/ranking' },
            { icon: History, label: t('login_history'), path: '/login-history' },
          ]
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
        fixed inset-y-0 left-0 z-50 w-64 bg-white border-r transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-auto h-screen flex flex-col overflow-y-auto
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6 flex items-center justify-between shrink-0">
          <h1 className="text-2xl font-black text-emerald-700 flex items-center gap-2">
            <BookOpen className="w-8 h-8" />
            {t('app_name')}
          </h1>
          <button 
            onClick={onClose}
            className="p-2 lg:hidden hover:bg-gray-100 rounded-lg text-gray-500"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <nav className="flex-1 px-4 space-y-1.5 mt-4 shrink-0 px-2 pb-4">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => {
                if (window.innerWidth < 1024) onClose();
              }}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all font-bold ${
                  isActive 
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-100' 
                    : 'text-gray-500 hover:bg-emerald-50 hover:text-emerald-700'
                }`
              }
            >
              <item.icon className="w-5 h-5" />
              <span className="text-sm tracking-tight">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t space-y-3 bg-gray-50/50 shrink-0">
          <div className="flex items-center justify-between px-2 mb-2">
            <div className="flex items-center gap-2 text-gray-500">
              <Globe className="w-4 h-4" />
              <span className="text-[10px] font-bold uppercase tracking-wider">{t('language')}</span>
            </div>
            <div className="flex gap-1">
              <button 
                onClick={() => i18n.changeLanguage('en')}
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${i18n.language === 'en' ? 'bg-emerald-600 text-white' : 'hover:bg-gray-200 text-gray-500'}`}
              >
                EN
              </button>
              <button 
                onClick={() => i18n.changeLanguage('ar')}
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${i18n.language === 'ar' ? 'bg-emerald-600 text-white' : 'hover:bg-gray-200 text-gray-500'}`}
              >
                عربي
              </button>
            </div>
          </div>
          <Link 
            to={isStudent ? `/students/${profile?.studentId}` : (profile?.uid ? `/teachers/${profile.uid}` : '#')}
            className="px-4 py-3 bg-white border border-gray-100 rounded-2xl shadow-sm block hover:border-emerald-200 transition-all group"
          >
            <p className="text-[9px] uppercase font-black text-emerald-500 tracking-widest mb-1 group-hover:text-emerald-600 transition-colors">
              {t('user_profile', { role: t(`role_${profile?.role || 'user'}`) })}
            </p>
            <p className="text-xs font-black text-gray-900 truncate group-hover:text-emerald-700 transition-colors">
              {profile?.displayName || auth.currentUser?.email}
            </p>
            <p className="text-[10px] text-gray-400 font-medium truncate mt-0.5">
              {auth.currentUser?.email}
            </p>
          </Link>
          <button 
            onClick={() => signOut(auth)}
            className="flex items-center justify-center gap-3 px-4 py-3.5 w-full bg-white border border-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-600 hover:border-red-100 rounded-2xl transition-all font-black text-xs uppercase tracking-widest"
          >
            <LogOut className="w-4 h-4" />
            {t('sign_out')}
          </button>
        </div>
      </div>
    </>
  );
}
