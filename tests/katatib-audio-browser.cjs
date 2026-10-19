const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve('public/katatib');let browser;
const harness=`<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/styles.css"><link rel="stylesheet" href="/live/live.css"></head><body><main id="test"></main><script type="module">
import {createAudioTest} from '/live/audio-test.mjs';
window.__tracks=[];window.__deny=false;window.__defer=false;
navigator.mediaDevices.getUserMedia=async()=>{
 if(window.__deny)throw new DOMException('denied','NotAllowedError');
 if(window.__defer)await new Promise(resolve=>window.__permissionResolve=resolve);
 const context=new AudioContext();await context.resume();const oscillator=context.createOscillator(),destination=context.createMediaStreamDestination();oscillator.frequency.value=440;oscillator.connect(destination);oscillator.start();
 for(const track of destination.stream.getTracks()){const stop=track.stop.bind(track);track.stop=()=>{stop();try{oscillator.stop();}catch{}void context.close().catch(()=>{});};window.__tracks.push(track);}
 return destination.stream;
};
const test=createAudioTest();window.__open=(role='teacher')=>{test.reset();test.mount(document.querySelector('#test'),{role,language:'en',user:{uid:'synthetic-teacher'},students:[]});};window.__open();
</script></body></html>`;
(async()=>{
 browser=await chromium.launch({headless:true,args:['--autoplay-policy=no-user-gesture-required'],...(process.env.KATATIB_CHROMIUM_EXECUTABLE?{executablePath:process.env.KATATIB_CHROMIUM_EXECUTABLE}:{})});const context=await browser.newContext(),page=await context.newPage(),errors=[],requests=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push({method:r.method(),url:r.url()}));
 await page.route('http://localhost:8422/**',async route=>{const p=new URL(route.request().url()).pathname;if(p==='/test-audio'){await route.fulfill({contentType:'text/html',body:harness});return;}const file=path.resolve(root,'.'+p);if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){await route.fulfill({status:404,body:''});return;}await route.fulfill({contentType:file.endsWith('.mjs')?'text/javascript':file.endsWith('.css')?'text/css':'application/json',body:fs.readFileSync(file)});});
 await page.goto('http://localhost:8422/test-audio');await page.locator('[data-audio-test=start]:not([disabled])').waitFor();
 // Permission failure preserves a usable page without audio or cloud writes.
 await page.evaluate(()=>window.__deny=true);await page.locator('[data-audio-test=start]').click();await page.locator('[data-audio-test-state][role=alert]').waitFor();assert.equal(await page.locator('audio').count(),0);
 await page.evaluate(()=>{window.__deny=false;window.__defer=true;});await page.locator('[data-audio-test=start]').click();await page.waitForFunction(()=>typeof window.__permissionResolve==='function');
 page.once('dialog',d=>d.accept());await page.locator('[data-audio-test=clear]').click();await page.evaluate(()=>{window.__defer=false;window.__permissionResolve();});
 await page.waitForFunction(()=>window.__tracks.length>0&&window.__tracks.every(t=>t.readyState==='ended'));
 // Actual MediaRecorder + Web Audio encode/decode; the synthetic tone substitutes only for the microphone input.
 await page.locator('[data-audio-test=start]').click();await page.locator('[data-audio-test-state=recording]').waitFor();
 await page.waitForFunction(()=>parseFloat(document.querySelector('#audio-test-clock')?.textContent)>=5.2);
 await page.locator('[data-audio-cue=forgot]').click();
 await page.waitForFunction(()=>parseFloat(document.querySelector('#audio-test-clock')?.textContent)>=16);
 await page.locator('[data-audio-test=stop]').click();await page.locator('[data-audio-test-state=complete]').waitFor({timeout:30000});
 assert.equal(await page.locator('[data-audio-clip]').count(),1);assert.equal(await page.evaluate(()=>window.__tracks.every(t=>t.readyState==='ended')),true);
 const clip=page.locator('[data-audio-clip]').first(),audio=clip.locator('audio');await audio.evaluate(async el=>{await el.play();});await page.waitForFunction(()=>document.querySelector('[data-audio-play]')?.duration>0);
 const duration=await audio.evaluate(el=>el.duration);assert.ok(Math.abs(duration-15)<0.05);
 const samples=await audio.evaluate(async el=>{const b=await (await fetch(el.src)).arrayBuffer(),v=new DataView(b);let peak=0;for(let i=44;i<b.byteLength;i+=2)peak=Math.max(peak,Math.abs(v.getInt16(i,true)));return {bytes:b.byteLength,rate:v.getUint32(24,true),peak};});assert.equal(samples.bytes,480044);assert.equal(samples.rate,16000);assert.ok(samples.peak>1000,'clip contains the recorded tone, not an empty container');
 const reportPromise=page.waitForEvent('download');await page.locator('[data-audio-test=report]').click();let file=await reportPromise;let report=JSON.parse(fs.readFileSync(await file.path(),'utf8'));assert.equal(report.uploaded,false);assert.equal(report.clips[0].partial,false);assert.equal(report.clips[0].played,true);assert.equal(Object.hasOwn(report,'studentId'),false);
 const originalTrackCount=await page.evaluate(()=>window.__tracks.length);
 await clip.locator('[data-audio-compress]').click();await page.locator('[data-audio-test-state=compressing]').waitFor();await page.locator('[data-audio-test-state=complete]').waitFor({timeout:30000});
 await clip.locator('audio').evaluate(async el=>{await el.play();});const compressedDuration=await clip.locator('audio').evaluate(async el=>{const context=new AudioContext();try{const data=await (await fetch(el.src)).arrayBuffer();return (await context.decodeAudioData(data)).duration;}finally{await context.close();}});
 assert.ok(Math.abs(compressedDuration-15)<0.3,'the complete compressed file decodes independently and preserves clip timing');assert.equal(await page.evaluate(()=>window.__tracks.length),originalTrackCount,'compression never reopens the microphone');
 const compressedReportPromise=page.waitForEvent('download');await page.locator('[data-audio-test=report]').click();file=await compressedReportPromise;report=JSON.parse(fs.readFileSync(await file.path(),'utf8'));assert.ok(report.clips[0].compressedBytes>0&&report.clips[0].compressedBytes<report.clips[0].waveBytes);assert.ok(report.clips[0].compressedMime.includes('audio/'));
 await clip.locator('[data-audio-remove]').click();assert.equal(await clip.locator('audio').count(),0);await clip.locator('[data-audio-remove]').click();assert.equal(await clip.locator('audio').count(),1);
 fs.mkdirSync('artifacts/katatib',{recursive:true});await page.setViewportSize({width:390,height:844});await page.screenshot({path:'artifacts/katatib/audio-phone-test.png',fullPage:true});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));
 page.once('dialog',d=>d.accept());await page.locator('[data-audio-test=clear]').click();assert.equal(await page.locator('audio').count(),0);
 // No marks retains no audio, and backgrounding stops the microphone.
 await page.locator('[data-audio-test=start]').click();await page.locator('[data-audio-test-state=recording]').waitFor();await page.waitForTimeout(700);
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{value:true,configurable:true});document.dispatchEvent(new Event('visibilitychange'));});await page.locator('[data-audio-empty]').waitFor();assert.equal(await page.locator('audio').count(),0);assert.equal(await page.evaluate(()=>window.__tracks.every(t=>t.readyState==='ended')),true);
 await page.evaluate(()=>window.__open('parent'));assert.equal(await page.locator('[data-audio-test=start]').count(),0);
 assert.ok(requests.every(r=>r.method==='GET'),'audio test must not upload any audio or mutate server data');assert.deepEqual(errors,[]);
 console.log('PASS: real browser encode/decode, 5s/10s independently playable clips, source sound preserved, compression duration/size, private measured report, delete/undo, permission cancellation cleanup, background stop, no-mistake discard, family exclusion and no upload. Physical-phone listening still requires the owner.');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{await browser?.close();});
