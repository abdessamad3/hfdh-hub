import { QURAN_HIZBS } from '../constants/quranMetadata';

export const SURAH_NAME_MAP: Record<string, string> = {
  "al-fatihah": "الفاتحة",
  "al-baqarah": "البقرة",
  "aal-e-imran": "آل عمران",
  "al-imran": "آل عمران",
  "an-nisa": "النساء",
  "al-ma'idah": "المائدة",
  "al-an'am": "الأنعام",
  "al-a'raf": "الأعراف",
  "al-anfal": "الأنفال",
  "at-tawbah": "التوبة",
  "yunus": "يونس",
  "hud": "هود",
  "yusuf": "يوسف",
  "ar-ra'd": "الرعد",
  "ibrahim": "إبراهيم",
  "al-hijr": "الحجر",
  "an-nahl": "النحل",
  "al-isra": "الإسراء",
  "al-kahf": "الكهف",
  "maryam": "مريم",
  "taha": "طه",
  "al-anbiya": "الأنبياء",
  "al-hajj": "الحج",
  "al-mu'minun": "المؤمنون",
  "an-nur": "النور",
  "al-furqan": "الفرقان",
  "ash-shu'ara": "الشعراء",
  "an-naml": "النمل",
  "al-qasas": "القصص",
  "al-ankabut": "العنكبوت",
  "ar-rum": "الروم",
  "luqman": "لقمان",
  "as-sajdah": "السجدة",
  "al-ahzab": "الأحزاب",
  "saba": "سبأ",
  "fatir": "فاطر",
  "ya-sin": "يس",
  "as-saffat": "الصافات",
  "sad": "ص",
  "az-zumar": "الزمر",
  "ghafir": "غافر",
  "fussilat": "فصلت",
  "ash-shura": "الشورى",
  "az-zukhruf": "الزخرف",
  "ad-dukhan": "الدخان",
  "al-jathiyah": "الجاثية",
  "al-ahqaf": "الأحقاف",
  "muhammad": "محمد",
  "al-fath": "الفتح",
  "al-hujurat": "الحجرات",
  "qaf": "ق",
  "adh-dhariyat": "الذاريات",
  "at-tur": "الطور",
  "an-najm": "النجم",
  "al-qamar": "القمر",
  "ar-rahman": "الرحمن",
  "al-waqi'ah": "الواقعة",
  "al-hadid": "الحديد",
  "al-mujadilah": "المجادلة",
  "al-hashr": "الحشر",
  "al-mumtahanah": "الممتحنة",
  "as-saff": "الصف",
  "al-jum'ah": "الجمعة",
  "al-munafiqun": "المنافقون",
  "at-taghabun": "التغابن",
  "at-talaq": "الطلاق",
  "at-tahrim": "التحريم",
  "al-mulk": "الملك",
  "al-qalam": "القلم",
  "al-haqqah": "الحاقة",
  "al-ma'ariij": "المعارج",
  "nuh": "نوح",
  "al-jinn": "الجن",
  "al-muzzammil": "المزمل",
  "al-muddaththir": "المدثر",
  "al-qiyamah": "القيامة",
  "al-insan": "الإنسان",
  "al-mursalat": "المرسلات",
  "an-naba": "النبأ",
  "an-nazi'at": "النازعات",
  "abasa": "عبس",
  "at-takwir": "التكوير",
  "al-infitar": "الانفطار",
  "al-mutaffifin": "المطففين",
  "al-inshiqaq": "الانشقاق",
  "al-buruj": "البروج",
  "at-tariq": "الطارق",
  "al-a'la": "الأعلى",
  "al-ghashiyah": "الغاشية",
  "al-fajr": "الفجر",
  "al-balad": "البلد",
  "ash-shams": "الشمس",
  "al-layl": "الليل",
  "ad-duha": "الضحى",
  "ash-sharh": "الشرح",
  "at-tin": "التين",
  "al-alaq": "العلق",
  "al-qadr": "القدر",
  "al-bayyinah": "البينة",
  "az-zalzalah": "الزلزلة",
  "al-adiyat": "العاديات",
  "al-qari'ah": "القارعة",
  "at-takathur": "التكاثر",
  "al-asr": "العصر",
  "al-humazah": "الهمزة",
  "al-fil": "الفيل",
  "quraysh": "قريش",
  "al-ma'un": "الماعون",
  "al-kawthar": "الكوثر",
  "al-kafirun": "الكافرون",
  "an-nasr": "النصر",
  "al-masad": "المسد",
  "al-ikhlas": "الإخلاص",
  "al-falaq": "الفلق",
  "an-nas": "الناس"
};

export const getHizbNumberForSurah = (surahName: string): number => {
  if (!surahName) return 1;
  const normalized = surahName.trim().toLowerCase();
  const arabicSurahName = SURAH_NAME_MAP[normalized] || surahName;
  
  // Find first matching Hizb in QURAN_HIZBS
  for (const [hizbNumStr, meta] of Object.entries(QURAN_HIZBS)) {
    if (meta.surah === arabicSurahName || meta.surah === surahName) {
      return parseInt(hizbNumStr, 10);
    }
  }
  
  // Fuzzy fallback: check if Surah name contains or is contained in meta.surah
  for (const [hizbNumStr, meta] of Object.entries(QURAN_HIZBS)) {
    if (meta.surah.includes(arabicSurahName) || arabicSurahName.includes(meta.surah)) {
      return parseInt(hizbNumStr, 10);
    }
  }

  return 1; // Default fallback to Hizb 1
};

export const formatQuranProgress = (totalHizbs: number, t: any) => {
  const totalUnits = Math.round(totalHizbs * 8);
  if (totalUnits === 0) return `0 ${t('hizbs')}`;
  
  let remaining = totalUnits;
  const hizbs = Math.floor(remaining / 8);
  remaining %= 8;
  
  const nisfs = Math.floor(remaining / 4);
  remaining %= 4;
  
  const rubus = Math.floor(remaining / 2);
  remaining %= 2;
  
  const thumns = remaining;
  
  const parts = [];
  if (hizbs > 0) parts.push(`${hizbs} ${hizbs === 1 ? t('hizb') : t('hizbs')}`);
  if (nisfs > 0) parts.push(`${nisfs} ${t('unit_nisf')}`);
  if (rubus > 0) parts.push(`${rubus} ${t('unit_rubu')}`);
  if (thumns > 0) parts.push(`${thumns} ${t('unit_thumn')}`);
  
  return parts.join(' • ');
};

export const getCoveredThumns = (hizb: number, quantityIdentifier: string): number[] => {
  if (hizb < 1 || hizb > 60) return [];
  const id = quantityIdentifier || '';
  
  if (id.startsWith('t')) {
    const unit = parseInt(id.substring(1));
    return (unit >= 1 && unit <= 8) ? [unit] : [];
  } else if (id.startsWith('r')) {
    const unit = parseInt(id.substring(1));
    // Each Rab' is 2 Thumns
    if (unit === 1) return [1, 2];
    if (unit === 2) return [3, 4];
    if (unit === 3) return [5, 6];
    if (unit === 4) return [7, 8];
  } else if (id.startsWith('n')) {
    const unit = parseInt(id.substring(1));
    // Each Nisf is 4 Thumns
    if (unit === 1) return [1, 2, 3, 4];
    if (unit === 2) return [5, 6, 7, 8];
  } else if (id === 'h' || id === 'h1') {
    // Full Hizb is all 8 Thumns
    return [1, 2, 3, 4, 5, 6, 7, 8];
  }
  return [];
};
