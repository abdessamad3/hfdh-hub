import { useTranslation } from 'react-i18next';
import { Evaluation } from '../types';
import { Check } from 'lucide-react';
import { getCoveredThumns } from '../lib/quranUtils';
import { QURAN_HIZBS } from '../constants/quranMetadata';

interface MemorizationGridProps {
  evaluations: Evaluation[];
}

export default function MemorizationGrid({ evaluations }: MemorizationGridProps) {
  const { t, i18n } = useTranslation();

  // Initialize a 60x8 grid (1-indexed for convenience in logic)
  // memorized[hizb][thumn]
  const memorized: boolean[][] = Array.from({ length: 61 }, () => Array(9).fill(false));
  const thumnMistakes: number[][] = Array.from({ length: 61 }, () => Array(9).fill(0));

  // Sort evaluations by date ascending so later evaluations override earlier ones for the same unit
  // Use localeCompare for YYYY-MM-DD strings to avoid timezone issues with new Date()
  const sortedEvals = [...evaluations].sort((a, b) => a.date.localeCompare(b.date));

  sortedEvals.forEach((ev) => {
    const h = ev.hizbNumber;
    if (h < 1 || h > 60) return;

    const covered = getCoveredThumns(h, ev.quantityIdentifier || '');
    covered.forEach(unit => {
      memorized[h][unit] = true;
      thumnMistakes[h][unit] = ev.mistakesCount || 0;
    });

    // Fallback for older data with only numerical quantity
    if (covered.length === 0 && ev.quantity > 0) {
      for (let i = 1; i <= Math.min(8, ev.quantity); i++) {
        memorized[h][i] = true;
        thumnMistakes[h][i] = ev.mistakesCount || 0;
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
        <table className="w-full border-collapse min-w-[900px] table-fixed">
          <thead className="sticky top-0 bg-white shadow-sm z-10">
            <tr>
              <th className="p-3 text-start bg-gray-50 border-b border-r sticky left-0 z-20 w-16">
                <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">{t('hizb')}</span>
              </th>
              <th className="p-3 text-start bg-gray-50 border-b border-r w-24">
                <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">{t('surah', 'Surah')}</span>
              </th>
              <th className="p-3 text-start bg-gray-50 border-b border-r w-16">
                <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">{t('page', 'Page')}</span>
              </th>
              <th className="p-3 text-start bg-gray-50 border-b border-r w-48">
                <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">{t('start_phrase', 'Start')}</span>
              </th>
              {thumnLabels.map((label, i) => (
                <th key={i} className="p-2 border-b text-center">
                  <span className="text-[10px] font-bold text-gray-500">{label}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y relative">
            {Array.from({ length: 60 }, (_, i) => i + 1)
              .filter(hizb => memorized[hizb].some(m => m))
              .map((hizb) => {
                const meta = QURAN_HIZBS[hizb];
                return (
                  <tr key={hizb} className="hover:bg-gray-50/50 transition-colors text-xs">
                    <td className="p-3 text-start bg-gray-50 font-black text-gray-700 border-r sticky left-0 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                      {hizb}
                    </td>
                    <td className="p-3 text-start border-r bg-white font-bold text-gray-900 truncate">
                      {meta?.surah}
                    </td>
                    <td className="p-3 text-start border-r bg-white text-gray-600 font-medium">
                      {meta?.page}
                    </td>
                    <td className="p-3 text-start border-r bg-white text-gray-400 text-[10px] italic truncate font-arabic" dir="rtl">
                      {meta?.startPhrase}
                    </td>
                    {Array.from({ length: 8 }, (_, i) => i + 1).map((thumn) => {
                      const styles = getCellStyles(hizb, thumn);
                      return (
                        <td key={thumn} className="p-1.5 border border-gray-50 text-center">
                          <div 
                            className={`w-full aspect-square max-w-[48px] mx-auto rounded-lg flex flex-col items-center justify-center transition-all duration-300 ${styles.className}`}
                            style={styles.style}
                            title={memorized[hizb][thumn] ? `${thumnMistakes[hizb][thumn]} mistakes` : ''}
                          >
                            {memorized[hizb][thumn] ? (
                              <>
                                {thumnMistakes[hizb][thumn] === 0 ? <Check className="w-3.5 h-3.5" /> : <span className="font-black text-[10px]">{thumnMistakes[hizb][thumn]}</span>}
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

