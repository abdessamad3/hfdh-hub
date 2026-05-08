import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Clock, Building, CalendarIcon } from 'lucide-react';
import type { Kuttab } from '../types';

interface KuttabWeeklyOverviewProps {
  kuttabs: Kuttab[];
}

export default function KuttabWeeklyOverview({ kuttabs }: KuttabWeeklyOverviewProps) {
  const { t, i18n } = useTranslation();

  const weekDays = i18n.language === 'ar' 
    ? ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
    : ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const getDaySessions = (kuttab: Kuttab, dayIdx: number) => {
    // We check for recurring lessons first as this is a "weekly" overview
    const recurring = kuttab.schedule?.lessons?.[dayIdx.toString()];
    if (recurring?.type === 'recurring') {
      return recurring.lessons;
    }
    return [];
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center">
          <CalendarIcon className="w-6 h-6" />
        </div>
        <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">{t('weekly_kuttab_sessions')}</h2>
      </div>

      <div className="bg-white border rounded-[32px] shadow-sm overflow-hidden text-black overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="p-6 text-start font-black text-gray-400 uppercase tracking-widest min-w-[200px]">
                {t('kuttab')}
              </th>
              {weekDays.map((day, idx) => {
                const isToday = new Date().getDay() === idx;
                return (
                  <th key={idx} className={`p-4 text-center font-black uppercase tracking-widest min-w-[140px] ${
                    isToday ? 'text-emerald-600 bg-emerald-50/50' : 'text-gray-400'
                  }`}>
                    {day}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y">
            {kuttabs.map(kuttab => (
              <tr key={kuttab.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
                      <Building className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-bold text-gray-900 uppercase tracking-tight">{kuttab.name}</div>
                      {kuttab.location && (
                        <div className="text-[10px] font-bold text-gray-400 uppercase truncate max-w-[150px]">
                          {kuttab.location}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                {[0, 1, 2, 3, 4, 5, 6].map(dayIdx => {
                  const sessions = getDaySessions(kuttab, dayIdx);
                  return (
                    <td key={dayIdx} className="p-4">
                      <div className="flex flex-col gap-1.5 items-center">
                        {sessions.length > 0 ? (
                          sessions.map((session, sIdx) => (
                            <div 
                              key={sIdx}
                              className="w-full px-2 py-1.5 bg-emerald-50 border border-emerald-100 rounded-lg flex items-center gap-1.5 text-[10px] font-black text-emerald-700"
                            >
                              <Clock className="w-3 h-3 shrink-0" />
                              <span className="truncate">{session}</span>
                            </div>
                          ))
                        ) : (
                          <div className="w-1 h-1 rounded-full bg-gray-200" />
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
