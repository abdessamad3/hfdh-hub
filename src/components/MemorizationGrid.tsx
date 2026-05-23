import { useTranslation } from 'react-i18next';
import { Evaluation, Memorization } from '../types';
import { Check } from 'lucide-react';
import { getCoveredThumns, getHizbNumberForSurah } from '../lib/quranUtils';
import { QURAN_HIZBS } from '../constants/quranMetadata';
import { formatDate } from '../lib/dateUtils';

interface MemorizationGridProps {
  evaluations: Evaluation[];
}

export default function MemorizationGrid({ evaluations }: MemorizationGridProps) {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';

  // Initialize a 60x8 grid (1-indexed for convenience in logic)
  // memorized[hizb][thumn]
  const memorized: boolean[][] = Array.from({ length: 61 }, () => Array(9).fill(false));
  const thumnMistakes: number[][] = Array.from({ length: 61 }, () => Array(9).fill(0));
  const thumnDates: string[][] = Array.from({ length: 61 }, () => Array(9).fill(''));

  // Sort evaluations by date ascending so later records override earlier ones
  const sortedEvals = [...evaluations].sort((a, b) => a.date.localeCompare(b.date));

  // Process evaluations next (so they can refine/update mistake details on already memorized parts)
  sortedEvals.forEach((ev) => {
    const h = ev.hizbNumber;
    if (h < 1 || h > 60) return;

    const covered = getCoveredThumns(h, ev.quantityIdentifier || '');
    covered.forEach(unit => {
      memorized[h][unit] = true;
      thumnMistakes[h][unit] = ev.mistakesCount || 0;
      thumnDates[h][unit] = ev.date;
    });

    // Fallback for older data with only numerical quantity
    if (covered.length === 0 && ev.quantity > 0) {
      for (let i = 1; i <= Math.min(8, ev.quantity); i++) {
        memorized[h][i] = true;
        thumnMistakes[h][i] = ev.mistakesCount || 0;
        thumnDates[h][i] = ev.date;
      }
    }
  });

  const getCellStyles = (hizb: number, thumn: number) => {
    if (!memorized[hizb][thumn]) {
      return { 
        className: 'opacity-0 pointer-events-none',
        style: {} 
      };
    }
    
    const mistakes = thumnMistakes[hizb][thumn];
    let bgColor = '#10b981'; // Default emerald-500
    
    if (mistakes === 1) bgColor = '#84cc16'; // lime-500
    else if (mistakes === 2) bgColor = '#eab308'; // yellow-500
    else if (mistakes === 3) bgColor = '#f97316'; // orange-500
    else if (mistakes >= 4) bgColor = '#ef4444'; // red-500

    return {
      className: 'text-white shadow-sm scale-100',
      style: { backgroundColor: bgColor }
    };
  };

  const thumnLabels = ['1/8', '2/8', '3/8', '4/8', '5/8', '6/8', '7/8', '8/8'];

  return (
    <div className="bg-white border rounded-3xl shadow-sm overflow-hidden flex flex-col min-h-[300px] max-h-[800px]">
      <div className="p-6 bg-gray-50 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
        <div>
          <h3 className="font-bold text-lg text-gray-900">{t('memorization_tracker', 'Memorization Tracker')}</h3>
          <p className="text-xs text-gray-500 mt-1">{t('grid_explanation', 'Color shows quality (Green: Perfect, Red: Many mistakes)')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-[10px]">
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 bg-emerald-500 rounded-sm" />
            <span className="text-gray-500 font-bold">0</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 bg-lime-500 rounded-sm" />
            <span className="text-gray-500 font-bold">1</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 bg-yellow-500 rounded-sm" />
            <span className="text-gray-500 font-bold">2</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 bg-orange-500 rounded-sm" />
            <span className="text-gray-500 font-bold">3</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 bg-red-500 rounded-sm" />
            <span className="text-gray-500 font-bold">4+</span>
          </div>
          <div className="w-px h-3 bg-gray-300 mx-1" />
        </div>
      </div>
      
      <div className="overflow-x-auto overflow-y-auto">
        <table className="w-full border-collapse min-w-[1000px] table-fixed">
          <thead className="sticky top-0 bg-white/80 backdrop-blur-md shadow-sm z-20">
            <tr className="border-b-2 border-gray-100">
              <th className="p-5 text-start bg-gray-50/30 w-20">
                <span className="text-[11px] font-black uppercase text-gray-500 tracking-widest">{t('hizb')}</span>
              </th>
              <th className="p-5 text-start bg-gray-50/30 w-32">
                <span className="text-[11px] font-black uppercase text-gray-500 tracking-widest">{t('surah')}</span>
              </th>
              <th className="p-5 text-start bg-gray-50/30 w-48">
                <span className="text-[11px] font-black uppercase text-gray-500 tracking-widest">{t('progress')}</span>
              </th>
              {thumnLabels.map((label, i) => (
                <th key={i} className="p-2 text-center w-16">
                  <span className="text-[10px] font-black text-gray-400">{label}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 relative">
            {Array.from({ length: 60 }, (_, i) => i + 1)
              .filter(hizb => memorized[hizb].some(m => m))
              .map((hizb, idx) => {
                const meta = QURAN_HIZBS[hizb];
                const hizbMemorizedCount = memorized[hizb].filter(m => m).length;
                const percentage = (hizbMemorizedCount / 8) * 100;
                
                return (
                  <tr key={hizb} className={`transition-all group ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30 hover:bg-emerald-50/10'}`}>
                    <td className="p-5 text-start font-black text-gray-900 border-r border-gray-50">
                      <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-all transform group-hover:rotate-6">
                        {hizb}
                      </div>
                    </td>
                    <td className="p-5 text-start border-r border-gray-50">
                      <p className="font-black text-gray-900 text-sm">{meta?.surah}</p>
                      <p className="text-[10px] text-gray-400 font-bold mt-0.5">{t('page')} {meta?.page}</p>
                    </td>
                    <td className="p-5 text-start border-r border-gray-50">
                       <div className="space-y-2">
                         <div className="flex items-center justify-between">
                            <span className={`text-[10px] font-black uppercase tracking-widest ${percentage === 100 ? 'text-emerald-600' : 'text-gray-400'}`}>
                              {percentage === 100 ? t('mastered') : `${Math.round(percentage)}%`}
                            </span>
                            {percentage === 100 && <Check className="w-3.5 h-3.5 text-emerald-500" />}
                         </div>
                         <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden shadow-inner">
                           <div 
                             className={`h-full rounded-full transition-all duration-1000 ${percentage === 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`} 
                             style={{ width: `${percentage}%` }} 
                           />
                         </div>
                       </div>
                    </td>
                    {Array.from({ length: 8 }, (_, i) => i + 1).map((thumn) => {
                      const styles = getCellStyles(hizb, thumn);
                      return (
                        <td key={thumn} className="p-2 text-center border-l border-gray-50/50">
                          <div 
                            className={`w-10 h-10 aspect-square mx-auto rounded-xl flex flex-col items-center justify-center transition-all duration-500 shadow-sm ${styles.className} ${memorized[hizb][thumn] ? 'hover:scale-110 hover:-rotate-3' : ''}`}
                            style={styles.style}
                            title={memorized[hizb][thumn] ? `${isRtl ? 'التاريخ' : 'Date'}: ${thumnDates[hizb][thumn] ? formatDate(thumnDates[hizb][thumn]) : '---'} | ${isRtl ? 'الأخطاء' : 'Mistakes'}: ${thumnMistakes[hizb][thumn]}` : ''}
                          >
                            {memorized[hizb][thumn] ? (
                              <>
                                {thumnMistakes[hizb][thumn] === 0 ? <Check className="w-4 h-4" /> : <span className="font-black text-[11px]">{thumnMistakes[hizb][thumn]}</span>}
                              </>
                            ) : null}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            {evaluations.length === 0 && (
              <tr>
                <td colSpan={12} className="p-20 text-center text-gray-400 font-medium italic">
                  {t('no_progress_recorded', 'No memorization progress recorded yet')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

