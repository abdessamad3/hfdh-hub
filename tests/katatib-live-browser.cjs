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
window.__pending=false;window.__deny=false;window.__history=[];window.__records={};window.__events=[];window.__saveFail=false;window.__conflict=false;
export async function connect(){
 return {
 observe(callback){observer=callback;callback(null);},
 async login(){observer({email:'teacher@example.com',emailVerified:true});},
 async logout(){observer(null);},
 async students(){if(window.__pending)await new Promise(r=>window.__release=r);if(window.__deny)throw new Error('no-access');return {students:[{id:'a',name:'<img src=x onerror=alert(1)>',kuttab:'One',age:12,hizbs:3,attendance:80},{id:'b',name:'Maryam',kuttab:'Two',age:null,hizbs:null,attendance:null}],role:'teacher',capped:false};},
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
 console.log('PASS: mocked-provider reader login, denied access, logout and stale-request clearing, no persistent student storage, escaped copied data, history, Arabic/French and responsive layout, cloud attendance save/reload, date/session isolation, unsaved errors and conflicts. Real Google OAuth requires owner setup and a live smoke test.');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{await browser?.close();server.close();});
