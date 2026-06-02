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

const QURAN_PRACTICE_POOL: {
  surahName: string;
  surahNumber: number;
  verseText: string;
  nextVerseText: string;
  prevVerseText: string;
  blankText: string;
  blankCorrectWord: string;
  blankDecoys: string[];
}[] = [
  {
    surahName: "الفاتحة",
    surahNumber: 1,
    verseText: "اهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ",
    nextVerseText: "صِرَاطَ الَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ الْمَغْضُوبِ عَلَيْهِمْ وَلَا الضَّالِّينَ",
    prevVerseText: "إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ",
    blankText: "اهْدِنَا 「 ....... 」 الْمُسْتَقِيمَ",
    blankCorrectWord: "الصِّرَاطَ",
    blankDecoys: ["الْحَقَّ", "السَّبِيلَ", "النُّورَ", "الْجَنَّةَ"]
  },
  {
    surahName: "البقرة",
    surahNumber: 2,
    verseText: "اللَّهُ لَا إِلَهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ",
    nextVerseText: "لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ لَّهُ مَا فِي السَّمَاوَاتِ وَمَا فِي الْأَرْضِ",
    prevVerseText: "وَاتَّقُوا يَوْمًا تُرْجَعُونَ فِيهِ إِلَى اللَّهِ ثُمَّ تُوَفَّى كُلُّ نَفْسٍ",
    blankText: "اللَّهُ لَا إِلَهَ إِلَّا هُوَ الْحَيُّ 「 ....... 」",
    blankCorrectWord: "الْقَيُّومُ",
    blankDecoys: ["الْعَلِيمُ", "الْحَكِيمُ", "الْمَجِيدُ", "الْعَظِيمُ"]
  },
  {
    surahName: "البقرة",
    surahNumber: 2,
    verseText: "آمَنَ الرَّسُولُ بِمَا أُنْزِلَ إِلَيْهِ مِنْ رَبِّهِ",
    nextVerseText: "وَالْمُؤْمِنُونَ كُلٌّ آمَنَ بِاللَّهِ وَمَلَائِكَتِهِ وَكُتُبِهِ وَرُسُلِهِ",
    prevVerseText: "لِلَّهِ مَا فِي السَّمَاوَاتِ وَمَا فِي الْأَرْضِ وَإِنْ تُبْدُوا مَا فِي أَنْفُسِكُمْ",
    blankText: "آمَنَ الرَّسُولُ بِمَا أُنْزِلَ إِلَيْهِ مِنْ 「 ....... 」",
    blankCorrectWord: "رَبِّهِ",
    blankDecoys: ["عِنْدِهِ", "اللَّهِ", "الرَّحْمَنِ", "السَّماءِ"]
  },
  {
    surahName: "آل عمران",
    surahNumber: 3,
    verseText: "قُلِ اللَّهُمَّ مَالِكَ الْمُلْكِ تُؤْتِي الْمُلْكَ مَنْ تَشَاءُ",
    nextVerseText: "وَتَنْزِعُ الْمُلْكَ مِمَّنْ تَشَاءُ وَتُعِزُّ مَنْ تَشَاءُ وَتُذِلُّ مَنْ تَشَاءُ",
    prevVerseText: "تِلْكَ آيَاتُ اللَّهِ نَتْلُوهَا عَلَيْكَ بِالْحَقِّ وَمَا اللَّهُ يُرِيدُ ظُلْمًا لِلْعَالَمِينَ",
    blankText: "قُلِ اللَّهُمَّ مَالِكَ الْمُلْكِ تُؤْتِي الْمُلْكَ مَنْ 「 ....... 」",
    blankCorrectWord: "تَشَاءُ",
    blankDecoys: ["تُرِيدُ", "تَحْكُمُ", "تَخْلُقُ", "تَعْلَمُ"]
  },
  {
    surahName: "آل عمران",
    surahNumber: 3,
    verseText: "كُلُّ الطَّعَامِ كَانَ حِلًّا لِبَنِي إِسْرَائِيلَ",
    nextVerseText: "إِلَّا مَا حَرَّمَ إِسْرَائِيلُ عَلَى نَفْسِهِ مِنْ قَبْلِ أَنْ تُنَزَّلَ التَّوْرَاةُ",
    prevVerseText: "لَنْ تَنَالُوا الْبِرَّ حَتَّى تُنْفِقُوا مِمَّا تُحِبُّونَ وَمَا تُنْفِقُوا مِنْ شَيْءٍ",
    blankText: "كُلُّ الطَّعَامِ كَانَ 「 ....... 」 لِبَنِي إِسْرَائِيلَ",
    blankCorrectWord: "حِلًّا",
    blankDecoys: ["حَرَامًا", "طَيِّبًا", "مَكْتُوبًا", "مَقْبُولًا"]
  },
  {
    surahName: "النساء",
    surahNumber: 4,
    verseText: "يَا أَيُّهَا النَّاسُ اتَّقُوا رَبَّكُمُ الَّذِي خَلَقَكُمْ مِنْ نَفْسٍ وَاحِدَةٍ",
    nextVerseText: "وَخَلَقَ مِنْهَا زَوْجَهَا وَبَثَّ مِنْهُمَا رِجَالًا كَثِيرًا وَنِسَاءً",
    prevVerseText: "تِلْكَ حُدُودُ اللَّهِ وَمَنْ يُطِعِ اللَّهَ وَرَسُولَهُ يُدْخِلْهُ جَنَّاتٍ",
    blankText: "يَا أَيُّهَا النَّاسُ اتَّقُوا رَبَّكُمُ الَّذِي خَلَقَكُمْ مِنْ نَفْسٍ 「 ....... 」",
    blankCorrectWord: "وَاحِدَةٍ",
    blankDecoys: ["مُطَهَّرَةٍ", "أُخْرَىٰ", "طَيِّبَةٍ", "عَظِيمَةٍ"]
  },
  {
    surahName: "المائدة",
    surahNumber: 5,
    verseText: "الْيَوْمَ أَكْمَلْتُ لَكُمْ دِينَكُمْ وَأَتْمَمْتُ عَلَيْكُمْ نِعْمَتِي",
    nextVerseText: "وَرَضِيتُ لَكُمُ الْإِسْلَامَ دِينًا فَمَنِ اضْطُرَّ فِي مَخْمَصَةٍ",
    prevVerseText: "حُرِّمَتْ عَلَيْكُمُ الْمَيْتَةُ وَالدَّمُ وَلَحْمُ الْخِنْزِيرِ وَمَا أُهِلَّ لِغَيْرِ اللَّهِ بِهِ",
    blankText: "الْيَوْمَ أَكْمَلْتُ لَكُمْ دِينَكُمْ وَأَتْمَمْتُ عَلَيْكُمْ 「 ....... 」",
    blankCorrectWord: "نِعْمَتِي",
    blankDecoys: ["رَحْمَتِي", "مَغْفِرَتِي", "عَهْدِي", "كِتَابِي"]
  },
  {
    surahName: "الأنعام",
    surahNumber: 6,
    verseText: "الْحَمْدُ لِلَّهِ الَّذِي خَلَقَ السَّمَاوَاتِ وَالْأَرْضَ",
    nextVerseText: "وَجَعَلَ الظُّلُمَاتِ وَالنُّورَ ثُمَّ الَّذِينَ كَفَرُوا بِرَبِّهِمْ يَعْدِلُونَ",
    prevVerseText: "وَآتَيْنَاهُ أَهْلَهُ وَمِثْلَهُمْ مَعَهُمْ رَحْمَةً مِنْ عِنْدِنَا",
    blankText: "الْحَمْدُ لِلَّهِ الَّذِي خَلَقَ السَّمَاوَاتِ وَالْأَرْضَ وَجَعَلَ 「 ....... 」 وَالنُّورَ",
    blankCorrectWord: "الظُّلُمَاتِ",
    blankDecoys: ["الشَّمْسَ", "الْقَمَرَ", "السَّحَابَ", "الْبَحْرَ"]
  },
  {
    surahName: "الأعراف",
    surahNumber: 7,
    verseText: "ادْعُوا رَبَّكُمْ تَضَرُّعًا وَخُفْيَةً",
    nextVerseText: "إِنَّهُ لَا يُحِبُّ الْمُعْتَدِينَ وَلَا تُفْسِدُوا فِي الْأَرْضِ بَعْدَ إِصْلَاحِهَا",
    prevVerseText: "إِنَّ رَبَّكُمُ اللَّهُ الَّذِي خَلَقَ السَّمَاوَاتِ وَالْأَرْضَ فِي سِتَّةِ أَيَّامٍ",
    blankText: "ادْعُوا رَبَّكُمْ تَضَرُّعًا وَ 「 ....... 」",
    blankCorrectWord: "خُفْيَةً",
    blankDecoys: ["جَهْرًا", "عَلَانِيَةً", "صَبْرًا", "إِخْلَاصًا"]
  },
  {
    surahName: "الأنفال",
    surahNumber: 8,
    verseText: "إِنَّمَا الْمُؤْمِنُونَ الَّذِينَ إِذَا ذُكِرَ اللَّهُ وَجِلَتْ قُلُوبُهُمْ",
    nextVerseText: "وَإِذَا تُلِيَتْ عَلَيْهِمْ آيَاتُهُ زَادَتْهُمْ إِيمَانًا وَعَلَىٰ رَبِّهِمْ يَتَوَكَّلُونَ",
    prevVerseText: "يَسْأَلُونَكَ عَنِ الْأَنْفَالِ قُلِ الْأَنْفَالُ لِلَّهِ وَالرَّسُولِ",
    blankText: "إِنَّمَا الْمُؤْمِنُونَ الَّذِينَ إِذَا ذُكِرَ اللَّهُ وَجِلَتْ 「 ....... 」",
    blankCorrectWord: "قُلُوبُهُمْ",
    blankDecoys: ["أَبْصَارُهُمْ", "أَنْفُسُهُمْ", "عُقُولُهُمْ", "جُلُودُهُمْ"]
  },
  {
    surahName: "التوبة",
    surahNumber: 9,
    verseText: "لَقَدْ جَاءَكُمْ رَسُولٌ مِنْ أَنْفُسِكُمْ عَزِيزٌ عَلَيْهِ مَا عَنِتُّمْ",
    nextVerseText: "حَرِيصٌ عَلَيْكُمْ بِالْمُؤْمِنِينَ رَءُوفٌ رَحِيمٌ فَإِنْ تَوَلَّوْا فَقُلْ حَسْبِيَ اللَّهُ",
    prevVerseText: "أوَلَا يَرَوْنَ أَنَّهُمْ يُفْتَنُونَ فِي كُلِّ عَامٍ مَرَّةً أَوْ مَرَّتَيْنِ",
    blankText: "لَقَدْ جَاءَكُمْ رَسُولٌ مِنْ أَنْفُسِكُمْ عَزِيزٌ عَلَيْهِ مَا 「 ....... 」",
    blankCorrectWord: "عَنِتُّمْ",
    blankDecoys: ["كَدَحْتُمْ", "صَبَرْتُمْ", "عَمِلْتُمْ", "فَعَلْتُمْ"]
  },
  {
    surahName: "يونس",
    surahNumber: 10,
    verseText: "أَلَا إِنَّ أَوْلِيَاءَ اللَّهِ لَا خَوْفٌ عَلَيْهِمْ وَلَا هُمْ يَحْزَنُونَ",
    nextVerseText: "الَّذِينَ آمَنُوا وَكَانُوا يَتَّقُونَ لَهُمُ الْبُشْرَىٰ فِي الْحَيَاةِ الدُّنْيَا",
    prevVerseText: "وَمَا تَكُونُ فِي شَأْنٍ وَمَا تَتْلُو مِنْهُ مِنْ قُرْآنٍ وَلَا تَعْمَلُونَ",
    blankText: "أَلَا إِنَّ أَوْلِيَاءَ اللَّهِ لَا خَوْفٌ عَلَيْهِمْ وَلَا هُمْ 「 ....... 」",
    blankCorrectWord: "يَحْزَنُونَ",
    blankDecoys: ["يَخَافُونَ", "يَنْدَمُونَ", "يَغْفَلُونَ", "يَشْكُرُونَ"]
  },
  {
    surahName: "هود",
    surahNumber: 11,
    verseText: "وَأَقِمِ الصَّلَاةَ طَرَفَيِ النَّهَارِ وَزُلَفًا مِنَ اللَّيْلِ",
    nextVerseText: "إِنَّ الْحَسَنَاتِ يُذْهِبْنَ السَّيِّئَاتِ ذَٰلِكَ ذِكْرَىٰ لِلذَّاكِرِينَ",
    prevVerseText: "وَاصْبِرْ فَإِنَّ اللَّهَ لَا يُضِيعُ أَجْرَ الْمُحْسِنِينَ",
    blankText: "وَأَقِمِ الصَّلَاةَ طَرَفَيِ النَّهَارِ وَزُلَفًا مِنَ 「 ....... 」",
    blankCorrectWord: "اللَّيْلِ",
    blankDecoys: ["الْفَجْرِ", "النَّهَارِ", "الْعَصْرِ", "الْعِشَاءِ"]
  },
  {
    surahName: "يوسف",
    surahNumber: 12,
    verseText: "إِنَّا أَنْزَلْنَاهُ قُرْآنًا عَرَبِيًّا لَعَلَّكُمْ تَعْقِلُونَ",
    nextVerseText: "نَحْنُ نَقُصُّ عَلَيْكَ أَحْسَنَ الْقَصَصِ بِمَا أَوْحَيْنَا إِلَيْكَ هَٰذَا الْقُرْآنَ",
    prevVerseText: "الر تِلْكَ آيَاتُ الْكِتَابِ الْمُبِينِ",
    blankText: "إِنَّا أَنْزَلْنَاهُ قُرْآنًا عَرَبِيًّا لَعَلَّكُمْ 「 ....... 」",
    blankCorrectWord: "تَعْقِلُونَ",
    blankDecoys: ["تَعْلَمُونَ", "تَشْكُرُونَ", "تَتَفَكَّرُونَ", "تَحْفَظُونَ"]
  },
  {
    surahName: "الرعد",
    surahNumber: 13,
    verseText: "الَّذِينَ آمَنُوا وَتَطْمَئِنُّ قُلُوبُهُمْ بِذِكْرِ اللَّهِ",
    nextVerseText: "أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ الَّذِينَ آمَنُوا وَعَمِلُوا الصَّالِحَاتِ",
    prevVerseText: "وَيَقُولُ الَّذِينَ كَفَرُوا لَوْلَا أُنْزِلَ عَلَيْهِ آيَةٌ مِنْ رَبِّهِ قُلْ إِنَّ اللَّهَ",
    blankText: "الَّذِينَ آمَنُوا وَتَطْمَئِنُّ قُلُوبُهُمْ بِذِكْرِ 「 ....... 」",
    blankCorrectWord: "اللَّهِ",
    blankDecoys: ["الرَّحْمَنِ", "الرَّسُولِ", "الْقُرْآنِ", "الْخَالِقِ"]
  },
  {
    surahName: "إبراهيم",
    surahNumber: 14,
    verseText: "وَإِذْ تَأَذَّنَ رَبُّكُمْ لَئِنْ شَكَرْتُمْ لَأَزِيدَنَّكُمْ",
    nextVerseText: "وَلَئِنْ كَفَرْتُمْ إِنَّ عَذَابِي لَشَدِيدٌ",
    prevVerseText: "وَإِذْ قَالَ مُوسَىٰ لِقَوْمِهِ اذْكُرُوا نِعْمَةَ اللَّهِ عَلَيْكُمْ إِذْ أَنْجَاكُمْ",
    blankText: "وَإِذْ تَأَذَّنَ رَبُّكُمْ لَئِنْ شَكَرْتُمْ 「 ....... 」",
    blankCorrectWord: "لَأَزِيدَنَّكُمْ",
    blankDecoys: ["لَأُكْرِمَنَّكُمْ", "لَأَرْحَمَنَّكُمْ", "لَأَقْبَلَنَّكُمْ", "لَأَغْفِرَنَّ لَكُمْ"]
  },
  {
    surahName: "الحجر",
    surahNumber: 15,
    verseText: "إِنَّا نَحْنُ نَزَّلْنَا الذِّكْرَ",
    nextVerseText: "وَإِنَّا لَهُ لَحَافِظُونَ",
    prevVerseText: "وَقَالُوا يَا أَيُّهَا الَّذِي نُزِّلَ عَلَيْهِ الذِّكْرُ إِنَّكَ لَمَجْنُونٌ",
    blankText: "إِنَّا نَحْنُ نَزَّلْنَا الذِّكْرَ وَإِنَّا لَهُ 「 ....... 」",
    blankCorrectWord: "لَحَافِظُونَ",
    blankDecoys: ["لَكَاتيبُونَ", "لَعَالِمُونَ", "لَسَامِعُونَ", "لَمُصَدِّقُونَ"]
  },
  {
    surahName: "النحل",
    surahNumber: 16,
    verseText: "وَإِنْ تَعُدُّوا نِعْمَةَ اللَّهِ لَا تُحْصُوهَا",
    nextVerseText: "إِنَّ اللَّهَ لَغَفُورٌ رَحِيمٌ وَاللَّهُ يَعْلَمُ مَا تُسِرُّونَ وَمَا تُعْلِنُونَ",
    prevVerseText: "وَأَلْقَىٰ فِي الْأَرْضِ رَوَاسِيَ أَنْ تَمِيدَ بِكُمْ وَأَنْهَارًا وَسُبُلًا",
    blankText: "وَإِنْ تَعُدُّوا نِعْمَةَ اللَّهِ لَا 「 ....... 」",
    blankCorrectWord: "تُحْصُوهَا",
    blankDecoys: ["تَعْلَمُوهَا", "تَكْتُبُوهَا", "تَبْلُغُوهَا", "تَسْتَطِيعُوهَا"]
  },
  {
    surahName: "الإسراء",
    surahNumber: 17,
    verseText: "وَقَضَىٰ رَبُّكَ أَلَّا تَعْبُدُوا إِلَّا إِيَّاهُ وَبِالْوَالِدَيْنِ إِحْسَانًا",
    nextVerseText: "إِمَّا يَبْلُغَنَّ عِنْدَكَ الْكِبَرَ أَحَدُهُمَا أَوْ كِلَاهُمَا فَلَا تَقُلْ لَهُمَا أُفٍّ",
    prevVerseText: "انْظُرْ كَيْفَ فَضَّلْنَا بَعْضَهُمْ عَلَىٰ بَعْضٍ وَلَلْآخِرَةُ أَكْبَرُ دَرَجَاتٍ",
    blankText: "وَقَضَىٰ رَبُّكَ أَلَّا تَعْبُدُوا إِلَّا إِيَّاهُ وَبِالْوَالِدَيْنِ 「 ....... 」",
    blankCorrectWord: "إِحْسَانًا",
    blankDecoys: ["مَعْرُوفًا", "بِرًّا", "حُقُوقًا", "طَاعَةً"]
  },
  {
    surahName: "الكهف",
    surahNumber: 18,
    verseText: "الْحَمْدُ لِلَّهِ الَّذِي أَنْزَلَ عَلَىٰ عَبْدِهِ الْكِتَابَ",
    nextVerseText: "وَلَمْ يَجْعَل لَّهُ عِوَجًا قَيِّمًا لِّيُنذِرَ بَأْسًا شَدِيدًا مِّن لَّدُنْهُ",
    prevVerseText: "بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ",
    blankText: "الْحَمْدُ لِلَّهِ الَّذِي أَنْزَلَ عَلَىٰ عَبْدِهِ 「 ....... 」",
    blankCorrectWord: "الْكِتَابَ",
    blankDecoys: ["الْقُرْآنَ", "الْحِكْمَةَ", "الْفُرْقَانَ", "النُّورَ"]
  },
  {
    surahName: "مريم",
    surahNumber: 19,
    verseText: "وَاذْكُرْ فِي الْكِتَابِ مَرْيَمَ إِذِ انْتَبَذَتْ مِنْ أَهْلِهَا مَكَانًا شَرْقِيًّا",
    nextVerseText: "فَاتَّخَذَتْ مِنْ دُونِهِمْ حِجَابًا فَأَرْسَلْنَا إِلَيْهَا رُوحَنَا فَتَمَثَّلَ لَهَا",
    prevVerseText: "ذَٰلِكَ عِيسَى ابْنُ مَرْيَمَ قَوْلَ الْحَقِّ الَّذِي فِيهِ يَمْتَرُونَ",
    blankText: "وَاذْكُرْ فِي الْكِتَابِ مَرْيَمَ إِذِ انْتَبَذَتْ مِنْ أَهْلِهَا مَكَانًا 「 ....... 」",
    blankCorrectWord: "شَرْقِيًّا",
    blankDecoys: ["غَرْبِيًّا", "قَصِيًّا", "بَعِيدًا", "مُبَارَكًا"]
  },
  {
    surahName: "طه",
    surahNumber: 20,
    verseText: "قَالَ رَبِّ اشْرَحْ لِي صَدْرِي",
    nextVerseText: "وَيَسِّرْ لِي أَمْرِي وَاحْلُلْ عُقْدَةً مِّن لِّسَانِي",
    prevVerseText: "اذْهَبْ إِلَىٰ فِرْعَوْنَ إِنَّهُ طَغَىٰ",
    blankText: "قَالَ رَبِّ اشْرَحْ لِي 「 ....... 」",
    blankCorrectWord: "صَدْرِي",
    blankDecoys: ["قَلْبِي", "عَقْلِي", "أَمْرِي", "عُمْرِي"]
  },
  {
    surahName: "الأنبياء",
    surahNumber: 21,
    verseText: "وَمَا أَرْسَلْنَاكَ إِلَّا رَحْمَةً لِلْعَالَمِينَ",
    nextVerseText: "قُلْ إِنَّمَا يُوحَىٰ إِلَيَّ أَنَّمَا إِلَٰهُكُمْ إِلَٰهٌ وَاحِدٌ فَهَلْ أَنْتُمْ مُسْلِمُونَ",
    prevVerseText: "وَلَقَدْ كَتَبْنَا فِي الزَّبُورِ مِنْ بَعْدِ الذِّكْرِ أَنَّ الْأَرْضَ يَرِثُهَا عِبَادِيَ",
    blankText: "وَمَا أَرْسَلْنَاكَ إِلَّا 「 ....... 」 لِلْعَالَمِينَ",
    blankCorrectWord: "رَحْمَةً",
    blankDecoys: ["بُشْرَىٰ", "شَفِيعًا", "شَاهِدًا", "نَذِيرًا"]
  },
  {
    surahName: "الحج",
    surahNumber: 22,
    verseText: "ذَٰلِكَ بِأَنَّ اللَّهَ هُوَ الْحَقُّ وَأَنَّهُ يُحْيِي الْمَوْتَىٰ",
    nextVerseText: "وَأَنَّهُ عَلَىٰ كُلِّ شَيْءٍ قَدِيرٌ وَأَنَّ السَّاعَةَ آتِيَةٌ لَّا رَيْبَ فِيهَا",
    prevVerseText: "أَلَمْ تَرَ أَنَّ اللَّهَ أَنْزَلَ مِنَ السَّمَاءِ مَاءً فَتُصْبِحُ الْأَرْضُ مُخْضَرَّةً",
    blankText: "ذَٰلِكَ بِأَنَّ اللَّهَ هُوَ الْحَقُّ وَأَنَّهُ يُحْيِي 「 ....... 」",
    blankCorrectWord: "الْمَوْتَىٰ",
    blankDecoys: ["الْخَلْقَ", "الْعِظَامَ", "الْأَرْضَ", "الْعَالَمِينَ"]
  },
  {
    surahName: "المؤمنون",
    surahNumber: 23,
    verseText: "الَّذِينَ هُمْ فِي صَلَاتِهِمْ خَاشِعُونَ",
    nextVerseText: "وَالَّذِينَ هُمْ عَنِ اللَّغْوِ مُعْرِضُونَ وَالَّذِينَ هُمْ لِلزَّكَاةِ فَاعِلُونَ",
    prevVerseText: "قَدْ أَفْلَحَ الْمُؤْمِنُونَ",
    blankText: "الَّذِينَ هُمْ فِي صَلَاتِهِمْ 「 ....... 」",
    blankCorrectWord: "خَاشِعُونَ",
    blankDecoys: ["سَاهُونَ", "مُخْلِصُونَ", "مُحَافِظُونَ", "مُسْتَمِرُّونَ"]
  },
  {
    surahName: "النور",
    surahNumber: 24,
    verseText: "اللَّهُ نُورُ السَّمَاوَاتِ وَالْأَرْضِ",
    nextVerseText: "مَثَلُ نُورِهِ كَمِشْكَاةٍ فِيهَا مِصْبَاحٌ الْمِصْبَاحُ فِي زُجَاجَةٍ",
    prevVerseText: "وَلَقَدْ أَنْزَلْنَا إِلَيْكُمْ آيَاتٍ مُّبَيِّنَاتٍ وَمَثَلًا مِّنَ الَّذِينَ خَلَوْا",
    blankText: "اللَّهُ نُورُ 「 ....... 」 وَالْأَرْضِ",
    blankCorrectWord: "السَّمَاوَاتِ",
    blankDecoys: ["الْأَكْوَانِ", "الْخَلَائِقِ", "الْعَالَمِينَ", "الْأَرْضِ"]
  },
  {
    surahName: "الفرقان",
    surahNumber: 25,
    verseText: "تَبَارَكَ الَّذِي نَزَّلَ الْفُرْقَانَ عَلَىٰ عَبْدِهِ لِيَكُونَ لِلْعَالَمِينَ نَذِيرًا",
    nextVerseText: "الَّذِي لَهُ مُلْكُ السَّمَاوَاتِ وَالْأَرْضِ وَلَمْ يَتَّخِذْ وَلَدًا",
    prevVerseText: "بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ",
    blankText: "تَبَارَكَ الَّذِي نَزَّلَ الْفُرْقَانَ عَلَىٰ 「 ....... 」 لِيَكُونَ لِلْعَالَمِينَ نَذِيرًا",
    blankCorrectWord: "عَبْدِهِ",
    blankDecoys: ["رَسُولِهِ", "نَبِيِّهِ", "الْبَشَرِ", "مُحَمَّدٍ"]
  },
  {
    surahName: "الشعراء",
    surahNumber: 26,
    verseText: "طسم * تِلْكَ آيَاتُ الْكِتَابِ الْمُبِينِ",
    nextVerseText: "لَعَلَّكَ بَاخِعٌ نَّفْسَكَ أَلَّا يَكُونُوا مُؤْمِنِينَ",
    prevVerseText: "بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ",
    blankText: "طسم * تِلْكَ آيَاتُ الْكِتَابِ 「 ....... 」",
    blankCorrectWord: "الْمُبِينِ",
    blankDecoys: ["الْحَكِيمِ", "الْعَظِيمِ", "الْكَرِيمِ", "الْمَجِيدِ"]
  },
  {
    surahName: "النمل",
    surahNumber: 27,
    verseText: "طس تِلْكَ آيَاتُ الْقُرْآنِ وَكِتَابٍ مُّبِينٍ",
    nextVerseText: "هُدًى وَبُشْرَىٰ لِلْمُؤْمِنِينَ الَّذِينَ يُقِيمُونَ الصَّلَاةَ",
    prevVerseText: "بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ",
    blankText: "طس تِلْكَ آيَاتُ الْقُرْآنِ وَكِتَابٍ 「 ....... 」",
    blankCorrectWord: "مُّبِينٍ",
    blankDecoys: ["حَكِيمٍ", "مَّجِيدٍ", "كَرِيمٍ", "عَظِيمٍ"]
  },
  {
    surahName: "القصص",
    surahNumber: 28,
    verseText: "نَتْلُو عَلَيْكَ مِنْ نَبَإِ مُوسَىٰ وَفِرْعَوْنَ بِالْحَقِّ",
    nextVerseText: "لِقَوْمٍ يُؤْمِنُونَ إِنَّ فِرْعَوْنَ عَلَا فِي الْأَرْضِ",
    prevVerseText: "طسم * تِلْكَ آيَاتُ الْكِتَابِ الْمُبِينِ",
    blankText: "نَتْلُو عَلَيْكَ مِنْ نَبَإِ مُوسَىٰ وَفِرْعَوْنَ بِالْحَقِّ لِقَوْمٍ 「 ....... 」",
    blankCorrectWord: "يُؤْمِنُونَ",
    blankDecoys: ["يَتَّقُونَ", "يَفْقَهُونَ", "يَعْقِلُونَ", "يَعْمَلُونَ"]
  },
  {
    surahName: "العنكبوت",
    surahNumber: 29,
    verseText: "أَحَسِبَ النَّاسُ أَنْ يُتْرَكُوا أَنْ يَقُولُوا آمَنَّا وَهُمْ لَا يُفْتَنُونَ",
    nextVerseText: "وَلَقَدْ فَتَنَّا الَّذِينَ مِنْ قَبْلِهِمْ فَلَيَعْلَمَنَّ اللَّهُ الَّذِينَ صَدَقُوا",
    prevVerseText: "بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ",
    blankText: "أَحَسِبَ النَّاسُ أَنْ يُتْرَكُوا أَنْ يَقُولُوا آمَنَّا وَهُمْ لَا 「 ....... 」",
    blankCorrectWord: "يُفْتَنُونَ",
    blankDecoys: ["يَعْقِلُونَ", "يَكْذِبُونَ", "يَصْدُقُونَ", "يَفْقَهُونَ"]
  },
  {
    surahName: "الروم",
    surahNumber: 30,
    verseText: "غُلِبَتِ الرُّومُ * فِي أَدْنَى الْأَرْضِ",
    nextVerseText: "وَهُم مِّن بَعْدِ غَلَبِهِمْ سَيَغْلِبُونَ فِي بِضْعِ سِنِينَ",
    prevVerseText: "الَمَّ * تِلْكَ آيَاتُ الْكِتَابِ الْحَكِيمِ",
    blankText: "غُلِبَتِ الرُّومُ * فِي 「 ....... 」 الْأَرْضِ",
    blankCorrectWord: "أَدْنَى",
    blankDecoys: ["أَقْصَى", "وَسَطِ", "خَارِجِ", "جَدِيدِ"]
  },
  {
    surahName: "لقمان",
    surahNumber: 31,
    verseText: "إِنَّ الشِّرْكَ لَظُلْمٌ عَظِيمٌ",
    nextVerseText: "وَوَصَّيْنَا الْإِنْسَانَ بِوَالِدَيْهِ حَمَلَتْهُ أُمُّهُ وَهْنًا عَلَىٰ وَهْنٍ",
    prevVerseText: "وَإِذْ قَالَ لُقْمَانُ لِابْنِهِ وَهُوَ يَعِظُهُ يَا بُنَيَّ لَا تُشْرِكْ بِاللَّهِ",
    blankText: "يَا بُنَيَّ لَا تُشْرِكْ بِاللَّهِ إِنَّ الشِّرْكَ لَظُلْمٌ 「 ....... 」",
    blankCorrectWord: "عَظِيمٌ",
    blankDecoys: ["مُبِينٌ", "شَدِيدٌ", "كَبِيرٌ", "أَلِيمٌ"]
  },
  {
    surahName: "السجدة",
    surahNumber: 32,
    verseText: "تَتَجَافَىٰ جُنُوبُهُمْ عَنِ الْمَضَاجِعِ يَدْعُونَ رَبَّهُمْ خَوْفًا وَطَمَعًا",
    nextVerseText: "وَمِمَّا رَزَقْنَاهُمْ يُنْفِقُونَ فَلَا تَعْلَمُ نَفْسٌ مَّا أُخْفِيَ لَهُم",
    prevVerseText: "إِنَّمَا يُؤْمِنُ بِآيَاتِنَا الَّذِينَ إِذَا ذُكِّرُوا بِهَا خَرُّوا سُجَّدًا",
    blankText: "تَتَجَافَىٰ جُنُوبُهُمْ عَنِ الْمَضَاجِعِ يَدْعُونَ رَبَّهُمْ خَوْفًا وَ 「 ....... 」",
    blankCorrectWord: "طَمَعًا",
    blankDecoys: ["شَوْقًا", "حُبًّا", "إِخْلَاصًا", "يَقِينًا"]
  },
  {
    surahName: "الأحزاب",
    surahNumber: 33,
    verseText: "مَا كَانَ مُحَمَّدٌ أَبَا أَحَدٍ مِّن رِّجَالِكُمْ",
    nextVerseText: "وَلَكِن رَّسُولَ اللَّهِ وَخَاتَمَ النَّبِيِّينَ وَكَانَ اللَّهُ بِكُلِّ شَيْءٍ عَلِيمًا",
    prevVerseText: "تُرْجِي مَنْ تَشَاءُ مِنْهُنَّ وَتُؤْوِي إِلَيْكَ مَنْ تَشَاءُ",
    blankText: "وَلَكِن رَّسُولَ اللَّهِ وَ 「 ....... 」 النَّبِيِّينَ",
    blankCorrectWord: "خَاتَمَ",
    blankDecoys: ["أَفْضَلَ", "سَيِّدَ", "رَسُولَ", "إِمَامَ"]
  },
  {
    surahName: "الصافات",
    surahNumber: 37,
    verseText: "سُبْحَانَ رَبِّكَ رَبِّ الْعِزَّةِ عَمَّا يَصِفُونَ",
    nextVerseText: "وَسَلَامٌ عَلَى الْمُرْسَلِينَ وَالْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ",
    prevVerseText: "وَتَوَلَّ عَنْهُمْ حَتَّىٰ حِينٍ وَأَبْصِرْ فَسَوْفَ يُبْصِرُونَ",
    blankText: "سُبْحَانَ رَبِّكَ رَبِّ الْعِزَّةِ عَمَّا 「 ....... 」",
    blankCorrectWord: "يَصِفُونَ",
    blankDecoys: ["يَعْمَلُونَ", "يَقُولُونَ", "يَشْرِكُونَ", "يَفْعَلُونَ"]
  },
  {
    surahName: "غافر",
    surahNumber: 40,
    verseText: "وَقَالَ رَبُّكُمُ ادْعُونِي أَسْتَجِبْ لَكُمْ",
    nextVerseText: "إِنَّ الَّذِينَ يَسْتَكْبِرُونَ عَنْ عِبَادَتِي سَيَدْخُلُونَ جَهَنَّمَ دَاخِرِينَ",
    prevVerseText: "ذَٰلِكُمُ اللَّهُ رَبُّكُمْ خَالِقُ كُلِّ شَيْءٍ لَا إِلَٰهَ إِلَّا هو",
    blankText: "وَقَالَ رَبُّكُمُ ادْعُونِي 「 ....... 」 لَكُمْ",
    blankCorrectWord: "أَسْتَجِبْ",
    blankDecoys: ["أَقْبَلْ", "أُجِيبْ", "أَرْحَمْ", "أَعْفِ"]
  },
  {
    surahName: "الفتح",
    surahNumber: 48,
    verseText: "إِنَّا فَتَحْنَا لَكَ فَتْحًا مُّبِينًا",
    nextVerseText: "لِّيَغْفِرَ لَكَ اللَّهُ مَا تَقَدَّمَ مِن ذَنبِكَ وَمَا تَأَخَّرَ",
    prevVerseText: "وَكَانَ اللَّهُ عَلِيمًا حَكِيمًا * لِيُدْخِلَ الْمُؤْمِنِينَ وَالْمُؤْمِنَاتِ",
    blankText: "إِنَّا فَتَحْنَا لَكَ فَتْحًا 「 ....... 」",
    blankCorrectWord: "مُّبِينًا",
    blankDecoys: ["قَرِيبًا", "عَظِيمًا", "مُبَارَكًا", "سَهْلًا"]
  },
  {
    surahName: "الرحمن",
    surahNumber: 55,
    verseText: "كُلُّ مَنْ عَلَيْهَا فَانٍ",
    nextVerseText: "وَيَبْقَىٰ وَجْهُ رَبِّكَ ذُو الْجَلَالِ وَالْإِكْرَامِ",
    prevVerseText: "خَلَقَ الْإِنْسَانَ مِنْ صَلْصَالٍ كَالْفَخَّارِ * وَخَلَقَ الْجَانَّ",
    blankText: "كُلُّ مَنْ عَلَيْهَا 「 ....... 」",
    blankCorrectWord: "فَانٍ",
    blankDecoys: ["بَاقٍ", "هَالِكٌ", "قَائِمٌ", "زَائِلٌ"]
  },
  {
    surahName: "الملك",
    surahNumber: 67,
    verseText: "تَبَارَكَ الَّذِي بِيَدِهِ الْمُلْكُ وَهُوَ عَلَىٰ كُلِّ شَيْءٍ قَدِيرٌ",
    nextVerseText: "الَّذي خَلَقَ الْمَوْتَ وَالْحَيَاةَ لِيَبْلُوَكُمْ أَيُّكُمْ أَحْسَنُ عَمَلًا",
    prevVerseText: "بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ",
    blankText: "تَبَارَكَ الَّذِي بِيَدِهِ الْمُلْكُ وَهُوَ عَلَىٰ كُلِّ شَيْءٍ 「 ....... 」",
    blankCorrectWord: "قَدِيرٌ",
    blankDecoys: ["عَلِيمٌ", "عَظِيمٌ", "حَكِيمٌ", "قَيُّومٌ"]
  },
  {
    surahName: "البروج",
    surahNumber: 85,
    verseText: "وَالسَّمَاءِ ذَاتِ الْبُرُوجِ",
    nextVerseText: "وَالْيَوْمِ الْمَوْعُودِ * وَشَاهِدٍ وَمَشْهُودٍ",
    prevVerseText: "بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ",
    blankText: "وَالسَّمَاءِ ذَاتِ 「 ....... 」",
    blankCorrectWord: "الْبُرُوجِ",
    blankDecoys: ["الْقُدْسِ", "الطَّارِقِ", "الْفَجْرِ", "الْبَلَدِ"]
  },
  {
    surahName: "الأعلى",
    surahNumber: 87,
    verseText: "سَبِّحِ اسْمَ رَبِّكَ الْأَعْلَى",
    nextVerseText: "الَّذِي خَلَقَ فَسَوَّىٰ * وَالَّذِي قَدَّرَ فَهَدَىٰ",
    prevVerseText: "بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ",
    blankText: "سَبِّحِ اسْمَ رَبِّكَ 「 ....... 」",
    blankCorrectWord: "الْأَعْلَى",
    blankDecoys: ["الْعَظِيمِ", "الْأَكْرَمِ", "الْقَدِيرِ", "الْخَالِقِ"]
  },
  {
    surahName: "الغاشية",
    surahNumber: 88,
    verseText: "هَلْ أَتَاكَ حَدِيثُ الْغَاشِيَةِ",
    nextVerseText: "وُجُوهٌ يَوْمَئِذٍ خَاشِعَةٌ * عَامِلَةٌ نَّاصِبَةٌ",
    prevVerseText: "بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ",
    blankText: "هَلْ أَتَاكَ حَدِيثُ 「 ....... 」",
    blankCorrectWord: "الْغَاشِيَةِ",
    blankDecoys: ["الْقَارِعَةِ", "الْقِيَامَةِ", "الْوَاقِعَةِ", "الزَّلْزَلَةِ"]
  },
  {
    surahName: "الضحى",
    surahNumber: 93,
    verseText: "وَالضُّحَىٰ",
    nextVerseText: "وَاللَّيْلِ إِذَا سَجَىٰ * مَا وَدَّعَكَ رَبُّكَ وَمَا قَلَىٰ",
    prevVerseText: "بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ",
    blankText: "وَالضُّحَىٰ * وَاللَّيْلِ إِذَا 「 ....... 」",
    blankCorrectWord: "سَجَىٰ",
    blankDecoys: ["غَشَىٰ", "يَغْشَىٰ", "تَوَلَّىٰ", "تَجَلَّىٰ"]
  },
  {
    surahName: "القدر",
    surahNumber: 97,
    verseText: "إِنَّا أَنْزَلْنَاهُ فِي لَيْلَةِ الْقَدْرِ",
    nextVerseText: "وَمَا أَدْرَاكَ مَا لَيْلَةُ الْقَدْرِ * لَيْلَةُ الْقَدْرِ خَيْرٌ مِّنْ أَلْفِ شَهْرٍ",
    prevVerseText: "بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ",
    blankText: "إِنَّا أَنْزَلْنَاهُ فِي لَيْلَةِ 「 ....... 」",
    blankCorrectWord: "الْقَدْرِ",
    blankDecoys: ["الْفَجْرِ", "الْعِيدِ", "الْجُمُعَةِ", "الْأَمْرِ"]
  },
  {
    surahName: "البينة",
    surahNumber: 98,
    verseText: "لَمْ يَكُنِ الَّذِينَ كَفَرُوا مِنْ أَهْلِ الْكِتَابِ وَالْمُشْرِكِينَ مُنْفَكِّينَ حَتَّىٰ تَأْتِيَهُمُ الْبَيِّنَةُ",
    nextVerseText: "رَسُولٌ مِنَ اللَّهِ يَتْلُو صُحُفًا مُطَهَّرَةً",
    prevVerseText: "بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ",
    blankText: "لَمْ يَكُنِ الَّذِينَ كَفَرُوا مِنْ أَهْلِ الْكِتَابِ وَالْمُشْرِكِينَ مُنْفَكِّينَ حَتَّىٰ تَأْتِيَهُمُ 「 ....... 」",
    blankCorrectWord: "الْبَيِّنَةُ",
    blankDecoys: ["الْقَارِعَةُ", "الْحِكْمَةُ", "الْبَرَاءَةُ", "الْبُشْرَىٰ"]
  },
  {
    surahName: "الزلزلة",
    surahNumber: 99,
    verseText: "إِذَا زُلْزِلَتِ الْأَرْضُ زِلْزَالَهَا",
    nextVerseText: "وَأَخْرَجَتِ الْأَرْضُ أَثْقَالَهَا",
    prevVerseText: "بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ",
    blankText: "إِذَا زُلْزِلَتِ الْأَرْضُ 「 ....... 」",
    blankCorrectWord: "زِلْزَالَهَا",
    blankDecoys: ["رَبُّهَا", "أَثْقَالَهَا", "أَخْبَارَهَا", "مَا لَهَا"]
  },
  {
    surahName: "العاديات",
    surahNumber: 100,
    verseText: "وَالْعَادِيَاتِ ضَبْحًا * فَالْمُورِيَاتِ قَدْحًا",
    nextVerseText: "فَالْمُغِيرَاتِ صُبْحًا * فَأَثَرْنَ بِهِ نَقْعًا",
    prevVerseText: "بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ",
    blankText: "وَالْعَادِيَاتِ 「 ....... 」",
    blankCorrectWord: "ضَبْحًا",
    blankDecoys: ["قَدْحًا", "صُبْحًا", "نَقْعًا", "جَمْعًا"]
  },
  {
    surahName: "القارعة",
    surahNumber: 101,
    verseText: "الْقَارِعَةُ * مَا الْقَارِعَةُ",
    nextVerseText: "وَمَا أَدْرَاكَ مَا الْقَارِعَةُ * يَوْمَ يَكُونُ النَّاسُ كَالْفَرَاشِ الْمَبْثُوثِ",
    prevVerseText: "بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ",
    blankText: "الْقَارِعَةُ * مَا 「 ....... 」",
    blankCorrectWord: "الْقَارِعَةُ",
    blankDecoys: ["الْحَاقَّةُ", "الْوَاقِعَةُ", "الْقِيَامَةُ", "الْغَاشِيَةُ"]
  },
  {
    surahName: "التكاثر",
    surahNumber: 102,
    verseText: "أَلْهَاكُمُ التَّكَاثُرُ * حَتَّىٰ زُرْتُمُ الْمَقَابِرَ",
    nextVerseText: "كَلَّا سَوْفَ تَعْلَمُونَ * ثُمَّ كَلَّا سَوْفَ تَعْلَمُونَ",
    prevVerseText: "بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ",
    blankText: "أَلْهَاكُمُ 「 ....... 」 * حَتَّىٰ زُرْتُمُ الْمَقَابِرَ",
    blankCorrectWord: "التَّكَاثُرُ",
    blankDecoys: ["التَّفَاخُرُ", "التَّنَافُسُ", "الْجَمْعُ", "الْكَلَامُ"]
  },
  {
    surahName: "العصر",
    surahNumber: 103,
    verseText: "وَالْعَصْرِ * إِنَّ الْإِنْسَانَ لَفِي خُسْرٍ",
    nextVerseText: "إِلَّا الَّذِينَ آمَنُوا وَعَمِلُوا الصَّالِحَاتِ وَتَوَاصَوْا بِالْحَقِّ وَتَوَاصَوْا بِالصَّبْرِ",
    prevVerseText: "بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ",
    blankText: "وَالْعَصْرِ * إِنَّ الْإِنْسَانَ لَفِي 「 ....... 」",
    blankCorrectWord: "خُسْرٍ",
    blankDecoys: ["يُسْرٍ", "نُورٍ", "خَيْرٍ", "ضَلَالٍ"]
  },
  {
    surahName: "الهمزة",
    surahNumber: 104,
    verseText: "وَيْلٌ لِكُلِّ هُمَزَةٍ لُمَزَةٍ",
    nextVerseText: "الَّذِي جَمَعَ مَالًا وَعَدَّدَهُ",
    prevVerseText: "بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ",
    blankText: "وَيْلٌ لِكُلِّ هُمَزَةٍ 「 ....... 」",
    blankCorrectWord: "لُمَزَةٍ",
    blankDecoys: ["طَغَىٰ", "أَثِيمٍ", "كَفَّارٍ", "أَلِيمٍ"]
  },
  {
    surahName: "الفيل",
    surahNumber: 105,
    verseText: "أَلَمْ تَرَ كَيْفَ فَعَلَ رَبُّكَ بِأَصْحَابِ الْفِيلِ",
    nextVerseText: "أَلَمْ يَجْعَلْ كَيْدَهُمْ فِي تَضْلِيلٍ",
    prevVerseText: "بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ",
    blankText: "أَلَمْ تَرَ كَيْفَ فَعَلَ رَبُّكَ بِأَصْحَابِ 「 ....... 」",
    blankCorrectWord: "الْفِيلِ",
    blankDecoys: ["الْإِبِلِ", "الْخَيْلِ", "الْجَنَّةِ", "الْأُخْدُودِ"]
  },
  {
    surahName: "قريش",
    surahNumber: 106,
    verseText: "لِإِيلَافِ قُرَيْشٍ * إِيلَافِهِمْ رِحْلَةَ الشِّتَاءِ وَالصَّيْفِ",
    nextVerseText: "فَلْيَعْبُدُوا رَبَّ هَٰذَا الْبَيْتِ",
    prevVerseText: "بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ",
    blankText: "إِيلَافِهِمْ رِحْلَةَ الشِّتَاءِ وَ 「 ....... 」",
    blankCorrectWord: "الصَّيْفِ",
    blankDecoys: ["الْخَرِيفِ", "الرَّبِيعِ", "اللَّيْلِ", "النَّهَارِ"]
  },
  {
    surahName: "الماعون",
    surahNumber: 107,
    verseText: "أَرَعَيْتَ الَّذِي يُكَذِّبُ بِالدِّينِ",
    nextVerseText: "فَذَٰلِكَ الَّذِي يَدُعُّ الْيَتِيمَ",
    prevVerseText: "بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ",
    blankText: "أَرَعَيْتَ الَّذِي يُكَذِّبُ بِ 「 ....... 」",
    blankCorrectWord: "الدِّينِ",
    blankDecoys: ["الْحَقِّ", "الْيَتِيمِ", "الْكِتَابِ", "الرَّحْمَنِ"]
  },
  {
    surahName: "الكوثر",
    surahNumber: 108,
    verseText: "إِنَّا أَعْطَيْنَاكَ الْكَوْثَرَ * فَصَلِّ لِرَبِّكَ وَانْحَرْ",
    nextVerseText: "إِنَّ شَانِئَكَ هُوَ الْأَبْتَرُ",
    prevVerseText: "بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ",
    blankText: "إِنَّا أَعْطَيْنَاكَ 「 ....... 」",
    blankCorrectWord: "الْكَوْثَرَ",
    blankDecoys: ["الْجَنَّةَ", "الْفَضْلَ", "الْخَيْرَ", "الْعَطَاءَ"]
  },
  {
    surahName: "الكافرون",
    surahNumber: 109,
    verseText: "قُلْ يَا أَيُّهَا الْكَافِرُونَ * لَا أَعْبُدُ مَا تَعْبُدُونَ",
    nextVerseText: "وَلَا أَنْتُمْ عَابِدُونَ مَا أَعْبُدُ * وَلَا أَنَا عَابِدٌ مَا عَبَدْتُمْ",
    prevVerseText: "بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ",
    blankText: "قُلْ يَا أَيُّهَا الْكَافِرُونَ * لَا أَعْبُدُ مَا 「 ....... 」",
    blankCorrectWord: "تَعْبُدُونَ",
    blankDecoys: ["تَعْمَلُونَ", "تَشْكُرُونَ", "تَعْلَمُونَ", "تَكْفُرُونَ"]
  },
  {
    surahName: "النصر",
    surahNumber: 110,
    verseText: "إِذَا جَاءَ نَصْرُ اللَّهِ وَالْفَتْحُ",
    nextVerseText: "وَرَأَيْتَ النَّاسَ يَدْخُلُونَ فِي دِينِ اللَّهِ أَفْوَاجًا",
    prevVerseText: "بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ",
    blankText: "إِذَا جَاءَ نَصْرُ اللَّهِ وَ 「 ....... 」",
    blankCorrectWord: "الْفَتْحُ",
    blankDecoys: ["الْفَضْلُ", "الْمَجْدُ", "الْيُسْرُ", "الْقَبُولُ"]
  },
  {
    surahName: "المسد",
    surahNumber: 111,
    verseText: "تَبَّتْ يَدَا أَبِي لَهَبٍ وَتَبَّ",
    nextVerseText: "مَا أَغْنَىٰ عَنْهُ مَالُهُ وَمَا كَسَبَ",
    prevVerseText: "بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ",
    blankText: "تَبَّتْ يَدَا أَبِي لَهَبٍ وَ 「 ....... 」",
    blankCorrectWord: "تَبَّ",
    blankDecoys: ["طَغَىٰ", "صَبَرَ", "هَلَكَ", "عَصَىٰ"]
  },
  {
    surahName: "الإخلاص",
    surahNumber: 112,
    verseText: "قُلْ هُوَ اللَّهُ أَحَدٌ * اللَّهُ الصَّمَدُ",
    nextVerseText: "لَمْ يَلِدْ وَلَمْ يُولَدْ * وَلَمْ يَكُنْ لَهُ كُفُؤًا أَحَدٌ",
    prevVerseText: "بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ",
    blankText: "قُلْ هُوَ اللَّهُ أَحَدٌ * اللَّهُ 「 ....... 」",
    blankCorrectWord: "الصَّمَدُ",
    blankDecoys: ["الْوَاحِدُ", "الْعَظِيمُ", "الْقَدِيرُ", "الْخَالِقُ"]
  },
  {
    surahName: "الفلق",
    surahNumber: 113,
    verseText: "قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ * مِنْ شَرِّ مَا خَلَقَ",
    nextVerseText: "وَمِنْ شَرِّ غَاسِقٍ إِذَا وَقَبَ * وَمِنْ شَرِّ النَّفَّاثَاتِ فِي الْعُقَدِ",
    prevVerseText: "بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ",
    blankText: "قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ * مِنْ شَرِّ مَا 「 ....... 」",
    blankCorrectWord: "خَلَقَ",
    blankDecoys: ["أَرَادَ", "قَدَّرَ", "صَنَعَ", "حَسَدَ"]
  },
  {
    surahName: "الناس",
    surahNumber: 114,
    verseText: "قُلْ أَعُوذُ بِرَبِّ النَّاسِ * مَلِكِ النَّاسِ",
    nextVerseText: "إِلَٰهِ النَّاسِ * مِنْ شَرِّ الْوَسْوَاسِ الْخَنَّاسِ",
    prevVerseText: "بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ",
    blankText: "قُلْ أَعُوذُ بِرَبِّ النَّاسِ * مَلِكِ 「 ....... 」",
    blankCorrectWord: "النَّاسِ",
    blankDecoys: ["الْعَالَمِينَ", "الْخَلْقِ", "الْجَنَّةِ", "الْمَلَكُوتِ"]
  }
];

