import { useState, useEffect, useMemo } from 'react';
import { auth } from '../lib/firebase';
import { dbService } from '../services/db';
import { Link, Navigate } from 'react-router-dom';
import { Student, Evaluation, Memorization, UserProfile } from '../types';
import { 
  Brain, 
  Award, 
  Sparkles, 
  RotateCcw, 
  ArrowRight, 
  ChevronRight, 
  Check, 
  X, 
  HelpCircle, 
  Trophy, 
  Play, 
  ChevronLeft,
  BookOpen,
  Timer,
  History,
  Calendar,
  Trash2,
  TrendingUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { SURAHS, QuranService, Ayah } from '../services/quran';
import { QURAN_HIZBS } from '../constants/quranMetadata';

interface ChallengeHistoryItem {
  id: string;
  date: string;
  score: number;
  detectedSurahsCount: number;
}

interface SmartChallengePageProps {
  profile: UserProfile | null;
}

interface Question {
  type: 'identify_surah' | 'next_ayah' | 'fill_blank' | 'prev_ayah';
  prompt: string;
  arabicPrompt: string;
  sourceAyah: Ayah;
  surahName: string;
  options: string[];
  correctAnswer: string;
}

// Fallback high-quality local datasets of Surahs to guarantee instant offline loading
const OFFLINE_SURAH_AYAH_POOL: Record<number, { text: string; numberInSurah: number }[]> = {
  1: [ // Al-Fatihah
    { text: "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ", numberInSurah: 1 },
    { text: "الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ", numberInSurah: 2 },
    { text: "الرَّحْمَٰنِ الرَّحِيمِ", numberInSurah: 3 },
    { text: "مَلِكِ يَوْمِ الدِّينِ", numberInSurah: 4 },
    { text: "إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ", numberInSurah: 5 },
    { text: "اهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ", numberInSurah: 6 },
    { text: "صِرَاطَ الَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ الْمَغْضُوبِ عَلَيْهِمْ وَلَا الضَّالِّينَ", numberInSurah: 7 }
  ],
  108: [ // Al-Kawthar
    { text: "إِنَّا أَعْطَيْنَاكَ الْكَوْثَرَ", numberInSurah: 1 },
    { text: "فَصَلِّ لِرَبِّكَ وَانْحَرْ", numberInSurah: 2 },
    { text: "إِنَّ شَانِئَكَ هُوَ الْأَبْتَرُ", numberInSurah: 3 }
  ],
  112: [ // Al-Ikhlas
    { text: "قُلْ هُوَ اللَّهُ أَحَدٌ", numberInSurah: 1 },
    { text: "اللَّهُ الصَّمَدُ", numberInSurah: 2 },
    { text: "لَمْ يَلِدْ وَلَمْ يُولَدْ", numberInSurah: 3 },
    { text: "وَلَمْ يَكُنْ لَهُ كُفُوًا أَحَدٌ", numberInSurah: 4 }
  ],
  113: [ // Al-Falaq
    { text: "قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ", numberInSurah: 1 },
    { text: "مِنْ شَرِّ مَا خَلَقَ", numberInSurah: 2 },
    { text: "وَمِنْ شَرِّ غَاسِقٍ إِذَا وَقَبَ", numberInSurah: 3 },
    { text: "وَمِنْ شَرِّ النَّفَّاثَاتِ فِي الْعُقَدِ", numberInSurah: 4 },
    { text: "وَمِنْ شَرِّ حَاسِدٍ إِذَا حَسَدَ", numberInSurah: 5 }
  ],
  114: [ // An-Nas
    { text: "قُل * أَعُوذُ بِرَبِّ النَّاسِ", numberInSurah: 1 },
    { text: "مَلِكِ النَّاسِ", numberInSurah: 2 },
    { text: "إِلَٰهِ النَّاسِ", numberInSurah: 3 },
    { text: "مِنْ شَرِّ الْوَسْوَاسِ الْخَنَّاسِ", numberInSurah: 4 },
    { text: "الَّذِي يُوَسْوِسُ فِي صُدُورِ النَّاسِ", numberInSurah: 5 },
    { text: "مِنَ الْجِنَّةِ وَالنَّاسِ", numberInSurah: 6 }
  ]
};

export default function SmartChallengePage({ profile }: SmartChallengePageProps) {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';

  // State
  const [student, setStudent] = useState<Student | null>(null);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [memorizations, setMemorizations] = useState<Memorization[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Challenge game settings
  const [gameStarted, setGameStarted] = useState<boolean>(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState<boolean>(false);
  const [score, setScore] = useState<number>(0);
  const [streakCount, setStreakCount] = useState<number>(0);
  const [answersLog, setAnswersLog] = useState<boolean[]>([]); // stores true/false for each of the 10 questions
  const [timeLeft, setTimeLeft] = useState<number>(45); // 45 seconds per question
  const [timerActive, setTimerActive] = useState<boolean>(false);

  // Stats from LocalStorage
  const [totalGamesPlayed, setTotalGamesPlayed] = useState<number>(() => {
    return parseInt(localStorage.getItem('hifdh_challenge_games') || '0');
  });
  const [highScore, setHighScore] = useState<number>(() => {
    return parseInt(localStorage.getItem('hifdh_challenge_highscore') || '0');
  });

  const [challengeHistory, setChallengeHistory] = useState<ChallengeHistoryItem[]>(() => {
    try {
      const stored = localStorage.getItem('hifdh_challenge_history');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [showResults, setShowResults] = useState<boolean>(false);
  const [showSurahsModal, setShowSurahsModal] = useState<boolean>(false);
  const [showClearConfirm, setShowClearConfirm] = useState<boolean>(false);

  // Verify Role is Student. Wait! Secure check:
  if (profile && profile.role !== 'student') {
    return <Navigate to="/" replace />;
  }

  // Effect: Subscribe to Student Memorization Data
  useEffect(() => {
    if (!auth.currentUser?.email) return;
    const email = auth.currentUser.email.toLowerCase();
    
    let subUnsubscribes: (() => void)[] = [];
    setLoading(true);

    const mainUnsubscribe = dbService.subscribeStudentProfile(email, (fetchedStudent) => {
      if (!fetchedStudent) {
        setStudent(null);
        setLoading(false);
        return;
      }
      setStudent(fetchedStudent);

      // Subscription lists
      subUnsubscribes.push(dbService.subscribeStudentEvaluations(fetchedStudent.id, email, (evals) => {
        setEvaluations(evals || []);
      }));

      subUnsubscribes.push(dbService.subscribeStudentMemorizations(fetchedStudent.id, email, (memos) => {
        setMemorizations(memos || []);
        setLoading(false);
      }));
    });

    return () => {
      mainUnsubscribe();
      subUnsubscribes.forEach(unsub => unsub());
    };
  }, []);

  // Timer Effect
  useEffect(() => {
    let timerId: any;
    if (timerActive && gameStarted && timeLeft > 0 && !isAnswered) {
      timerId = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && !isAnswered && timerActive) {
      // Auto submit as wrong answer
      handleAnswerSelection("");
    }
    return () => clearInterval(timerId);
  }, [timeLeft, timerActive, gameStarted, isAnswered]);

  // Extract Student's memorized Surahs
  const memorizedSurahNames = useMemo(() => {
    const list: string[] = [];
    
    const addFromItem = (item: any) => {
      if (item.surahName && item.surahName.trim()) {
        const sName = item.surahName.trim();
        if (!list.includes(sName)) list.push(sName);
      }
      
      if (item.hizbNumber && item.hizbNumber >= 1 && item.hizbNumber <= 60) {
        const h = item.hizbNumber;
        const hStart = QURAN_HIZBS[h]?.page;
        if (hStart) {
          const hEnd = h < 60 ? (QURAN_HIZBS[h + 1]?.page - 1 || hStart + 9) : 604;
          
          SURAHS.forEach((s, idx) => {
            const sStart = s.startPage;
            const sEnd = idx < 113 ? (SURAHS[idx + 1].startPage - 1) : 604;
            
            // Check for overlap between [hStart, hEnd] and [sStart, sEnd]
            const hasOverlap = Math.max(hStart, sStart) <= Math.min(hEnd, sEnd);
            if (hasOverlap) {
              if (!list.includes(s.name)) {
                list.push(s.name);
              }
              if (!list.includes(s.englishName)) {
                list.push(s.englishName);
              }
            }
          });
        }
      }
    };

    evaluations.forEach(addFromItem);
    memorizations.forEach(addFromItem);
    
    return list;
  }, [evaluations, memorizations]);

  // Filter full Surah metadata objects matching the detected list
  const matchedSurahsList = useMemo(() => {
    return SURAHS.filter(s => memorizedSurahNames.includes(s.name) || memorizedSurahNames.includes(s.englishName));
  }, [memorizedSurahNames]);

  // Generate 10-Question challenge round
  const startNewChallenge = async () => {
    setLoading(true);
    try {
      // Find surah numbers
      let matchedSurahs = SURAHS.filter(s => memorizedSurahNames.includes(s.name) || memorizedSurahNames.includes(s.englishName));
      
      // Fallback if they have less than 2 memorized surahs (beginners default pool)
      if (matchedSurahs.length < 2) {
        // Juz Amma Surahs numbers: 1 (Fatihah), 112 (Ikhlas), 113 (Falaq), 114 (Nas), 108 (Kawthar)
        matchedSurahs = SURAHS.filter(s => [1, 93, 94, 95, 103, 108, 110, 112, 113, 114].includes(s.number));
      }

      const generatedQuestions: Question[] = [];

      // Query database custom smart questions
      try {
        const dbQs = (await dbService.listCustomQuestions()) as any[];
        if (dbQs && dbQs.length > 0) {
          const studentSurahNums = matchedSurahs.map(s => s.number);
          const matchedDbQs = dbQs.filter(q => !q.surahNumber || studentSurahNums.includes(q.surahNumber));
          const mappedDbQs: Question[] = matchedDbQs.map(customQ => ({
            type: customQ.type as any,
            prompt: customQ.prompt,
            arabicPrompt: customQ.arabicPrompt,
            sourceAyah: {
              number: 1,
              text: customQ.verseText,
              numberInSurah: 1,
              juz: 30,
              hizbQuarter: 120,
              page: 1,
              surah: {
                number: customQ.surahNumber || 1,
                name: customQ.surahName || '',
                englishName: customQ.surahName || '',
                numberOfAyahs: 1
              }
            } as any,
            surahName: customQ.surahName,
            options: customQ.options,
            correctAnswer: customQ.correctAnswer
          }));
          const shuffledCustom = mappedDbQs.sort(() => 0.5 - Math.random());
          generatedQuestions.push(...shuffledCustom.slice(0, 10));
        }
      } catch (err) {
        console.error("Failed to inject custom admin questions, falling back to dynamic only", err);
      }
      
      // Fetch data for these surahs
      const fetchedSurahData: Record<number, Ayah[]> = {};
      
      // Fetch up to 5 matching surahs in parallel or fallbacks
      const fetchPromises = matchedSurahs.slice(0, 10).map(async (sur) => {
        try {
          const pageAyat = await QuranService.getPageAyahs(sur.startPage);
          // Let's also fetch from public alquran cloud API directly or construct from fallback
          const url = `https://api.alquran.cloud/v1/surah/${sur.number}/quran-uthmani`;
          const apiResponse = await fetch(url);
          if (apiResponse.ok) {
            const rawJson = await apiResponse.json();
            if (rawJson.data && rawJson.data.ayahs) {
              const fullAyat = rawJson.data.ayahs.map((a: any) => ({
                number: a.number,
                text: a.text,
                numberInSurah: a.numberInSurah,
                surah: {
                  number: sur.number,
                  name: sur.name,
                  englishName: sur.englishName,
                  numberOfAyahs: sur.numberOfAyahs
                }
              } as any));
              fetchedSurahData[sur.number] = fullAyat;
              return;
            }
          }
        } catch (e) {
          console.log("No internet or API error. Falling back to offline dataset for Surah " + sur.number);
        }

        // Offline Fallback Constructor
        if (OFFLINE_SURAH_AYAH_POOL[sur.number]) {
          fetchedSurahData[sur.number] = OFFLINE_SURAH_AYAH_POOL[sur.number].map((x, i) => ({
            number: i + 1,
            text: x.text,
            numberInSurah: x.numberInSurah,
            surah: {
              number: sur.number,
              name: sur.name,
              englishName: sur.englishName,
              numberOfAyahs: sur.numberOfAyahs
            }
          } as any));
        } else {
          // Construct general fallback
          const fallbacks: Ayah[] = [];
          for (let index = 1; index <= Math.min(sur.numberOfAyahs, 8); index++) {
            fallbacks.push({
              number: index,
              text: `الآية رقم ${index} من سورة ${sur.name} المباركة المكتوبة بالرسم المغربي لورش`,
              numberInSurah: index,
              juz: 30,
              hizbQuarter: 120,
              page: sur.startPage,
              surah: {
                number: sur.number,
                name: sur.name,
                englishName: sur.englishName,
                englishNameTranslation: sur.englishNameTranslation,
                revelationType: sur.revelationType,
                numberOfAyahs: sur.numberOfAyahs
              }
            });
          }
          fetchedSurahData[sur.number] = fallbacks;
        }
      });

      await Promise.all(fetchPromises);

      // Now compile 10 questions using fetchedSurahData
      const surahKeys = Object.keys(fetchedSurahData).map(Number);
      
      let loopAttempts = 0;
      while (generatedQuestions.length < 10 && loopAttempts < 120) {
        loopAttempts++;
        const randSurahNum = surahKeys[Math.floor(Math.random() * surahKeys.length)];
        const surahAyahs = fetchedSurahData[randSurahNum] || [];
        
        if (surahAyahs.length === 0) {
          // Absolute fallback protection
          surahKeys.push(1); // Force Al-Fatihah
          continue;
        }

        // Select a random ayah
        const randAyahIdx = Math.floor(Math.random() * surahAyahs.length);
        const sourceAyah = surahAyahs[randAyahIdx];

        // Pick question type randomly
        const questionTypes: Question['type'][] = ['identify_surah', 'next_ayah', 'fill_blank'];
        if (randAyahIdx > 0) questionTypes.push('prev_ayah');
        
        const selectedType = questionTypes[Math.floor(Math.random() * questionTypes.length)];

        let prompt = "";
        let arabicPrompt = "";
        let correctAnswer = "";
        let options: string[] = [];

        if (selectedType === 'identify_surah') {
          prompt = `Which Surah does this noble Ayah belong to?`;
          arabicPrompt = `إلى أي سورة تنتمي هذه الآية الكريمة؟`;
          correctAnswer = sourceAyah.surah.name;
          
          // Construct incorrect distractors
          const otherNames = SURAHS.filter(s => s.name !== correctAnswer).map(s => s.name);
          // Shuffle distractors
          const distractors = otherNames.sort(() => 0.5 - Math.random()).slice(0, 3);
          options = [...distractors, correctAnswer].sort(() => 0.5 - Math.random());
        } 
        else if (selectedType === 'next_ayah') {
          prompt = `Recite and complete: What is the immediately following Ayah?`;
          arabicPrompt = `أكمل الحفظ: ما هي الآية الموالية للآية المعروضة؟`;
          
          if (randAyahIdx + 1 < surahAyahs.length) {
            correctAnswer = surahAyahs[randAyahIdx + 1].text;
          } else {
            correctAnswer = `صدق الله العظيم (نهاية السورة)`;
          }

          // Generate distractors
          const distractors: string[] = [];
          while (distractors.length < 3) {
            const randomOtherSurah = surahKeys[Math.floor(Math.random() * surahKeys.length)];
            const otherSurahAyahs = fetchedSurahData[randomOtherSurah] || [];
            if (otherSurahAyahs.length > 0) {
              const rIdx = Math.floor(Math.random() * otherSurahAyahs.length);
              const otherText = otherSurahAyahs[rIdx].text;
              if (otherText !== sourceAyah.text && otherText !== correctAnswer && !distractors.includes(otherText)) {
                distractors.push(otherText);
              }
            } else {
              distractors.push(`آية قريبة من الجزء المذكور`);
            }
          }
          options = [...distractors, correctAnswer].sort(() => 0.5 - Math.random());
        }
        else if (selectedType === 'prev_ayah' && randAyahIdx > 0) {
          prompt = `Complete the sequence: What is the preceding Ayah?`;
          arabicPrompt = `أكمل التسلسل: ما هي الآية السابقة للآية المعروضة؟`;
          correctAnswer = surahAyahs[randAyahIdx - 1].text;

          // Generate distractors
          const distractors: string[] = [];
          while (distractors.length < 3) {
            const randomOtherSurah = surahKeys[Math.floor(Math.random() * surahKeys.length)];
            const otherSurahAyahs = fetchedSurahData[randomOtherSurah] || [];
            if (otherSurahAyahs.length > 0) {
              const rIdx = Math.floor(Math.random() * otherSurahAyahs.length);
              const otherText = otherSurahAyahs[rIdx].text;
              if (otherText !== sourceAyah.text && otherText !== correctAnswer && !distractors.includes(otherText)) {
                distractors.push(otherText);
              }
            } else {
              distractors.push(`آية عشوائية من الحفظ`);
            }
          }
          options = [...distractors, correctAnswer].sort(() => 0.5 - Math.random());
        }
        else { // fill_blank / complete vocabulary
          prompt = `Which correct word is missing in the blank?`;
          arabicPrompt = `اختر الكلمة الصحيحة التي تملأ الفراغ بالرسم العثماني لورش:`;
          
          const words = sourceAyah.text.split(" ");
          // Pick a random word that is not too short
          const eligibleIndices = words.map((w, idx) => ({ w, idx })).filter(item => item.w.length > 3 && !item.w.includes("(") && !item.w.includes(")"));
          
          if (eligibleIndices.length > 0) {
            const chosen = eligibleIndices[Math.floor(Math.random() * eligibleIndices.length)];
            correctAnswer = chosen.w;
            
            // Mask the word
            const maskedWords = [...words];
            maskedWords[chosen.idx] = "「 ....... 」";
            const maskedText = maskedWords.join(" ");

            // Create a virtual modified source ayah with masked text
            const modifiedAyah = { ...sourceAyah, text: maskedText };
            
            // Distractors: other words from nearby verses or standard vocabulary
            const otherWordsList = ["عَلِيمٌ", "حَكِيمٌ", "مُستَقِيمَ", "رَّحِيمٌ", "الْمُتَّقِينَ", "النَّاسِ", "الْحَقّ", "سَبِيل", "بَيَان"];
            const distractors = otherWordsList.filter(o => o !== correctAnswer).sort(() => 0.5 - Math.random()).slice(0, 3);
            
            generatedQuestions.push({
              type: 'fill_blank',
              prompt,
              arabicPrompt,
              sourceAyah: modifiedAyah,
              surahName: sourceAyah.surah.name,
              options: [...distractors, correctAnswer].sort(() => 0.5 - Math.random()),
              correctAnswer
            });
            continue; // Skip the default push below
          } else {
            // Fallback to identify surah
            prompt = `Which Surah does this noble Ayah belong to?`;
            arabicPrompt = `إلى أي سورة تنتمي هذه الآية الكريمة؟`;
            correctAnswer = sourceAyah.surah.name;
            const otherNames = SURAHS.filter(s => s.name !== correctAnswer).map(s => s.name);
            const distractors = otherNames.sort(() => 0.5 - Math.random()).slice(0, 3);
            options = [...distractors, correctAnswer].sort(() => 0.5 - Math.random());
          }
        }

        generatedQuestions.push({
          type: selectedType,
          prompt,
          arabicPrompt,
          sourceAyah,
          surahName: sourceAyah.surah.name,
          options,
          correctAnswer
        });
      }

      setQuestions(generatedQuestions);
      setCurrentIndex(0);
      setScore(0);
      setStreakCount(0);
      setAnswersLog([]);
      setIsAnswered(false);
      setSelectedOption(null);
      setTimeLeft(45);
      setShowResults(false);
      setGameStarted(true);
      setTimerActive(true);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const handleAnswerSelection = (option: string) => {
    if (isAnswered) return;
    
    setSelectedOption(option);
    setIsAnswered(true);
    setTimerActive(false);

    const isCorrect = option === questions[currentIndex].correctAnswer;
    const newAnswersLog = [...answersLog, isCorrect];
    setAnswersLog(newAnswersLog);

    if (isCorrect) {
      setScore(prev => prev + 1);
      setStreakCount(prev => prev + 1);
    } else {
      setStreakCount(0);
    }
  };

  const handleNextQuestion = () => {
    if (currentIndex < 9) {
      setCurrentIndex(prev => prev + 1);
      setSelectedOption(null);
      setIsAnswered(false);
      setTimeLeft(45);
      setTimerActive(true);
    } else {
      // Game Over: Save stats
      const games = totalGamesPlayed + 1;
      setTotalGamesPlayed(games);
      localStorage.setItem('hifdh_challenge_games', String(games));

      let finalScore = score;
      if (score > highScore) {
        setHighScore(score);
        localStorage.setItem('hifdh_challenge_highscore', String(score));
      }
      setTimerActive(false);

      // Save to Challenge History logs
      const historyItem: ChallengeHistoryItem = {
        id: Math.random().toString(36).substring(2, 11),
        date: new Date().toISOString(),
        score: finalScore,
        detectedSurahsCount: matchedSurahsList.length
      };
      
      setChallengeHistory(prev => {
        const next = [historyItem, ...prev];
        localStorage.setItem('hifdh_challenge_history', JSON.stringify(next));
        return next;
      });

      setShowResults(true);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8 select-none" dir={isRtl ? 'rtl' : 'ltr'}>
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-8 rounded-[32px] border border-slate-200/40 shadow-soft">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-500 shadow-md">
            <Brain className="w-8 h-8 animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">
              {isRtl ? 'تحدي الذكاء التفاعلي' : 'Play Smart Challenge'}
            </h1>
            <p className="text-xs font-semibold text-slate-400 mt-1">
              {isRtl 
                ? 'مراجعة تفاعلية مبنية بالكامل على سورك وأحزابك المحفوظة لتأكيد الضبط والتمكين' 
                : 'Adaptive evaluation program trained directly on your memorization catalog to build mastery.'}
            </p>
          </div>
        </div>
        <Link 
          to="/" 
          className="flex items-center gap-2 text-xs font-black text-slate-500 bg-slate-50 hover:bg-slate-100 transition-colors px-4 py-2.5 rounded-xl border border-slate-100"
        >
          {isRtl ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          {isRtl ? 'بوابتي الشخصية' : 'Back to Portal'}
        </Link>
      </div>

      <AnimatePresence mode="wait">
        
        {/* Loading Overlay */}
        {loading && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="bg-white p-20 rounded-[32px] border border-slate-200/50 flex flex-col items-center justify-center space-y-4 shadow-sm min-h-[400px]"
          >
            <div className="w-14 h-14 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin" />
            <div className="text-center space-y-1.5 pt-2">
              <h4 className="font-extrabold text-slate-700 text-sm">
                {isRtl ? 'جاري تحضير أسئلتك المخصصة...' : 'Loading custom questions...'}
              </h4>
              <p className="text-[10px] text-slate-400 font-bold">
                {isRtl ? 'نقوم بفحص مصفوفة حفظك واختيار الآيات بالرسم المغربي ورواية ورش' : 'Compiling active verses matching your latest evaluations...'}
              </p>
            </div>
          </motion.div>
        )}

        {/* Start Game Dashboard */}
        {!loading && !gameStarted && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-8 animate-fade-in"
          >
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Big Card: Intro & Play Button */}
            <div className="lg:col-span-2 bg-gradient-to-b from-slate-900 via-slate-900 to-emerald-950 p-8 rounded-[40px] text-white flex flex-col justify-between min-h-[420px] shadow-xl relative overflow-hidden group">
              
              {/* Decorative Glow */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl group-hover:bg-emerald-500/15 transition-all duration-700 pointer-events-none" />
              
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] tracking-widest font-black uppercase text-amber-400 bg-amber-500/10 border border-amber-400/20 px-3 py-1 rounded-full">
                    {isRtl ? 'تحسين الضبط والإتقان والتمكين' : 'Adaptive Memorization Assessment'}
                  </span>
                  <button 
                    onClick={() => setShowSurahsModal(true)}
                    className="flex items-center gap-1.5 text-xs font-bold text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 transition-all px-3 py-1.5 rounded-full cursor-pointer hover:scale-105 active:scale-95 border border-emerald-500/25"
                    title={isRtl ? "عرض السور المكتشفة" : "Click to view detected surahs"}
                  >
                    <BookOpen className="w-4 h-4 text-emerald-400" />
                    <span className="underline decoration-dotted decoration-emerald-400/40 underline-offset-4">
                      {isRtl ? `لديك ${matchedSurahsList.length} سور مسجلة` : `${matchedSurahsList.length} Custom Surahs Detected`}
                    </span>
                  </button>
                </div>

                <div className="space-y-3.5">
                  <h2 className="text-3xl font-black leading-tight tracking-tight">
                    {isRtl ? 'اختبر قوة حفظك في ૧٠ أسئلة ذكية' : 'Test your Hifdh with 10 Smart Questions'}
                  </h2>
                  <p className="text-slate-350 text-xs font-semibold leading-relaxed max-w-xl">
                    {isRtl 
                      ? 'يقوم مولد الأسئلة بالتقاط آيات عشوائية من مجموع سور مراجعاتك وتقييماتك الأخيرة ويبتكر أسئلة تفاعلية (إكمال فواصل السور، التعرف على مواضع الآيات، ملء الكلمات المنسية برسم ورش).' 
                      : 'The algorithm analyzes your performance index, selects randomized verses from your logged milestones, and prompts you to match the correct chapter, write corresponding lines, or complete the vocabulary placeholders.'}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-bold text-xs pt-4 border-t border-slate-800">
                  <div className="space-y-1">
                    <span className="text-slate-400 text-[10px] block font-black uppercase tracking-wider">{isRtl ? 'طول الجولة' : 'Round Limit'}</span>
                    <span className="text-white text-sm font-black">10 {isRtl ? 'أسئلة تفاعلية' : 'Questions'}</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-slate-400 text-[10px] block font-black uppercase tracking-wider">{isRtl ? 'مؤقت الإجابة' : 'Timer rule'}</span>
                    <span className="text-white text-sm font-black">45 {isRtl ? 'ثانية لكل سؤال' : 'Sec / Ayah'}</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-slate-400 text-[10px] block font-black uppercase tracking-wider">{isRtl ? 'رواية المصحف' : 'Mushaf standard'}</span>
                    <span className="text-emerald-400 text-sm font-black">{isRtl ? 'ورش عن نافع' : 'WARSH Script'}</span>
                  </div>
                </div>
              </div>

              <div className="pt-8">
                <button
                  onClick={startNewChallenge}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-3.5 bg-[#16C47F] hover:bg-[#14b071] text-white px-8 py-4.5 rounded-2xl font-black text-sm tracking-wide shadow-lg shadow-emerald-950/40 transition-all transform hover:scale-[1.02] active:scale-95"
                >
                  <Play className="w-5 h-5 fill-current" />
                  <span>{isRtl ? 'ابدأ جولة التحدي الآن' : 'Start Assessment Round'}</span>
                </button>
              </div>
            </div>

            {/* Right Side Column: Achievements & Stats */}
            <div className="space-y-6">
              
              {/* High Score / Stats widget */}
              <div className="bg-white p-6 rounded-[32px] border border-slate-200/40 shadow-soft flex flex-col justify-between min-h-[200px]">
                <div className="space-y-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 bg-amber-50 text-amber-500 rounded-xl flex items-center justify-center">
                      <Trophy className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-black text-slate-800 text-xs tracking-tight">{isRtl ? 'أعلى نتيجة مسجلة' : 'My Hall of Fame'}</h4>
                      <p className="text-[10px] text-slate-400 font-bold">{isRtl ? 'الرقم القياسي الخاص بك' : 'Personal all-time high score'}</p>
                    </div>
                  </div>
                </div>

                <div className="py-2.5 flex items-baseline gap-2">
                  <span className="text-5xl font-black text-slate-850 tracking-tight">{highScore}</span>
                  <span className="text-slate-400 text-xs font-bold">/ 10 {isRtl ? 'إجابات صحيحة' : 'correct'}</span>
                </div>

                <div className="text-[11px] font-bold text-slate-450 pt-2 border-t border-slate-50 flex items-center justify-between">
                  <span>{isRtl ? 'إجمالي الجولات الملعوبة' : 'Assessment rounds complete'}</span>
                  <span className="text-slate-700 font-black">{totalGamesPlayed} {isRtl ? 'جولات' : 'rounds'}</span>
                </div>
              </div>

              {/* Tips & Instructions Card */}
              <div className="bg-white p-6 rounded-[32px] border border-slate-200/40 shadow-soft space-y-4">
                <div className="flex items-center gap-2 text-indigo-600">
                  <Sparkles className="w-5 h-5 animate-spin-slow" />
                  <h5 className="font-extrabold text-xs tracking-tight">{isRtl ? 'نصيحة لتفعيل الضبط الذكي' : 'Mastery tips & updates'}</h5>
                </div>
                
                <p className="text-[11px] font-semibold text-slate-500 leading-relaxed text-justify">
                  {isRtl 
                    ? 'كلما زاد عدد الأجزاء والسور التي تمر بتقييم معلمك، كلما تدرب خوارزم التحدي على سور أكثر اتساعاً. إن لم تسجل لك أي سور بعد، سيبدأ التحدي بسور جزء عمّ ليكون جاهزاً للمتعة فوراً!' 
                    : 'The smart engine pulls ayahs based on active records verified by your Sheikh. If you do not have logged revisions yet, the system defaults to Juz Amma targets in standard Warsh layout.'}
                </p>
              </div>

            </div>

          </div>

            {/* Smart Challenge Play History panel */}
            <div className="bg-white rounded-[40px] border border-slate-200/40 shadow-soft p-6 sm:p-8 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-[#16C47F] border border-emerald-500/10 flex items-center justify-center">
                    <History className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-800 tracking-tight">
                      {isRtl ? 'سجل مشاركات تحدي الذكاء' : 'Smart Challenge Play History'}
                    </h3>
                    <p className="text-xs text-slate-400 font-semibold mt-0.5">
                      {isRtl ? 'استعراض أدائك ومستويات الإتقان في المحاولات السابقة' : 'Review your historical progress and precision scores in previous runs'}
                    </p>
                  </div>
                </div>

                {challengeHistory.length > 0 && (
                  <div className="flex items-center gap-2">
                    {showClearConfirm ? (
                      <div className="flex items-center gap-2 bg-red-50 border border-red-100 p-1.5 rounded-xl">
                        <span className="text-[10px] font-black text-red-600 px-1">
                          {isRtl ? 'هل أنت متأكد؟' : 'Are you sure?'}
                        </span>
                        <button
                          onClick={() => {
                            setChallengeHistory([]);
                            localStorage.removeItem('hifdh_challenge_history');
                            setShowClearConfirm(false);
                          }}
                          className="text-[10px] font-bold text-white bg-red-500 hover:bg-red-600 px-2.5 py-1 rounded-lg cursor-pointer transition-colors"
                        >
                          {isRtl ? 'نعم، احذف' : 'Yes, Delete'}
                        </button>
                        <button
                          onClick={() => setShowClearConfirm(false)}
                          className="text-[10px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-lg cursor-pointer transition-colors"
                        >
                          {isRtl ? 'إلغاء' : 'Cancel'}
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowClearConfirm(true)}
                        className="inline-flex items-center gap-1.5 text-[11px] font-bold text-red-500 hover:text-red-600 bg-red-50 hover:bg-red-100 transition-colors px-3 py-1.5 rounded-xl cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>{isRtl ? 'مسح السجل' : 'Clear History'}</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {challengeHistory.length === 0 ? (
                <div className="text-center py-16 text-slate-400 font-semibold italic space-y-3">
                  <TrendingUp className="w-12 h-12 text-slate-200 mx-auto" />
                  <p className="text-xs">
                    {isRtl ? 'لا توجد جولات مسجلة في تاريخك بعد.' : 'No recorded rounds in your history yet.'}
                  </p>
                  <p className="text-[10px] text-slate-400 max-w-sm mx-auto font-medium">
                    {isRtl 
                      ? 'بمجرد إكمالك لأول تحدي مكون من ૧٠ أسئلة، سيتم تجميع نقاطك والاحتفاظ بسجلك هنا تلقائياً لضبط مصفوفة مستواك.' 
                      : 'Complete your first 10-questions challenge to unlock graphical analytics and track your retention performance over time.'}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-right" dir={isRtl ? 'rtl' : 'ltr'}>
                    <thead>
                      <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">
                        <th className="pb-3 text-left pl-3">{isRtl ? 'التاريخ والوقت' : 'Attempt Date & Time'}</th>
                        <th className="pb-3 text-center">{isRtl ? 'السور المكتشفة' : 'Active Surah Pool'}</th>
                        <th className="pb-3 text-center">{isRtl ? 'معدل الدقة' : 'Accuracy Rating'}</th>
                        <th className="pb-3 text-right pr-3">{isRtl ? 'النتيجة الإجمالية' : 'Round Score'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 text-xs font-bold text-slate-750">
                      {challengeHistory.map((item, idx) => {
                        const accuracyPercent = item.score * 10;
                        const ratingColor = item.score >= 8 ? 'bg-emerald-500' : item.score >= 5 ? 'bg-amber-500' : 'bg-red-500';
                        const ratingTextColor = item.score >= 8 ? 'text-emerald-600' : item.score >= 5 ? 'text-amber-600' : 'text-red-600';
                        const ratingBg = item.score >= 8 ? 'bg-emerald-50' : item.score >= 5 ? 'bg-amber-50' : 'bg-red-50';

                        let formattedDateString = '';
                        try {
                          const attemptDate = new Date(item.date);
                          formattedDateString = attemptDate.toLocaleDateString(isRtl ? 'ar-EG' : 'en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          });
                        } catch {
                          formattedDateString = item.date;
                        }

                        return (
                          <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                            <td className="py-4 text-left pl-3 text-slate-500 font-semibold font-mono">
                              <span className="inline-flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition-colors" />
                                {formattedDateString}
                              </span>
                            </td>
                            <td className="py-4 text-center">
                              <span className="inline-block bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg text-[11px] font-extrabold border border-slate-200/35">
                                {item.detectedSurahsCount > 0 
                                  ? `${item.detectedSurahsCount} ${isRtl ? 'سور' : 'Surahs'}` 
                                  : (isRtl ? 'جزء عمّ (افتراضي)' : 'Juz Amma (Fallback)')}
                              </span>
                            </td>
                            <td className="py-4 text-center">
                              <div className="flex items-center justify-center gap-2 max-w-[124px] mx-auto">
                                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                  <div className={`h-full ${ratingColor}`} style={{ width: `${accuracyPercent}%` }} />
                                </div>
                                <span className={`text-[11px] font-black w-10 text-right ${ratingTextColor}`}>
                                  {accuracyPercent}%
                                </span>
                              </div>
                            </td>
                            <td className="py-4 text-right pr-3 font-mono">
                              <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl font-black text-sm ${ratingBg} ${ratingTextColor}`}>
                                {item.score} <span className="text-[10px] text-slate-400">/ 10</span>
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </motion.div>
        )}

        {/* Active Game Interface */}
        {!loading && gameStarted && !showResults && (
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: isRtl ? -15 : 15 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: isRtl ? 15 : -15 }}
            className="bg-white rounded-[36px] border border-slate-200/40 shadow-soft p-6 sm:p-10 space-y-8"
          >
            {/* Top Indicator Panel */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-6 shrink-0">
              <div className="flex items-center gap-3">
                <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100 uppercase tracking-widest select-none">
                  {isRtl ? `السؤال ${currentIndex + 1} من ૧૦` : `Question ${currentIndex + 1} of 10`}
                </span>
                {streakCount > 1 && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-black text-amber-600 bg-amber-50 border border-amber-100 px-3 py-1 rounded-full animate-bounce">
                    🔥 {isRtl ? `${streakCount} متتالي` : `${streakCount} Streak!`}
                  </span>
                )}
              </div>

              {/* Progress Beads HUD */}
              <div className="flex items-center gap-1.5 self-center">
                {Array.from({ length: 10 }).map((_, idx) => {
                  let beadClass = "bg-slate-100 border-slate-200 scale-90";
                  let beadIcon = null;

                  if (idx === currentIndex) {
                    beadClass = "bg-slate-50 border-emerald-500 ring-2 ring-emerald-500/10 scale-110";
                  } else if (answersLog[idx] === true) {
                    beadClass = "bg-emerald-500 border-emerald-600 shadow-sm shadow-emerald-100 text-white";
                    beadIcon = <Check className="w-2.5 h-2.5 font-bold" />;
                  } else if (answersLog[idx] === false) {
                    beadClass = "bg-rose-500 border-rose-600 shadow-sm shadow-rose-100 text-white";
                    beadIcon = <X className="w-2.5 h-2.5 font-bold" />;
                  }

                  return (
                    <div 
                      key={idx} 
                      className={`w-6 h-6 rounded-full border flex items-center justify-center transition-all duration-300 font-bold ${beadClass}`}
                    >
                      {beadIcon ? beadIcon : <span className="text-[9px] text-slate-400 font-black">{idx + 1}</span>}
                    </div>
                  );
                })}
              </div>

              {/* Timer Pill */}
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 px-3.5 py-1.5 rounded-2xl">
                <Timer className={`w-4 h-4 ${timeLeft < 10 ? 'text-rose-500 animate-pulse' : 'text-slate-400'}`} />
                <span className={`text-xs font-black ${timeLeft < 10 ? 'text-rose-600 font-extrabold' : 'text-slate-600'}`}>
                  00:{String(timeLeft).padStart(2, "0")}
                </span>
              </div>
            </div>

            {/* Middle Prompt Area */}
            <div className="space-y-4 text-center">
              <span className="text-[10px] uppercase font-black tracking-widest text-[#16C47F]">
                {isRtl ? questions[currentIndex].arabicPrompt : questions[currentIndex].prompt}
              </span>

              {/* Majestic Ayah display */}
              <div 
                className="py-10 px-8 bg-slate-50/50 rounded-[28px] border border-slate-150 flex flex-col items-center justify-center relative overflow-hidden text-center max-w-4xl mx-auto"
                dir="rtl"
              >
                {/* Decorative brackets */}
                <div className="absolute top-4 left-6 text-6xl text-slate-200/40 select-none font-serif">۝</div>
                <div className="absolute bottom-4 right-6 text-6xl text-slate-200/40 select-none font-serif">۝</div>

                <p className="text-2xl sm:text-3xl font-extrabold leading-[1.8] text-slate-800 font-arabic tracking-wide max-w-3xl">
                  {questions[currentIndex].sourceAyah.text}
                </p>

                {/* Additional portion detail labels */}
                {questions[currentIndex].type !== 'identify_surah' && (
                  <span className="inline-block mt-4 text-[10px] font-black tracking-widest text-slate-400 uppercase bg-slate-100 px-3 py-0.5 rounded-lg border border-slate-200/10">
                    {questions[currentIndex].surahName} (الآية: {questions[currentIndex].sourceAyah.numberInSurah})
                  </span>
                )}
              </div>
            </div>

            {/* Answer Options Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
              {questions[currentIndex].options.map((option, optIdx) => {
                let cardStyle = "bg-white hover:bg-slate-50/50 hover:border-slate-300 text-slate-705 border-slate-200";
                let accessory = <div className="w-6 h-6 rounded-full border border-slate-200 bg-slate-50 flex items-center justify-center text-[10px] font-black text-slate-400">{optIdx + 1}</div>;

                if (isAnswered) {
                  const isThisOptionCorrect = option === questions[currentIndex].correctAnswer;
                  const isThisOptionSelected = option === selectedOption;

                  if (isThisOptionCorrect) {
                    cardStyle = "bg-emerald-500 text-white border-emerald-600 ring-4 ring-emerald-500/10 shadow-lg shadow-emerald-100";
                    accessory = <div className="w-6 h-6 rounded-full bg-white text-emerald-600 flex items-center justify-center"><Check className="w-4 h-4 font-black" /></div>;
                  } else if (isThisOptionSelected && !isThisOptionCorrect) {
                    cardStyle = "bg-rose-500 text-white border-rose-600 ring-4 ring-rose-500/10 shadow-lg shadow-rose-100";
                    accessory = <div className="w-6 h-6 rounded-full bg-white text-rose-600 flex items-center justify-center"><X className="w-4 h-4 font-black" /></div>;
                  } else {
                    cardStyle = "bg-white opacity-40 text-slate-400 border-slate-100";
                    accessory = <div className="w-6 h-6 rounded-full border border-slate-100 bg-slate-50 flex items-center justify-center" />;
                  }
                }

                return (
                  <button
                    key={optIdx}
                    onClick={() => handleAnswerSelection(option)}
                    disabled={isAnswered}
                    className={`w-full p-5 rounded-2xl border text-base font-extrabold text-right transition-all flex items-center justify-between gap-4 font-arabic ${cardStyle}`}
                  >
                    <span className="flex-1 text-slate-800 font-arabic truncate-2-lines text-right leading-relaxed" style={{ color: isAnswered && option === questions[currentIndex].correctAnswer ? '#fff' : (isAnswered && option === selectedOption ? '#fff' : '#1e293b') }}>
                      {option}
                    </span>
                    <span className="shrink-0">{accessory}</span>
                  </button>
                );
              })}
            </div>

            {/* Footer Control Panel */}
            <AnimatePresence>
              {isAnswered && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="flex justify-between items-center bg-slate-50 py-4.5 px-6 rounded-3xl border border-slate-100"
                >
                  <div className="flex items-center gap-2">
                    {selectedOption === questions[currentIndex].correctAnswer ? (
                      <span className="text-emerald-650 text-xs font-black flex items-center gap-1.5">
                        <Check className="w-4.5 h-4.5" />
                        {isRtl ? 'إجابة صحيحة وممتازة!' : 'Splendid, correct answer!'}
                      </span>
                    ) : (
                      <span className="text-rose-500 text-xs font-black flex items-center gap-1.5">
                        <X className="w-4.5 h-4.5" />
                        {isRtl ? 'لم يصب الموضع المطلق.' : 'Wrong, but dont lose hope!'}
                      </span>
                    )}
                  </div>

                  <button
                    onClick={handleNextQuestion}
                    className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl font-black text-xs transition-colors shadow-sm"
                  >
                    <span>{currentIndex === 9 ? (isRtl ? 'عرض نتائج الجولة' : 'Finish Round') : (isRtl ? 'السؤال الموالي' : 'Next Ayah')}</span>
                    {isRtl ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

          </motion.div>
        )}

        {/* Results / Score Sheet */}
        {!loading && gameStarted && showResults && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-[36px] border border-slate-200/40 shadow-soft p-8 sm:p-14 text-center space-y-8"
          >
            
            <div className="max-w-md mx-auto space-y-6">
              
              {/* Score Arc Card */}
              <div className="relative w-40 h-40 mx-auto flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-4 border-slate-100 bg-slate-50/50 flex flex-col items-center justify-center">
                  <span className="text-5xl font-black text-slate-850">{score}</span>
                  <span className="text-[10px] uppercase font-black tracking-widest text-slate-400 mt-1">/ 10 Correct</span>
                </div>
                
                {/* Circular indicator ring depending on rating */}
                <svg className="w-40 h-40 transform -rotate-90">
                  <circle
                    cx="80"
                    cy="80"
                    r="74"
                    strokeDasharray={`${2 * Math.PI * 74}`}
                    strokeDashoffset={`${2 * Math.PI * 74 * (1 - score / 10)}`}
                    className="transition-all duration-1000"
                    stroke={score >= 8 ? '#10b981' : (score >= 5 ? '#f59e0b' : '#ef4444')}
                    strokeWidth="8"
                    fill="transparent"
                  />
                </svg>
              </div>

              <div className="space-y-2">
                <h3 className="text-2xl font-black text-slate-800 tracking-tight">
                  {score >= 9 ? (isRtl ? 'قوة حفظ بالغة الإتقان!' : 'Exceptional Reciter!') : 
                   (score >= 7 ? (isRtl ? 'حفظ طيب، استمر!' : 'Very Good memorization!') : 
                   (score >= 5 ? (isRtl ? 'تحسين مطلوب لبعض المواضع' : 'Keep practicing!') : (isRtl ? 'تحتاج جولات مراجعة مكثفة' : 'Needs daily hifdh work')))}
                </h3>
                <p className="text-xs font-semibold text-slate-400 leading-relaxed">
                  {isRtl 
                    ? `لقد نجحت في تأكيد الإتقان لـ ${score} من أصل ١٠ أسئلة مشتقة من خطة مراجعتك الأسبوعية.`
                    : `You successfully achieved mastery for ${score} out of 10 complex multi-tier hifdh questions.`}
                </p>
              </div>

              {/* Detail Statistics box */}
              <div className="grid grid-cols-2 gap-4 text-xs font-bold pt-4 border-t border-slate-100">
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-0.5">
                  <span className="text-slate-400 text-[10px] block font-black uppercase">{isRtl ? 'درجة الدقة الإجمالية' : 'Average Precision'}</span>
                  <span className="text-slate-700 text-sm font-black">{score * 10}%</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-0.5">
                  <span className="text-slate-400 text-[10px] block font-black uppercase">{isRtl ? 'الأعلى تسجيلاً' : 'Personal High Score'}</span>
                  <span className="text-slate-700 text-sm font-black">{highScore} / 10</span>
                </div>
              </div>

              <div className="pt-6 flex flex-col sm:flex-row gap-3">
                <button
                  onClick={startNewChallenge}
                  className="w-full inline-flex items-center justify-center gap-2 bg-[#16C47F] hover:bg-[#14b071] text-white px-6 py-4 rounded-2xl font-black text-sm tracking-wide shadow-md hover:shadow-lg shadow-emerald-100 transition-all active:scale-95"
                >
                  <RotateCcw className="w-5 h-5" />
                  <span>{isRtl ? 'العب جولة جديدة' : 'Play Another Round'}</span>
                </button>
                <button
                  onClick={() => setGameStarted(false)}
                  className="w-full inline-flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-600 px-6 py-4 rounded-2xl font-black text-sm transition-all"
                >
                  <span>{isRtl ? 'العودة لواجهة الانطلاق' : 'Challenge Dashboard'}</span>
                </button>
              </div>

            </div>

          </motion.div>
        )}

      </AnimatePresence>

      <AnimatePresence>
        {showSurahsModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md"
            onClick={() => setShowSurahsModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="bg-white rounded-[32px] border border-slate-100 shadow-2xl max-w-xl w-full overflow-hidden flex flex-col max-h-[85vh] select-text"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-slate-800 tracking-tight">
                    {isRtl ? 'السور المكتشفة للتحدي' : 'Detected Surahs for Challenge'}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-wider">
                    {isRtl ? `إجمالي السور النشطة: ${matchedSurahsList.length}` : `ACTIVE POOL: ${matchedSurahsList.length} SURAHS`}
                  </p>
                </div>
                <button
                  onClick={() => setShowSurahsModal(false)}
                  className="w-10 h-10 rounded-xl bg-slate-200/50 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable list content */}
              <div className="p-6 overflow-y-auto space-y-3 max-h-[55vh]">
                {matchedSurahsList.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 font-bold italic space-y-2">
                    <HelpCircle className="w-12 h-12 text-slate-300 mx-auto animate-bounce" />
                    <p className="text-xs">
                      {isRtl ? 'لم يتم اكتشاف سور مخصصة بعد.' : 'No custom surahs detected yet.'}
                    </p>
                    <p className="text-[10px] text-slate-450 max-w-xs mx-auto font-medium">
                      {isRtl ? 'سيتم استخدام سور جزء عم كتحدّي افتراضي للمبتدئين.' : 'The system will fallback to Juz Amma pool for the challenge assessment.'}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-2">
                    {matchedSurahsList.map((surah) => (
                      <div
                        key={surah.number}
                        className="flex items-center justify-between p-4 bg-slate-50 hover:bg-emerald-50/45 border border-slate-100 hover:border-emerald-500/10 rounded-2xl transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-8 h-8 rounded-lg bg-[#16C47F]/10 text-[#16C47F] border border-emerald-500/10 flex items-center justify-center font-bold text-xs font-mono">
                            {surah.number}
                          </span>
                          <div className="text-left">
                            <h4 className="font-extrabold text-slate-850 text-xs">
                              {surah.englishName}
                            </h4>
                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                              {isRtl ? `${surah.numberOfAyahs} آيات` : `${surah.numberOfAyahs} verses`}
                            </p>
                          </div>
                        </div>
                        <span className="font-black text-slate-850 text-sm tracking-tight">
                          {surah.name}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-6 bg-slate-50 border-t border-slate-100 text-center">
                <p className="text-[10px] text-slate-450 font-bold leading-relaxed max-w-sm mx-auto">
                  {isRtl 
                    ? 'يتم اكتشاف السور تلقائياً بناءً على تقييماتك الأخيرة وحفظك المسجل في النظام.' 
                    : 'Surah catalog is dynamically extracted from all evaluations and memorizations logged inside your student profile.'}
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
