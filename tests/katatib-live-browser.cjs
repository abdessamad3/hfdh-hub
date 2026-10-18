const assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve('public/katatib');
const server=http.createServer((req,res)=>{
 let file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);
 if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 if(fs.existsSync(file)&&fs.statSync(file).isDirectory()) file=path.join(file,'index.html');
 if(!fs.existsSync(file)){res.writeHead(404).end();return;}
 res.setHeader('Content-Type',file.endsWith('.mjs')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(fs.readFileSync(file));
});
const mock=`
let observer;
window.__pending=false;window.__deny=false;window.__history=[];window.__learning={};window.__learningFail=false;window.__learningLostAck=false;window.__records={};window.__events=[];window.__saveFail=false;window.__conflict=false;
export async function connect(){
 return {
 observe(callback){observer=callback;callback(null);},
 async login(){observer({email:'teacher@example.com',emailVerified:true});},
 async logout(){observer(null);},
 async students(){if(window.__pending)await new Promise(r=>window.__release=r);if(window.__deny)throw new Error('no-access');return {students:[{id:'a',name:'<img src=x onerror=alert(1)>',kuttab:'One',age:12,hizbs:3,attendance:80},{id:'b',name:'Maryam',kuttab:'Two',age:null,hizbs:null,attendance:null}],role:'teacher',capped:false};},
 async learningHistory(id){return Object.values(window.__learning).filter(x=>x.studentId===id);},
 async saveLearning(input,id){
  if(window.__learningFail)throw new Error('unavailable');
  if(window.__learning[id]&&JSON.stringify(window.__learning[id].input)!==JSON.stringify(input))throw Object.assign(new Error('learning-conflict'),{code:'learning-conflict'});
  window.__learning[id]={schemaVersion:2,...input,input,id};
  if(window.__learningLostAck){window.__learningLostAck=false;throw new Error('unavailable');}
  return window.__learning[id];
 },
 async attendance(ids,context){return Object.fromEntries(ids.map(id=>[id,window.__records[id+'~'+context.date+'~'+context.session]||{status:'unmarked',note:'',revision:0}]));},
 async saveAttendance(id,context,desired,revision){
  if(window.__saveFail)throw new Error('unavailable');
  if(window.__conflict)throw Object.assign(new Error('conflict'),{code:'conflict'});
  const key=id+'~'+context.date+'~'+context.session;
  const result={...desired,revision:revision+1};window.__records[key]=result;window.__events.push({...result,date:context.date,session:context.session,id});return result;
 },
 async attendanceHistory(id){return window.__events.filter(e=>e.id===id);},
 async history(){return window.__history;}
 };
}`;
let browser;
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 browser=await chromium.launch({headless:true});
 const errors=[];
 const page=await browser.newPage({viewport:{width:390,height:844}});
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/live/gateway.mjs',r=>r.fulfill({contentType:'text/javascript',body:mock}));
 const url=`http://127.0.0.1:${server.address().port}/live/`;
 await page.goto(url);
 await page.locator('[data-action=login]').waitFor();
 assert.equal(await page.locator('.student-card').count(),0);
 await page.locator('[data-lang=fr]').click();
 await page.locator('[data-action=login]').click();
 await page.locator('.student-card').first().waitFor();
 assert.equal(await page.locator('.student-card').count(),2);
 assert.equal(await page.locator('.student-card img').count(),0);
 await page.locator('#live-search').fill('Maryam');assert.equal(await page.locator('.student-card').count(),1);
 await page.locator('#live-search').fill('');
 await page.locator('#live-school').selectOption('One');assert.equal(await page.locator('.student-card').count(),1);
 await page.evaluate(()=>window.__history=[{date:'2026-10-18',status:'present',session:0}]);
 await page.locator('[data-profile=a]').click();
 await page.locator('#live-history li').waitFor();assert.ok((await page.locator('#live-history').innerText()).includes('Présent'));
 await page.keyboard.press('Escape');assert.equal(await page.getByRole('dialog').count(),0);
 await page.locator('#live-school').selectOption('');
 await page.waitForFunction(()=>document.documentElement.scrollWidth<=window.innerWidth+1);
 fs.mkdirSync('artifacts/katatib',{recursive:true});
 await page.screenshot({path:'artifacts/katatib/mobile-test-reader-fr.png',fullPage:true});
 await page.setViewportSize({width:1440,height:1000});
 await page.locator('[data-lang=ar]').click();
 await page.screenshot({path:'artifacts/katatib/desktop-test-reader-ar.png',fullPage:true});
 // Actual browser behavior with a mocked server; real transactions/rules run separately in the emulator.
 await page.locator('[data-screen=attendance]').click();
 await page.locator('[data-cloud-student=a][data-cloud-status=absent]').waitFor();
 await page.locator('[data-cloud-student=a][data-cloud-status=absent]').click();
 await page.locator('[data-cloud-note=a]').fill('ملاحظة <img src=x onerror=alert(1)>');
 await page.locator('[data-cloud-save=a]').click();
 await page.waitForFunction(()=>document.querySelector('[data-cloud-message=a]').textContent.includes('محفوظ في'));
 const day=await page.locator('#cloud-date').inputValue();
 await page.locator('#cloud-session').selectOption('evening');
 await page.waitForFunction(()=>document.querySelector('[data-cloud-student=a][data-cloud-status=unmarked]')?.getAttribute('aria-pressed')==='true');
 await page.locator('[data-cloud-student=a][data-cloud-status=present]').click();await page.locator('[data-cloud-save=a]').click();
 await page.waitForFunction(()=>document.querySelector('[data-cloud-message=a]').textContent.includes('محفوظ في'));
 await page.locator('#cloud-session').selectOption('morning');
 await page.waitForFunction(()=>document.querySelector('[data-cloud-student=a][data-cloud-status=absent]')?.getAttribute('aria-pressed')==='true');
 assert.ok((await page.locator('[data-cloud-note=a]').inputValue()).includes('<img'));
 assert.equal(await page.locator('.cloud-card img').count(),0);
 await page.locator('#cloud-date').fill(day==='2026-10-20'?'2026-10-21':'2026-10-20');
 await page.waitForFunction(()=>document.querySelector('[data-cloud-student=a][data-cloud-status=unmarked]')?.getAttribute('aria-pressed')==='true');
 await page.locator('#cloud-date').fill(day);
 await page.waitForFunction(()=>document.querySelector('[data-cloud-student=a][data-cloud-status=absent]')?.getAttribute('aria-pressed')==='true');
 // Network errors retain the draft and never show it as saved.
 await page.evaluate(()=>window.__saveFail=true);
 await page.locator('[data-cloud-student=a][data-cloud-status=late]').click();await page.locator('[data-cloud-save=a]').click();
 await page.waitForFunction(()=>document.querySelector('[data-cloud-message=a]').textContent.includes('لم يتم'));
 assert.equal(await page.locator('[data-cloud-student=a][data-cloud-status=late]').getAttribute('aria-pressed'),'true');
 await page.evaluate(()=>{window.__saveFail=false;window.__conflict=true;});
 await page.locator('[data-cloud-save=a]').click();
 await page.waitForFunction(()=>document.querySelector('[data-cloud-message=a]').textContent.includes('عُدّل'));
 page.once('dialog',d=>d.accept());await page.locator('[data-cloud-reload=a]').click();
 await page.waitForFunction(()=>document.querySelector('[data-cloud-student=a][data-cloud-status=absent]')?.getAttribute('aria-pressed')==='true');
 await page.evaluate(()=>window.__conflict=false);
 await page.setViewportSize({width:390,height:844});
 await page.waitForFunction(()=>document.documentElement.scrollWidth<=window.innerWidth+1);
 await page.screenshot({path:'artifacts/katatib/mobile-cloud-attendance-ar.png',fullPage:true});
 await page.locator('[data-lang=fr]').click();
 await page.screenshot({path:'artifacts/katatib/mobile-cloud-attendance-fr.png',fullPage:true});
 // Re-sign-in rereads the mocked server and is independent of the old in-memory draft.
 await page.locator('[data-action=logout]').click();await page.locator('[data-action=login]').click();
 await page.locator('[data-screen=attendance]').click();
 await page.waitForFunction(()=>document.querySelector('[data-cloud-student=a][data-cloud-status=absent]')?.getAttribute('aria-pressed')==='true');
 await page.locator('[data-screen=students]').click();
 await page.locator('[data-screen=learning]').click();
 await page.locator('#learning-student').selectOption('a');
 await page.locator('#learning-form [name=hizb]').fill('4');
 await page.locator('#learning-form [name=fromEighth]').selectOption('2');
 await page.locator('#learning-form [name=toEighth]').selectOption('4');
 await page.locator('#learning-form [name=note]').fill('حفظ <img src=x onerror=alert(1)>');
 await page.locator('#learning-form [name=confirmMastered]').count().then(async n=>{if(n)await page.locator('#learning-form [name=confirmMastered]').check();});
 await page.locator('#learning-form button[type=submit]').click();
 await page.waitForFunction(()=>Object.keys(window.__learning).length===1);
 await page.locator('.learning-history li').waitFor();
 assert.ok((await page.locator('.learning-history').innerText()).includes('حفظ <img'));
 assert.equal(await page.locator('.learning-history img').count(),0);
 assert.equal(await page.evaluate(()=>Object.values(window.__learning)[0].quantity),3);
 assert.equal(await page.locator('[data-progress] [role=progressbar]').getAttribute('aria-valuenow'),'3');
 // Editing changes one visible lesson; previous content appears only in collapsed change history.
 await page.locator('[data-learning-correct]').first().click();
 await page.locator('#learning-form [name=note]').fill('تصحيح محفوظ');
 await page.locator('#learning-form [name=confirmMastered]').count().then(async n=>{if(n)await page.locator('#learning-form [name=confirmMastered]').check();});
 await page.locator('#learning-form button[type=submit]').click();
 await page.waitForFunction(()=>Object.keys(window.__learning).length===2);
 await page.waitForFunction(()=>document.querySelectorAll('.learning-history > li').length===1);
 assert.ok(await page.evaluate(()=>Object.values(window.__learning).some(x=>!!x.supersedesId)));
 assert.equal(await page.locator('.learning-history > li').count(),1);
 assert.equal(await page.locator('[data-progress] [role=progressbar]').getAttribute('aria-valuenow'),'3');
 assert.ok((await page.locator('.learning-history > li > p').allTextContents()).join(' ').includes('تصحيح محفوظ'));
 assert.equal(await page.locator('.learning-previous').isVisible(),false);
 await page.locator('.learning-versions summary').click();
 assert.ok((await page.locator('.learning-previous').innerText()).includes('حفظ <img'));
 await page.locator('.learning-versions summary').click();
 for(const kind of ['revision','evaluation']){
  await page.locator('#learning-form [name=kind]').selectOption(kind);
  await page.locator('#learning-form [name=hizb]').fill('5');
  await page.locator('#learning-form [name=mistakes]').fill('2');
  await page.locator('#learning-form [name=score]').fill('85');
  await page.locator('#learning-form button[type=submit]').click();
  await page.waitForFunction(kind=>Object.values(window.__learning).some(x=>x.kind===kind),kind);
  await page.waitForFunction(()=>!document.querySelector('#learning-form fieldset').disabled);
 }
 await page.waitForFunction(()=>document.querySelectorAll('.learning-history > li').length===3);
 assert.equal(await page.locator('.learning-history > li').count(),3);
 await page.locator('#learning-form [name=hizb]').fill('6');
 await page.locator('#learning-form [name=mistakes]').fill('0');
 await page.locator('#learning-form [name=score]').fill('90');
 await page.evaluate(()=>window.__learningLostAck=true);
 await page.locator('#learning-form button[type=submit]').click();
 await page.waitForFunction(()=>document.querySelector('#learning-form fieldset').disabled&&!document.querySelector('#learning-form button[type=submit]').disabled);
 assert.equal(await page.evaluate(()=>Object.keys(window.__learning).length),5);
 await page.locator('#learning-form button[type=submit]').click();
 await page.waitForFunction(()=>!document.querySelector('#learning-form fieldset').disabled);
 await page.waitForFunction(()=>document.querySelectorAll('.learning-history > li').length===4);
 assert.equal(await page.evaluate(()=>Object.keys(window.__learning).length),5,'lost acknowledgement retry does not duplicate');
 await page.setViewportSize({width:390,height:844});
 await page.waitForFunction(()=>document.documentElement.scrollWidth<=window.innerWidth+1);
 await page.screenshot({path:'artifacts/katatib/mobile-learning-fr.png',fullPage:true});
 await page.locator('[data-lang=ar]').click();
 await page.screenshot({path:'artifacts/katatib/mobile-learning-ar.png',fullPage:true});
 await page.locator('[data-screen=students]').click();
 await page.locator('[data-profile=a]').click();
 await page.locator('#profile-learning li').first().waitFor();
 assert.equal(await page.locator('#profile-learning > ul > li').count(),4);
 await page.keyboard.press('Escape');
 // Re-authentication loads saved learning from the mocked server rather than a draft.
 await page.locator('[data-action=logout]').click();await page.locator('[data-action=login]').click();
 await page.locator('[data-screen=learning]').click();await page.locator('#learning-student').selectOption('a');
 await page.waitForFunction(()=>document.querySelectorAll('.learning-history > li').length===4);
 // Practice does not increase progress; an explicit confirmed edit does.
 await page.locator('#learning-form [name=kind]').selectOption('practice');
 await page.locator('#learning-form [name=hizb]').fill('7');
 await page.locator('#learning-form [name=toEighth]').selectOption('2');
 await page.locator('#learning-form button[type=submit]').click();
 await page.waitForFunction(()=>Object.keys(window.__learning).length===6);
 await page.waitForFunction(()=>document.querySelectorAll('.learning-history > li').length===5);
 assert.equal(await page.locator('[data-progress] [role=progressbar]').getAttribute('aria-valuenow'),'3');
 const practiceId=await page.evaluate(()=>Object.values(window.__learning).find(x=>x.kind==='practice').id);
 await page.locator(`[data-learning-correct="${practiceId}"]`).click();
 await page.locator('#learning-form [name=kind]').selectOption('memorization');
 await page.locator('#learning-form [name=confirmMastered]').check();
 await page.locator('#learning-form button[type=submit]').click();
 await page.waitForFunction(()=>Object.keys(window.__learning).length===7);
 await page.waitForFunction(()=>document.querySelector('[data-progress] [role=progressbar]')?.getAttribute('aria-valuenow')==='5');
 assert.equal(await page.locator('.learning-history > li').count(),5);
 const confirmedId=await page.evaluate(()=>Object.values(window.__learning).find(x=>x.supersedesId===Object.values(window.__learning).find(p=>p.kind==='practice').id).id);
 await page.locator(`[data-learning-correct="${confirmedId}"]`).click();
 await page.locator('#learning-form [name=kind]').selectOption('practice');
 await page.locator('#learning-form button[type=submit]').click();
 await page.waitForFunction(()=>document.querySelector('[data-progress] [role=progressbar]')?.getAttribute('aria-valuenow')==='3');
 await page.screenshot({path:'artifacts/katatib/mobile-confirmed-progress.png',fullPage:true});
 await page.locator('[data-screen=students]').click();
 await page.locator('[data-profile=a]').click();
 await page.waitForFunction(()=>document.querySelector('#profile-progress [role=progressbar]')?.getAttribute('aria-valuenow')==='3');
 assert.ok((await page.locator('#profile-progress [data-baseline-hizbs]').innerText()).length>0);
 await page.keyboard.press('Escape');
 await page.locator('[data-screen=students]').click();
 assert.equal(await page.evaluate(()=>localStorage.length),0);
 assert.equal(await page.evaluate(()=>sessionStorage.length),0);
 await page.locator('[data-action=logout]').click();assert.equal(await page.locator('.student-card').count(),0);
 assert.equal(await page.locator('body').innerText().then(s=>s.includes('Maryam')),false);
 await page.evaluate(()=>window.__deny=true);await page.locator('[data-action=login]').click();
 await page.getByRole('alert').waitFor();assert.equal(await page.locator('.student-card').count(),0);
 await page.locator('[data-action=logout]').click();
 await page.evaluate(()=>{window.__deny=false;window.__pending=true;});
 await page.locator('[data-action=login]').click();
 await page.waitForFunction(()=>typeof window.__release==='function');
 await page.locator('[data-action=logout]').click();
 await page.evaluate(()=>window.__release());
 await page.waitForTimeout(100);
 assert.equal(await page.locator('.student-card').count(),0,'late response cannot restore signed-out data');
 assert.deepEqual(errors,[]);
 console.log('PASS: mocked-provider reader login, denied access, logout and stale-request clearing, no persistent student storage, escaped copied data, history, Arabic/French and responsive layout, cloud attendance save/reload, date/session isolation, unsaved errors and conflicts; learning types, one current row per edit with collapsed prior versions, lost-ack retries and profile consistency; explicit confirmation, practice exclusion and edited progress. Real Google OAuth requires owner setup and a live smoke test.');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{await browser?.close();server.close();});