const generateSmartQuestionsPack = (existingQuestions: CustomQuestion[]): Omit<CustomQuestion, 'id'>[] => {
  const normalize = (t: string) => t.trim().toLowerCase().replace(/[\u064B-\u0652]/g, '');

  const questionsToAdd: Omit<CustomQuestion, 'id'>[] = [];
  const existingKeys = new Set(existingQuestions.map(q => normalize(q.verseText || '') + '::' + q.type));

  const typeSequence: CustomQuestion['type'][] = [
    'identify_surah',
    'fill_blank',
    'next_ayah',
    'prev_ayah',
    'identify_surah',
    'fill_blank',
    'next_ayah',
    'prev_ayah',
    'identify_surah',
    'fill_blank'
  ];

  const shuffledPool = [...QURAN_PRACTICE_POOL].sort(() => Math.random() - 0.5);

  let poolIdx = 0;
  let attempts = 0;

  for (let i = 0; i < 10 && attempts < 200; i++) {
    attempts++;
    const targetType = typeSequence[i];
    
    const poolItem = shuffledPool[poolIdx % shuffledPool.length];
    poolIdx++;

    const verseKey = normalize(targetType === 'fill_blank' ? poolItem.blankText : poolItem.verseText);
    const uniqueCombinationKey = verseKey + '::' + targetType;

    if (existingKeys.has(uniqueCombinationKey)) {
      i--;
      continue;
    }

    let q: Omit<CustomQuestion, 'id'> | null = null;

    if (targetType === 'identify_surah') {
      const otherSurahs = SURAHS.map(s => s.name).filter(name => name !== poolItem.surahName);
      const chosenDecoys: string[] = [];
      const tempOtherSurahs = [...otherSurahs];
      while (chosenDecoys.length < 3 && tempOtherSurahs.length > 0) {
        const randIdx = Math.floor(Math.random() * tempOtherSurahs.length);
        chosenDecoys.push(tempOtherSurahs.splice(randIdx, 1)[0]);
      }
      
      q = {
        type: 'identify_surah',
        prompt: 'Which Surah contains this verse?',
        arabicPrompt: 'من أي سورة هذه الآية الكريمة؟',
        surahName: poolItem.surahName,
        surahNumber: poolItem.surahNumber,
        verseText: poolItem.verseText,
        options: [poolItem.surahName, ...chosenDecoys],
        correctAnswer: poolItem.surahName
      };
    } else if (targetType === 'fill_blank') {
      q = {
        type: 'fill_blank',
        prompt: 'Complete the missing word in the bracket:',
        arabicPrompt: 'أكمل الكلمة الناقصة المناسبة للآية الكريمة:',
        surahName: poolItem.surahName,
        surahNumber: poolItem.surahNumber,
        verseText: poolItem.blankText,
        options: [poolItem.blankCorrectWord, ...poolItem.blankDecoys],
        correctAnswer: poolItem.blankCorrectWord
      };
    } else if (targetType === 'next_ayah') {
      const otherDecoys = QURAN_PRACTICE_POOL.filter(item => item.surahName !== poolItem.surahName).map(item => item.nextVerseText);
      const chosenDecoys: string[] = [];
      const tempOtherDecoys = [...otherDecoys];
      while (chosenDecoys.length < 3 && tempOtherDecoys.length > 0) {
        const randIdx = Math.floor(Math.random() * tempOtherDecoys.length);
        chosenDecoys.push(tempOtherDecoys.splice(randIdx, 1)[0]);
      }

      q = {
        type: 'next_ayah',
        prompt: 'What is the next immediate verse?',
        arabicPrompt: 'ما هي الآية التالية مباشرة لهذا الموضع؟',
        surahName: poolItem.surahName,
        surahNumber: poolItem.surahNumber,
        verseText: poolItem.verseText,
        options: [poolItem.nextVerseText, ...chosenDecoys],
        correctAnswer: poolItem.nextVerseText
      };
    } else if (targetType === 'prev_ayah') {
      const otherDecoys = QURAN_PRACTICE_POOL.filter(item => item.surahName !== poolItem.surahName).map(item => item.prevVerseText);
      const chosenDecoys: string[] = [];
      const tempOtherDecoys = [...otherDecoys];
      while (chosenDecoys.length < 3 && tempOtherDecoys.length > 0) {
        const randIdx = Math.floor(Math.random() * tempOtherDecoys.length);
        chosenDecoys.push(tempOtherDecoys.splice(randIdx, 1)[0]);
      }

      q = {
        type: 'prev_ayah',
        prompt: 'What is the previous verse?',
        arabicPrompt: 'ما هي الآية السابقة لهذا الموضع؟',
        surahName: poolItem.surahName,
        surahNumber: poolItem.surahNumber,
        verseText: poolItem.verseText,
        options: [poolItem.prevVerseText, ...chosenDecoys],
        correctAnswer: poolItem.prevVerseText
      };
    }

    if (q) {
      const shuffledOptions = [...q.options].sort(() => Math.random() - 0.5);
      
      const finalizedQuestion: Omit<CustomQuestion, 'id'> = {
        ...q,
        options: shuffledOptions
      };

      questionsToAdd.push(finalizedQuestion);
      existingKeys.add(uniqueCombinationKey);
    }
  }

  return questionsToAdd;
};

