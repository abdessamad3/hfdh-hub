import {PASSAGE_INDEX} from './passage-index.mjs';
import {MUSHAF_EDITION,MUSHAF_COMMIT} from './mushaf-model.mjs';
export function validatePassageIndex(data){
 if(data?.edition!==MUSHAF_EDITION||data.artworkCommit!==MUSHAF_COMMIT||data.entries?.length!==480)throw Error('invalid-passage-index');
 let lastOrdinal=0,lastOffset=-1;
 for(const [i,r] of data.entries.entries()){
  if(r.hizb!==Math.floor(i/8)+1||r.eighth!==i%8+1||!Number.isInteger(r.surah)||r.surah<1||r.surah>114||!Number.isInteger(r.ayah)||r.ayah<1||!Number.isInteger(r.page)||r.page<1||r.page>604||!Number.isInteger(r.ordinal)||r.ordinal<1||r.ordinal>6214||!Number.isInteger(r.startOffset)||r.startOffset<0||typeof r.fullAyah!=='string'||!r.fullAyah||typeof r.opening!=='string'||!r.opening||typeof r.surahName!=='string'||!r.surahName||r.startsInsideAyah!==(r.startOffset>0)||r.startOffset>=r.fullAyah.length||r.ordinal<lastOrdinal||r.ordinal===lastOrdinal&&r.startOffset<=lastOffset)throw Error('invalid-passage-index');
  if(!r.fullAyah.slice(r.startOffset).startsWith(r.opening))throw Error('invalid-passage-opening');
  lastOrdinal=r.ordinal;lastOffset=r.startOffset;
 }
 return data;
}
const index=validatePassageIndex(PASSAGE_INDEX);
export function passageReference(hizb,eighth=1){if(!Number.isInteger(hizb)||hizb<1||hizb>60||!Number.isInteger(eighth)||eighth<1||eighth>8)throw Error('invalid-passage');return index.entries[(hizb-1)*8+eighth-1];}
export const passageLabels={
 en:{opening:'Opening words',ayah:'Opening ayah',surah:'Surah',verse:'Ayah',page:'Mushaf page',inside:'This eighth starts inside the ayah; its opening words are shown above.',full:'Read the complete opening ayah',open:'Open in Mushaf',close:'Close passage details',noEvidence:'No student record for this eighth in the selected view.',source:'Warsh text: King Fahd Complex. Eighth boundaries: Noureddine El-Ahmadi, CC BY 4.0.',sources:'Sources and edition',recorded:'Recorded evidence',empty:'No recorded evidence',confirmed:'Confirmed memorization',choose:'Tap any eighth to read its passage and student records.'},
 ar:{opening:'بداية المقطع',ayah:'الآية الأولى',surah:'السورة',verse:'الآية',page:'صفحة المصحف',inside:'يبدأ هذا الثمن من داخل الآية؛ الكلمات المعروضة أعلاه هي بداية المقطع.',full:'عرض الآية الأولى كاملة',open:'فتح في المصحف',close:'إغلاق تفاصيل المقطع',noEvidence:'لا يوجد سجل للطالب في هذا الثمن ضمن العرض المحدد.',source:'نص ورش: مجمع الملك فهد. حدود الأثمان: نور الدين الأحمدي، CC BY 4.0.',sources:'المصادر والطبعة',recorded:'سجل موجود',empty:'لا يوجد سجل',confirmed:'حفظ مثبت',choose:'اضغط أي ثمن لعرض بدايته وسجلات الطالب.'},
 fr:{opening:'Début du passage',ayah:'Premier verset',surah:'Sourate',verse:'Verset',page:'Page du Mushaf',inside:'Ce huitième commence au milieu du verset ; ses premiers mots figurent ci-dessus.',full:'Lire le premier verset en entier',open:'Ouvrir dans le Mushaf',close:'Fermer les détails du passage',noEvidence:'Aucune fiche élève pour ce huitième dans la vue sélectionnée.',source:'Texte Warsh : Complexe du roi Fahd. Limites des huitièmes : Noureddine El-Ahmadi, CC BY 4.0.',sources:'Sources et édition',recorded:'Fiche enregistrée',empty:'Aucune fiche',confirmed:'Mémorisation confirmée',choose:'Touchez un huitième pour lire son début et les fiches élève.'}
};
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function passageDescription(hizb,eighth,language,{canOpen=false}={}){
 const r=passageReference(hizb,eighth),l=passageLabels[language];
 return `<section class="passage-description"><div class="passage-detail-heading"><strong>${l.opening}</strong><button type="button" class="secondary-button" data-passage-close aria-label="${l.close}">×</button></div><blockquote dir="rtl" lang="ar">${esc(r.opening)}</blockquote><p>${l.surah}: <span lang="ar">${esc(r.surahName)}</span> · ${l.verse}: <bdi>${r.ayah}</bdi> · ${l.page}: <bdi>${r.page}</bdi></p>${r.startsInsideAyah?`<p class="visual-hint">${l.inside}</p>`:''}<details class="passage-full-ayah"><summary>${l.full}</summary><p dir="rtl" lang="ar">${esc(r.fullAyah)}</p></details>${canOpen?`<button type="button" class="primary-button" data-passage-open="${hizb}:${eighth}">${l.open}</button>`:''}</section>`;
}
