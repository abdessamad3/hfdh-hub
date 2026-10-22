// Real Firebase SDK persistence against a local Auth emulator; no real accounts or Google login.
const assert=require('node:assert/strict'),http=require('node:http'),path=require('node:path');
const {createRequire}=require('node:module');
const requireTools=createRequire(path.resolve(process.env.KATATIB_AUTH_TOOLS,'package.json'));
const {build}=requireTools('esbuild');
const {chromium}=requireTools('playwright');
let browser,server;
(async()=>{
 const studentHelper=path.resolve('public/katatib/live/student-login.mjs');
 const helper=path.resolve('public/katatib/live/auth-session.mjs');
 const entry=`
 import {initializeApp,deleteApp} from 'firebase/app';
 import {initializeAuth,browserSessionPersistence,browserLocalPersistence,setPersistence,browserPopupRedirectResolver,connectAuthEmulator,onAuthStateChanged,createUserWithEmailAndPassword,signInWithEmailAndPassword,inMemoryPersistence,signOut} from 'firebase/auth';
 import {createSessionAuth} from ${JSON.stringify(helper)};
 import {provisionStudentAuth,newStudentLogin} from ${JSON.stringify(studentHelper)};
 const app=initializeApp({apiKey:'demo-test-key',authDomain:'demo-katatib-auth.firebaseapp.com',projectId:'demo-katatib-auth'});
 const auth=createSessionAuth(app,{initializeAuth,browserSessionPersistence,browserLocalPersistence,setPersistence,browserPopupRedirectResolver});
 connectAuthEmulator(auth,'http://127.0.0.1:9099',{disableWarnings:true});
 onAuthStateChanged(auth,user=>{document.body.dataset.user=user?user.uid:'signed-out';});
 window.testLogin=()=>createUserWithEmailAndPassword(auth,'persistence-'+crypto.randomUUID()+'@example.com','test-only-example-password');
 window.testStudent=async()=>{
   const before=auth.currentUser.uid,login=newStudentLogin();
   const initializeSecondary=(app,options)=>{const secondary=initializeAuth(app,options);connectAuthEmulator(secondary,'http://127.0.0.1:9099',{disableWarnings:true});return secondary;};
   const sdk={initializeApp,deleteApp,initializeAuth:initializeSecondary,inMemoryPersistence,createUserWithEmailAndPassword,signInWithEmailAndPassword,signOut};
   const uid=await provisionStudentAuth(app.options,login,sdk);
   const retried=await provisionStudentAuth(app.options,login,sdk);
   return {staffUnchanged:auth.currentUser.uid===before,sameAccount:retried===uid,differentAccount:uid!==before};
 };
 window.testLogout=()=>signOut(auth);
 window.testTrust=async()=>{await setPersistence(auth,browserLocalPersistence);localStorage.setItem('katatib-offline-trusted','yes');};
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
 assert.deepEqual(await page.evaluate(()=>window.testStudent()),{staffUnchanged:true,sameAccount:true,differentAccount:true});
 const anotherTab=await context.newPage();await anotherTab.goto(url);
 await anotherTab.waitForFunction(()=>document.body.dataset.user==='signed-out');
 await page.evaluate(()=>window.testLogout());
 await page.waitForFunction(()=>document.body.dataset.user==='signed-out');
 await page.reload();await page.waitForFunction(()=>document.body.dataset.user==='signed-out');
 // Opt-in trusted-device persistence restores a real SDK identity in a newly opened offline tab.
 await page.evaluate(()=>window.testLogin());await page.waitForFunction(()=>document.body.dataset.user!=='signed-out');
 const trustedUid=await page.getAttribute('body','data-user');await page.evaluate(()=>window.testTrust());await page.close();await anotherTab.close();
 await context.route(url+'**',route=>route.fulfill({contentType:route.request().url().endsWith('/bundle.mjs')?'text/javascript':'text/html',body:route.request().url().endsWith('/bundle.mjs')?result.outputFiles[0].text:'<!doctype html><html><body><script type="module" src="/bundle.mjs"></script></body></html>'}));
 await context.setOffline(true);const offlineTab=await context.newPage();offlineTab.on('pageerror',e=>errors.push(e.message));await offlineTab.goto(url);await offlineTab.waitForFunction(uid=>document.body.dataset.user===uid,trustedUid);
 assert.equal(await offlineTab.getAttribute('body','data-user'),trustedUid);
 await offlineTab.evaluate(()=>window.testLogout());await offlineTab.waitForFunction(()=>document.body.dataset.user==='signed-out');await context.setOffline(false);
 assert.deepEqual(errors,[]);
 console.log('PASS: real Firebase Auth SDK restores the same user after repeated reloads, stores auth only in tab session storage, leaves an independent tab signed out, and stays signed out after explicit logout/reload.');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{await browser?.close();server?.close();});
