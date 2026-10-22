// Publisher-hosted reference only: no artwork is copied or cached by the app.
const labels={
 ar:{title:'مصحف ورش — ألوان التجويد',description:'مرجع إضافي على موقع الناشر، يفتح في تبويب جديد ويتطلب اتصالاً بالإنترنت. علامات الطالب والتسجيل تبقى في المصحف الحالي. لم تُتحقق مطابقة صفحات الطبعتين بعد.',open:'فتح مصحف التجويد لدى الناشر',page:'صفحة الناشر ٤٤٦ — الرابط الذي شاركته'},
 en:{title:'Warsh — Tajweed colours',description:'An additional reference on the publisher’s website. Opens in a new tab and requires internet. Student marks and recording remain in the current Mushaf. Page correspondence between editions has not yet been verified.',open:'Open the publisher’s Tajweed Mushaf',page:'Publisher page 446 — the reference you shared'},
 fr:{title:'Warsh — couleurs du Tajwid',description:'Une référence supplémentaire sur le site de l’éditeur. S’ouvre dans un nouvel onglet et nécessite Internet. Les marques et l’enregistrement restent dans le Mushaf actuel. La correspondance des pages entre éditions reste à vérifier.',open:'Ouvrir le Mushaf Tajwid de l’éditeur',page:'Page 446 de l’éditeur — votre référence'}
};
export function tajweedReference(language='ar'){
 const l=labels[language]||labels.ar;
 return `<details class="tajweed-reference"><summary>${l.title}</summary><p>${l.description}</p><a class="secondary-button" href="https://easyquran-eg.com/qrwarsh/page/446" target="_blank" rel="noopener noreferrer" referrerpolicy="no-referrer">${l.open} ↗</a><small>${l.page}</small></details>`;
}
