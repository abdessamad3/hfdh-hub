import { useState, useEffect, useRef } from 'react';
import { Search, User, Users, Home, X, Building } from 'lucide-react';
import { dbService } from '../services/db';
import { Student, UserProfile, Kuttab } from '../types';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';

interface AdminSearchBarProps {
  profile: UserProfile | null;
}

interface SearchResult {
  id: string;
  name: string;
  email?: string;
  kuttab?: string;
  location?: string;
  type: 'student' | 'teacher' | 'kuttab';
}

export default function AdminSearchBar({ profile }: AdminSearchBarProps) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const [allData, setAllData] = useState<{ students: Student[], teachers: UserProfile[], kuttabs: Kuttab[] }>({
    students: [],
    teachers: [],
    kuttabs: []
  });

  useEffect(() => {
    if (profile?.role !== 'admin' && profile?.role !== 'manager') return;

    const fetchData = async () => {
      try {
        const [students, teachers, kuttabs] = await Promise.all([
          dbService.getAllStudents(),
          dbService.getTeachers(),
          dbService.getAllKuttabs()
        ]);
        setAllData({ students, teachers, kuttabs });
      } catch (err) {
        console.error('Error fetching search data:', err);
      }
    };

    fetchData();
  }, [profile]);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);
    const searchTerm = query.toLowerCase();
    
    const filteredStudents = allData.students.filter(s => 
      s.name.toLowerCase().includes(searchTerm) || 
      (s.email && s.email.toLowerCase().includes(searchTerm)) ||
      (s.kuttabName && s.kuttabName.toLowerCase().includes(searchTerm))
    ).map(s => ({
      id: s.id,
      name: s.name,
      email: s.email || '',
      kuttab: s.kuttabName || '',
      type: 'student' as const
    }));

    const filteredTeachers = allData.teachers.filter(t => 
      (t.displayName || '').toLowerCase().includes(searchTerm) || 
      (t.email && t.email.toLowerCase().includes(searchTerm)) ||
      (t.kuttabName && t.kuttabName.toLowerCase().includes(searchTerm))
    ).map(t => ({
      id: t.uid,
      name: t.displayName || t.email,
      email: t.email || '',
      kuttab: t.kuttabName || '',
      type: 'teacher' as const
    }));

    const filteredKuttabs = allData.kuttabs.filter(k => 
      k.name.toLowerCase().includes(searchTerm) || 
      (k.location && k.location.toLowerCase().includes(searchTerm))
    ).map(k => ({
      id: k.id,
      name: k.name,
      location: k.location || '',
      type: 'kuttab' as const
    }));

    setResults([...filteredKuttabs, ...filteredTeachers, ...filteredStudents].slice(0, 8));
    setLoading(false);
  }, [query, allData]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (profile?.role !== 'admin' && profile?.role !== 'manager') return null;

  const handleSelect = (result: SearchResult) => {
    if (result.type === 'student') {
      navigate(`/students/${result.id}`);
    } else if (result.type === 'teacher') {
      navigate(`/teachers/${result.id}`);
    } else {
      navigate(`/kuttabs/${result.id}`);
    }
    setQuery('');
    setIsOpen(false);
  };

  return (
    <div className="relative w-full max-w-xl mx-auto px-4 lg:px-0" ref={searchRef}>
      <div className="relative group">
        <div className={`absolute inset-y-0 ${i18n.language === 'ar' ? 'right-4' : 'left-4'} flex items-center pointer-events-none text-emerald-500`}>
          <Search className="w-5 h-5" />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={t('search_placeholder')}
          className={`w-full bg-white border border-gray-200 py-3 ${i18n.language === 'ar' ? 'pr-12 pl-10' : 'pl-12 pr-10'} rounded-2xl shadow-sm focus:ring-4 focus:ring-emerald-100 focus:border-emerald-500 transition-all outline-none text-sm font-medium`}
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className={`absolute inset-y-0 ${i18n.language === 'ar' ? 'left-4' : 'right-4'} flex items-center text-gray-400 hover:text-gray-600`}
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <AnimatePresence>
        {isOpen && (query.trim().length >= 2 || results.length > 0) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute top-full mt-2 w-full bg-white border rounded-3xl shadow-2xl z-50 overflow-hidden max-h-[400px] overflow-y-auto"
          >
            {loading ? (
              <div className="p-8 text-center">
                <div className="w-8 h-8 border-4 border-emerald-100 border-t-emerald-500 rounded-full animate-spin mx-auto" />
              </div>
            ) : results.length > 0 ? (
              <div className="p-2">
                {results.map((result) => (
                    <button
                    key={`${result.type}-${result.id}`}
                    onClick={() => handleSelect(result)}
                    className="w-full flex items-center gap-4 p-3 hover:bg-emerald-50 rounded-2xl transition-colors text-start"
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      result.type === 'teacher' ? 'bg-blue-100 text-blue-600' : 
                      result.type === 'kuttab' ? 'bg-amber-100 text-amber-600' :
                      'bg-emerald-100 text-emerald-600'
                    }`}>
                      {result.type === 'teacher' ? <Users className="w-5 h-5" /> : 
                       result.type === 'kuttab' ? <Building className="w-5 h-5" /> :
                       <User className="w-5 h-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-start">
                        <div className="text-sm font-bold text-gray-900 truncate tracking-tight">{result.name}</div>
                        {result.email && (
                          <div className="text-[10px] text-gray-400 truncate hidden sm:block">({result.email})</div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500 text-start">
                        {result.type === 'kuttab' ? (
                          <>
                            <Building className="w-3 h-3 shrink-0" />
                            <span className="truncate">{result.location || t('not_assigned')}</span>
                          </>
                        ) : (
                          <>
                            <Home className="w-3 h-3 shrink-0" />
                            <span className="truncate">{result.kuttab || t('no_kuttab')}</span>
                          </>
                        )}
                        <span className="text-[10px] uppercase tracking-wider font-black bg-gray-100 px-1.5 py-0.5 rounded-md ms-auto whitespace-nowrap">
                          {t(result.type)}
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500 space-y-2">
                <Search className="w-10 h-10 mx-auto text-gray-200" />
                <p className="text-sm font-medium">{t('no_results', 'No results found')}</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
