export function verseOrdinal(m,surah,ayah){
 if(!Number.isInteger(surah)||surah<1||surah>114||!Number.isInteger(ayah)||ayah<1||ayah>m.surahs[surah-1].ayahCount)throw new Error('invalid-warsh-reference');
 return m.surahs.slice(0,surah-1).reduce((n,s)=>n+s.ayahCount,0)+ayah;
}
export function verseReference(m,ordinal){
 if(!Number.isInteger(ordinal)||ordinal<1||ordinal>6214)throw new Error('invalid-warsh-reference');
 for(const s of m.surahs){if(ordinal<=s.ayahCount)return {surah:s.number,ayah:ordinal};ordinal-=s.ayahCount;}
}
export function versePage(m,surah,ayah){const n=verseOrdinal(m,surah,ayah);return m.pageStarts.findIndex((start,i)=>i<604&&start<=n&&m.pageStarts[i+1]>n)+1;}