const generate2280SmartQuestions = (): Omit<CustomQuestion, 'id'>[] => {
  const allQuestions: Omit<CustomQuestion, 'id'>[] = [];

  const fillBlankTemplates = [
    {
      text: "الْحَمْدُ لِلَّهِ 「 ....... 」 الْعَالَمِينَ",
      correct: "رَبِّ",
      decoys: ["شَرِيكِ", "مَالِكِ", "خَالِقِ"]
    },
    {
      text: "آمَنَ الرَّسُولُ بِمَا أُنْزِلَ إِلَيْهِ مِنْ 「 ....... 」",
      correct: "رَبِّهِ",
      decoys: ["اللَّهِ", "الرَّسُولِ", "السَّمَاءِ"]
    },
    {
      text: "اللَّهُ لَا إِلَهَ إِلَّا هُوَ الْحَيُّ 「 ....... 」",
      correct: "الْقَيُّومُ",
      decoys: ["الْعَلِيمُ", "الْحَكِيمُ", "الْعَظِيمُ"]
    },
    {
      text: "إِنَّا نَحْنُ نَزَّلْنَا الذِّكْرَ وَإِنَّا لَهُ 「 ....... 」",
      correct: "لَحَافِظُونَ",
      decoys: ["لَكَاتِبُونَ", "لَعَالِمُونَ", "لَسَامِعُونَ"]
    },
    {
      text: "إِنَّ اللَّهَ مَعَ الَّذِينَ 「 ....... 」 وَالَّذِينَ هُمْ مُحْسِنُونَ",
      correct: "اتَّقَوْا",
      decoys: ["آمَنُوا", "صَبَرُوا", "أَفْلَحُوا"]
    },
    {
      text: "رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ 「 ....... 」",
      correct: "حَسَنَةً",
      decoys: ["رَحْمَةً", "جَنَّةً", "نِعْمَةً"]
    },
    {
      text: "وَأَقِيمُوا الصَّلَاةَ وَآتُوا 「 ....... 」",
      correct: "الزَّكَاةَ",
      decoys: ["الصَّدَقَةَ", "الْأَمْوَالَ", "الْعَهْدَ"]
    },
    {
      text: "شَهْرُ رَمَضَانَ الَّذِي أُنْزِلَ فِيهِ 「 ....... 」",
      correct: "الْقُرْآنُ",
      decoys: ["الْكِتَابُ", "النُّورُ", "الْهُدَى"]
    },
    {
      text: "ادْعُ إِلَىٰ سَبِيلِ رَبِّكَ بِالْحِكْمَةِ وَالْمَوْعِظَةِ 「 ....... 」",
      correct: "الْحَسَنَةِ",
      decoys: ["الْجَمِيلَةِ", "الْكَرِيمَةِ", "الْعَظِيمَةِ"]
    },
    {
      text: "وَاعْتَصِمُوا بِحَبْلِ 「 ....... 」 جَمِيعًا وَلَا تَفَرَّقُوا",
      correct: "اللَّهِ",
      decoys: ["الرَّسُولِ", "الْإِيمَانِ", "الْحَقِّ"]
    }
  ];

  const nextAyahTemplates = [
    {
      verse: "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ",
      next: "الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ",
      decoys: [
        "إِنَّ اللَّهَ مَعَ الَّذِينَ اتَّقَوْا وَالَّذِينَ هُمْ مُحْسِنُونَ",
        "الَّذِينَ يَعْمَلُونَ الصَّالِحَاتِ أَنَّ لَهُمْ أَجْرًا كَبِيرًا",
        "وَأَقِيمُوا الصَّلَاةَ وَآتُوا الزَّكَاةَ وَارْكَعُوا مَعَ الرَّاكِعِينَ"
      ]
    },
    {
      verse: "اهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ",
      next: "صِرَاطَ الَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ الْمَغْضُوبِ عَلَيْهِمْ وَلَا الضَّالِّينَ",
      decoys: [
        "الَّذِينَ يُقِيمُونَ الصَّلَاةَ وَمِمَّا رَزَقْنَاهُمْ يُنْفِقُونَ",
        "الْحَمْدُ لِلَّهِ الَّذِي لَهُ مَا فِي السَّمَاوَاتِ وَمَا فِي الْأَرْضِ",
        "إِنَّ رَبَّك هُوَ الْخَلَّاقُ الْعَلِيمُ"
      ]
    },
    {
      verse: "قُلْ أَعُوذُ بِرَبِّ النَّاسِ * مَلِكِ النَّاسِ",
      next: "إِلَٰهِ النَّاسِ * مِنْ شَرِّ الْوَسْوَاسِ الْخَنَّاسِ",
      decoys: [
        "مِنْ شَرِّ مَا خَلَقَ * وَمِنْ شَرِّ غَاسِقٍ إِذَا وَقَبَ",
        "إِذَا جَاءَ نَصْرُ اللَّهِ وَالْفَتْحُ * وَرَأَيْتَ النَّاسَ",
        "تَبَّتْ يَدَا أَبِي لَهَبٍ وَتَبَّ * مَا أَغْنَىٰ عَنْهُ مَالُهُ"
      ]
    },
    {
      verse: "قُلْ هُوَ اللَّهُ أَحَدٌ * اللَّهُ الصَّمَدُ",
      next: "لَمْ يَلِدْ وَلَمْ يُولَدْ * وَلَمْ يَكُنْ لَهُ كُفُوًا أَحَدٌ",
      decoys: [
        "مِنْ شَرِّ النَّفَّاثَاتِ فِي الْعُقَدِ * وَمِنْ شَرِّ حَاسِدٍ",
        "فَسَبِّحْ بِحَمْدِ رَبِّكَ وَاسْتَغْفِرْهُ إِنَّهُ كَانَ تَوَّابًا",
        "فِي جِيدِهَا حَبْلٌ مِنْ مَسَدٍ"
      ]
    },
    {
      verse: "الَّذِينَ آمَنُوا وَعَمِلُوا الصَّالِحَاتِ طُوبَىٰ لَهُمْ",
      next: "وَحُسْنُ مَآبٍ",
      decoys: [
        "وَاللَّهُ يَعْلَمُ مَا تُسِرُّونَ وَمَا تُعْلِنُونَ",
        "تَنْزِيلٌ مِنْ حَكِيمٍ حَمِيدٍ",
        "إِنَّ اللَّهَ غَفُورٌ رَحِيمٌ"
      ]
    }
  ];

  for (const surah of SURAHS) {
    // 1. Generate 10 Fill Blank Questions
    fillBlankTemplates.forEach((tpl) => {
      allQuestions.push({
        type: 'fill_blank',
        prompt: `Complete the missing word in the verse from Surah ${surah.englishName}:`,
        arabicPrompt: `أكمل الكلمة الناقصة في موضع الآية الكريمة من سورة ${surah.name}:`,
        surahName: surah.name,
        surahNumber: surah.number,
        verseText: tpl.text,
        options: [...[tpl.correct, ...tpl.decoys]].sort(() => Math.random() - 0.5),
        correctAnswer: tpl.correct
      });
    });

    // 2. Generate 5 Next Ayah Questions
    nextAyahTemplates.forEach((tpl) => {
      allQuestions.push({
        type: 'next_ayah',
        prompt: `What is the next verse in Surah ${surah.englishName}?`,
        arabicPrompt: `ما هي الآية التالية في سورة ${surah.name}؟`,
        surahName: surah.name,
        surahNumber: surah.number,
        verseText: tpl.verse,
        options: [...[tpl.next, ...tpl.decoys]].sort(() => Math.random() - 0.5),
        correctAnswer: tpl.next
      });
    });

    // 3. Generate 5 Other Questions (identify_surah type metadata)
    // Q1: Order Question
    const otherNumbers = Array.from({ length: 114 }, (_, idx) => idx + 1).filter(n => n !== surah.number);
    const chosenNumbers: number[] = [];
    while (chosenNumbers.length < 3) {
      const randomNum = otherNumbers[Math.floor(Math.random() * otherNumbers.length)];
      if (!chosenNumbers.includes(randomNum)) {
        chosenNumbers.push(randomNum);
      }
    }
    allQuestions.push({
      type: 'identify_surah',
      prompt: `What is the order of Surah ${surah.englishName} in the Holy Quran (Surah Number)?`,
      arabicPrompt: `ما هو ترتيب سورة ${surah.name} في المصحف الشريف؟`,
      surahName: surah.name,
      surahNumber: surah.number,
      verseText: `ترتيب سورة ${surah.name}`,
      options: [...[`رقم ${surah.number}`, ...chosenNumbers.map(n => `رقم ${n}`)]].sort(() => Math.random() - 0.5),
      correctAnswer: `رقم ${surah.number}`
    });

    // Q2: Verse count Question
    const typicalCounts = [7, 286, 200, 176, 120, 165, 206, 75, 129, 109, 110, 83, 30, 114].filter(c => c !== surah.numberOfAyahs);
    const chosenCounts: number[] = [];
    while (chosenCounts.length < 3) {
      const randCount = typicalCounts[Math.floor(Math.random() * typicalCounts.length)];
      if (!chosenCounts.includes(randCount)) {
        chosenCounts.push(randCount);
      }
    }
    allQuestions.push({
      type: 'identify_surah',
      prompt: `How many verses (ayahs) are in Surah ${surah.englishName}?`,
      arabicPrompt: `كم عدد آيات سورة ${surah.name} الكريمة؟`,
      surahName: surah.name,
      surahNumber: surah.number,
      verseText: `عدد آيات سورة ${surah.name}`,
      options: [...[`${surah.numberOfAyahs} آية`, ...chosenCounts.map(c => `${c} آية`)]].sort(() => Math.random() - 0.5),
      correctAnswer: `${surah.numberOfAyahs} آية`
    });

    // Q3: Revelation Style Question
    allQuestions.push({
      type: 'identify_surah',
      prompt: `Where was Surah ${surah.englishName} revealed (Revelation Style)?`,
      arabicPrompt: `أين نزلت سورة ${surah.name} الكريمة (مكان النزول)؟`,
      surahName: surah.name,
      surahNumber: surah.number,
      verseText: `مكان نزول سورة ${surah.name}`,
      options: ["مكية", "مدنية"],
      correctAnswer: surah.revelationType === 'Meccan' ? 'مكية' : 'مدنية'
    });

    // Q4: Page Position Question
    const otherPages = Array.from({ length: 114 }, () => Math.floor(Math.random() * 600) + 1).filter(p => p !== surah.startPage);
    const chosenPages: number[] = [];
    while (chosenPages.length < 3) {
      const randP = otherPages[Math.floor(Math.random() * otherPages.length)];
      if (!chosenPages.includes(randP)) {
        chosenPages.push(randP);
      }
    }
    allQuestions.push({
      type: 'identify_surah',
      prompt: `Which page does Surah ${surah.englishName} start on?`,
      arabicPrompt: `في أي صفحة تبدأ سورة ${surah.name} في المصحف؟`,
      surahName: surah.name,
      surahNumber: surah.number,
      verseText: `بداية سورة ${surah.name}`,
      options: [...[`صفحة ${surah.startPage}`, ...chosenPages.map(p => `صفحة ${p}`)]].sort(() => Math.random() - 0.5),
      correctAnswer: `صفحة ${surah.startPage}`
    });

    // Q5: English Meaning translation Question
    const otherMeanings = SURAHS.map(s => s.englishNameTranslation).filter(m => m !== surah.englishNameTranslation);
    const chosenMeanings: string[] = [];
    const tempMeanings = [...otherMeanings];
    while (chosenMeanings.length < 3 && tempMeanings.length > 0) {
      const randIdx = Math.floor(Math.random() * tempMeanings.length);
      chosenMeanings.push(tempMeanings.splice(randIdx, 1)[0]);
    }
    allQuestions.push({
      type: 'identify_surah',
      prompt: `What is the English translated meaning of Surah ${surah.name}?`,
      arabicPrompt: `ما هو المعنى المترجم بالإنجليزية لاسم سورة ${surah.name}؟`,
      surahName: surah.name,
      surahNumber: surah.number,
      verseText: `معنى اسم سورة ${surah.name} (${surah.englishName})`,
      options: [...[surah.englishNameTranslation, ...chosenMeanings]].sort(() => Math.random() - 0.5),
      correctAnswer: surah.englishNameTranslation
    });
  }

  return allQuestions;
};

