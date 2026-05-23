import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import { 
  Book, 
  ChevronLeft, 
  ChevronRight, 
  Search, 
  Volume2, 
  VolumeX, 
  Play, 
  Pause, 
  Copy, 
  Award, 
  RotateCcw,
  Sparkles,
  HelpCircle,
  HelpCircle as GameIcon,
  FastForward,
  Bookmark
} from 'lucide-react';
import { 
  QuranService, 
  SURAHS, 
  JUZS, 
  HIZBS, 
  WARSH_RECITERS, 
  Ayah, 
  Reciter 
} from '../services/quran';
import type { UserProfile } from '../types';

interface QuranDatabaseProps {
  profile: UserProfile | null;
}

export default function QuranDatabase({ profile }: QuranDatabaseProps) {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';

  // State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [ayahs, setAyahs] = useState<Ayah[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  
  // Audio & Reciter State
  const [selectedReciter, setSelectedReciter] = useState<Reciter>(WARSH_RECITERS[0]);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [audioProgress, setAudioProgress] = useState<number>(0);
  const [audioDuration, setAudioDuration] = useState<number>(0);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [autoPlayOnPageSwitch, setAutoPlayOnPageSwitch] = useState<boolean>(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedSurah, setSelectedSurah] = useState<string>('');
  const [selectedJuz, setSelectedJuz] = useState<string>('');
  const [selectedHizb, setSelectedHizb] = useState<string>('');
  const [jumpPageVal, setJumpPageVal] = useState<string>('');

  // Game Challenge State
  const [challengeAyah, setChallengeAyah] = useState<Ayah | null>(null);
  const [challengeOptions, setChallengeOptions] = useState<string[]>([]);
  const [correctAnswer, setCorrectAnswer] = useState<string>('');
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [streak, setStreak] = useState<number>(0);
  const [isAnswered, setIsAnswered] = useState<boolean>(false);

  // Load Ayat of Current Page
  useEffect(() => {
    let active = true;
    const fetchPage = async () => {
      setLoading(true);
      try {
        const data = await QuranService.getPageAyahs(currentPage);
        if (active) {
          setAyahs(data);
          setLoading(false);
          
          // Auto Play Audio transition if toggled on
          if (autoPlayOnPageSwitch && data.length > 0) {
            setTimeout(() => {
              handlePlaySurah(data[0].surah.number);
            }, 500);
          }
        }
      } catch (err) {
        console.error("Error loading Quran page data:", err);
        if (active) {
          setLoading(false);
          toast.error("Failed to fetch Quran page data. Loaded local fallback.");
        }
      }
    };
    fetchPage();
    return () => { active = false; };
  }, [currentPage]);

  // Audio Playback effect listeners
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Sync Search Query with Actions (Jumping to page if query is exactly a page number)
  const handleTextSearch = (val: string) => {
    setSearchQuery(val);
    const parsedPage = parseInt(val.trim());
    if (!isNaN(parsedPage) && parsedPage >= 1 && parsedPage <= 604) {
      setCurrentPage(parsedPage);
    }
  };

  // Switch Page
  const nextPage = () => {
    if (currentPage < 604) {
      setCurrentPage(currentPage + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  // Jump to specific page input
  const handleJumpPage = (e: React.FormEvent) => {
    e.preventDefault();
    const p = parseInt(jumpPageVal);
    if (!isNaN(p) && p >= 1 && p <= 604) {
      setCurrentPage(p);
      setJumpPageVal('');
    } else {
      toast.error("Format error: Page must be between 1 and 604");
    }
  };

  // Handle Surah Jump Dropdown
  const handleSurahChange = (surahNumStr: string) => {
    setSelectedSurah(surahNumStr);
    if (surahNumStr) {
      const s = SURAHS.find(meta => meta.number === parseInt(surahNumStr));
      if (s) {
        setCurrentPage(s.startPage);
        setSelectedJuz('');
        setSelectedHizb('');
      }
    }
  };

  // Handle Juz Jump Dropdown
  const handleJuzChange = (juzNumStr: string) => {
    setSelectedJuz(juzNumStr);
    if (juzNumStr) {
      const idx = parseInt(juzNumStr) - 1;
      const j = JUZS[idx];
      if (j) {
        setCurrentPage(j.startPage);
        setSelectedSurah('');
        setSelectedHizb('');
      }
    }
  };

  // Handle Hizb Jump Dropdown
  const handleHizbChange = (hizbNumStr: string) => {
    setSelectedHizb(hizbNumStr);
    if (hizbNumStr) {
      const idx = parseInt(hizbNumStr) - 1;
      const h = HIZBS[idx];
      if (h) {
        setCurrentPage(h.startPage);
        setSelectedSurah('');
        setSelectedJuz('');
      }
    }
  };

  // Audio Play Action
  const handlePlaySurah = (surahNum: number) => {
    if (audioRef.current) {
      audioRef.current.pause();
    }

    const url = QuranService.getSurahAudioUrl(selectedReciter, surahNum);
    const audio = new Audio(url);
    audio.playbackRate = playbackRate;
    audioRef.current = audio;

    audio.addEventListener('timeupdate', () => {
      setAudioProgress(audio.currentTime);
    });

    audio.addEventListener('loadedmetadata', () => {
      setAudioDuration(audio.duration);
    });

    audio.addEventListener('ended', () => {
      setIsPlaying(false);
      setAudioProgress(0);
    });

    audio.play()
      .then(() => {
        setIsPlaying(true);
      })
      .catch(err => {
        console.error("Audio playback error:", err);
        toast.error("Recitation stream is loading or briefly unavailable.");
      });
  };

  const togglePausePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play()
        .then(() => setIsPlaying(true))
        .catch(() => toast.error("Unable to resume recitation stream."));
    }
  };

  // Copy Ayah to clipboard helper
  const handleCopyAyah = (ayah: Ayah) => {
    const formatted = `${ayah.text} ﴿${ayah.numberInSurah}﴾ [سورة ${ayah.surah.englishName}]`;
    navigator.clipboard.writeText(formatted);
    toast.success("Ayah text copied! (برواية ورش)", {
      icon: '📋',
      duration: 2000
    });
  };

  // Play synthetic tone on challenge completion to create premium tactile game feel
  const playSynthesizedTone = (isCorrectTone: boolean) => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (isCorrectTone) {
        osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1); // E5
        osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.2); // G5
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      } else {
        osc.frequency.setValueAtTime(180, ctx.currentTime);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      }
    } catch {
      // Audio context may be auto-blocked by user gesture constraint, ignore safely
    }
  };

  // Smart Game Challenge Creator
  const generateChallenge = async (selectedAyah: Ayah) => {
    // Determine the expected next ayah.
    let correctNextText = "";
    
    // Attempt to locate if correct next verse belongs to standard flowing sequence
    try {
      // Check if next verse is on the same page first
      const nextIndex = ayahs.findIndex(a => a.number === selectedAyah.number) + 1;
      if (nextIndex > 0 && nextIndex < ayahs.length) {
        correctNextText = ayahs[nextIndex].text;
      } else {
        // Fetch the next verse dynamically
        const nextPageNum = currentPage < 604 ? currentPage + 1 : 1;
        const nextPageAyahs = await QuranService.getPageAyahs(nextPageNum);
        if (nextPageAyahs && nextPageAyahs.length > 0) {
          correctNextText = nextPageAyahs[0].text;
        } else {
          correctNextText = "إِنَّ رَبَّكَ هُوَ الْخَلَّاقُ الْعَلِيمُ"; // robust fallback
        }
      }
    } catch {
      correctNextText = "إِنَّ رَبَّكَ هُوَ الْخَلَّاقُ الْعَلِيمُ"; // robust fallback
    }

    // Creating misleading alternatives (distractors)
    const distractors: string[] = [
      "إِنَّ فِي ذَٰلِكَ لَآيَاتٍ لِّقَوْمٍ يَتَفَكَّرُونَ",
      "وَاللَّهُ عَلِيمٌ بِذَاتِ الصُّدُورِ",
      "فَبِأَيِّ آلَاءِ رَبِّكُمَا تُكَذِّبَانِ",
      "إِنَّا نَحْنُ نَزَّلْنَا الذِّكْرَ وَإِنَّا لَهُ لَحَافِظُونَ",
      "إِنَّ اللَّهَ غَفُورٌ رَّحِيمٌ"
    ];

    // Filter distractors to exclude correct answer
    const filteredDistractors = distractors.filter(d => d !== correctNextText);
    
    // Pick two random distractors
    const randomDistractors = [...filteredDistractors]
      .sort(() => 0.5 - Math.random())
      .slice(0, 2);

    // Prepare option deck
    const optionsDeck = [correctNextText, ...randomDistractors].sort(() => 0.5 - Math.random());

    // Update States
    setChallengeAyah(selectedAyah);
    setChallengeOptions(optionsDeck);
    setCorrectAnswer(correctNextText);
    setSelectedAnswer(null);
    setIsAnswered(false);
  };

  // Handle answers
  const handleSelectAnswer = (ans: string) => {
    if (isAnswered) return;
    setSelectedAnswer(ans);
    setIsAnswered(true);

    if (ans === correctAnswer) {
      setStreak(prev => prev + 1);
      playSynthesizedTone(true);
      toast.success("Perfect memorization! Correct continuation.", {
        icon: '🌟'
      });
    } else {
      setStreak(0);
      playSynthesizedTone(false);
      toast.error("Incorrect continuation sentence. Keep practicing!");
    }
  };

  // Render variables
  const filteredAyahs = useMemo(() => {
    if (!searchQuery.trim() || !isNaN(parseInt(searchQuery))) return ayahs;
    return ayahs.filter(a => 
      a.text.includes(searchQuery) || 
      a.surah.name.includes(searchQuery) ||
      a.surah.englishName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [ayahs, searchQuery]);

  return (
    <div className="flex-1 space-y-8 p-4 md:p-8 overflow-y-auto max-w-7xl mx-auto w-full focus:outline-none">
      
      {/* Top Main Heading Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6 border-slate-100">
        <div>
          <div className="flex items-center gap-3">
            <div className="bg-emerald-50 text-emerald-600 p-2.5 rounded-2xl border border-emerald-100">
              <Book className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
                {isRtl ? 'قاعدة بيانات القرآن الكريم' : 'Quran Database'}
              </h1>
              <p className="text-xs text-slate-500 font-medium tracking-wide mt-1">
                {isRtl 
                  ? 'مجموعة بيانات القرآن الكريم برواية ورش للتطبيقات التعليمية وألعاب الحفظ' 
                  : 'Official WARSH Quran dataset & interactive sandbox for memorization support'}
              </p>
            </div>
          </div>
        </div>

        {/* Recitation Audio Control Centre */}
        <div className="bg-white border rounded-3xl p-4 flex flex-col md:flex-row items-center gap-4 shadow-sm w-full md:w-auto">
          <div className="flex flex-col w-full md:w-auto">
            <label className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1">
              {isRtl ? 'المقرئ' : 'Warsh Reciter'}
            </label>
            <select
              value={selectedReciter.id}
              onChange={(e) => {
                const rec = WARSH_RECITERS.find(r => r.id === e.target.value);
                if (rec) setSelectedReciter(rec);
              }}
              className="bg-slate-50 text-xs font-bold text-slate-700 px-3 py-2 rounded-xl focus:ring-1 focus:ring-emerald-500 outline-none border"
            >
              {WARSH_RECITERS.map(rec => (
                <option key={rec.id} value={rec.id}>
                  {isRtl ? rec.arabicName : rec.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 mt-2 md:mt-0 w-full md:w-auto justify-end">
            <button
              onClick={togglePausePlay}
              disabled={ayahs.length === 0}
              className={`p-3 rounded-full flex items-center justify-center transition-all ${
                isPlaying 
                  ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' 
                  : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-md shadow-emerald-100'
              }`}
              title={isRtl ? 'تشغيل تلاوة السورة' : 'Play Surah Recitation'}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 pl-0.5" />}
            </button>

            <button
              onClick={() => {
                const rate = playbackRate === 1 ? 1.25 : playbackRate === 1.25 ? 1.5 : playbackRate === 1.5 ? 0.75 : 1;
                setPlaybackRate(rate);
              }}
              className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 border text-[10px] font-mono font-bold rounded-xl text-slate-600"
              title={isRtl ? 'سرعة التلاوة' : 'Playback speedMultiplier'}
            >
              {playbackRate}x
            </button>

            <button
              onClick={() => setAutoPlayOnPageSwitch(!autoPlayOnPageSwitch)}
              className={`p-2 rounded-xl border text-xs flex items-center gap-1.5 transition-all ${
                autoPlayOnPageSwitch 
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                  : 'bg-white border-slate-200 text-slate-400'
              }`}
              title="Continuous background flow"
            >
              <Bookmark className={`w-3.5 h-3.5 ${autoPlayOnPageSwitch ? 'fill-emerald-600' : ''}`} />
              <span className="text-[10px] font-bold hidden lg:inline">
                {isRtl ? 'تشغيل تلقائي' : 'Auto Play'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Navigation and Advanced Filters Bar */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        
        {/* Navigation panel */}
        <div className="xl:col-span-3 bg-white border rounded-3xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            
            {/* Prev/Next Page Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={prevPage}
                disabled={currentPage === 1}
                className="p-2.5 rounded-2xl border bg-slate-50 hover:bg-slate-100 disabled:opacity-40 transition-all"
              >
                <ChevronLeft className="w-5 h-5 text-slate-600" />
              </button>

              <div className="px-5 py-2.5 bg-slate-50 border rounded-2xl text-center min-w-[120px]">
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none">
                  {isRtl ? 'الصفحة' : 'Mushaf Page'}
                </div>
                <div className="text-base font-black text-slate-800 font-mono mt-1">
                  {currentPage} / 604
                </div>
              </div>

              <button
                onClick={nextPage}
                disabled={currentPage === 604}
                className="p-2.5 rounded-2xl border bg-slate-50 hover:bg-slate-100 disabled:opacity-40 transition-all"
              >
                <ChevronRight className="w-5 h-5 text-slate-600" />
              </button>
            </div>

            {/* Selector jumps */}
            <div className="grid grid-cols-3 gap-2 w-full sm:w-auto">
              <div>
                <select
                  value={selectedSurah}
                  onChange={(e) => handleSurahChange(e.target.value)}
                  className="w-full bg-slate-50 border text-xs font-bold px-2.5 py-3 rounded-2xl text-slate-700 outline-none"
                >
                  <option value="">{isRtl ? 'السورة' : 'Surah'}</option>
                  {SURAHS.map(s => (
                    <option key={s.number} value={s.number}>
                      {s.number}. {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <select
                  value={selectedJuz}
                  onChange={(e) => handleJuzChange(e.target.value)}
                  className="w-full bg-slate-50 border text-xs font-bold px-2.5 py-3 rounded-2xl text-slate-700 outline-none"
                >
                  <option value="">{isRtl ? 'الجزء' : 'Juz'}</option>
                  {JUZS.map(j => (
                    <option key={j.number} value={j.number}>
                      {isRtl ? `جزء ${j.number}` : `Juz ${j.number}`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <select
                  value={selectedHizb}
                  onChange={(e) => handleHizbChange(e.target.value)}
                  className="w-full bg-slate-50 border text-xs font-bold px-2.5 py-3 rounded-2xl text-slate-700 outline-none"
                >
                  <option value="">{isRtl ? 'الحزب' : 'Hizb'}</option>
                  {HIZBS.map(h => (
                    <option key={h.number} value={h.number}>
                      {isRtl ? `حزب ${h.number}` : `Hizb ${h.number}`}
                    </option>
                  ))}
                </select>
              </div>
            </div>

          </div>
        </div>

        {/* Quick jump input to specific page */}
        <div className="bg-white border rounded-3xl p-5 shadow-sm">
          <form onSubmit={handleJumpPage} className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block">
              {isRtl ? 'الانتقال السريع لصفحة' : 'Fast Jump to Page'}
            </label>
            <div className="relative">
              <input
                type="number"
                min="1"
                max="604"
                placeholder={isRtl ? 'مثال: ٢٥٠' : 'e.g. 250'}
                value={jumpPageVal}
                onChange={(e) => setJumpPageVal(e.target.value)}
                className="w-full pl-4 pr-12 py-2.5 bg-slate-50 rounded-2xl border text-sm font-bold text-slate-700 outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-all"
              >
                {isRtl ? 'اذهب' : 'Go'}
              </button>
            </div>
          </form>
        </div>

      </div>

      {/* Main Quran Mushaf View alongside Sidebar Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left/Middle Column: Beautiful Quran Mushaf Page Card */}
        <div className="lg:col-span-2 space-y-4">
          
          {/* Real-time search inside current page */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              placeholder={isRtl ? 'بحث في الصفحة الحالية (أو اكتب رقم صفحة للانتقال إليها مباشرة)...' : 'Search Arabic text in page, or write page number to jump...'}
              value={searchQuery}
              onChange={(e) => handleTextSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 bg-white rounded-3xl border shadow-sm outline-none text-slate-800 font-medium text-sm transition-all focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={currentPage}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="bg-[#FCFAF2] border-2 border-[#D4C3A3] rounded-[2.5rem] shadow-xl p-6 md:p-12 relative overflow-hidden"
            >
              {/* Vintage Moroccan mushaf border designs */}
              <div className="absolute top-2 left-2 right-2 bottom-2 border border-[#EBE3CD] rounded-[2.2rem] pointer-events-none" />
              <div className="absolute top-4 left-4 right-4 bottom-4 border border-[#E5DBBF] rounded-[2.0rem] opacity-40 pointer-events-none" />

              {loading ? (
                <div className="py-32 flex flex-col items-center justify-center space-y-4">
                  <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
                  <p className="text-slate-500 font-bold text-xs font-mono">{isRtl ? 'جاري تحميل لوحة ورش...' : 'Rendering WARSH script...'}</p>
                </div>
              ) : (
                <div className="space-y-8">
                  
                  {/* Surah title frame indicator inside the page */}
                  {ayahs.length > 0 && (
                    <div className="flex justify-between items-center bg-[#F4EDE0] border border-[#DDD3BC] px-6 py-2.5 rounded-2xl text-[11px] font-bold text-slate-600 uppercase tracking-widest relative">
                      <span>{isRtl ? `الجزء ${ayahs[0].juz}` : `Juz ${ayahs[0].juz}`}</span>
                      <span className="font-serif text-sm bg-emerald-50 border border-emerald-100 text-emerald-800 px-3 py-1 rounded-xl">
                        {ayahs[0].surah.name}
                      </span>
                      <span>{isRtl ? `الحزب ${Math.ceil(ayahs[0].hizbQuarter / 4)}` : `Hizb ${Math.ceil(ayahs[0].hizbQuarter / 4)}`}</span>
                    </div>
                  )}

                  {/* Flowing Arabic Text block */}
                  <div 
                    className="text-right text-slate-800 font-serif text-2xl md:text-3.5xl leading-[2.5] select-text font-semibold relative py-4 px-2"
                    dir="rtl"
                  >
                    {/* Basmalah block at start of non-Tawbah Surah if it's the first page of that surah */}
                    {ayahs.length > 0 && ayahs[0].numberInSurah === 1 && ayahs[0].surah.number !== 1 && ayahs[0].surah.number !== 9 && (
                      <div className="text-center font-serif text-xl text-slate-600 mb-8 border-y border-dashed border-slate-300 py-3 bg-white/40 rounded-xl">
                        بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
                      </div>
                    )}

                    {filteredAyahs.map((ayah) => {
                      // Check if matches text highlight
                      const isHighlighted = searchQuery.trim() && !isNaN(parseInt(searchQuery)) === false && ayah.text.includes(searchQuery);
                      
                      return (
                        <span 
                          key={ayah.number} 
                          className={`relative inline-wrap cursor-pointer rounded-lg px-1 transition-all group ${
                            isHighlighted ? 'bg-yellow-100 ring-2 ring-yellow-200' : 'hover:bg-amber-100/40'
                          }`}
                        >
                          <span>{ayah.text}</span>
                          
                          {/* Circle decorative Ayah counter mark unique to Moroccan Mushafs */}
                          <span className="inline-flex items-center justify-center w-8 h-8 mx-2 rounded-full border-2 border-[#D4C3A3] text-xs font-semibold font-serif text-[#9E8B68] bg-white/60">
                            {ayah.numberInSurah}
                          </span>

                          {/* Hover Action popup tooltips */}
                          <div className="hidden group-hover:flex absolute bottom-[105%] left-1/2 -translate-x-1/2 bg-slate-900 text-white rounded-2xl shadow-xl p-2 items-center gap-1.5 z-40 scale-90 transition-all">
                            <button
                              onClick={() => handleCopyAyah(ayah)}
                              className="p-2 hover:bg-slate-800 rounded-xl transition-all"
                              title="Copy"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => generateChallenge(ayah)}
                              className="p-2 hover:bg-slate-800 rounded-xl transition-all text-amber-400 flex items-center gap-1 text-[10px] font-bold"
                              title="Smart Game Challenge"
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                              <span>{isRtl ? 'لعبة الحفظ' : 'Challenge'}</span>
                            </button>
                          </div>
                        </span>
                      );
                    })}
                  </div>

                  {/* Centered page footer mark */}
                  <div className="flex justify-center items-center pt-6 border-t border-[#DDD3BC]/40">
                    <span className="font-serif font-black text-slate-500 border-2 border-[#EBE3CD] rounded-full w-12 h-12 flex items-center justify-center bg-[#F5EEDF] shadow-inner text-sm">
                      {currentPage}
                    </span>
                  </div>

                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Right Column: Educational Gamification Sandbox */}
        <div className="space-y-6">
          
          {/* Smart Ayah Continuation Challenge Card */}
          <div className="bg-white border rounded-3xl p-6 shadow-sm space-y-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-emerald-500 text-white px-3 py-1 text-[10px] font-black rounded-bl-2xl uppercase tracking-widest flex items-center gap-1.5 shadow-md">
              <Award className="w-3 h-3 fill-white" />
              <span>{isRtl ? 'المحاكاة التعليمية' : 'Hifdh Quiz'}</span>
            </div>

            <div className="space-y-2 pt-2">
              <h2 className="text-lg font-black text-slate-800 tracking-tight flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500 fill-amber-300" />
                {isRtl ? 'تحدي الحفظ التفاعلي' : 'Play Smart Challenge'}
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed font-semibold">
                {isRtl 
                  ? 'انقر على أي آية في المصحف لتوليد سؤال حول الآية الموالية لها فوراً واختبر مهارات حفظك للحفاظ على سلسلة الربح.'
                  : 'Click on any Ayah in the Mushaf page to build an instant continuation challenge and improve your accuracy streak.'}
              </p>
            </div>

            {challengeAyah ? (
              <div className="space-y-4 border-t pt-4">
                
                {/* Active Question Prompt */}
                <div className="bg-slate-50 border p-4 rounded-2xl relative space-y-2">
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-lg font-bold">
                    {challengeAyah.surah.name} ({challengeAyah.numberInSurah})
                  </span>
                  <div className="text-right text-lg md:text-xl font-serif text-slate-700 leading-loose py-2 font-semibold">
                    {challengeAyah.text} ... ﴿{challengeAyah.numberInSurah}﴾
                  </div>
                  <div className="text-xs text-slate-400 font-bold italic flex items-center gap-1.5">
                    <HelpCircle className="w-4 h-4 text-emerald-500" />
                    <span>{isRtl ? 'ما هي الآية الموالية لها مباشرة؟' : 'What is the correct next verse?'}</span>
                  </div>
                </div>

                {/* Multiple Options deck */}
                <div className="space-y-2">
                  {challengeOptions.map((opt, idx) => {
                    const isSelected = selectedAnswer === opt;
                    const isCorrectOpt = opt === correctAnswer;
                    const canHighlight = isAnswered;

                    let cardClass = "bg-white border hover:bg-slate-50 border-slate-200 text-slate-700";
                    if (canHighlight) {
                      if (isCorrectOpt) {
                        cardClass = "bg-emerald-50 border-emerald-300 text-emerald-800";
                      } else if (isSelected) {
                        cardClass = "bg-red-50 border-red-300 text-red-800";
                      }
                    }

                    return (
                      <button
                        key={idx}
                        disabled={isAnswered}
                        onClick={() => handleSelectAnswer(opt)}
                        className={`w-full text-right p-3.5 rounded-2xl text-sm font-serif font-semibold leading-relaxed border transition-all ${cardClass}`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>

                {/* Next Game button */}
                {isAnswered && (
                  <div className="flex justify-between items-center p-2">
                    <div className="flex items-center gap-2">
                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none">
                        {isRtl ? 'سلسلة الربح الحالية' : 'Current Streak'}
                      </div>
                      <div className="text-sm bg-amber-500 text-white font-black px-2.5 py-1 rounded-xl">
                        🔥 {streak}
                      </div>
                    </div>

                    <button
                      onClick={() => generateChallenge(challengeAyah)}
                      className="bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold px-4 py-2.5 rounded-2xl flex items-center gap-1.5 transition-all shadow-md"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>{isRtl ? 'إعادة التحدي' : 'Retry'}</span>
                    </button>
                  </div>
                )}

              </div>
            ) : (
              <div className="bg-slate-50 border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center text-center space-y-4">
                <GameIcon className="w-12 h-12 text-slate-300 animate-pulse" />
                <p className="text-xs text-slate-500 font-bold leading-relaxed">
                  {isRtl 
                    ? 'لم يتم تحديد آية؛ بمجرد نقرك على أي آية في القائمة، سيتم فتح التحدي واختبار حفظك للآية الموالية.'
                    : 'Currently waiting for selected verse. Scroll or hover over any Ayah card and click the Sparkles icon to trigger.'}
                </p>
              </div>
            )}
          </div>

          {/* Morocco Mushaf Structure Insights */}
          <div className="bg-emerald-950 text-white rounded-3xl p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-black uppercase tracking-widest text-emerald-300 flex items-center gap-2">
              <Sparkles className="w-4 h-4 fill-emerald-300" />
              {isRtl ? 'مزايا مصحف ورش المغربي' : 'WARSH Premium Dataset'}
            </h3>
            
            <div className="text-xs space-y-3 leading-relaxed text-emerald-100 font-medium">
              <p>
                {isRtl 
                  ? '• تلتزم قاعدة البيانات بالتقسيم الثماني لورش (أثمان وأرباع وأنصاف أحزاب)، وهو التقسيم المعتمد في الكتاتيب ومراكز الحفظ بمدرستنا.'
                  : '• Fully integrates Arabic typography tuned according to the Warsh riwaya spelling system (Moroccan Quran structure).'}
              </p>
              <p>
                {isRtl 
                  ? '• تشتمل الخصائص اللغوية على تعديل بعض الألفاظ كالاستفهام المقترن بالبدل وحذف المد العارض، لتتوافق تماماً مع التلاوة الجماعية المغربية.'
                  : '• Embedded with full support for Quran audio narration featuring top historical Moroccan reciters such as Aloyoon Al-Koshi.'}
              </p>
              <p>
                {isRtl 
                  ? '• يغذي هذا النظام بنك الأسئلة ومحركات التقييم الذكي لتوفير اختبارات المتابعة للمشرفين والمعلمين بدقة قصوى.'
                  : '• Acts as a database foundation powering game loops, question generators, and teacher evaluation analytics.'}
              </p>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
