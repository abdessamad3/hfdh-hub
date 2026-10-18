// Real Firebase SDK persistence against a local Auth emulator; no real accounts or Google login.
const assert=require('node:assert/strict'),http=require('node:http'),path=require('node:path');
const {createRequire}=require('node:module');
const requireTools=createRequire(path.resolve(process.env.KATATIB_AUTH_TOOLS,'package.json'));
const {build}=requireTools('esbuild');
const {chromium}=requireTools('playwright');
let browser,server;
(async()=>{
 const helper=path.resolve('public/katatib/live/auth-session.mjs');
 const entry=`
 import {initializeApp} from 'firebase/app';
 import {initializeAuth,browserSessionPersistence,browserPopupRedirectResolver,connectAuthEmulator,onAuthStateChanged,createUserWithEmailAndPassword,signOut} from 'firebase/auth';
 import {createSessionAuth} from ${JSON.stringify(helper)};
 const app=initializeApp({apiKey:'demo-test-key',authDomain:'demo-katatib-auth.firebaseapp.com',projectId:'demo-katatib-auth'});
 const auth=createSessionAuth(app,{initializeAuth,browserSessionPersistence,browserPopupRedirectResolver});
 connectAuthEmulator(auth,'http://127.0.0.1:9099',{disableWarnings:true});
 onAuthStateChanged(auth,user=>{document.body.dataset.user=user?user.uid:'signed-out';});
 window.testLogin=()=>createUserWithEmailAndPassword(auth,'persistence-'+crypto.randomUUID()+'@example.com','test-only-example-password');
 window.testLogout=()=>signOut(auth);
 `;
 const result=await build({stdin:{contents:entry,resolveDir:process.env.KATATIB_AUTH_TOOLS,sourcefile:'session-test.mjs'},bundle:true,format:'esm',write:false,platform:'browser'});
 server=http.createServer((req,res)=>{
  res.setHeader('Cache-Control','no-store');
  if(req.url==='/bundle.mjs'){res.setHeader('Content-Type','text/javascript');res.end(result.outputFiles[0].text);}
  else {res.setHeader('Content-Type','text/html');res.end('<!doctype html><html><body><script type="module" src="/bundle.mjs"></script></body></html>');}
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 browser=await chromium.launch({headless:true});
 const context=await browser.newContext(),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 const url=`http://127.0.0.1:${server.address().port}/`;
 await page.goto(url);await page.waitForFunction(()=>document.body.dataset.user==='signed-out');
 await page.evaluate(()=>window.testLogin());
 await page.waitForFunction(()=>document.body.dataset.user&&document.body.dataset.user!=='signed-out');
 const uid=await page.getAttribute('body','data-user');
 assert.ok(await page.evaluate(()=>Object.keys(sessionStorage).some(k=>k.startsWith('firebase:authUser:'))));
 assert.equal(await page.evaluate(()=>Object.keys(localStorage).some(k=>k.startsWith('firebase:authUser:'))),false);
 // A deployment changes assets, not the website's origin or tab session storage.
 for(let i=0;i<2;i++){
  await page.reload();await page.waitForFunction(uid=>document.body.dataset.user===uid,uid);
  assert.equal(await page.getAttribute('body','data-user'),uid);
 }
 const anotherTab=await context.newPage();await anotherTab.goto(url);
 await anotherTab.waitForFunction(()=>document.body.dataset.user==='signed-out');
 await page.evaluate(()=>window.testLogout());
 await page.waitForFunction(()=>document.body.dataset.user==='signed-out');
 await page.reload();await page.waitForFunction(()=>document.body.dataset.user==='signed-out');
 assert.deepEqual(errors,[]);
 console.log('PASS: real Firebase Auth SDK restores the same user after repeated reloads, stores auth only in tab session storage, leaves an independent tab signed out, and stays signed out after explicit logout/reload.');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{await browser?.close();server?.close();});
