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
window.__pending=false;window.__deny=false;window.__history=[];
export async function connect(){
 return {
 observe(callback){observer=callback;callback(null);},
 async login(){observer({email:'teacher@example.com',emailVerified:true});},
 async logout(){observer(null);},
 async students(){if(window.__pending)await new Promise(r=>window.__release=r);if(window.__deny)throw new Error('no-access');return {students:[{id:'a',name:'<img src=x onerror=alert(1)>',kuttab:'One',age:12,hizbs:3,attendance:80},{id:'b',name:'Maryam',kuttab:'Two',age:null,hizbs:null,attendance:null}],role:'teacher',capped:false};},
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
 console.log('PASS: mocked-provider reader login, denied access, logout and stale-request clearing, no persistent student storage, escaped copied data, history, Arabic/French and responsive layout. Real Google OAuth requires owner setup and a live smoke test.');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{await browser?.close();server.close();});
