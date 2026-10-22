// Publisher-hosted reference only: no artwork is copied or cached by the app.
const labels={
 ar:{title:'مصحف ورش — ألوان التجويد',description:'مرجع قراءة على موقع الناشر، يفتح في تبويب جديد ويتطلب اتصالاً بالإنترنت. لا يدعم هنا تقييم الطلاب أو التنزيل دون اتصال؛ لم تُعتمد مواقع الآيات وإذن إعادة التوزيع بعد.',open:'فتح مصحف التجويد لدى الناشر',publisherPage:'صفحة الناشر'},
 en:{title:'Warsh — Tajweed colours',description:'A reading reference on the publisher’s website. Opens in a new tab and requires internet. Student assessment and offline download are unavailable here while verse mapping and redistribution permission remain unconfirmed.',open:'Open the publisher’s Tajweed Mushaf',publisherPage:'Publisher page'},
 fr:{title:'Warsh — couleurs du Tajwid',description:'Une référence de lecture sur le site de l’éditeur, dans un nouvel onglet avec Internet. L’évaluation des élèves et le téléchargement hors ligne restent indisponibles ici tant que la carte des versets et l’autorisation de redistribution ne sont pas confirmées.',open:'Ouvrir le Mushaf Tajwid de l’éditeur',publisherPage:'Page de l’éditeur'}
};
export function tajweedReference(language='ar',page=446,{open=false}={}){
 if(!Number.isInteger(page)||page<1||page>604)throw Error('invalid-publisher-page');
 const l=labels[language]||labels.ar;
 return `<details class="tajweed-reference" ${open?'open':''}><summary>${l.title}</summary><p>${l.description}</p><a class="secondary-button" href="https://easyquran-eg.com/qrwarsh/page/${page}" target="_blank" rel="noopener noreferrer" referrerpolicy="no-referrer">${l.open} ↗</a><small>${l.publisherPage} <bdi dir="ltr">${page} / 604</bdi></small></details>`;
}
