const {openScreen}=require('./katatib-navigation-helpers.cjs');
const assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve('public/katatib');
const redirects=JSON.parse(fs.readFileSync('firebase.katatib-connected.json','utf8')).hosting.redirects;
const server=http.createServer((req,res)=>{
 const route=redirects.find(r=>r.source===new URL(req.url,'http://localhost').pathname);
 if(route){res.writeHead(route.type,{Location:route.destination});res.end();return;}
 let file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);
 if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 if(fs.existsSync(file)&&fs.statSync(file).isDirectory()) file=path.join(file,'index.html');
 if(!fs.existsSync(file)){res.writeHead(404).end();return;}
 res.setHeader('Content-Type',file.endsWith('.mjs')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(fs.readFileSync(file));
});
const mock=`
import { historyProjection, mergeHistory } from './legacy.mjs';
import { applyLegacyCorrections, applyLegacyTaskStates } from './advanced-model.mjs';
let observer;
window.__teacherRecords={};window.__teacherEvents=[];window.__teacherFail=false;window.__teacherLostAck=false;window.__legacy={};window.__attendanceCalls=[];window.__role='teacher';window.__profiles={};window.__workspace={katatib_tasks:{},katatib_access:{},katatib_audit:{},katatib_schedules:{},katatib_legacy_corrections:{},katatib_legacy_task_states:{},katatib_questions:{},katatib_challenge_attempts:{}};window.__workspaceFail=false;window.__workspaceLostAck=false;window.__pending=false;window.__deny=false;window.__history=[];window.__learning={};window.__learningFail=false;window.__learningLostAck=false;window.__records={};window.__events=[];window.__saveFail=false;window.__conflict=false;
export async function connect(){
 return {
 observe(callback){observer=callback;callback(null);},
 async login(){observer({uid:'reader-uid',email:'teacher@example.com',displayName:'Teacher Test',emailVerified:true});},
 async studentLogin(code,pin){if(pin!=='12345678')throw new Error('auth/invalid-credential');window.__role='student';observer({uid:'student-uid',email:'student@students.katatib.invalid',emailVerified:false});},
 async studentCredential(id){return window.__credentialPointers?.[id]||null;},
 async provisionStudent(id,login,rev,event){window.__credentialCalls??=[];window.__credentialCalls.push({id,code:login.code,event});window.__credentialPointers??={};let current=window.__credentialPointers[id];if(current?.eventId!==event){if((current?.revision||0)!==rev)throw new Error('conflict');current={revision:rev+1,eventId:event};window.__credentialPointers[id]=current;}if(window.__credentialLostAck){window.__credentialLostAck=false;throw new Error('unavailable');}return current;},
 async logout(){observer(null);},
 async students(){if(window.__pending)await new Promise(r=>window.__release=r);if(window.__deny)throw new Error('no-access');const original=[{id:'a',name:'<img src=x onerror=alert(1)>',kuttab:'One',age:12,hizbs:3,attendance:80},{id:'b',name:'Maryam',kuttab:'Two',age:null,hizbs:null,attendance:null}];const students=(window.__roster||original).map(s=>({...s,teacherId:'legacy',status:'active',source:'copy',...window.__profiles[s.id]}));for(const [id,p] of Object.entries(window.__profiles))if(!students.some(s=>s.id===id))students.push({id,...p,hizbs:null,attendance:null});return {students,role:window.__role,capped:false};},
 async verseMarks(){return [];},
 async noticeAcks(id){return Object.values(window.__workspace.katatib_notice_acks||{}).filter(r=>r.studentId===id&&r.readerUid==='reader-uid');},
 async legacyVersions(){return [];},
 async kuttabs(){return [{id:'one',name:'One',teacherId:'legacy',schedule:{lessons:{'1':{lessons:['Original session']}}}}];},
 async scheduleRows(id){return Object.values(window.__workspace.katatib_schedules).filter(r=>r.kuttabId===id);},
 async questions(review=false){return review?[{id:'copied-question',prompt:'Copied general question',options:['Yes','No'],correctAnswer:'Yes'}]:Object.values(window.__workspace.katatib_questions).filter(q=>q.active&&q.reviewed);},
 async questionBank(){return Object.values(window.__workspace.katatib_questions);},
 async teachers(){if(!['admin','manager'].includes(window.__role))throw new Error('no-access');return [{id:'teacher-one',name:'Teacher One <script>',kuttab:'One'},{id:'teacher-two',name:'Teacher Two',kuttab:'Two'}].filter(t=>window.__role==='admin'||t.kuttab==='One');},
 async teacherAttendance(id,c){if(window.__teacherFail)throw new Error('unavailable');return structuredClone(window.__teacherRecords[id+'~'+c.date+'~'+c.session]||{status:'unmarked',note:'',revision:0});},
 async teacherHistory(id){return structuredClone([{id:'copied-old',teacherId:'teacher-one',source:'V1',date:'2020-01-01',sessionIndex:4,status:'excused',excuse:'Original preserved'},...window.__teacherEvents].filter(e=>e.teacherId===id));},
 async saveTeacherAttendance(id,c,p,rev,event){if(window.__teacherFail)throw new Error('unavailable');const key=id+'~'+c.date+'~'+c.session,prior=window.__teacherRecords[key];if(prior?.eventId===event)return structuredClone(prior);if((prior?.revision||0)!==rev)throw Object.assign(new Error('conflict'),{code:'conflict'});const result={...p,...c,teacherId:id,revision:rev+1,eventId:event,source:'V2',id:event};window.__teacherRecords[key]=structuredClone(result);window.__teacherEvents.push(structuredClone(result));if(window.__teacherLostAck){window.__teacherLostAck=false;throw new Error('unavailable');}return result;},
 async studentHistory(id){if(window.__historyFail)throw new Error('history-unavailable');const rows=[...(window.__legacy[id]||[]).map(r=>historyProjection(r.collection,r.id,r.data)),...Object.entries(window.__records).filter(([key])=>key.startsWith(id+'~')).map(([key,x])=>{const [studentId,date,session]=key.split('~');return historyProjection('katatib_attendance',key,{...x,studentId,date,session});})];return mergeHistory([applyLegacyTaskStates(applyLegacyCorrections(rows,Object.values(window.__workspace.katatib_legacy_corrections).filter(c=>c.studentId===id)),Object.values(window.__workspace.katatib_legacy_task_states).filter(c=>c.studentId===id))],id);},
 async workspaceList(name,id){if(window.__workspaceFail)throw new Error('unavailable');if(name==='katatib_attendance')return Object.entries(window.__records).filter(([key])=>key.startsWith(id+'~')).map(([key,x])=>{const [studentId,date,session]=key.split('~');return {...x,id:key,studentId,date,session};});return Object.values(window.__workspace[name]||{}).filter(r=>!id||r.studentId===id);},
 async workspaceSave(name,id,input,revision,event){
  if(window.__workspaceFail)throw new Error('unavailable');const target=name==='katatib_students'?window.__profiles:(window.__workspace[name]||={});
  if(target[id]?.eventId===event)return target[id];if((target[id]?.revision||0)!==revision)throw Object.assign(new Error('conflict'),{code:'conflict'});
  const data={...input,id,revision:revision+1,eventId:event};target[id]=data;
  if(name==='katatib_students')target[id]={...data,kuttab:input.kuttabName,profileRevision:data.revision};
  if(window.__workspaceLostAck){window.__workspaceLostAck=false;throw new Error('unavailable');}return data;
 },
 async importStudents(rows){for(const r of rows)window.__profiles[r.id]={...r,kuttab:r.kuttabName,profileRevision:1};},
 async learningHistory(id){if(window.__delayLearning){window.__delayLearning=false;await new Promise(r=>window.__releaseLearning=r);}return Object.values(window.__learning).filter(x=>x.studentId===id);},
 async saveLearning(input,id){
  if(window.__learningFail)throw new Error('unavailable');
  if(window.__learning[id]&&JSON.stringify(window.__learning[id].input)!==JSON.stringify(input))throw Object.assign(new Error('learning-conflict'),{code:'learning-conflict'});
  window.__learning[id]={schemaVersion:input.passage?3:2,...input,input,id};
  if(window.__learningLostAck){window.__learningLostAck=false;throw new Error('unavailable');}
  return window.__learning[id];
 },
 async attendance(ids,context){window.__attendanceCalls.push(ids);return Object.fromEntries(ids.map(id=>[id,window.__records[id+'~'+context.date+'~'+context.session]||{status:'unmarked',note:'',revision:0}]));},
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
let browser,failurePage,observedErrors;
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 browser=await chromium.launch({headless:true,...(process.env.KATATIB_CHROMIUM_EXECUTABLE?{executablePath:process.env.KATATIB_CHROMIUM_EXECUTABLE}:{}),args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream']});
 const errors=[];observedErrors=errors;
 fs.mkdirSync('artifacts/katatib',{recursive:true});
 const page=await browser.newPage({viewport:{width:390,height:844}});failurePage=page;
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/live/gateway.mjs',r=>r.fulfill({contentType:'text/javascript',body:mock}));
 await page.route('https://raw.githubusercontent.com/quran-ws/quran-svg/**',route=>{const match=route.request().url().match(/\/svg\/(\d{3})\.svg$/);const file=match?path.resolve('tests/fixtures/warsh-'+match[1]+'.svg'):'';return file&&fs.existsSync(file)?route.fulfill({contentType:'image/svg+xml',body:fs.readFileSync(file)}):route.fulfill({status:503,body:''});});
 const url=`http://127.0.0.1:${server.address().port}/live/`;
 await page.goto(new URL('/',url).href);
 assert.equal(new URL(page.url()).pathname,'/');
 await page.locator('[data-action=login]').waitFor();
 assert.equal(await page.locator('a[href*=demo]').count(),0);
 assert.equal(await page.locator('a[href*=live]').count(),0);
 assert.equal(await page.locator('.student-card').count(),0);
 await page.locator('.appearance-controls summary').click();
 for(const accent of ['green','blue','violet','terracotta']){await page.locator(`[data-accent-choice=${accent}]`).click();assert.equal(await page.locator('html').getAttribute('data-accent'),accent);}
 await page.locator('[data-mode-choice=dark]').click();assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');
 await page.screenshot({path:'artifacts/katatib/login-dark-terracotta.png',fullPage:true});
 await page.reload();await page.locator('[data-action=login]').waitFor();assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');assert.equal(await page.locator('html').getAttribute('data-accent'),'terracotta');
 await page.locator('.appearance-controls summary').click();await page.locator('[data-accent-choice=green]').click();await page.locator('[data-mode-choice=light]').click();await page.locator('.appearance-controls summary').click();
 await page.screenshot({path:'artifacts/katatib/unified-login-phone-ar.png',fullPage:true});
 await page.locator('[data-lang=en]').click();assert.equal(await page.locator('html').getAttribute('lang'),'en');assert.equal(await page.locator('html').getAttribute('dir'),'ltr');assert.ok((await page.locator('body').innerText()).includes('Welcome to Katatib'));
 await page.locator('[data-lang=fr]').click();
 await page.locator('[data-action=login]').click();
 await page.locator('.student-card').first().waitFor();
 assert.equal(await page.locator('[data-dashboard-students]').innerText(),'2');assert.equal(await page.locator('[data-main-page]').count(),5,'staff see five main destinations');
 await page.locator('.priorities-counts').waitFor();assert.equal(await page.locator('[data-priorities-load]').count(),0,'tasks load automatically without a Show tasks button');assert.equal(await page.locator('.priorities-counts strong').first().innerText(),'0');
 assert.ok((await page.locator('h1').innerText()).includes('Teacher Test'));
 assert.equal(await page.locator('a[href*=demo]').count(),0);
 await page.screenshot({path:'artifacts/katatib/unified-today-phone-fr.png',fullPage:true});
 await openScreen(page,'students');
 assert.equal(await page.locator('.student-card').count(),2);
 assert.equal(await page.locator('.student-card img').count(),0);
 await page.locator('#live-search').fill('Maryam');assert.equal(await page.locator('.student-card').count(),1);
 await page.locator('#live-search').fill('');
 await page.locator('#live-school').selectOption('One');assert.equal(await page.locator('.student-card').count(),1);
 await page.evaluate(()=>window.__legacy.a=[{collection:'attendance',id:'old-present',data:{studentId:'a',date:'2026-10-18',status:'present',sessionIndex:0}}]);
 await page.locator('[data-profile=a]').click();
 assert.equal(await page.locator('[data-profile-tab=overview]').getAttribute('aria-selected'),'true');
 assert.equal(await page.locator('#profile-panel-attendance').isVisible(),false);
 assert.ok(await page.locator('#student-dialog').evaluate(el=>el.scrollWidth<=el.clientWidth+1),'profile has no horizontal overflow');
 await page.locator('[data-profile-tab=attendance]').click();
 await page.locator('[data-calendar-day="2026-10-18"]').waitFor();
 await page.locator('[data-calendar-day="2026-10-18"]').click();
 assert.ok((await page.locator('.calendar-day-detail').innerText()).includes('Présent'));
 await page.locator('[data-calendar-day="2026-10-17"]').click();
 assert.ok((await page.locator('.calendar-day-detail').innerText()).includes('Aucune présence'));
 await page.locator('[data-calendar-shift="-1"]').click();assert.equal(await page.locator('[data-calendar-month]').inputValue(),'2026-09');
 await page.locator('[data-calendar-shift="1"]').click();assert.equal(await page.locator('[data-calendar-month]').inputValue(),'2026-10');
 await page.locator('.profile-attendance-lists > summary').click();
 await page.locator('#live-history li').waitFor();assert.ok((await page.locator('#live-history').innerText()).includes('Présent'));
 for(const [width,height] of [[390,844],[820,1180],[1360,900]]){
   await page.setViewportSize({width,height});
   assert.ok(await page.locator('#student-dialog').evaluate(el=>el.scrollWidth<=el.clientWidth+1));
   const close=await page.locator('#student-dialog [data-close]').boundingBox();
   assert.ok(close.y>=0&&close.y+close.height<=height,'close stays inside viewport');
 }
 await page.setViewportSize({width:390,height:844});
 await page.locator('[data-profile-from]').fill('2026-10-19');
 assert.equal(await page.locator('#live-history li').count(),0);
 await page.locator('[data-profile-from]').fill('');
 assert.equal(await page.locator('#live-history li').count(),1);
 await page.locator('[data-profile-tab=attendance]').focus();await page.keyboard.press('Home');
 assert.equal(await page.locator('[data-profile-tab=overview]').getAttribute('aria-selected'),'true');
 
 await page.keyboard.press('Escape');assert.equal(await page.getByRole('dialog').count(),0);
 await page.locator('#live-school').selectOption('');
 await page.waitForFunction(()=>document.documentElement.scrollWidth<=window.innerWidth+1);
 fs.mkdirSync('artifacts/katatib',{recursive:true});
 await page.screenshot({path:'artifacts/katatib/mobile-test-reader-fr.png',fullPage:true});
 await page.setViewportSize({width:1440,height:1000});
 await page.locator('[data-lang=ar]').click();
 await page.screenshot({path:'artifacts/katatib/desktop-test-reader-ar.png',fullPage:true});
 await openScreen(page,'today');
 await page.screenshot({path:'artifacts/katatib/unified-today-desktop-ar.png',fullPage:true});
 await openScreen(page,'students');
 // Actual browser behavior with a mocked server; real transactions/rules run separately in the emulator.
 await openScreen(page,'attendance');
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
 await openScreen(page,'attendance');
 await page.waitForFunction(()=>document.querySelector('[data-cloud-student=a][data-cloud-status=absent]')?.getAttribute('aria-pressed')==='true');
 await openScreen(page,'students');
 await openScreen(page,'learning');
 await page.evaluate(()=>window.__delayLearning=true);
 await page.locator('#learning-student').selectOption('a');
 await page.waitForFunction(()=>typeof window.__releaseLearning==='function');
 await page.locator('#learning-form [name=hizb]').selectOption('4');
 await page.locator('#learning-form [name=fromEighth]').selectOption('2');
 await page.locator('#learning-form [name=amount]').selectOption('custom');await page.locator('#learning-form [name=toEighth]').selectOption('4');
 await page.locator('#learning-form [name=note]').fill('حفظ <img src=x onerror=alert(1)>');
 await page.locator('#learning-form [name=confirmMastered]').count().then(async n=>{if(n)await page.locator('#learning-form [name=confirmMastered]').check();});
 await page.evaluate(()=>window.__releaseLearning());await page.locator('#learning-history-panel [data-confirmed-hizbs]').waitFor();
 assert.equal(await page.locator('#learning-form [name=hizb]').inputValue(),'4','a delayed history response must preserve an active learning form');
 assert.equal(await page.locator('#learning-form [name=confirmMastered]').isChecked(),true);
 await page.locator('#learning-form button[type=submit]').click();
 await page.waitForFunction(()=>Object.keys(window.__learning).length===1);
 await page.locator('.learning-history li').waitFor();
 assert.ok((await page.locator('.learning-history').innerText()).includes('حفظ <img'));
 assert.equal(await page.locator('.learning-history img').count(),0);
 assert.equal(await page.evaluate(()=>Object.values(window.__learning)[0].quantity),3);
 assert.equal(await page.locator('[data-confirmed-hizbs]').innerText(),await page.evaluate(()=>new Intl.NumberFormat(document.documentElement.lang==='ar'?'ar-MA':'fr-FR',{maximumFractionDigits:3}).format(3/8)));
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
  await page.locator('#learning-form [name=hizb]').selectOption('5');
  await page.locator('#learning-form [name=mistakes]').fill('2');
  await page.locator('#learning-form [name=score]').fill('85');
  await page.locator('#learning-form button[type=submit]').click();
  await page.waitForFunction(kind=>Object.values(window.__learning).some(x=>x.kind===kind),kind);
  await page.waitForFunction(()=>!document.querySelector('#learning-form fieldset').disabled);
 }
 await page.waitForFunction(()=>document.querySelectorAll('.learning-history > li').length===3);
 assert.equal(await page.locator('.learning-history > li').count(),3);
 await page.locator('#learning-form [name=hizb]').selectOption('6');
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
 await openScreen(page,'students');
 await page.locator('[data-profile=a]').click();
 await page.locator('[data-profile-tab=learning]').click();
 await page.locator('#profile-learning li').first().waitFor();
 assert.equal(await page.locator('#profile-learning > ul > li').count(),4);
 await page.keyboard.press('Escape');
 // Re-authentication loads saved learning from the mocked server rather than a draft.
 await page.locator('[data-action=logout]').click();await page.locator('[data-action=login]').click();
 await openScreen(page,'learning');await page.locator('#learning-student').selectOption('a');
 await page.waitForFunction(()=>document.querySelectorAll('.learning-history > li').length===4);
 // Practice does not increase progress; an explicit confirmed edit does.
 await page.locator('#learning-form [name=kind]').selectOption('practice');
 await page.locator('#learning-form [name=hizb]').selectOption('7');
 await page.locator('#learning-form [name=amount]').selectOption('custom');await page.locator('#learning-form [name=toEighth]').selectOption('2');
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
 await openScreen(page,'students');
 await page.locator('[data-profile=a]').click();
 await page.waitForFunction(()=>document.querySelector('#profile-progress [role=progressbar]')?.getAttribute('aria-valuenow')==='3');
 assert.ok((await page.locator('#profile-progress [data-baseline-hizbs]').innerText()).length>0);
 await page.keyboard.press('Escape');
 await openScreen(page,'students');
 assert.deepEqual(await page.evaluate(()=>Object.keys(localStorage)),['katatib-appearance'],'only visual preferences are kept in localStorage without offline opt-in');
 assert.equal(await page.evaluate(()=>sessionStorage.length),0);
 await page.locator('[data-action=logout]').click();assert.equal(await page.locator('.student-card').count(),0);
 assert.equal(await page.locator('body').innerText().then(s=>s.includes('Maryam')),false);
 // The same connected app exposes audited management and read-only family screens.
 await page.evaluate(()=>window.__role='admin');
 await page.locator('[data-action=login]').click();
 await openScreen(page,'manage');
 await page.locator('[data-work-action=new-profile]').click();
 await page.locator('[data-work-form] [name=name]').fill('New student');
 await page.locator('[data-work-form] [name=kuttabName]').fill('One');
 await page.locator('[data-work-form] [name=teacherId]').fill('legacy');
 await page.locator('[data-work-form] [name=group]').fill('Group 1');
 await page.locator('[data-work-form] [name=age]').fill('10');
 await page.evaluate(()=>window.__workspaceLostAck=true);
 await page.locator('[data-work-form] button[type=submit]').click();
 await page.getByRole('alert').waitFor();
 assert.equal(await page.locator('[data-work-form] [name=name]').isDisabled(),true);
 await page.locator('[data-work-form] button[type=submit]').click();
 await page.waitForFunction(()=>!document.querySelector('[data-work-form]'));
 const added=await page.evaluate(()=>Object.keys(window.__profiles).find(id=>window.__profiles[id].name==='New student'));
 assert.ok(added);
 assert.equal(await page.evaluate(()=>Object.keys(window.__profiles).length),1,'lost acknowledgment retries the same enrollment');
 await openScreen(page,'students');
 assert.ok((await page.locator('#live-students').innerText()).includes('New student'));
 await openScreen(page,'manage');
 await page.locator(`[data-work-edit="${added}"]`).click();
 await page.locator('[data-work-form] [name=group]').fill('Unsaved group');
 let confirmations=0;const rejectDiscard=async d=>{confirmations++;if(confirmations===1)await d.accept();else await d.dismiss();};
 page.on('dialog',rejectDiscard);
 await page.locator(`[data-work-archive="${added}"]`).click();
 page.off('dialog',rejectDiscard);
 assert.equal(await page.evaluate(id=>window.__profiles[id].status,added),'active');
 assert.equal(await page.evaluate(id=>window.__profiles[id].group,added),'Group 1','declining discard must not save an existing draft');
 page.once('dialog',d=>d.accept());await page.locator('[data-work-action=cancel]').click();
 page.once('dialog',d=>d.accept());
 await page.locator(`[data-work-archive="${added}"]`).click();
 await page.waitForFunction(id=>window.__profiles[id].status==='archived',added);
 await page.waitForFunction(()=>!document.querySelector('[data-work-form]'));
 await openScreen(page,'students');
 assert.equal((await page.locator('#live-students').innerText()).includes('New student'),false);
 await openScreen(page,'manage');
 await page.locator(`[data-work-archive="${added}"]`).click();
 await page.waitForFunction(id=>window.__profiles[id].status==='active',added);
 await page.waitForFunction(()=>!document.querySelector('[data-work-form]'));
 await openScreen(page,'tasks');
 await page.locator('[data-work-action=new-task]').click();
 await page.locator('[data-work-form] [name=studentId]').selectOption('a');
 await page.locator('[data-work-form] [name=kind]').selectOption('revision');
 await page.locator('[data-work-form] [name=note]').fill('Revise the assigned portion');
 await page.locator('[data-work-form] button[type=submit]').click();
 await page.waitForFunction(()=>!document.querySelector('[data-work-form]'));
 await page.waitForFunction(()=>document.querySelector('#work-root')?.innerText.includes('Revise the assigned portion'));
 const taskId=await page.evaluate(()=>Object.keys(window.__workspace.katatib_tasks)[0]);
 await page.locator(`[data-work-edit="${taskId}"]`).click();
 await page.locator('[data-work-form] [name=status]').selectOption('done');
 await page.locator('[data-work-form] button[type=submit]').click();
 await page.waitForFunction(()=>!document.querySelector('[data-work-form]'));
 assert.equal(await page.evaluate(id=>window.__workspace.katatib_tasks[id].status,taskId),'done');
 // The same task list exposes original plans; finishing one adds only an audited V2 state.
 await page.evaluate(()=>{window.__legacy.a=[{collection:'next_revisions',id:'unified-plan',data:{studentId:'a',dueDate:'2020-01-03',quantityIdentifier:'Original portion',notes:'Original planned note'}}];});
 await page.locator('[data-work-action=reload]').click();await page.locator('[data-work-legacy="next_revisions/unified-plan"]').waitFor();
 await page.locator('[data-work-legacy="next_revisions/unified-plan"]').click();
 assert.equal(await page.locator('[data-work-form] [name=hizb]').count(),0,'an original portion must not be replaced with a guessed hizb');
 await page.locator('[data-work-form] [name=status]').selectOption('done');await page.locator('[data-work-form] [name=note]').fill('Plan completed');await page.locator('[data-work-form] button[type=submit]').click();await page.waitForFunction(()=>!document.querySelector('[data-work-form]'));
 assert.equal(await page.evaluate(()=>window.__workspace.katatib_legacy_task_states['next_revisions~unified-plan'].status),'done');
 assert.equal(await page.evaluate(()=>window.__legacy.a[0].data.notes),'Original planned note');
 await page.evaluate(()=>{window.__legacy.a=[];window.__workspace.katatib_legacy_task_states={};});

 await openScreen(page,'reports');
 await page.locator('#katatib-print').waitFor();
 assert.ok((await page.locator('#katatib-print').innerText()).includes('Maryam'));
 await page.locator('#report-student').selectOption('a');
 assert.equal((await page.locator('#katatib-print').innerText()).includes('Maryam'),false);
 assert.equal(await page.locator('.report-student-card').count(),1);
 const filePromise=page.waitForEvent('download');await page.locator('[data-work-action=excel]').click();
 const downloaded=await filePromise;assert.ok(downloaded.suggestedFilename().endsWith('.xml'));
 await page.emulateMedia({media:'print'});assert.equal(await page.locator('.unified-sidebar').isVisible(),false);await page.emulateMedia({media:'screen'});
 // Teacher attendance uses explicit status, one current row and immutable correction history.
 await openScreen(page,'teacherAttendance');await page.locator('[data-teacher-form]').waitFor();
 assert.equal(await page.locator('#teacher-status').inputValue(),'unmarked');
 assert.ok((await page.locator('#work-root').innerText()).includes('Original preserved'));
 assert.equal(await page.locator('#work-root script').count(),0);
 await page.locator('#teacher-date').fill('2026-10-18');await page.locator('[data-teacher-form]').waitFor();
 await page.locator('#teacher-status').selectOption('present');await page.locator('#teacher-note').fill('أول سجل');
 await page.locator('[data-teacher-form] button[type=submit]').click();
 await page.waitForFunction(()=>window.__teacherEvents.length===1);
 await page.locator('[data-teacher-reload]').click();await page.locator('[data-teacher-form]').waitFor();
 assert.equal(await page.locator('#teacher-status').inputValue(),'present');
 await page.locator('#teacher-status').selectOption('excused');await page.locator('#teacher-note').fill('تصحيح');
 await page.evaluate(()=>window.__teacherLostAck=true);
 await page.locator('[data-teacher-form] button[type=submit]').click();await page.getByRole('alert').waitFor();
 assert.equal(await page.locator('#teacher-note').inputValue(),'تصحيح');
 await page.locator('[data-teacher-form] button[type=submit]').click();
 await page.waitForFunction(()=>!document.querySelector('.teacher-attendance-module [role=alert]'));
 assert.equal(await page.evaluate(()=>window.__teacherEvents.length),2,'lost-ack retry adds no duplicate change');
 assert.equal(await page.evaluate(()=>window.__teacherEvents[0].status),'present');
 assert.equal(await page.evaluate(()=>window.__teacherRecords['teacher-one~2026-10-18~morning'].status),'excused');
 await page.locator('#teacher-session').selectOption('afternoon');await page.locator('[data-teacher-form]').waitFor();
 assert.equal(await page.locator('#teacher-status').inputValue(),'unmarked');
 await page.locator('#teacher-session').selectOption('morning');await page.locator('[data-teacher-form]').waitFor();
 assert.equal(await page.locator('#teacher-status').inputValue(),'excused');
 await page.locator('#teacher-status').selectOption('late');
 await page.evaluate(()=>{window.__teacherRecords['teacher-one~2026-10-18~morning'].revision=3;});
 await page.locator('[data-teacher-form] button[type=submit]').click();await page.getByRole('alert').waitFor();
 assert.equal(await page.locator('#teacher-status').inputValue(),'late','stale conflict preserves the draft');
 page.once('dialog',d=>d.accept());await page.locator('[data-teacher-reload]').click();await page.locator('[data-teacher-form]').waitFor();
 assert.equal(await page.locator('#teacher-status').inputValue(),'excused');
 await page.screenshot({path:'artifacts/katatib/teacher-attendance-phone-ar.png',fullPage:true});
 await page.locator('#teacher-person').selectOption('teacher-two');await page.locator('[data-teacher-form]').waitFor();
 assert.equal(await page.locator('#teacher-status').inputValue(),'unmarked');
 assert.equal((await page.locator('#work-root').innerText()).includes('Original preserved'),false);
 // Weekly schedules, a dated closure, preserved source corrections and reviewed practice questions.
 await openScreen(page,'schedules');await page.locator('[data-effective-schedule]').waitFor();
 await page.locator('#schedule-preview').fill('2026-10-19');
 assert.ok((await page.locator('[data-effective-schedule]').innerText()).includes('Original session'));
 await page.locator('[data-advanced-action=new]').click();await page.locator('[data-advanced-form] [name=key]').fill('1');
 await page.locator('[data-advanced-form] [name=morning]').fill('08:00');await page.locator('[data-advanced-form] button[type=submit]').click();
 await page.waitForFunction(()=>!!window.__workspace.katatib_schedules['one~1']);await page.waitForFunction(()=>!document.querySelector('[data-advanced-form]'));
 assert.ok((await page.locator('[data-effective-schedule]').innerText()).includes('08:00'));
 await page.locator('[data-advanced-action=new]').click();await page.locator('[data-advanced-form] [name=key]').fill('2026-10-19');
 await page.locator('[data-advanced-form] [name=note]').fill('Dated closure');await page.locator('[data-advanced-form] button[type=submit]').click();
 await page.waitForFunction(()=>!!window.__workspace.katatib_schedules['one~2026-10-19']);await page.waitForFunction(()=>!document.querySelector('[data-advanced-form]'));
 assert.equal((await page.locator('[data-effective-schedule]').innerText()).includes('08:00'),false);
 await page.evaluate(()=>window.__legacy.a=[{collection:'evaluations',id:'v1-edit',data:{studentId:'a',date:'2026-10-18',hizbNumber:2,quantity:1,accuracyScore:70,notes:'Original evaluation'}}]);
 await openScreen(page,'corrections');await page.locator('[data-advanced-edit]').first().waitFor();
 await page.locator('[data-advanced-edit]').first().click();await page.locator('[data-advanced-form] [name=score]').fill('90');await page.locator('[data-advanced-form] [name=note]').fill('Corrected evaluation');await page.locator('[data-advanced-form] [name=reason]').fill('Teacher correction');
 await page.locator('[data-advanced-form] button[type=submit]').click();await page.waitForFunction(()=>!!window.__workspace.katatib_legacy_corrections['evaluations~v1-edit']);await page.waitForFunction(()=>!document.querySelector('[data-advanced-form]'));
 assert.equal(await page.locator('.advanced-module tbody tr').count(),1);assert.ok((await page.locator('.advanced-module').innerText()).includes('Corrected evaluation'));assert.equal(await page.evaluate(()=>window.__legacy.a[0].data.notes),'Original evaluation');
 await openScreen(page,'questions');await page.locator('#question-bank').waitFor();await page.locator('#question-bank').selectOption('copied');await page.locator('[data-advanced-edit]').first().click();
 await page.locator('[data-advanced-form] [name=reference]').fill('Teacher-reviewed general reference');await page.locator('[data-advanced-form] [name=reviewed]').check();await page.locator('[data-advanced-form] [name=active]').check();await page.locator('[data-advanced-form] button[type=submit]').click();
 await page.waitForFunction(()=>Object.keys(window.__workspace.katatib_questions).length===1);await page.waitForFunction(()=>!document.querySelector('[data-advanced-form]'));
 await openScreen(page,'challenge');await page.locator('[data-advanced-choice="0"]').waitFor();await page.locator('[data-advanced-choice="0"]').click();await page.locator('[data-quiz-feedback]').waitFor();
 assert.equal(await page.evaluate(()=>Object.values(window.__workspace.katatib_challenge_attempts)[0].correct),true);
 await openScreen(page,'ranking');await page.locator('.advanced-module table').waitFor();assert.ok((await page.locator('.advanced-module').innerText()).includes('Maryam'));
 await page.screenshot({path:'artifacts/katatib/ranking-phone-ar.png',fullPage:true});
 await page.evaluate(()=>{window.__workspace.katatib_legacy_corrections={};window.__legacy.a=[];});
 await openScreen(page,'access');
 await page.locator('[data-work-action=new-access]').click();
 await page.locator('[data-work-form] [name=email]').fill('parent@example.com');
 await page.locator('[data-work-form] [name=role]').selectOption('parent');
 await page.locator('[data-work-form] [name=studentIds]').fill('a');
 await page.locator('[data-work-form] button[type=submit]').click();
 await page.waitForFunction(()=>!document.querySelector('[data-work-form]'));
 assert.equal(await page.evaluate(()=>window.__workspace.katatib_access['parent@example.com'].role),'parent');
 await openScreen(page,'readiness');await page.locator('[data-migration-verdict]').waitFor();
 await page.locator('#comparison-report').setInputFiles({name:'invalid.json',mimeType:'application/json',buffer:Buffer.from('{"production_migration_ready":true}')});await page.getByRole('alert').waitFor();assert.equal(await page.locator('[data-comparison-report]').count(),0);
 await page.locator('#comparison-report').setInputFiles({name:'readiness.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({source_documents:1,matched_documents:1,missing_documents:0,different_documents:0,unexplained_target_documents:0,typed_clone_matches:true,missing_parent_paths_match:true,source_snapshot:'2026-10-18T00:00:00Z',source_relationship_issues:{},production_migration_ready:false}))});await page.locator('[data-comparison-report]').waitFor();assert.ok((await page.locator('[data-migration-verdict]').innerText()).includes('ليس بعد'));

 await openScreen(page,'manage');
 await page.locator('#student-csv').setInputFiles({name:'students.csv',mimeType:'text/csv',buffer:Buffer.from('id,name,kuttabName,teacherId,group,age\nimport-one,Imported,One,legacy,A,11\n')});
 await page.locator('[data-work-action=import]').waitFor();
 await page.locator('[data-work-action=import]').click();
 await page.waitForFunction(()=>!!window.__profiles['import-one']);
 await page.locator('[data-work-action=new-profile]').waitFor();
 await page.screenshot({path:'artifacts/katatib/management-phone-ar.png',fullPage:true});
 await page.waitForFunction(()=>document.documentElement.scrollWidth<=window.innerWidth+1);
 await openScreen(page,'recording');
 await page.evaluate(()=>{const get=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);navigator.mediaDevices.getUserMedia=async input=>{const stream=await get(input);window.__recordingTracks=stream.getTracks();return stream;};});
 await page.locator('[data-audio-trust]').check();await page.locator('[data-recorder=start]').click();
 await page.locator('[data-recording-state=listening]').waitFor();
 assert.equal(await page.locator('#recording-student').isDisabled(),true);
 await page.waitForTimeout(1100);
 await page.locator('[data-recorder=stop]').click();
 await page.locator('[data-recorder=download]').waitFor();
 assert.equal(await page.evaluate(()=>window.__recordingTracks.every(t=>t.readyState==='ended')),true,'stopping a recording releases the microphone');
 assert.ok((await page.locator('.local-recorder audio').getAttribute('src')).startsWith('blob:'));
 page.once('dialog',d=>d.dismiss());await openScreen(page,'students');
 assert.equal(await page.locator('.local-recorder').count(),1,'leaving an undownloaded recording requires an explicit discard');
 const audioDownload=page.waitForEvent('download');await page.locator('[data-recorder=download]').click();
 assert.ok((await audioDownload).suggestedFilename().startsWith('katatib-'));
 await page.screenshot({path:'artifacts/katatib/local-recorder-ar.png',fullPage:true});
 await openScreen(page,'students');
 assert.equal(await page.locator('.local-recorder').count(),0);
 await openScreen(page,'recording');
 await page.evaluate(()=>{window.__workingMicrophone=navigator.mediaDevices.getUserMedia;navigator.mediaDevices.getUserMedia=async()=>{throw new DOMException('Denied','NotAllowedError');};});
 await page.locator('[data-audio-trust]').check();await page.locator('[data-recorder=start]').click();await page.getByRole('alert').waitFor();
 assert.equal(await page.locator('[data-recording-state=ready]').count(),1);
 await page.evaluate(()=>navigator.mediaDevices.getUserMedia=window.__workingMicrophone);
 await page.locator('[data-audio-trust]').check();await page.locator('[data-recorder=start]').click();await page.locator('[data-recording-state=listening]').waitFor();
 page.once('dialog',d=>d.accept());await page.locator('[data-action=logout]').click();
 assert.equal(await page.evaluate(()=>window.__recordingTracks.every(t=>t.readyState==='ended')),true,'logout releases an active microphone and discards local audio');
 await page.evaluate(()=>window.__role='parent');
 await page.locator('[data-action=login]').click();
 await page.locator('[data-screen=tasks]').waitFor({state:'attached'});
 assert.equal(await page.locator('[data-main-page]').count(),3,'family navigation has three main destinations');
 for(const screen of ['attendance','learning','recording','teacherAttendance','schedules','corrections','questions','ranking','manage','access','audit','readiness'])assert.equal(await page.locator(`[data-screen=${screen}]`).count(),0);
 await openScreen(page,'tasks');
 await page.locator('.workspace-table').waitFor();
 assert.equal(await page.locator('[data-work-action=new-task]').count(),0);
 assert.equal(await page.locator('[data-work-edit]').count(),0);
 await page.locator('[data-action=logout]').click();
 await page.evaluate(()=>window.__role='teacher');
 // Full copied history remains visible, with source labels and explicit ambiguity flags.
 await page.evaluate(()=>{window.__legacy.a=Array.from({length:130},(_,i)=>({collection:'evaluations',id:'evaluation-'+i,data:{studentId:'a',date:'2020-01-01',hizbNumber:2,quantity:1,accuracyScore:80,mistakesCount:2,notes:'Old note '+i}}));window.__legacy.a.push(...['old-a','old-b'].map(id=>({collection:'attendance',id,data:{studentId:'a',date:'2020-01-01',sessionIndex:0,status:'present'}})),{collection:'next_revisions',id:'old-task',data:{studentId:'a',dueDate:'2019-01-01',notes:'Keep overdue original task'}});});
 await page.locator('[data-action=login]').click();assert.equal(await page.locator('[data-screen=teacherAttendance]').count(),0);await openScreen(page,'history');
 await page.locator('[data-history-count]').waitFor();const v2HistoryCount=await page.evaluate(()=>Object.keys(window.__records).filter(key=>key.startsWith('a~')).length);const newEducationalCount=await page.evaluate(async()=>{const {currentLearning}=await import('/live/learning.mjs');return currentLearning(Object.values(window.__learning).filter(r=>r.studentId==='a')).length+Object.values(window.__workspace.katatib_tasks).filter(r=>r.studentId==='a').length;});assert.ok((await page.locator('[data-history-count]').innerText()).startsWith(String(133+v2HistoryCount+newEducationalCount)+' '));
 await page.locator('#history-source').selectOption('V1');assert.ok((await page.locator('[data-history-count]').innerText()).includes('133'));await page.locator('#history-source').selectOption('');
 assert.equal(await page.locator('.workspace-table tbody tr').count(),40);
 await page.locator('#history-kind').selectOption('attendance');
 assert.equal(await page.locator('.workspace-table tbody tr').count(),2+v2HistoryCount);
 assert.ok((await page.locator('.workspace-table').innerText()).includes('V1'));
 await page.locator('#history-kind').selectOption('nextRevision');
 assert.ok((await page.locator('.workspace-table').innerText()).includes('Keep overdue original task'));
 await page.locator('#history-kind').selectOption('evaluation');
 await page.locator('[data-work-history-page=next]').click();
 assert.equal(await page.locator('.workspace-table tbody tr').count(),40);
 await page.locator('#history-month').fill('2020-01');await page.locator('[data-history-day="2020-01-01"]').click();assert.equal(await page.locator('.activity-days button[aria-pressed=true]').count(),1);assert.equal(await page.locator('.workspace-table tbody tr').count(),40);await page.locator('[data-history-clear]').click();await page.locator('#history-month').fill('');
 await page.locator('#history-student').selectOption('b');
 const childHistoryCount=await page.evaluate(async()=>{const {currentLearning}=await import('/live/learning.mjs');return Object.keys(window.__records).filter(key=>key.startsWith('b~')).length+currentLearning(Object.values(window.__learning).filter(r=>r.studentId==='b')).length+Object.values(window.__workspace.katatib_tasks).filter(r=>r.studentId==='b').length;});await page.waitForFunction(n=>document.querySelector('[data-history-count]')?.textContent.startsWith(n+' '),childHistoryCount);
 assert.equal((await page.locator('#work-root').innerText()).includes('Old note'),false,'switching a child cannot retain another child’s history');
 // Exact V1 identifiers populate the eight-column map; quantity alone remains unlocated.
 await page.evaluate(()=>{window.__legacy.a[0].data.quantityIdentifier='r2';});
 // Profiles reveal old educational records as well as new learning, without another main destination.
 await openScreen(page,'students');await page.locator('[data-profile=a]').click();
 await page.locator('[data-profile-tab=learning]').click();await page.locator('#profile-previous [data-previous-record]').first().waitFor();
 await page.locator('#profile-hizb-grid .hizb-table').waitFor();
 assert.equal(await page.locator('#profile-hizb-grid .hizb-table tbody > tr').count(),60);
 assert.equal(await page.locator('#profile-hizb-grid .hizb-table thead th').count(),9);
 await page.locator('#profile-hizb-grid [data-hizb-cell="2:3"]').click();
 assert.ok((await page.locator('#profile-hizb-grid .hizb-cell-detail').innerText()).includes('Old note 0'));
 assert.equal(await page.locator('#profile-hizb-grid [data-hizb-cell="2:2"]').getAttribute('data-evidence-state'),'empty','quantity does not guess first eighths');
 await page.locator('#profile-hizb-grid [data-passage-close]').click();
 await page.locator('#profile-hizb-grid [data-hizb-cell="2:2"]').click();
 assert.ok((await page.locator('#profile-hizb-grid .passage-description').innerText()).includes('84'));
 assert.ok((await page.locator('#profile-hizb-grid .passage-description').innerText()).includes('داخل الآية'));
 await page.locator('#profile-hizb-grid .passage-full-ayah summary').click();assert.ok(await page.locator('#profile-hizb-grid .passage-full-ayah p').isVisible());
 const pane=await page.locator('#profile-hizb-grid .hizb-cell-detail').boundingBox();assert.ok(pane.y>=0&&pane.y+pane.height<=844+1,'passage panel fits the phone');
 await page.keyboard.press('Escape');assert.equal(await page.locator('#profile-hizb-grid .hizb-cell-detail').count(),0);
 assert.ok(await page.locator('#student-dialog').isVisible(),'Escape closes passage details before the profile');
 assert.ok((await page.locator('#profile-hizb-grid .hizb-row-heading').nth(2).innerText()).includes('سَيَقُولُ'));
 assert.equal(await page.locator('#profile-hizb-grid .hizb-row-heading').first().evaluate(el=>getComputedStyle(el).position),'sticky');
 await page.locator('#profile-hizb-grid [data-hizb-view]').selectOption('confirmed');
 assert.equal(await page.locator('#profile-hizb-grid .hizb-cell-detail').count(),0,'changing evidence clears the old selected cell');
 await page.locator('#profile-hizb-grid [data-hizb-view]').selectOption('oldEvaluation');
 assert.equal(await page.locator('#profile-previous [data-previous-record]').count(),131);
 assert.equal(await page.locator('#profile-previous [data-previous-record]:visible').count(),8);
 await page.locator('#profile-previous [data-records-more]').click();
 assert.equal(await page.locator('#profile-previous [data-previous-record]:visible').count(),16);
 assert.ok((await page.locator('#profile-previous').textContent()).includes('Old note 129'));
 await page.screenshot({path:'artifacts/katatib/profile-complete-history-phone.png',fullPage:true});
 await page.locator('#profile-hizb-grid [data-hizb-start="1"]').click();
 await page.locator('#profile-hizb-grid [data-passage-open="1:1"]').click();
 await page.locator('.mushaf-reader').waitFor();assert.equal(await page.locator('#mushaf-student').inputValue(),'a');
 assert.equal(await page.locator('#student-dialog').isVisible(),false);
 await openScreen(page,'dataReview');await page.locator('[data-work-action=review-records]').click();await page.locator('[data-review-students]').waitFor();
 const copiedEvaluation=page.locator('.workspace-table').first().locator('tbody tr').filter({has:page.locator('td:first-child',{hasText:'التقييم'})});
 assert.equal(await copiedEvaluation.locator('td').nth(1).innerText(),'130');
 const reviewDownloadPromise=page.waitForEvent('download');await page.locator('[data-work-action=review-excel]').click();const reviewDownload=await reviewDownloadPromise;
 assert.ok(fs.readFileSync(await reviewDownload.path(),'utf8').includes('130'));
 await page.evaluate(()=>window.__historyFail=true);await page.locator('[data-work-action=review-records]').click();await page.getByRole('alert').waitFor();
 assert.equal(await page.locator('[data-review-students]').count(),0,'failed review never shows stale complete counts');
 await page.evaluate(()=>window.__historyFail=false);
 // Historical monthly report includes every original evaluation and flags both duplicate attendance rows.
 await openScreen(page,'reports');await page.locator('#katatib-print').waitFor();
 await page.locator('#report-month').fill('2020-01');
 await page.locator('[data-report-v1]').waitFor();
 await page.locator('#report-student').selectOption('a');
 const historicCells=await page.locator('[data-report-v1] tbody tr').first().locator('td').allTextContents();
 assert.deepEqual(historicCells.slice(1),['0','0','0','2','130','0','0','0','80','—','0']);
 assert.ok((await page.locator('[data-report-v2]').innerText()).includes('V2'));
 assert.equal(await page.locator('[data-report-detail]').count(),2);
 assert.equal(await page.locator('[data-report-detail=reportActivities] tbody tr').count(),1);
 assert.equal(await page.locator('[data-report-detail=reportPlans] tbody tr').count(),1);
 const historyDownloadPromise=page.waitForEvent('download');await page.locator('[data-work-action=excel]').click();
 const historyDownload=await historyDownloadPromise;
 const spreadsheet=fs.readFileSync(await historyDownload.path(),'utf8');
 assert.ok(spreadsheet.includes('130'));assert.ok(spreadsheet.includes('V1:'));assert.ok(spreadsheet.includes('V2:'));
 await page.locator('#report-student').selectOption('b');
 const childCells=await page.locator('[data-report-v1] tbody tr').first().locator('td').allTextContents();
 assert.ok(childCells.slice(1).every(x=>x==='0'||x==='—'),'reports cannot leak another child’s totals');
 await page.evaluate(()=>window.__historyFail=true);
 await page.locator('#report-month').fill('2020-02');await page.getByRole('alert').waitFor();
 assert.equal(await page.locator('#katatib-print').count(),0,'failed history reads must not leave an exportable partial or stale report');
 await page.evaluate(()=>window.__historyFail=false);
 await page.locator('[data-work-action=reload]').click();await page.locator('#katatib-print').waitFor();
 await page.locator('[data-action=logout]').click();
 // Candidate-only performance smoke: 501 students, CPU throttling, bounded DOM and reads.
 await page.evaluate(()=>{window.__roster=Array.from({length:501},(_,i)=>({id:'s-'+String(i).padStart(4,'0'),name:'Student '+String(i).padStart(4,'0'),kuttab:i%2?'One':'Two',hizbs:null,age:12,attendance:null}));window.__profiles={};window.__attendanceCalls=[];});
 const cdp=await page.context().newCDPSession(page);await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
 await page.locator('[data-action=login]').click();await page.locator('[data-screen=students]').waitFor({state:'attached'});
 const renderStart=Date.now();await openScreen(page,'students');
 await page.waitForFunction(()=>document.querySelectorAll('#live-students .student-card').length===40);const rosterMs=Date.now()-renderStart;
 await page.locator('[data-roster-page="1"]').click();assert.equal(await page.locator('#live-students .student-card').count(),40);
 assert.ok((await page.locator('#live-students').innerText()).includes('Student 0040'));
 const searchStart=Date.now();await page.locator('#live-search').fill('Student 0500');
 await page.waitForFunction(()=>document.querySelectorAll('#live-students .student-card').length===1);const searchMs=Date.now()-searchStart;
 assert.ok((await page.locator('#live-students').innerText()).includes('Student 0500'));
 await page.locator('#live-search').fill('');await openScreen(page,'attendance');
 await page.locator('[data-cloud-student=s-0000]').first().waitFor();
 await page.locator('[data-cloud-student=s-0000][data-cloud-status=late]').click();
 await page.locator('[data-cloud-note=s-0000]').fill('Unsaved across pages');
 await page.locator('[data-roster-page="1"]').click();await page.locator('[data-cloud-student=s-0040]').first().waitFor();
 await page.locator('[data-roster-page="0"]').click();
 assert.equal(await page.locator('[data-cloud-note=s-0000]').inputValue(),'Unsaved across pages');
 assert.equal(await page.locator('[data-cloud-student=s-0000][data-cloud-status=late]').getAttribute('aria-pressed'),'true');
 await page.locator('[data-cloud-note=s-0000]').fill('');await page.locator('[data-cloud-student=s-0000][data-cloud-status=unmarked]').click();
 await page.locator('#live-school').selectOption('One');await page.locator('[data-cloud-student=s-0001]').first().waitFor();
 assert.equal(await page.locator('[data-cloud-student=s-0000]').count(),0);
 await page.locator('#live-school').selectOption('');
 await page.locator('#live-search').fill('Student 0500');await page.locator('[data-cloud-student=s-0500]').first().waitFor();
 assert.equal(await page.locator('#live-search').evaluate(el=>document.activeElement===el),true,'attendance search must not lose keyboard focus');
 const requests=await page.evaluate(()=>window.__attendanceCalls.map(ids=>ids.length));assert.ok(requests.every(n=>n<=40));
 assert.ok(rosterMs<5000&&searchMs<5000,'candidate UI smoke budget exceeded');
 const metrics={scope:'candidate mocked-provider UI; not V1 comparison or live Firebase/phone performance',students:501,cpuSlowdown:4,rosterMs,searchMs,maxAttendanceReadsPerPage:Math.max(...requests),maxVisibleCards:40};fs.writeFileSync('artifacts/katatib/migration-performance.json',JSON.stringify(metrics,null,2));console.log('MIGRATION_PERFORMANCE '+JSON.stringify(metrics));
 await page.screenshot({path:'artifacts/katatib/large-roster-attendance.png',fullPage:true});await cdp.send('Emulation.setCPUThrottlingRate',{rate:1});
 await page.locator('[data-action=logout]').click();await page.evaluate(()=>window.__roster=null);
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
 // Family notices and choices use the linked student; no email, upload or public ranking is activated.
 await page.evaluate(()=>{window.__pending=false;window.__role='teacher';});await page.locator('[data-action=login]').click();
 await openScreen(page,'notices');await page.locator('[data-family-new]:not([disabled])').waitFor();
 await page.locator('[data-family-new]').click();
 await page.locator('[data-notice-form] [name=title]').fill('Bring the book <script>');
 await page.locator('[data-notice-form] [name=body]').fill('Private family message');
 await page.locator('[data-notice-form] button[type=submit]').click();
 await page.locator('[data-notice-edit]').waitFor();assert.equal(await page.locator('#work-root script').count(),0);
 await page.locator('[data-action=logout]').click();await page.evaluate(()=>window.__role='parent');await page.locator('[data-action=login]').click();await page.locator('[data-dashboard-students]').waitFor();
 await openScreen(page,'notices');await page.locator('[data-notice-read]').waitFor();assert.equal(await page.locator('[data-family-new]').count(),0);
 await page.locator('[data-notice-read]').click();await page.locator('[data-notice-read][disabled]').waitFor();
 await openScreen(page,'consent');await page.locator('[data-consent=audio]:not([disabled])').first().waitFor();
 await page.locator('[data-consent=audio][data-approved=false]').click();
 await page.waitForFunction(()=>Object.values(window.__workspace.katatib_consents||{}).some(c=>c.purpose==='audio'&&c.approved===false));
 await page.locator('[data-consent=audio]:not([disabled])').first().waitFor();
 await page.locator('[data-consent=audio][data-approved=true]').click();
 await page.waitForFunction(()=>Object.values(window.__workspace.katatib_consents||{}).some(c=>c.purpose==='audio'&&c.approved===true&&c.revision===2));
 await page.locator('[data-consent=audio]:not([disabled])').first().waitFor();
 await page.locator('#family-student').selectOption('b');await page.locator('[data-consent=audio]:not([disabled])').first().waitFor();
 assert.equal(await page.locator('#work-root').innerText().then(s=>s.includes('Private family message')),false);
 await page.locator('[data-action=logout]').click();
 // Student sign-in and administrator cards use the same site, with bounded retries and no persistent PIN.
 await page.evaluate(()=>{window.__pending=false;window.__role='admin';});
 await page.locator('[data-login-tab=student]').click();
 await page.locator('#student-login-form [name=code]').fill('aaaaaaaaaaaaaaaaaaaa');
 await page.locator('#student-login-form [name=pin]').fill('00000000');
 await page.locator('#student-login-form button[type=submit]').click();await page.getByRole('alert').waitFor();
 assert.equal(await page.locator('.student-card').count(),0);
 await page.locator('#student-login-form [name=code]').fill('aaaaaaaaaaaaaaaaaaaa');
 await page.locator('#student-login-form [name=pin]').fill('12345678');
 await page.locator('#student-login-form button[type=submit]').click();await page.locator('[data-screen=students]').waitFor({state:'attached'});
 assert.equal(await page.locator('[data-screen=credentials]').count(),0);
 await page.locator('[data-action=logout]').click();
 await page.locator('[data-login-tab=staff]').click();await page.evaluate(()=>window.__role='admin');
 await page.locator('[data-action=login]').click();await openScreen(page,'credentials');
 await page.locator('[data-card-issue]:not([disabled])').waitFor();await page.evaluate(()=>window.__credentialLostAck=true);
 await page.locator('[data-card-issue]').click();await page.locator('#work-root [role=alert]').waitFor();
 await page.locator('[data-card-issue]').click();await page.locator('[data-card-print]').waitFor();
 const credentialCalls=await page.evaluate(()=>window.__credentialCalls);assert.equal(credentialCalls.length,2);assert.deepEqual(credentialCalls[0],credentialCalls[1]);
 assert.equal(await page.locator('#katatib-print img').count(),0,'student name is escaped on login card');
 assert.equal(await page.locator('#katatib-print strong').count(),2);
 await page.screenshot({path:'artifacts/katatib/student-login-card.png',fullPage:true});
 await page.locator('[data-card-clear]').click();await page.locator('[data-action=logout]').click();
 assert.deepEqual(errors,[]);
 console.log('PASS: mocked-provider reader login, denied access, logout and stale-request clearing, no persistent student storage, escaped copied data, history, Arabic/French and responsive unified homepage/design with actual account/roster,  cloud attendance save/reload, date/session isolation, unsaved errors and conflicts; learning types, one current row per edit with collapsed prior versions, lost-ack retries and profile consistency; explicit confirmation, practice exclusion and edited progress. Real Google OAuth requires owner setup and a live smoke test.');
})().catch(async e=>{console.error(e);if(failurePage){await failurePage.screenshot({path:'artifacts/katatib/live-failure.png',fullPage:true}).catch(()=>{});console.error(await failurePage.evaluate(()=>({alerts:[...document.querySelectorAll('[role=alert]')].map(e=>e.textContent),form:[...document.querySelectorAll('#learning-form input,#learning-form select,#learning-form textarea')].map(e=>({name:e.name,value:e.value,checked:e.checked,valid:e.checkValidity()}))})).catch(()=>({})));console.error(observedErrors);}process.exitCode=1;}).finally(async()=>{await browser?.close();server.close();});
