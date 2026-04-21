import { Home, Users, Calendar, BookOpen, BarChart2, Award, LogOut } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';

const navItems = [
  { icon: Home, label: 'Dashboard', path: '/' },
  { icon: Users, label: 'Students', path: '/students' },
  { icon: Calendar, label: 'Attendance', path: '/attendance' },
  { icon: Award, label: 'Evaluation', path: '/evaluation' },
  { icon: BarChart2, label: 'Ranking', path: '/ranking' },
];

export default function Sidebar() {
  return (
    <div className="w-64 bg-white border-r h-screen sticky top-0 flex flex-col">
      <div className="p-6">
        <h1 className="text-2xl font-bold text-emerald-700 flex items-center gap-2">
          <BookOpen className="w-8 h-8" />
          Hifdh Hub
        </h1>
      </div>
      
      <nav className="flex-1 px-4 space-y-2 mt-4">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive 
                  ? 'bg-emerald-50 text-emerald-700 font-medium' 
                  : 'text-gray-600 hover:bg-gray-50'
              }`
            }
          >
            <item.icon className="w-5 h-5" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t space-y-2 text-black">
        <div className="px-4 py-2 bg-gray-50 rounded-xl">
          <p className="text-[10px] uppercase font-bold text-gray-400">Logged in as</p>
          <p className="text-xs font-bold text-gray-700 truncate">
            {auth.currentUser?.isAnonymous ? 'Guest Teacher' : auth.currentUser?.email}
          </p>
        </div>
        <button 
          onClick={() => signOut(auth)}
          className="flex items-center gap-3 px-4 py-3 w-full text-left text-gray-600 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors font-medium"
        >
          <LogOut className="w-5 h-5" />
          Sign Out
        </button>
      </div>
    </div>
  );
}
