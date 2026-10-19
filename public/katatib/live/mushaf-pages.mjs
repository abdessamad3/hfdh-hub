import {MUSHAF_COMMIT,pageReferences,validateMushafManifest} from './mushaf-model.mjs';
const encoder=new TextEncoder();
export async function verifyPageBytes(bytes,expected){
 if(bytes.byteLength!==expected.bytes)throw new Error('mushaf-integrity');
 const prefix=encoder.encode(`blob ${bytes.byteLength}\0`),joined=new Uint8Array(prefix.length+bytes.byteLength);joined.set(prefix);joined.set(new Uint8Array(bytes),prefix.length);
 const digest=await crypto.subtle.digest('SHA-1',joined),hex=[...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('');
 if(hex!==expected.sha)throw new Error('mushaf-integrity');
 return new TextDecoder('utf-8',{fatal:true}).decode(bytes);
}
async function download(url,max){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);
 try{const response=await fetch(url,{credentials:'omit',referrerPolicy:'no-referrer',signal:controller.signal});if(!response.ok)throw new Error('mushaf-unavailable');const size=Number(response.headers.get('Content-Length'));if(size>max)throw new Error('mushaf-too-large');const bytes=await response.arrayBuffer();if(bytes.byteLength>max)throw new Error('mushaf-too-large');return bytes;}finally{clearTimeout(timer);}
}
export function createMushafPages({persist=false}={}){
 let manifest=null;const pages=new Map();
 return {
  async manifest(){if(!manifest)manifest=validateMushafManifest(JSON.parse(new TextDecoder().decode(await download('/mushaf/manifest.json',200000))));return manifest;},
  async page(number){const m=await this.manifest(),expected=m.pages[number-1];if(!Number.isInteger(number)||!expected)throw new Error('invalid-mushaf-page');if(pages.has(number)){const text=pages.get(number);pages.delete(number);pages.set(number,text);return text;}
   const url=`https://raw.githubusercontent.com/quran-ws/quran-svg/${MUSHAF_COMMIT}/mushafs/warsh/kfqc/svg/${String(number).padStart(3,'0')}.svg`;
   let cache=null,cached=null;if(globalThis.caches){cache=await caches.open('katatib-warsh-pages-v1');cached=await cache.match(url);}
   const bytes=cached?await cached.arrayBuffer():await download(url,3000000);const text=await verifyPageBytes(bytes,expected);
   if(persist&&cache&&!cached){await cache.put(url,new Response(bytes,{headers:{'Content-Type':'image/svg+xml'}}));}
   pages.set(number,text);while(pages.size>3)pages.delete(pages.keys().next().value);return text;
  },clear(){pages.clear();}
 };
}
// Parse inert XML, reject executable/remote SVG content, and validate the exact Warsh verse set.
export function mountMushafPage(host,text,m,page,onSelect){
 if(/<!DOCTYPE|<!ENTITY/i.test(text))throw new Error('unsafe-mushaf');
 const xml=new DOMParser().parseFromString(text,'image/svg+xml'),root=xml.documentElement;
 if(root.localName!=='svg'||xml.querySelector('parsererror'))throw new Error('invalid-mushaf-svg');
 const tags=new Set(['svg','g','path']),attributes=new Set(['xmlns','xmlns:ayah','version','viewBox','xml:space','class','fill-opacity','id','number','ayah','surah','d','transform','fill','fill-rule','ayah:x','ayah:y','stroke','stroke-width','stroke-linejoin','stroke-linecap','opacity']);
 for(const node of [root,...root.querySelectorAll('*')]){
  if(!tags.has(node.localName)||node.namespaceURI!=='http://www.w3.org/2000/svg')throw new Error('unsafe-mushaf');
  for(const a of node.attributes)if(!attributes.has(a.name)||/url\s*\(|javascript:|data:|https?:/i.test(a.value)&&!a.name.startsWith('xmlns'))throw new Error('unsafe-mushaf');
 }
 const expected=pageReferences(m,page),polygons=[...root.querySelectorAll('path.ayahPolygon')];
 const references=polygons.map(p=>({surah:Number(p.getAttribute('surah')),ayah:Number(p.getAttribute('ayah'))}));
 if(references.length!==expected.length||references.some((r,i)=>r.surah!==expected[i].surah||r.ayah!==expected[i].ayah))throw new Error('mushaf-verse-map-mismatch');
 const svg=document.importNode(root,true);svg.setAttribute('class','mushaf-svg');svg.setAttribute('role','group');
 svg.setAttribute('aria-label',`ورش · ${page}`);
 // Original artwork stays intact; only its transparent interaction layer changes.
 for(const g of svg.querySelectorAll('g'))g.style.pointerEvents='none';
 for(const p of svg.querySelectorAll('.ayahPolygon')){
  const ref={surah:Number(p.getAttribute('surah')),ayah:Number(p.getAttribute('ayah'))};
  p.id=`mushaf-verse-${ref.surah}-${ref.ayah}`;p.setAttribute('tabindex','0');p.setAttribute('role','button');p.setAttribute('aria-label',`${m.surahs[ref.surah-1].name} ${ref.ayah}`);p.setAttribute('aria-pressed','false');p.style.pointerEvents='all';
  p.addEventListener('click',()=>onSelect(ref));p.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onSelect(ref);}});
 }
 host.replaceChildren(svg);
 // Opening pages have extra canvas space; fit the artwork without moving individual paths.
 if(page<=2){try{const b=svg.getBBox(),pad=12;if(b.width>0&&b.height>0)svg.setAttribute('viewBox',`${b.x-pad} ${b.y-pad} ${b.width+pad*2} ${b.height+pad*2}`);}catch{}}
 return svg;
}
