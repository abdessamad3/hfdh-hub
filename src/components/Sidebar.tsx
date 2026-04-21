import { Home, Users, Calendar, BookOpen, BarChart2, Award, LogOut, X, LayoutDashboard, Building } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { UserProfile } from '../types';

const teacherItems = [
  { icon: Home, label: 'Dashboard', path: '/' },
  { icon: Building, label: 'Kuttabs', path: '/kuttabs' },
  { icon: Users, label: 'Students List', path: '/students' },
  { icon: Calendar, label: 'Attendance', path: '/attendance' },
  { icon: Award, label: 'Evaluations', path: '/evaluation' },
  { icon: BarChart2, label: 'Rankings', path: '/ranking' },
];

const studentItems = [
  { icon: LayoutDashboard, label: 'My Portal', path: '/' },
  { icon: BarChart2, label: 'Global Ranking', path: '/ranking' },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile | null;
}

export default function Sidebar({ isOpen, onClose, profile }: SidebarProps) {
  const isStudent = profile?.role === 'student';
  const navItems = isStudent ? studentItems : teacherItems;

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
        fixed inset-y-0 left-0 z-50 w-64 bg-white border-r transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-auto lg:h-screen lg:flex lg:flex-col
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6 flex items-center justify-between">
          <h1 className="text-2xl font-black text-emerald-700 flex items-center gap-2">
            <BookOpen className="w-8 h-8" />
            Hifdh Hub
          </h1>
          <button 
            onClick={onClose}
            className="p-2 lg:hidden hover:bg-gray-100 rounded-lg text-gray-500"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <nav className="flex-1 px-4 space-y-1.5 mt-4 overflow-y-auto">
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

        <div className="p-4 border-t space-y-3 bg-gray-50/50">
          <div className="px-4 py-3 bg-white border border-gray-100 rounded-2xl shadow-sm">
            <p className="text-[9px] uppercase font-black text-emerald-500 tracking-widest mb-1">
              {profile?.role || 'User'} Profile
            </p>
            <p className="text-xs font-black text-gray-900 truncate">
              {profile?.displayName || auth.currentUser?.email}
            </p>
            <p className="text-[10px] text-gray-400 font-medium truncate mt-0.5">
              {auth.currentUser?.email}
            </p>
          </div>
          <button 
            onClick={() => signOut(auth)}
            className="flex items-center justify-center gap-3 px-4 py-3.5 w-full bg-white border border-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-600 hover:border-red-100 rounded-2xl transition-all font-black text-xs uppercase tracking-widest"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </div>
    </>
  );
}
