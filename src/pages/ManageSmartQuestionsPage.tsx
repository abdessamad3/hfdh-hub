import React, { useState, useEffect, useMemo } from 'react';
import { dbService } from '../services/db';
import { UserProfile } from '../types';
import { Navigate, Link } from 'react-router-dom';
import { 
  Brain, 
  Plus, 
  Search, 
  Trash2, 
  Check, 
  AlertCircle, 
  ArrowLeft, 
  Sparkles, 
  BookOpen, 
  HelpCircle,
  Filter,
  Layers,
  CheckCircle2,
  ListFilter
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { SURAHS } from '../services/quran';

interface ManageSmartQuestionsPageProps {
  profile: UserProfile | null;
}

interface CustomQuestion {
  id?: string;
  type: 'identify_surah' | 'next_ayah' | 'fill_blank' | 'prev_ayah' | 'custom';
  prompt: string;
  arabicPrompt: string;
  surahName: string;
  surahNumber?: number;
  verseText: string;
  options: string[];
  correctAnswer: string;
  createdAt?: any;
}

const DENSE_PRESETS: Omit<CustomQuestion, 'id'>[] = [
  // 1. Identify Surah
  {
    type: 'identify_surah',
    prompt: 'Which Surah starts with this verse?',
    arabicPrompt: 'من أي سورة يبدأ هذا النص الكريم؟',
    surahName: 'الملك',
    surahNumber: 67,
    verseText: 'تَبَارَكَ الَّذِي بِيَدِهِ الْمُلْكُ وَهُوَ عَلَىٰ كُلِّ شَيْءٍ قَدِيرٌ',
    options: ['الملك', 'الواقعة', 'الرحمن', 'الجمعة'],
    correctAnswer: 'الملك'
  },
  {
    type: 'identify_surah',
    prompt: 'Which Surah starts with this verse?',
    arabicPrompt: 'من أي سورة يبدأ هذا النص الكريم؟',
    surahName: 'الفاتحة',
    surahNumber: 1,
    verseText: 'الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ',
    options: ['الفاتحة', 'البقرة', 'آل عمران', 'النساء'],
    correctAnswer: 'الفاتحة'
  },
  {
    type: 'identify_surah',
    prompt: 'Which Surah starts with this verse?',
    arabicPrompt: 'من أي سورة يبدأ هذا النص الكريم؟',
    surahName: 'القدر',
    surahNumber: 97,
    verseText: 'إِنَّا أَنْزَلْنَاهُ فِي لَيْلَةِ الْقَدْرِ',
    options: ['القدر', 'العلق', 'البيّنة', 'الزلزلة'],
    correctAnswer: 'القدر'
  },
  {
    type: 'identify_surah',
    prompt: 'Which Surah starts with this verse?',
    arabicPrompt: 'من أي سورة يبدأ هذا النص الكريم؟',
    surahName: 'الفيل',
    surahNumber: 105,
    verseText: 'أَلَمْ تَرَ كَيْفَ فَعَلَ رَبُّكَ بِأَصْحَابِ الْفِيلِ',
    options: ['الفيل', 'قريش', 'الماعون', 'الكوثر'],
    correctAnswer: 'الفيل'
  },
  {
    type: 'identify_surah',
    prompt: 'Which Surah contains this verse?',
    arabicPrompt: 'من أي سورة هذا النص الكريم؟',
    surahName: 'الكوثر',
    surahNumber: 108,
    verseText: 'إِنَّا أَعْطَيْنَاكَ الْكَوْثَرَ',
    options: ['الكوثر', 'الماعون', 'الكافرون', 'النصر'],
    correctAnswer: 'الكوثر'
  },
  {
    type: 'identify_surah',
    prompt: 'Which Surah starts with this verse?',
    arabicPrompt: 'من أي سورة يبدأ هذا النص الكريم؟',
    surahName: 'النبأ',
    surahNumber: 78,
    verseText: 'عَمَّ يَتَسَاءَلُونَ',
    options: ['النبأ', 'النازعات', 'عبس', 'التكوير'],
    correctAnswer: 'النبأ'
  },
  {
    type: 'identify_surah',
    prompt: 'Which Surah starts with this verse?',
    arabicPrompt: 'من أي سورة يبدأ هذا النص الكريم؟',
    surahName: 'الأعلى',
    surahNumber: 87,
    verseText: 'سَبِّحِ اسْمَ رَبِّكَ الْأَعْلَى',
    options: ['الأعلى', 'الغاشية', 'البلد', 'الشمس'],
    correctAnswer: 'الأعلى'
  },

  // 2. Fill Blank
  {
    type: 'fill_blank',
    prompt: 'Complete the missing word in the bracket:',
    arabicPrompt: 'أكمل الكلمة الناقصة المناسبة للآية الكريمة:',
    surahName: 'الإخلاص',
    surahNumber: 112,
    verseText: 'لَمْ يَلِدْ وَلَمْ 「 ....... 」',
    options: ['يُولَدْ', 'يَمُتْ', 'يَكُنْ', 'يَخْلُقْ'],
    correctAnswer: 'يُولَدْ'
  },
  {
    type: 'fill_blank',
    prompt: 'Complete the missing word in the bracket:',
    arabicPrompt: 'أكمل الكلمة الناقصة المناسبة للآية الكريمة:',
    surahName: 'العصر',
    surahNumber: 103,
    verseText: 'إِنَّ الْإِنْسَانَ لَفِي 「 ....... 」',
    options: ['خُسْرٍ', 'نَعِيمٍ', 'جَنَّةٍ', 'ضَلَالٍ'],
    correctAnswer: 'خُسْرٍ'
  },
  {
    type: 'fill_blank',
    prompt: 'Complete the missing word in the bracket:',
    arabicPrompt: 'أكمل الكلمة الناقصة المناسبة للآية الكريمة:',
    surahName: 'النصر',
    surahNumber: 110,
    verseText: 'وَرَأَيْتَ النَّاسَ يَدْخُلُونَ فِي 「 ....... 」 اللَّهِ أَفْوَاجًا',
    options: ['دِينِ', 'بَيْتِ', 'رَحْمَةِ', 'فَضْلِ'],
    correctAnswer: 'دِينِ'
  },
  {
    type: 'fill_blank',
    prompt: 'Complete the missing word in the bracket:',
    arabicPrompt: 'أكمل الكلمة الناقصة المناسبة للآية الكريمة:',
    surahName: 'الفلق',
    surahNumber: 113,
    verseText: 'قُلْ أَعُوذُ بِرَبِّ 「 ....... 」',
    options: ['الْفَلَقِ', 'النَّاسِ', 'الْفَجْرِ', 'الْقَدَرِ'],
    correctAnswer: 'الْفَلَقِ'
  },
  {
    type: 'fill_blank',
    prompt: 'Complete the missing word in the bracket:',
    arabicPrompt: 'أكمل الكلمة الناقصة المناسبة للآية الكريمة:',
    surahName: 'العاديات',
    surahNumber: 100,
    verseText: 'وَالْعَادِيَاتِ 「 ....... 」',
    options: ['ضَبْحًا', 'قَدْحًا', 'صُبْحًا', 'نَقْعًا'],
    correctAnswer: 'ضَبْحًا'
  },
  {
    type: 'fill_blank',
    prompt: 'Complete the missing word in the bracket:',
    arabicPrompt: 'أكمل الكلمة الناقصة المناسبة للآية الكريمة:',
    surahName: 'التين',
    surahNumber: 95,
    verseText: 'وَالتِّينِ وَ 「 ....... 」',
    options: ['الزَّيْتُونِ', 'الرُّمَّانِ', 'الْعِنَبِ', 'النَّخْلِ'],
    correctAnswer: 'الزَّيْتُونِ'
  },
  {
    type: 'fill_blank',
    prompt: 'Complete the missing word in the bracket:',
    arabicPrompt: 'أكمل الكلمة الناقصة المناسبة للآية الكريمة:',
    surahName: 'الهمزة',
    surahNumber: 104,
    verseText: 'وَيْلٌ لِكُلِّ هُمَزَةٍ 「 ....... 」',
    options: ['لُمَزَةٍ', 'خُسْرٍ', 'غَاسِقٍ', 'أَبْتَرَ'],
    correctAnswer: 'لُمَزَةٍ'
  },

  // 3. Next Ayah
  {
    type: 'next_ayah',
    prompt: 'What is the next immediate verse?',
    arabicPrompt: 'ما هي الآية التالية مباشرة لهذا الموضع؟',
    surahName: 'الناس',
    surahNumber: 114,
    verseText: 'مِنْ شَرِّ الْوَسْوَاسِ الْخَنَّاسِ',
    options: ['الَّذِي يُوَسْوِسُ فِي صُدُورِ النَّاسِ', 'مِنَ الْجِنَّةِ وَالنَّاسِ', 'إِلَٰهِ النَّاسِ', 'مَلِكِ النَّاسِ'],
    correctAnswer: 'الَّذِي يُوَسْوِسُ فِي صُدُورِ النَّاسِ'
  },
  {
    type: 'next_ayah',
    prompt: 'What is the next immediate verse?',
    arabicPrompt: 'ما هي الآية التالية مباشرة لهذا الموضع؟',
    surahName: 'الماعون',
    surahNumber: 107,
    verseText: 'أَرَأَيْتَ الَّذِي يُكَذِّبُ بِالدِّينِ',
    options: ['فَذَٰلِكَ الَّذِي يَدُعُّ الْيَتِيمَ', 'وَلَا يَحُضُّ عَلَىٰ طَعَامِ الْمِسْكِينِ', 'فَوَيْلٌ لِلْمُصَلِّينَ', 'الَّذِينَ هُمْ عَنْ صَلَاتِهِمْ سَاهُونَ'],
    correctAnswer: 'فَذَٰلِكَ الَّذِي يَدُعُّ الْيَتِيمَ'
  },
  {
    type: 'next_ayah',
    prompt: 'What is the next immediate verse?',
    arabicPrompt: 'ما هي الآية التالية مباشرة لهذا الموضع؟',
    surahName: 'الضحى',
    surahNumber: 93,
    verseText: 'وَالضُّحَىٰ',
    options: ['وَاللَّيْلِ إِذَا سَجَىٰ', 'مَا وَدَّعَكَ رَبُّكَ وَمَا قَلَىٰ', 'وَلَلْآخِرَةُ خَيْرٌ لَكَ مِنَ الْأُولَىٰ', 'وَلَسَوْفَ يُعْطِيكَ رَبُّكَ فَتَرْضَىٰ'],
    correctAnswer: 'وَاللَّيْلِ إِذَا سَجَىٰ'
  },
  {
    type: 'next_ayah',
    prompt: 'What is the next immediate verse?',
    arabicPrompt: 'ما هي الآية التالية مباشرة لهذا الموضع؟',
    surahName: 'الشرح',
    surahNumber: 94,
    verseText: 'أَلَمْ نَشْرَحْ لَكَ صَدْرَكَ',
    options: ['وَوَضَعْنَا عَنْكَ وِزْرَكَ', 'الَّذِي أَنْقَضَ ظَهْرَكَ', 'وَرَفَعْنَا لَكَ ذِكْرَكَ', 'فَإِنَّ مَعَ الْعُسْرِ يُسْرًا'],
    correctAnswer: 'وَوَضَعْنَا عَنْكَ وِزْرَكَ'
  },
  {
    type: 'next_ayah',
    prompt: 'What is the next immediate verse?',
    arabicPrompt: 'ما هي الآية التالية مباشرة لهذا الموضع؟',
    surahName: 'التكاثر',
    surahNumber: 102,
    verseText: 'أَلْهَاكُمُ التَّكَاثُرُ',
    options: ['حَتَّىٰ زُرْتُمُ الْمَقَابِرَ', 'كَلَّا سَوْفَ تَعْلَمُونَ', 'ثُمَّ كَلَّا سَوْفَ تَعْلَمُونَ', 'كَلَّا لَوْ تَعْلَمُونَ عِلْمَ الْيَقِينِ'],
    correctAnswer: 'حَتَّىٰ زُرْتُمُ الْمَقَابِرَ'
  },

  // 4. Prev Ayah
  {
    type: 'prev_ayah',
    prompt: 'What is the previous verse?',
    arabicPrompt: 'ما هي الآية السابقة لهذا الموضع؟',
    surahName: 'الفلق',
    surahNumber: 113,
    verseText: 'وَمِنْ شَرِّ غَاسِقٍ إِذَا وَقَبَ',
    options: ['مِنْ شَرِّ مَا خَلَقَ', 'وَمِنْ شَرِّ النَّفَّاثَاتِ فِي الْعُقَدِ', 'وَمِنْ شَرِّ حَاسِدٍ إِذَا حَسَدَ', 'قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ'],
    correctAnswer: 'مِنْ شَرِّ مَا خَلَقَ'
  },
  {
    type: 'prev_ayah',
    prompt: 'What is the previous verse?',
    arabicPrompt: 'ما هي الآية السابقة لهذا الموضع؟',
    surahName: 'الإخلاص',
    surahNumber: 112,
    verseText: 'اللَّهُ الصَّمَدُ',
    options: ['قُلْ هُوَ اللَّهُ أَحَدٌ', 'لَمْ يَلِدْ وَلَمْ يُولَدْ', 'وَلَمْ يَكُنْ لَهُ كُفُوًا أَحَدٌ', 'من شر ما خلق'],
    correctAnswer: 'قُلْ هُوَ اللَّهُ أَحَدٌ'
  },
  {
    type: 'prev_ayah',
    prompt: 'What is the previous verse?',
    arabicPrompt: 'ما هي الآية السابقة لهذا الموضع؟',
    surahName: 'الناس',
    surahNumber: 114,
    verseText: 'إِلَٰهِ النَّاسِ',
    options: ['مَلِكِ النَّاسِ', 'قُلْ أَعُوذُ بِرَبِّ النَّاسِ', 'مِنْ شَرِّ الْوَسْوَاسِ الْخَنَّاسِ', 'من الجنة والناس'],
    correctAnswer: 'مَلِكِ النَّاسِ'
  },
  {
    type: 'prev_ayah',
    prompt: 'What is the previous verse?',
    arabicPrompt: 'ما هي الآية السابقة لهذا الموضع؟',
    surahName: 'الزلزلة',
    surahNumber: 99,
    verseText: 'وَأَخْرَجَتِ الْأَرْضُ أَثْقَالَهَا',
    options: ['إِذَا زُلْزِلَتِ الْأَرْضُ زِلْزَالَهَا', 'وَقَالَ الْإِنْسَانُ مَا لَهَا', 'يَوْمَئِذٍ تُحَدِّثُ أَخْبَارَهَا', 'بِأَنَّ رَبَّكَ أَوْحَىٰ لَهَا'],
    correctAnswer: 'إِذَا زُلْزِلَتِ الْأَرْضُ زِلْزَالَهَا'
  }
];

const DYNAMIC_VERSE_POOL = [
  { surah: 'العصر', num: 103, text: 'وَالْعَصْرِ' },
  { surah: 'العصر', num: 103, text: 'إِنَّ الْإِنْسَانَ لَفِي خُسْرٍ' },
  { surah: 'العصر', num: 103, text: 'إِلَّا الَّذِينَ آمَنُوا وَعَمِلُوا الصَّالِحَاتِ وَتَوَاصَوْا بِالْحَقِّ وَتَوَاصَوْا بِالصَّبْرِ' },
  { surah: 'الكوثر', num: 108, text: 'إِنَّا أَعْطَيْنَاكَ الْكَوْثَرَ' },
  { surah: 'الكوثر', num: 108, text: 'فَصَلِّ لِرَبِّكَ وَانْحَرْ' },
  { surah: 'الكوثر', num: 108, text: 'إِنَّ شَانِئَكَ هُوَ الْأَبْتَرُ' },
  { surah: 'الإخلاص', num: 112, text: 'قُلْ هُوَ اللَّهُ أَحَدٌ' },
  { surah: 'الإخلاص', num: 112, text: 'اللَّهُ الصَّمَدُ' },
  { surah: 'الإخلاص', num: 112, text: 'لَمْ يَلِدْ وَلَمْ يُولَدْ' },
  { surah: 'الإخلاص', num: 112, text: 'وَلَمْ يَكُنْ لَهُ كُفُوًا أَحَدٌ' },
  { surah: 'الفلق', num: 113, text: 'قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ' },
  { surah: 'الفلق', num: 113, text: 'مِنْ شَرِّ مَا خَلَقَ' },
  { surah: 'الفلق', num: 113, text: 'وَمِنْ شَرِّ غَاسِقٍ إِذَا وَقَبَ' },
  { surah: 'الفلق', num: 113, text: 'وَمِنْ شَرِّ النَّفَّاثَاتِ فِي الْعُقَدِ' },
  { surah: 'الفلق', num: 113, text: 'وَمِنْ شَرِّ حَاسِدٍ إِذَا حَسَدَ' },
  { surah: 'الناس', num: 114, text: 'قُلْ أَعُوذُ بِرَبِّ النَّاسِ' },
  { surah: 'الناس', num: 114, text: 'مَلِكِ النَّاسِ' },
  { surah: 'الناس', num: 114, text: 'إِلَٰهِ النَّاسِ' },
  { surah: 'الناس', num: 114, text: 'مِنْ شَرِّ الْوَسْوَاسِ الْخَنَّاسِ' },
  { surah: 'الناس', num: 114, text: 'الَّذِي يُوَسْوِسُ فِي صُدُورِ النَّاسِ' },
  { surah: 'الناس', num: 114, text: 'مِنَ الْجِنَّةِ وَالنَّاسِ' },
  { surah: 'الفاتحة', num: 1, text: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ' },
  { surah: 'الفاتحة', num: 1, text: 'الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ' },
  { surah: 'الفاتحة', num: 1, text: 'الرَّحْمَٰنِ الرَّحِيمِ' },
  { surah: 'الفاتحة', num: 1, text: 'مَالِكِ يَوْمِ الدِّينِ' },
  { surah: 'الفاتحة', num: 1, text: 'إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ' },
  { surah: 'الفاتحة', num: 1, text: 'اهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ' },
  { surah: 'الفاتحة', num: 1, text: 'صِرَاطَ الَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ الْمَغْضُوبِ عَلَيْهِمْ وَلَا الضَّالِّينَ' },
];

const generateDynamicQuestion = (existingQuestions: CustomQuestion[]): Omit<CustomQuestion, 'id'> => {
  const normalize = (t: string) => t.trim().toLowerCase().replace(/[\u064B-\u0652]/g, '');
  
  // Find a combination that doesn't exist in existingQuestions
  for (const item of DYNAMIC_VERSE_POOL) {
    // Type 1: identify_surah
    const idSurahText = item.text;
    const type1Exists = existingQuestions.some(q => 
      q.type === 'identify_surah' && normalize(q.verseText) === normalize(idSurahText)
    );
    if (!type1Exists) {
      const otherSurahs = ['الناس', 'الفلق', 'الإخلاص', 'الفاتحة', 'العصر', 'الكوثر', 'الملك', 'القارعة', 'الضحى', 'البلد'].filter(s => s !== item.surah);
      const shuffledOptions = [item.surah];
      while (shuffledOptions.length < 4 && otherSurahs.length > 0) {
        const randIdx = Math.floor(Math.random() * otherSurahs.length);
        const [picked] = otherSurahs.splice(randIdx, 1);
        shuffledOptions.push(picked);
      }
      shuffledOptions.sort(() => Math.random() - 0.5);

      return {
        type: 'identify_surah',
        prompt: 'Which Surah contains this verse?',
        arabicPrompt: 'من أي سورة هذا الجزء من الآية الكريمة؟',
        surahName: item.surah,
        surahNumber: item.num,
        verseText: idSurahText,
        options: shuffledOptions,
        correctAnswer: item.surah
      };
    }

    // Type 2: fill_blank (we replace a key word with bracket)
    const words = item.text.split(' ');
    if (words.length >= 3) {
      const blankIndex = Math.min(words.length - 1, Math.max(1, Math.floor(Math.random() * (words.length - 1))));
      const originalWord = words[blankIndex].replace(/[^\u0621-\u064A]/g, '');
      if (originalWord.length > 2) {
        const blankedWords = [...words];
        blankedWords[blankIndex] = '「 ....... 」';
        const blankedText = blankedWords.join(' ');

        const type2Exists = existingQuestions.some(q => 
          q.type === 'fill_blank' && normalize(q.verseText) === normalize(blankedText)
        );

        if (!type2Exists) {
          const decoys = ['عَلِيمٌ', 'حَكِيمٌ', 'اللَّهِ', 'رَبِّكَ', 'النَّاسِ', 'الْجَنَّةِ', 'الْفَلَقِ', 'الْخَيْرِ', 'الْأَمْرِ'].filter(w => w !== originalWord);
          const shuffledOpts = [originalWord];
          while (shuffledOpts.length < 4 && decoys.length > 0) {
            const pickIdx = Math.floor(Math.random() * decoys.length);
            const [picked] = decoys.splice(pickIdx, 1);
            shuffledOpts.push(picked);
          }
          shuffledOpts.sort(() => Math.random() - 0.5);

          return {
            type: 'fill_blank',
            prompt: 'Complete the missing word in the bracket:',
            arabicPrompt: 'أكمل الكلمة الناقصة المناسبة للآية الكريمة:',
            surahName: item.surah,
            surahNumber: item.num,
            verseText: blankedText,
            options: shuffledOpts,
            correctAnswer: originalWord
          };
        }
      }
    }
  }

  // Fallback
  const base = DENSE_PRESETS[0];
  const uniqueId = Date.now().toString().slice(-4);
  return {
    ...base,
    verseText: `${base.verseText} (${uniqueId})`,
    options: [...base.options],
    correctAnswer: base.correctAnswer
  };
};

export default function ManageSmartQuestionsPage({ profile }: ManageSmartQuestionsPageProps) {
  const { i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';

  // Secure redirect if not Admin
  if (!profile || profile.role !== 'admin') {
    return <Navigate to="/" />;
  }

  const [questions, setQuestions] = useState<CustomQuestion[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [isAdding, setIsAdding] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form State
  const [formType, setFormType] = useState<CustomQuestion['type']>('identify_surah');
  const [formPrompt, setFormPrompt] = useState<string>('');
  const [formArabicPrompt, setFormArabicPrompt] = useState<string>('');
  const [formSurahNumber, setFormSurahNumber] = useState<number>(112); // Al-Ikhlas default
  const [formVerseText, setFormVerseText] = useState<string>('');
  const [formOptions, setFormOptions] = useState<string[]>(['', '', '', '']);
  const [formCorrectIndex, setFormCorrectIndex] = useState<number>(0);

  // Fetch Questions
  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const qList = await dbService.listCustomQuestions();
      setQuestions(qList as CustomQuestion[]);
    } catch (e: any) {
      console.error(e);
      setError(isRtl ? 'حدث خطأ أثناء تحميل الأسئلة.' : 'Error fetching questions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, []);

  // Preset Template loader for Admin convenience
  const loadPresetSamples = async () => {
    setLoading(true);
    try {
      // 1. Fetch current questions from DB to have the most up-to-date list
      const currentDBQuestions = (await dbService.listCustomQuestions() || []) as CustomQuestion[];
      setQuestions(currentDBQuestions);

      // 2. Identify presets that DO NOT exist in the database yet
      const normalizeText = (t: string) => t.trim().toLowerCase().replace(/[\u064B-\u0652]/g, '');

      const availablePresets = DENSE_PRESETS.filter(p => {
        const isDuplicate = currentDBQuestions.some((q: CustomQuestion) => 
          normalizeText(q.verseText || '') === normalizeText(p.verseText) && q.type === p.type
        );
        return !isDuplicate;
      });

      const questionsToAdd: Omit<CustomQuestion, 'id'>[] = [];

      // Take from pool of presets
      for (const ap of availablePresets) {
        if (questionsToAdd.length < 3) {
          questionsToAdd.push(ap);
        } else {
          break;
        }
      }

      // 3. If we don't have 3 unique ones, generate completely different/dynamic ones
      let attempts = 0;
      const combinedListForChecking = [...currentDBQuestions];
      while (questionsToAdd.length < 3 && attempts < 100) {
        attempts++;
        const dynamicQ = generateDynamicQuestion(combinedListForChecking);
        if (dynamicQ) {
          questionsToAdd.push(dynamicQ);
          combinedListForChecking.push(dynamicQ as any);
        }
      }

      for (const p of questionsToAdd) {
        // Ensure options are shuffled before adding to database so correct answer is at a random position
        const shuffledP = {
          ...p,
          options: [...p.options].sort(() => 0.5 - Math.random())
        };
        await dbService.addCustomQuestion(shuffledP);
      }
      setSuccessMsg(isRtl ? 'تم تحميل وتوليد عينات أسئلة جديدة غير مكررة بنجاح!' : 'Successfully loaded and generated new unique sample questions!');
      fetchQuestions();
    } catch (e) {
      setError('Failed to generate template questions.');
      setLoading(false);
    }
  };

  // Safe Deletion
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const confirmDelete = async () => {
    if (!deletingId) return;
    try {
      await dbService.deleteCustomQuestion(deletingId);
      setSuccessMsg(isRtl ? 'تم حذف السؤال بنجاح.' : 'Question deleted successfully.');
      setQuestions(prev => prev.filter(q => q.id !== deletingId));
    } catch (e) {
      setError(isRtl ? 'فشل حذف السؤال.' : 'Failed to delete question.');
    } finally {
      setDeletingId(null);
    }
  };

  // Handle Form Submission
  const handleSubmitNew = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate Form
    if (!formVerseText.trim()) {
      setError(isRtl ? 'برجاء كتابة نص الآية الكريمة أو السؤال.' : 'Please enter the verse or content text.');
      return;
    }
    if (formOptions.some(o => !o.trim())) {
      setError(isRtl ? 'برجاء كتابة جميع الخيارات الأربعة.' : 'Please provide all 4 multiple choice options.');
      return;
    }

    const selectedSurah = SURAHS.find(s => s.number === formSurahNumber);
    const surahName = selectedSurah ? selectedSurah.name : 'سورة مخصصة';

    const rawOptions = formOptions.map(o => o.trim());
    const correctAnswerText = formOptions[formCorrectIndex].trim();
    const shuffledOptions = [...rawOptions].sort(() => 0.5 - Math.random());

    const payload: Omit<CustomQuestion, 'id'> = {
      type: formType,
      prompt: formPrompt.trim() || (isRtl ? 'Choose the correct answer.' : 'Choose the correct answer.'),
      arabicPrompt: formArabicPrompt.trim() || (isRtl ? 'اختر الإجابة الصحيحة:' : 'Choose the correct answer:'),
      surahName: surahName,
      surahNumber: formSurahNumber,
      verseText: formVerseText.trim(),
      options: shuffledOptions,
      correctAnswer: correctAnswerText
    };

    setLoading(true);
    try {
      await dbService.addCustomQuestion(payload);
      setSuccessMsg(isRtl ? 'تمت إضافة السؤال المخصص بنجاح!' : 'Successfully added custom smart question!');
      setIsAdding(false);
      // Reset Form fields
      setFormPrompt('');
      setFormArabicPrompt('');
      setFormVerseText('');
      setFormOptions(['', '', '', '']);
      setFormCorrectIndex(0);
      fetchQuestions();
    } catch (err) {
      setError(isRtl ? 'فشلت إضافة السؤال المخصص.' : 'Failed to add custom question.');
      setLoading(false);
    }
  };

  // Filter & Search Logic
  const filteredQuestions = useMemo(() => {
    return questions.filter(q => {
      const typeMatch = typeFilter === 'all' || q.type === typeFilter;
      const tQuery = searchQuery.toLowerCase().trim();
      const textMatch = !tQuery || 
        q.prompt.toLowerCase().includes(tQuery) || 
        q.arabicPrompt.includes(tQuery) || 
        q.verseText.includes(tQuery) || 
        q.surahName.includes(tQuery) ||
        q.correctAnswer.includes(tQuery);
      return typeMatch && textMatch;
    });
  }, [questions, searchQuery, typeFilter]);

  // Clean success/error notifications automatically
  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-8 select-none" dir={isRtl ? 'rtl' : 'ltr'}>
      
      {/* Top Breadcrumb Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-[32px] border border-slate-200/40 shadow-soft">
        <div className="flex items-center gap-4">
          <Link 
            to="/"
            className="w-10 h-10 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className={`w-5 h-5 text-slate-500 ${isRtl ? 'rotate-180' : ''}`} />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black bg-emerald-50 border border-emerald-100 text-[#16C47F] px-2.5 py-0.5 rounded-full">
                {isRtl ? 'بوابة المدير' : 'Admin Control'}
              </span>
            </div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight mt-1">
              {isRtl ? 'بنك أسئلة تحدي الذكاء المخصصة' : 'Smart Challenge Custom Questions'}
            </h1>
            <p className="text-xs text-slate-400 font-semibold mt-0.5">
              {isRtl 
                ? 'لوحة إدارة وصياغة أسئلة مصفوفة الحفظ التي يتم تزويد الطلاب بها لتقييم مستويات الدقة.' 
                : 'Formulate, view, and purge customized Hifdh test cases injected dynamically inside students panels.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsAdding(true)}
            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs px-5 py-3 rounded-2xl shadow-lg shadow-emerald-500/10 cursor-pointer transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>{isRtl ? 'إضافة سؤال جديد' : 'New Custom Question'}</span>
          </button>
        </div>
      </div>

      {/* Notifications banner */}
      <AnimatePresence>
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: -10 }} 
            className="bg-red-50 border-r-4 border-red-500 p-4 rounded-2xl flex items-center gap-3 text-red-600 text-xs font-bold shadow-sm"
          >
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </motion.div>
        )}
        {successMsg && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: -10 }} 
            className="bg-emerald-50 border-r-4 border-emerald-500 p-4 rounded-2xl flex items-center gap-3 text-emerald-700 text-xs font-bold shadow-sm"
          >
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add New Question Section with Slider/Scale Animation */}
      <AnimatePresence>
        {isAdding && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <form 
              onSubmit={handleSubmitNew}
              className="bg-white rounded-[36px] border border-slate-200/60 p-6 md:p-8 space-y-6 shadow-soft"
            >
              <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                <span className="text-sm font-black text-slate-700 flex items-center gap-2">
                  <Brain className="w-5 h-5 text-emerald-600 animate-pulse" />
                  {isRtl ? 'تفريغ وتصميم سؤال جديد' : 'Add New Custom Hifdh Question'}
                </span>
                <button 
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="text-xs font-bold text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
                >
                  {isRtl ? 'إلغاء' : 'Close'}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Selection column */}
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-wider block">
                      {isRtl ? 'سورة الموضع أو المرجعية' : 'Associated Surah Reference'}
                    </label>
                    <select
                      value={formSurahNumber}
                      onChange={(e) => setFormSurahNumber(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200/60 rounded-2xl px-4 py-3 font-semibold text-xs text-slate-700 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                    >
                      {SURAHS.map(s => (
                        <option key={s.number} value={s.number}>
                          {s.number}: {s.name} ({s.englishName})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-wider block">
                      {isRtl ? 'نوع السؤال التفاعلي' : 'Interactive Challenge Type'}
                    </label>
                    <select
                      value={formType}
                      onChange={(e) => setFormType(e.target.value as CustomQuestion['type'])}
                      className="w-full bg-slate-50 border border-slate-200/60 rounded-2xl px-4 py-3 font-semibold text-xs text-slate-700 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                    >
                      <option value="identify_surah">{isRtl ? 'إلى أي سورة تنتمي الآية؟' : 'Identify Surah of Verse'}</option>
                      <option value="fill_blank">{isRtl ? 'أكمل الكلمة المفقودة (ملء الفراغ)' : 'Fill in the Blank Word'}</option>
                      <option value="next_ayah">{isRtl ? 'ما هي الآية التالية؟' : 'Identify the Next Verse'}</option>
                      <option value="prev_ayah">{isRtl ? 'ما هي الآية السابقة؟' : 'Identify the Previous Verse'}</option>
                      <option value="custom">{isRtl ? 'سؤال مخصص / معلومات عامة' : 'Custom Trivia Q&A'}</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-wider block">
                      {isRtl ? 'منطوق السؤال بالإنجليزي (اختياري)' : 'English Prompt Instruction (Optional)'}
                    </label>
                    <input
                      type="text"
                      value={formPrompt}
                      onChange={(e) => setFormPrompt(e.target.value)}
                      placeholder={isRtl ? 'مثال: Which Surah contains this verse?' : 'e.g. Which Surah initiates with this noble Verse?'}
                      className="w-full bg-slate-50 border border-slate-200/60 rounded-2xl px-4 py-3 font-semibold text-xs text-slate-700 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-wider block">
                      {isRtl ? 'منطوق السؤال بالعربية (اختياري)' : 'Arabic Prompt Instruction (Optional)'}
                    </label>
                    <input
                      type="text"
                      value={formArabicPrompt}
                      onChange={(e) => setFormArabicPrompt(e.target.value)}
                      placeholder={isRtl ? 'مثال: في أي سورة وردت هذه الآية الكريمة؟' : 'e.g. في أي سورة وردت هذه الآية الكريمة؟'}
                      className="w-full bg-slate-50 border border-slate-200/60 rounded-2xl px-4 py-3 font-semibold text-xs text-slate-700 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Content & Options Column */}
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-wider block">
                      {isRtl ? 'نص الآية الكريمة أو نص السؤال (بالرسم المغربي أو ورش)' : 'Verse Text / Prompt Question Content (Arabic Script)'}
                    </label>
                    <textarea
                      rows={3}
                      value={formVerseText}
                      onChange={(e) => setFormVerseText(e.target.value)}
                      placeholder={isRtl ? 'مثال: لَمْ يَلِدْ وَلَمْ 「 ....... 」' : 'e.g. Write out the Arabic Ayat exactly, adding mask braces if it is a fill_blank challenge.'}
                      className="w-full bg-slate-50 border border-slate-200/60 rounded-2xl px-4 py-3 font-semibold text-sm text-slate-700 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-mono"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-wider block">
                      {isRtl ? 'الخيارات الأربعة (حدد الإجابة الصحيحة بالدائرة)' : 'Multiple Choice Options (Check the correct radio)'}
                    </label>
                    <div className="space-y-2">
                      {formOptions.map((opt, idx) => (
                        <div key={idx} className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="correct_choice"
                            checked={formCorrectIndex === idx}
                            onChange={() => setFormCorrectIndex(idx)}
                            className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 accent-emerald-500"
                          />
                          <input
                            type="text"
                            value={opt}
                            onChange={(e) => {
                              const updated = [...formOptions];
                              updated[idx] = e.target.value;
                              setFormOptions(updated);
                            }}
                            placeholder={isRtl ? `الخيار رَقْم ${idx + 1}` : `Option Choice ${idx + 1}`}
                            className="flex-1 bg-slate-50 border border-slate-200/60 rounded-xl px-3 py-2 font-bold text-xs text-slate-700 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-black text-xs px-5 py-3 rounded-2xl cursor-pointer transition-colors"
                >
                  {isRtl ? 'إبطال وإلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs px-6 py-3 rounded-2xl shadow-md cursor-pointer transition-colors disabled:opacity-50"
                >
                  {isRtl ? 'حفظ وضخ السؤال في البنك' : 'Save and Publish Question'}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Statistics board bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-[28px] border border-slate-200/40 shadow-soft">
          <span className="text-[10px] uppercase font-black tracking-widest text-slate-400 block">{isRtl ? 'الأسئلة النشطة' : 'Active Questions'}</span>
          <span className="text-2xl font-black text-slate-800 focus:outline-none">{questions.length}</span>
        </div>
        <div className="bg-white p-5 rounded-[28px] border border-slate-200/40 shadow-soft">
          <span className="text-[10px] uppercase font-black tracking-widest text-slate-400 block">{isRtl ? 'المطابقة الحالية' : 'Current Filters Match'}</span>
          <span className="text-2xl font-black text-emerald-600">{filteredQuestions.length}</span>
        </div>
        <div className="bg-white p-5 rounded-[28px] border border-slate-200/40 shadow-soft">
          <span className="text-[10px] uppercase font-black tracking-widest text-slate-400 block">{isRtl ? 'سور تقويمية مضافة' : 'Different Surahs Injected'}</span>
          <span className="text-2xl font-black text-slate-800">
            {new Set(questions.map(q => q.surahName)).size}
          </span>
        </div>
        <div className="bg-white p-5 rounded-[28px] border border-slate-200/40 shadow-soft flex flex-col justify-between">
          <span className="text-[10px] uppercase font-black tracking-widest text-slate-400 block">{isRtl ? 'وضع التهيئة المسبق' : 'Initialize Sample Presets'}</span>
          <button
            onClick={loadPresetSamples}
            className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 cursor-pointer text-left focus:outline-none underline underline-offset-2 flex items-center gap-1 mt-1"
          >
            <Sparkles className="w-3 h-3 text-[#16C47F]" />
            <span>{isRtl ? 'توليد حزمة عينية' : 'Generate sample pack'}</span>
          </button>
        </div>
      </div>

      {/* Filter / Search HUD options */}
      <div className="bg-white rounded-[32px] border border-slate-200/40 shadow-soft p-5 md:p-6 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:max-w-md">
          <Search className={`absolute top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400 ${isRtl ? 'right-4.5' : 'left-4.5'}`} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isRtl ? 'ابحث بنص الآية، منطوق السؤال، السورة المعتمدة...' : 'Search by verse text, prompts, surah...'}
            className={`w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all ${
              isRtl ? 'pr-12 pl-4' : 'pl-12 pr-4'
            }`}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 text-slate-400 font-bold text-xs shrink-0">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <span>{isRtl ? 'الفلترة بالنوع:' : 'Type Filter:'}</span>
          </div>

          <div className="flex gap-1.5 flex-wrap">
            {[
              { id: 'all', labelKey: isRtl ? 'الكل' : 'All' },
              { id: 'identify_surah', labelKey: isRtl ? 'تحديد السورة' : 'Identify Surah' },
              { id: 'fill_blank', labelKey: isRtl ? 'ملء الفراغ' : 'Fill Blank' },
              { id: 'next_ayah', labelKey: isRtl ? 'الآية التالية' : 'Next Verse' },
              { id: 'prev_ayah', labelKey: isRtl ? 'الآية السابقة' : 'Prev Verse' },
              { id: 'custom', labelKey: isRtl ? 'سؤال مخصص' : 'Custom Info' }
            ].map((fItem) => (
              <button
                key={fItem.id}
                onClick={() => setTypeFilter(fItem.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  typeFilter === fItem.id 
                    ? 'bg-slate-900 text-white' 
                    : 'bg-slate-100 hover:bg-slate-150 text-slate-500'
                }`}
              >
                {fItem.labelKey}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Table / Collection list view */}
      {loading ? (
        <div className="bg-white rounded-[32px] border border-slate-100 p-16 text-center shadow-soft">
          <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-600 rounded-full animate-spin mx-auto pb-4" />
          <p className="text-xs text-slate-400 font-semibold mt-4">
            {isRtl ? 'جاري استيراد الأسئلة من خادم قاعدة البيانات...' : 'Syncing database custom questions pool...'}
          </p>
        </div>
      ) : filteredQuestions.length === 0 ? (
        <div className="bg-white rounded-[36px] border border-slate-200/40 shadow-soft p-12 text-center space-y-4">
          <div className="w-16 h-16 bg-slate-50 border border-slate-100 text-slate-300 rounded-2xl flex items-center justify-center mx-auto">
            <HelpCircle className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-black text-slate-700">
              {isRtl ? 'لا توجد أسئلة مضافة حتى الآن' : 'No Custom Questions Found'}
            </h3>
            <p className="text-xs text-slate-400 font-semibold max-w-md mx-auto leading-relaxed">
              {isRtl 
                ? 'لم تقم بإضافة أي أسئلة مخصصة في هذا القسم. اضغط على زر إضافة سؤال أو قم بتهيئة عينات الأسئلة المسبقة للبدء!' 
                : 'Your smart question pool is currently empty. Add your first interactive test case using the builder above, or populate presets.'}
            </p>
          </div>
          <div className="pt-2">
            <button
              onClick={loadPresetSamples}
              className="inline-flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 text-[#16C47F] font-black text-xs px-4 py-2 rounded-xl transition-colors cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isRtl ? 'توليد حزمة العينات للمبتدئين' : 'Generate Default Presets Sample'}</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredQuestions.map((item) => (
            <div 
              key={item.id}
              className="bg-white rounded-[32px] border border-slate-200/40 p-6 shadow-soft flex flex-col justify-between hover:border-slate-300/60 transition-all group"
            >
              <div className="space-y-4">
                {/* Header tag */}
                <div className="flex items-center justify-between gap-4">
                  <span className="text-[10px] font-black uppercase bg-slate-100 border border-slate-200/30 text-slate-600 px-3 py-1 rounded-lg">
                    {item.type === 'identify_surah' ? (isRtl ? 'تحديد السورة' : 'Identify Surah') :
                     item.type === 'fill_blank' ? (isRtl ? 'ملء الفراغ' : 'Fill Blank') :
                     item.type === 'next_ayah' ? (isRtl ? 'الآية التالية' : 'Next Verse') :
                     item.type === 'prev_ayah' ? (isRtl ? 'الآية السابقة' : 'Prev Verse') :
                     (isRtl ? 'سؤال مخصص' : 'Custom Info')}
                  </span>

                  <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
                    {isRtl ? `سورة ${item.surahName}` : `Surah ${item.surahName}`}
                  </span>
                </div>

                {/* Question Info */}
                <div className="space-y-1.5">
                  <p className="text-xs text-slate-400 font-bold">{item.prompt}</p>
                  <p className="text-xs text-slate-600 font-black">{item.arabicPrompt}</p>
                </div>

                {/* Display verse */}
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex items-center justify-center text-center">
                  <p className="text-slate-800 text-base font-extrabold font-arabic leading-loose tracking-wide">
                    {item.verseText}
                  </p>
                </div>

                {/* Options display */}
                <div className="grid grid-cols-2 gap-2.5">
                  {item.options.map((optionText, oIdx) => {
                    const isCorrect = optionText === item.correctAnswer;
                    return (
                      <div 
                        key={oIdx}
                        className={`p-2.5 rounded-xl border text-xs font-bold leading-normal text-slate-700 flex items-center justify-between ${
                          isCorrect 
                            ? 'bg-emerald-50/50 border-emerald-200 text-emerald-700' 
                            : 'bg-white border-slate-100 text-slate-600'
                        }`}
                      >
                        <span className="truncate">{optionText}</span>
                        {isCorrect && <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Bottom Actions card */}
              <div className="flex justify-between items-center border-t border-slate-100 pt-4 mt-5">
                <span className="text-[9px] font-bold text-slate-400 font-mono">
                  ID: {item.id}
                </span>

                <button
                  type="button"
                  onClick={() => item.id && setDeletingId(item.id)}
                  className="w-8 h-8 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 flex items-center justify-center transition-colors cursor-pointer"
                  title={isRtl ? 'حذف من البنك' : 'Delete'}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Custom Delete Confirmation Dialog */}
      <AnimatePresence>
        {deletingId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeletingId(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            {/* Modal Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[32px] max-w-md w-full p-6 shadow-2xl border border-slate-100 relative z-10 space-y-6"
            >
              <div className="flex items-center gap-4 text-red-600 bg-red-50 p-4 rounded-2xl col-span-1">
                <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-red-800">
                    {isRtl ? 'حذف السؤال نهائياً' : 'Delete Question Permanently'}
                  </h3>
                  <p className="text-xs text-red-600 mt-0.5 font-semibold">
                    {isRtl ? 'هذا الإجراء لا يمكن التراجع عنه.' : 'This action cannot be undone.'}
                  </p>
                </div>
              </div>

              <p className="text-xs text-slate-500 font-bold leading-relaxed">
                {isRtl
                  ? 'هل أنت متأكد من رغبتك في حذف هذا السؤال من بنك الأسئلة؟ لن يتمكن الطلاب بعد ذلك من حله لتقييم الحفظ لديهم.'
                  : 'Are you sure you want to completely remove this custom question? Students will no longer see it inside their challenges.'}
              </p>

              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setDeletingId(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-black transition-colors cursor-pointer"
                >
                  {isRtl ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={confirmDelete}
                  className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-black transition-colors shadow-lg shadow-red-500/10 cursor-pointer"
                >
                  {isRtl ? 'تأكيد الحذف' : 'Confirm Delete'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