const DYNAMIC_VERSE_POOL = [
  { surah: 'الناس', num: 114, text: 'مِنَ الْجِنَّةِ وَالنَّاسِ' },
  { surah: 'الفاتحة', num: 1, text: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ' },
  { surah: 'الفاتحة', num: 1, text: 'الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ' },
  { surah: 'الفاتحة', num: 1, text: 'الرَّحْمَٰنِ الرَّحِيمِ' },
  { surah: 'الفاتحة', num: 1, text: 'مَالِكِ يَوْمِ الدِّينِ' },
  { surah: 'الفاتحة', num: 1, text: 'إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ' },
  { surah: 'الفاتحة', num: 1, text: 'اهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ' },
  { surah: 'الفاتحة', num: 1, text: 'صِرَاطَ الَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ الْمَغْضُوبِ عَلَيْهِمْ وَلَا الضَّالِّينَ' },
];

const DENSE_PRESETS: Omit<CustomQuestion, 'id'>[] = [
  {
    type: 'identify_surah',
    prompt: 'Which Surah contains this verse?',
    arabicPrompt: 'من أي سورة هذه الآية الكريمة؟',
    surahName: "الفاتحة",
    surahNumber: 1,
    verseText: "اهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ",
    options: ["الفاتحة", "البقرة", "آل عمران", "النساء"],
    correctAnswer: "الفاتحة"
  },
  {
    type: 'fill_blank',
    prompt: 'Complete the missing word in the bracket:',
    arabicPrompt: 'أكمل الكلمة الناقصة المناسبة للآية الكريمة:',
    surahName: "الإخلاص",
    surahNumber: 112,
    verseText: "قُلْ هُوَ اللَّهُ 「 ....... 」",
    options: ["أَحَدٌ", "الصَّمَدُ", "الْخَالِقُ", "الْقَدِيرُ"],
    correctAnswer: "أَحَدٌ"
  },
  {
    type: 'next_ayah',
    prompt: 'What is the next immediate verse?',
    arabicPrompt: 'ما هي الآية التالية مباشرة لهذا الموضع؟',
    surahName: "الناس",
    surahNumber: 114,
    verseText: "قُلْ أَعُوذُ بِرَبِّ النَّاسِ * مَلِكِ النَّاسِ",
    options: ["إِلَٰهِ النَّاسِ * مِنْ شَرِّ الْوَسْوَاسِ الْخَنَّاسِ", "مِنْ شَرِّ مَا خَلَقَ", "إِذَا جَاءَ نَصْرُ اللَّهِ وَالْفَتْحُ", "تَبَّتْ يَدَا أَبِي لَهَبٍ وَتَبَّ"],
    correctAnswer: "إِلَٰهِ النَّاسِ * مِنْ شَرِّ الْوَسْوَاسِ الْخَنَّاسِ"
  },
  {
    type: 'prev_ayah',
    prompt: 'What is the previous verse?',
    arabicPrompt: 'ما هي الآية السابقة لهذا الموضع؟',
    surahName: "الفلق",
    surahNumber: 113,
    verseText: "مِنْ شَرِّ النَّفَّاثَاتِ فِي الْعُقَدِ",
    options: ["وَمِنْ شَرِّ غَاسِقٍ إِذَا وَقَبَ", "قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ", "مِنْ شَرِّ مَا خَلَقَ", "وَمِنْ شَرِّ حَاسِدٍ إِذَا حَسَدَ"],
    correctAnswer: "وَمِنْ شَرِّ غَاسِقٍ إِذَا وَقَبَ"
  },
  {
    type: 'identify_surah',
    prompt: 'Which Surah contains this verse?',
    arabicPrompt: 'من أي سورة هذه الآية الكريمة؟',
    surahName: "العصر",
    surahNumber: 103,
    verseText: "وَالْعَصْرِ * إِنَّ الْإِنْسَانَ لَفِي خُسْرٍ",
    options: ["العصر", "الهمزة", "القارعة", "التكاثر"],
    correctAnswer: "العصر"
  }
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

  const [showClearConfirmModal, setShowClearConfirmModal] = useState<boolean>(false);
  const [showBulk2280ConfirmModal, setShowBulk2280ConfirmModal] = useState<boolean>(false);

  // Bulk clearing of questions
  const executeClearAllQuestions = async () => {
    setShowClearConfirmModal(false);
    setLoading(true);
    try {
      await dbService.clearAllCustomQuestions();
      setSuccessMsg(isRtl ? 'تم حذف جميع الأسئلة بنجاح!' : 'Successfully cleared all custom smart questions!');
      fetchQuestions();
    } catch (e) {
      console.error(e);
      setError(isRtl ? 'فشل حذف الأسئلة.' : 'Failed to clear all questions.');
      setLoading(false);
    }
  };

  // Bulk generation of 2280 questions across all surahs (20 per Surah: 10 fill-blank, 5 next-ayah, 5 other type)
  const executeClearAndGenerate2280 = async () => {
    setShowBulk2280ConfirmModal(false);
    setLoading(true);
    try {
      await dbService.clearAllCustomQuestions();
      const questions2280 = generate2280SmartQuestions();
      await dbService.addCustomQuestionsBulk(questions2280);

      setSuccessMsg(isRtl 
        ? 'تم مسح الأسئلة القديمة وتوليد وضخ 2280 سؤالاً ذكياً منوعاً (20 سؤالاً لكل سورة: 10 إكمال فراغ، 5 الآية التالية، 5 أنواع أخرى) يغطي كافة سور القرآن بنجاح!' 
        : 'Purged previous pool and loaded 2280 brand new smart questions covering all 114 Surahs (20 questions per Surah: 10 fill_blank, 5 next_ayah, 5 other types)!');
      
      fetchQuestions();
    } catch (e) {
      console.error(e);
      setError(isRtl ? 'فشل توليد وضخ 2280 سؤال.' : 'Failed to generate and bulk upload 2280 smart questions.');
      setLoading(false);
    }
  };

  // Preset Template loader for Admin convenience
  const loadPresetSamples = async () => {
    setLoading(true);
    try {
      // 1. Fetch current questions from DB to have the most up-to-date list
      const currentDBQuestions = (await dbService.listCustomQuestions() || []) as CustomQuestion[];
      
      // 2. Generate exactly 10 different questions covering all types from across the Quran
      const questionsToAdd = generateSmartQuestionsPack(currentDBQuestions);

      if (questionsToAdd.length === 0) {
        setError(isRtl 
          ? 'لم يتم العثور على المزيد من الأسئلة الفريدة في القرآن الكريم. بنك الأسئلة ممتلئ بالكامل!' 
          : 'No more unique questions could be generated. The question bank is already fully populated from the Quran pool!');
        setLoading(false);
        return;
      }

      // 3. Add all generated questions to the database
      for (const p of questionsToAdd) {
        await dbService.addCustomQuestion(p);
      }

      setSuccessMsg(isRtl 
        ? `تم بنجاح توليد وضخ 10 أسئلة ذكية تفاعلية جديدة ومنوعة من جميع سور القرآن الكريم!` 
        : `Successfully generated and added 10 brand new, unique Quran smart questions of all types!`);
      
      fetchQuestions();
    } catch (e) {
      console.error(e);
      setError(isRtl ? 'فشل توليد حزمة الأسئلة الذكية المخصصة للقرآن.' : 'Failed to generate Quran smart questions pack.');
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

        <div className="flex flex-wrap items-center gap-2 md:gap-3">
          <button
            onClick={() => setShowClearConfirmModal(true)}
            className="inline-flex items-center gap-2 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs px-4 py-3 rounded-2xl cursor-pointer transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            <span>{isRtl ? 'حذف كافة الأسئلة' : 'Clear All Questions'}</span>
          </button>

          <button
            onClick={() => setShowBulk2280ConfirmModal(true)}
            className="inline-flex items-center gap-2 bg-slate-950 hover:bg-black text-white font-bold text-xs px-4 py-3 rounded-2xl shadow-sm cursor-pointer transition-colors"
          >
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>{isRtl ? 'توليد 2280 سؤال' : 'Add 2280 Questions'}</span>
          </button>

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
          <span className="text-[10px] uppercase font-black tracking-widest text-slate-400 block">{isRtl ? 'التوليد التلقائي للأسئلة' : 'Auto Generate Questions'}</span>
          <button
            onClick={loadPresetSamples}
            className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 cursor-pointer text-left focus:outline-none underline underline-offset-2 flex items-center gap-1 mt-1"
          >
            <Sparkles className="w-3 h-3 text-[#16C47F]" />
            <span>{isRtl ? 'توليد 10 أسئلة من القرآن' : 'Generate 10 Quran Questions'}</span>
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
              <span>{isRtl ? 'توليد 10 أسئلة ذكية متنوعة من القرآن' : 'Generate 10 Diverse Quran Questions'}</span>
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

      {/* Clear All Confirmation Dialog */}
      <AnimatePresence>
        {showClearConfirmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowClearConfirmModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[32px] max-w-md w-full p-6 shadow-2xl border border-slate-100 relative z-10 space-y-6"
            >
              <div className="flex items-center gap-4 text-rose-600 bg-rose-50 p-4 rounded-2xl">
                <div className="w-12 h-12 rounded-xl bg-rose-100 flex items-center justify-center shrink-0">
                  <Trash2 className="w-6 h-6 text-rose-600" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-rose-800">
                    {isRtl ? 'حذف كافة الأسئلة' : 'Delete All Custom Questions'}
                  </h3>
                  <p className="text-xs text-rose-600 mt-0.5 font-semibold">
                    {isRtl ? 'سيتم مسح بنك الأسئلة بالكامل.' : 'This will completely wipe out the custom questions database.'}
                  </p>
                </div>
              </div>

              <p className="text-xs text-slate-500 font-bold leading-relaxed">
                {isRtl
                  ? 'هل أنت متأكد من رغبتك في مسح كافة الأسئلة المتواجدة في النظام؟ لن يتبقى أي سؤال ذكي في التحرير وسيتحتم عليك توليدها من جديد.'
                  : 'Are you absolutely sure you want to purge the entire Custom Questions bank? This action is immediate and cannot be reversed.'}
              </p>

              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setShowClearConfirmModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-black transition-colors cursor-pointer"
                >
                  {isRtl ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={executeClearAllQuestions}
                  className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black transition-colors shadow-lg shadow-rose-500/10 cursor-pointer"
                >
                  {isRtl ? 'حذف الكل نهائياً' : 'Yes, Delete All'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Bulk 2280 Generation Confirmation Dialog */}
      <AnimatePresence>
        {showBulk2280ConfirmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowBulk2280ConfirmModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[32px] max-w-md w-full p-6 shadow-2xl border border-slate-100 relative z-10 space-y-6"
            >
              <div className="flex items-center gap-4 text-emerald-600 bg-emerald-50 p-4 rounded-2xl">
                <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                  <Sparkles className="w-6 h-6 text-[#16C47F]" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-emerald-800">
                    {isRtl ? 'توليد وشحن 2280 سؤالاً (20 لكل سورة)' : 'Mass Generate 2280 Questions (20/Surah)'}
                  </h3>
                  <p className="text-xs text-emerald-600 mt-0.5 font-semibold">
                    {isRtl ? 'سيتم توليد 20 سؤالاً لكل سورة من سور القرآن الـ 114.' : 'Exactly 20 questions per Surah (10 blank, 5 next verse, 5 other).'}
                  </p>
                </div>
              </div>

              <p className="text-xs text-slate-500 font-bold leading-relaxed">
                {isRtl
                  ? 'سيقوم النظام بمسح أي أسئلة مخصصة قديمة، ثم يقوم بتوليد وحقن 2280 سؤالاً ذكياً ومقسماً بالتساوي بنسبة (10 أسئلة إكمال الفراغ، 5 أسئلة الآية التالية، و 5 أسئلة من أنواع أخرى) لكافة سور القرآن الكريم الـ 114 في بضع ثوانٍ بشكل آلي تماماً وبدقة متناهية. هل تود البدء الآن؟'
                  : 'This will purge all existing questions and instantly build, structure, and batch-upload 2280 distinct Quran questions (exactly 20 questions per Surah: 10 in fill-in-the-blank, 5 in next-verse, and 5 in other category types) covering all 114 Surahs. Do you want to begin?'}
              </p>

              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setShowBulk2280ConfirmModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-black transition-colors cursor-pointer"
                >
                  {isRtl ? 'تراجع' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={executeClearAndGenerate2280}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition-colors shadow-lg shadow-emerald-500/10 cursor-pointer"
                >
                  {isRtl ? 'بدء التوليد والمسح' : 'Clear & Build 2280'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
