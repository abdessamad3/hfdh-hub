import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { dbService } from '../services/db';
import { UserProfile } from '../types';
import { LogIn, User as UserIcon, Monitor, Clock, ChevronLeft } from 'lucide-react';
import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

interface LoginHistoryItem {
  id: string;
  userId: string;
  email: string;
  displayName: string;
  userAgent: string;
  timestamp: string;
}

interface LoginHistoryProps {
  profile: UserProfile | null;
}

export default function LoginHistory({ profile }: LoginHistoryProps) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [history, setHistory] = useState<LoginHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const isAdmin = profile?.role === 'admin';

  useEffect(() => {
    if (!isAdmin) {
      navigate('/');
      return;
    }

    const fetchHistory = async () => {
      try {
        const data = await dbService.getLoginHistory();
        setHistory(data as any);
      } catch (error) {
        console.error('Error fetching login history:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [isAdmin, navigate]);

  if (loading) {
    return (
      <div className="p-8 flex justify-center items-center">
        <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const dateLocale = i18n.language === 'ar' ? ar : enUS;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-8 rounded-[32px] border shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full -mr-16 -mt-16 opacity-50" />
        <div className="relative flex items-center gap-6">
          <button 
            onClick={() => navigate('/')}
            className="p-3 hover:bg-gray-100 rounded-2xl transition-colors text-gray-400"
          >
            <ChevronLeft className={`w-6 h-6 ${i18n.language === 'ar' ? 'rotate-180' : ''}`} />
          </button>
          <div className="p-4 bg-emerald-100/50 text-emerald-600 rounded-2xl">
            <LogIn className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">{t('login_history')}</h1>
            <p className="text-gray-500 font-medium">{t('last_20_logins')}</p>
          </div>
        </div>
      </div>

      {/* History Table */}
      <div className="bg-white rounded-[32px] border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50/50 border-b">
              <tr>
                <th className={`px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest ${i18n.language === 'ar' ? 'text-right' : ''}`}>
                  {t('user')}
                </th>
                <th className={`px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest ${i18n.language === 'ar' ? 'text-right' : ''}`}>
                  {t('device_info')}
                </th>
                <th className={`px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest ${i18n.language === 'ar' ? 'text-right' : ''}`}>
                  {t('login_time')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {history.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50/30 transition-colors group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center text-gray-400 group-hover:bg-emerald-100 group-hover:text-emerald-600 transition-colors">
                        <UserIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">{item.displayName}</p>
                        <p className="text-sm text-gray-500">{item.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-3 text-gray-600">
                      <Monitor className="w-4 h-4 text-gray-400" />
                      <p className="text-xs font-medium max-w-[300px] truncate" title={item.userAgent}>
                        {item.userAgent}
                      </p>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-3 text-gray-600">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <p className="text-sm font-bold">
                        {format(new Date(item.timestamp), 'dd/MM/yyyy HH:mm:ss')}
                      </p>
                    </div>
                  </td>
                </tr>
              ))}
              {history.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-8 py-20 text-center text-gray-400 font-medium">
                    {t('no_unified_records')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
