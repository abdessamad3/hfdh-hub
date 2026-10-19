import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {webcrypto} from 'node:crypto';
import {MUSHAF_EDITION,MUSHAF_COMMIT,validateMushafManifest,verseOrdinal,verseReference,versePage,pageReferences,cleanVerseMark,verseHistory,commitVerseMark} from '../public/katatib/live/mushaf-model.mjs';
import {verifyPageBytes} from '../public/katatib/live/mushaf-pages.mjs';
globalThis.crypto??=webcrypto;
const m=validateMushafManifest(JSON.parse(fs.readFileSync('public/katatib/mushaf/manifest.json')));
const mark={studentId:'a',edition:MUSHAF_EDITION,sourceVersion:MUSHAF_COMMIT,page:1,surah:1,ayah:1,mark:'forgot',note:'Original note'};
test('Warsh navigation covers exactly 6214 references on 604 pages without Hafs numbering',()=>{
 assert.equal(versePage(m,2,251),42);assert.equal(versePage(m,114,6),604);assert.equal(verseOrdinal(m,114,6),6214);
 const all=[];for(let page=1;page<=604;page++)for(const ref of pageReferences(m,page)){all.push(verseOrdinal(m,ref.surah,ref.ayah));assert.equal(versePage(m,ref.surah,ref.ayah),page);}
 assert.deepEqual(all,Array.from({length:6214},(_,i)=>i+1));
 for(const s of m.surahs)assert.equal(versePage(m,s.number,1),s.page);
 for(const n of m.hizbStarts)assert.equal(verseOrdinal(m,...Object.values(verseReference(m,n))),n);
 assert.throws(()=>versePage(m,2,286));assert.throws(()=>verseReference(m,6215));assert.throws(()=>pageReferences(m,605));
});
test('opening and last-page artwork match the pinned Git blob fingerprints; changed bytes fail',async()=>{
 for(const n of [1,42,591,604]){const b=fs.readFileSync(`tests/fixtures/warsh-${String(n).padStart(3,'0')}.svg`);const bytes=b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);assert.match(await verifyPageBytes(bytes,m.pages[n-1]),/<svg /);const changed=bytes.slice(0);new Uint8Array(changed)[100]^=1;await assert.rejects(verifyPageBytes(changed,m.pages[n-1]));}
});
test('marks bind the exact edition, page and Warsh reference; history keeps previous mistakes',()=>{
 assert.equal(cleanVerseMark(mark,m).mark,'forgot');
 for(const update of [{edition:'hafs'},{sourceVersion:'latest'},{page:2},{ayah:8},{mark:'perfect'},{note:'x'.repeat(501)},{studentId:'../b'}])assert.throws(()=>cleanVerseMark({...mark,...update},m));
 const records=[{...mark,id:'first',createdAt:{seconds:1}},{...mark,id:'second',mark:'correct',createdAt:{seconds:2}},{...mark,id:'other',ayah:2,createdAt:{seconds:3}}];
 assert.deepEqual(verseHistory(records,1,1).map(r=>r.mark),['correct','forgot']);
});
test('a lost-ack retry preserves one immutable mark; conflicting retries cannot change it',async()=>{
 const store=new Map(),sdk={doc:(_db,c,id)=>c+'/'+id,serverTimestamp:()=>({seconds:1}),runTransaction:async(_db,fn)=>fn({get:async ref=>({exists:()=>store.has(ref),data:()=>store.get(ref)}),set:(ref,data)=>store.set(ref,data)})};
 await commitVerseMark({},sdk,'teacher',mark,'verse-event-first-0001',m);await commitVerseMark({},sdk,'teacher',mark,'verse-event-first-0001',m);assert.equal(store.size,1);
 await assert.rejects(commitVerseMark({},sdk,'teacher',{...mark,mark:'correct'},'verse-event-first-0001',m));
 await assert.rejects(commitVerseMark({},sdk,'different-teacher',mark,'verse-event-first-0001',m));
});
