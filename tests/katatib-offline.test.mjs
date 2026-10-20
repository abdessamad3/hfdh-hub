import test from 'node:test';
import assert from 'node:assert/strict';
import {createOfflineGateway} from '../public/katatib/live/offline-gateway.mjs';
import {decideSave,emptyAttendance} from '../public/katatib/live/attendance.mjs';
const context={date:'2026-10-19',session:'morning'},user={uid:'teacher-uid',email:'teacher@example.com'};
function fixture(){const accounts=new Map(),remote=new Map(),events=new Set(),mutex=new Map();let callback,connected=true,denied=false,lost=false,writes=0;
 const store={async read(uid){return structuredClone(accounts.get(uid)||{enabled:false,cache:{},queue:[]});},async update(uid,fn){const next=fn(await this.read(uid));accounts.set(uid,structuredClone(next));return next;},async remove(uid){accounts.delete(uid);}};
 const locks={request(name,fn){const work=(mutex.get(name)||Promise.resolve()).then(fn);mutex.set(name,work.catch(()=>{}));return work;}};
 const raw={observe(cb){callback=cb;cb(user);},async students(){if(denied)throw Object.assign(Error('denied'),{code:'permission-denied'});return {role:'teacher',students:[{id:'a',name:'A',kuttab:'One'}]};},async trustDevice(){},async untrustDevice(){},async logout(){callback(null);},async kuttabs(){return [];},async studentHistory(){return [];},async history(){return [];},async attendanceHistory(){return [];},async learningHistory(){return [];},async verseMarks(){return [];},async workspaceList(){return [];},async attendance(ids,c){return Object.fromEntries(ids.map(id=>[id,remote.get(id+c.date+c.session)||emptyAttendance()]));},async saveAttendance(id,c,value,revision,event){writes++;if(denied)throw Object.assign(Error('denied'),{code:'permission-denied'});const key=id+c.date+c.session,prior=remote.get(key),decision=decideSave(prior,value,revision);if(!decision.unchanged){remote.set(key,{...value,revision:decision.revision});events.add(event);}if(lost){lost=false;throw Object.assign(Error('offline'),{code:'unavailable'});}return {...value,revision:decision.revision};},async saveLearning(){writes++;},async workspaceSave(){writes++;},async saveVerseMark(){writes++;}};
 const options={store,locks,online:()=>connected};const api=createOfflineGateway(raw,options);
 const observe=async gateway=>new Promise(resolve=>gateway.observe(()=>resolve()));
 return {api,raw,store,options,remote,events,observe,async init(){await observe(api);await api.offline.prepare({date:context.date,students:['a'],pages:[]});},offline(){connected=false;},online(){connected=true;},deny(){denied=true;},allow(){denied=false;},loseAck(){lost=true;},switchUser(next){callback(next);},get writes(){return writes;}};
}
test('cold reload retains queued attendance and syncs once with stable event identity',async()=>{
 const f=fixture();await f.init();f.offline();assert.equal((await f.api.attendance(['a'],context)).a.revision,0);
 const local=await f.api.saveAttendance('a',context,{status:'present',note:'محلي'},0);assert.equal(local.queued,true);assert.equal(f.writes,0);
 const reopened=createOfflineGateway(f.raw,f.options);await f.observe(reopened);assert.equal((await reopened.attendance(['a'],context)).a.note,'محلي');assert.equal(reopened.offlinePending(),1);
 await reopened.saveAttendance('a',context,{status:'late',note:'Corrected locally'},1);assert.equal((await reopened.attendance(['a'],context)).a.revision,2);
 f.online();await reopened.offline.sync();assert.equal(reopened.offlinePending(),0);assert.equal(f.events.size,2);assert.equal(f.remote.values().next().value.status,'late');
 await reopened.offline.sync();assert.equal(f.events.size,2);
});
test('lost acknowledgements retry without duplicate audit rows; stale changes block without overwrite',async()=>{
 const f=fixture();await f.init();f.offline();await f.api.saveAttendance('a',context,{status:'present',note:''},0);f.loseAck();f.online();await f.api.offline.sync();assert.equal(f.api.offlinePending(),1);assert.equal(f.events.size,1);await f.api.offline.sync();assert.equal(f.events.size,1);assert.equal(f.api.offlinePending(),0);
 f.offline();await f.api.saveAttendance('a',context,{status:'absent',note:'Local intention'},1);f.remote.set('a'+context.date+context.session,{status:'excused',note:'Other device',revision:2});f.online();await f.api.offline.sync();assert.equal(f.api.offline.status().queue[0].status,'blocked');assert.equal(f.remote.values().next().value.status,'excused');
 await f.api.offline.dismiss(f.api.offline.status().queue[0].id);assert.equal(f.api.offlinePending(),0);assert.equal(f.api.offline.status().queue[0].status,'dismissed');
});
test('permission changes never fall back to cached access and a different account sees no downloaded data',async()=>{
 const f=fixture();await f.init();f.offline();await assert.rejects(f.api.attendance(['b'],context),/no-access/);await assert.rejects(f.api.attendance(['a'],{...context,date:'2026-10-20'}),/offline-not-prepared/);
 await f.api.saveAttendance('a',context,{status:'present',note:''},0);await assert.rejects(f.api.logout(),/offline-sync-first/);
 f.online();f.deny();await assert.rejects(f.api.students(user),/denied/);assert.equal(f.api.offline.status().enabled,false);f.offline();await assert.rejects(f.api.students(user),/denied/);
 f.allow();f.switchUser({uid:'another-uid'});await new Promise(r=>setTimeout(r,0));assert.equal(f.api.offlinePending(),0);assert.equal(f.api.offline.status().enabled,false);assert.equal((await f.store.read(user.uid)).queue.length,1);
});
test('concurrent tabs preserve both writes and serialize replay',async()=>{
 const f=fixture();await f.init();f.offline();const other=createOfflineGateway(f.raw,f.options);await f.observe(other);
 await Promise.all([f.api.saveAttendance('a',context,{status:'present',note:'First'},0),other.saveAttendance('a',context,{status:'late',note:'Second'},1)]);
 assert.equal((await f.store.read(user.uid)).queue.length,2);f.online();await Promise.all([f.api.offline.sync(),other.offline.sync()]);assert.equal(f.events.size,2);assert.equal((await f.store.read(user.uid)).queue.length,0);
});
test('invalid data and online-only management actions never enter the durable queue',async()=>{
 const f=fixture();await f.init();f.offline();await assert.rejects(f.api.saveAttendance('b',context,{status:'present',note:''},0),/no-access/);await assert.rejects(f.api.saveAttendance('a',context,{status:'invalid',note:''},0),/invalid-attendance/);
 await assert.rejects(f.api.workspaceSave('katatib_access','admin',{},0,'test-event-123456789'),/offline-online-only-action/);assert.equal(f.api.offlinePending(),0);
});

test('a slow sync never blocks saving another local change',async()=>{
 const f=fixture();await f.init();f.offline();await f.api.saveAttendance('a',context,{status:'present',note:''},0);
 const save=f.raw.saveAttendance;let release,entered;const started=new Promise(r=>entered=r);f.raw.saveAttendance=async(...args)=>{entered();await new Promise(r=>release=r);return save(...args);};
 f.online();const syncing=f.api.offline.sync();await started;f.offline();await f.api.saveAttendance('a',context,{status:'late',note:'Saved during slow network'},1);assert.equal(f.api.offlinePending(),2);release();await syncing;
 f.raw.saveAttendance=save;f.online();await f.api.offline.sync();assert.equal(f.events.size,2);assert.equal(f.api.offlinePending(),0);
});

test('device quota failures do not claim a save or discard the existing queue',async()=>{
 const f=fixture();await f.init();f.offline();const update=f.store.update;f.store.update=async()=>{throw Error('QuotaExceededError');};
 await assert.rejects(f.api.saveAttendance('a',context,{status:'present',note:'Still a draft'},0),/QuotaExceeded/);assert.equal(f.api.offlinePending(),0);assert.equal(f.events.size,0);
 f.store.update=update;assert.equal((await f.api.attendance(['a'],context)).a.revision,0);
});

test('a delayed Auth observer cannot save under a different SDK identity',async()=>{
 const f=fixture();await f.init();f.offline();f.raw.authUid=()=> 'different-sdk-user';
 await assert.rejects(f.api.saveAttendance('a',context,{status:'present',note:''},0),/offline-account-changed/);assert.equal((await f.store.read(user.uid)).queue.length,0);
});

test('quota blocks preserve work and can be explicitly retried after recovery',async()=>{
 const f=fixture();await f.init();f.offline();await f.api.saveAttendance('a',context,{status:'present',note:''},0);const save=f.raw.saveAttendance;f.raw.saveAttendance=async()=>{throw Object.assign(Error('quota'),{code:'resource-exhausted'});};
 f.online();await f.api.offline.sync();assert.equal(f.api.offline.status().queue[0].error,'quota');assert.equal(f.api.offlinePending(),1);
 f.raw.saveAttendance=save;await f.api.offline.retry();assert.equal(f.api.offlinePending(),0);assert.equal(f.events.size,1);
});

test('online-only actions still use their authorized server path after offline preparation',async()=>{
 const f=fixture();await f.init();await f.api.workspaceSave('katatib_notices','notice',{},0,'online-only-test-event');assert.equal(f.writes,1);assert.equal(f.api.offlinePending(),0);
 f.offline();await assert.rejects(f.api.workspaceSave('katatib_notices','notice',{},0,'offline-notice-event'),/offline-online-only-action/);assert.equal(f.writes,1);
});
test('sign-out rechecks the durable queue so another tab cannot lose a newly saved change',async()=>{
 const f=fixture();await f.init();f.offline();const other=createOfflineGateway(f.raw,f.options);await f.observe(other);await other.saveAttendance('a',context,{status:'present',note:'Other tab'},0);
 assert.equal(f.api.offlinePending(),0,'the first tab has an intentionally stale count');await assert.rejects(f.api.logout(),/offline-sync-first/);assert.equal((await f.store.read(user.uid)).queue.length,1);
});

test('unsupported offline locking does not prevent ordinary online sign-out',async()=>{
 const f=fixture(),api=createOfflineGateway(f.raw,{...f.options,locks:null});await f.observe(api);
 await assert.rejects(api.offline.prepare({date:context.date,students:['a']}),/offline-locks-unavailable/);await api.logout();assert.equal(api.offlinePending(),0);
});

test('preparation requires fresh server reads instead of relabelling an old cached copy as downloaded',async()=>{
 const f=fixture();await f.init();await f.api.offline.completePreparation();assert.ok(f.api.offline.status().preparedAt);
 f.raw.studentHistory=async()=>{throw Object.assign(Error('network unavailable'),{code:'unavailable'});};
 await assert.rejects(f.api.offline.prepare({date:context.date,students:['a']}),/network unavailable/);assert.equal(f.api.offline.status().preparedAt,null);
});

test('expanded snapshot prepares a bounded 30-day history plus future sessions from current records',async()=>{
 const f=fixture();await f.init();let individualReads=0;f.raw.attendance=async()=>{individualReads++;throw Error('unnecessary per-date reads');};
 f.raw.workspaceList=async(name)=>name==='katatib_attendance'?[{studentId:'a',date:'2026-10-19',session:'morning',status:'late',note:'Current snapshot',revision:7}]:[];
 f.raw.studentHistory=async()=>[{date:'2020-01-01',kind:'attendance'},{date:'2020-01-01',kind:'nextRevision'},{date:'2026-10-19',kind:'attendance'}];
 await f.api.offline.prepare({date:context.date,students:['a'],days:30,upcoming:7,includeOlder:false});assert.equal(individualReads,0);const s=f.api.offline.status();assert.deepEqual(s.preparedWindow,{from:'2026-09-20',to:'2026-10-26',days:30,upcoming:7});assert.ok(s.lastSnapshotAt);assert.ok(s.snapshotBytes>0);f.offline();assert.equal((await f.api.attendance(['a'],context)).a.revision,7);assert.equal((await f.api.attendance(['a'],{date:'2026-10-26',session:'evening'})).a.status,'unmarked');await assert.rejects(f.api.attendance(['a'],{date:'2026-10-27',session:'morning'}),/offline-not-prepared/);
 const saved=await f.store.read(user.uid);assert.equal(saved.cache['["studentHistory","a"]'].length,2,'overdue V1 plans survive while old ordinary history is excluded');
});
test('linked family can prepare/read their copy but cannot queue educational writes',async()=>{
 const f=fixture();f.raw.students=async()=>({role:'parent',students:[{id:'a',name:'Child',kuttab:'One'}]});f.raw.kuttabs=async()=>{throw Error('family must not query management scopes');};await f.observe(f.api);await f.api.offline.prepare({date:context.date,students:['a'],days:30,upcoming:7,includeOlder:false});f.offline();assert.equal((await f.api.students(user)).role,'parent');await assert.rejects(f.api.saveAttendance('a',context,{status:'present',note:''},0),/offline-staff-only/);await assert.rejects(f.api.attendance(['b'],context),/no-access/);
});
test('selected class roster stays selected after online access refresh and unselected online work remains server-authorized',async()=>{
 const f=fixture();f.raw.students=async()=>({role:'teacher',students:[{id:'a',name:'A',kuttab:'One'},{id:'b',name:'B',kuttab:'Two'}]});await f.init();await f.api.offline.sync();assert.equal((await f.api.students(user)).students.length,2);await f.api.saveAttendance('b',context,{status:'present',note:'Online only for unprepared student'},0);assert.equal(f.writes,1);f.offline();assert.deepEqual((await f.api.students(user)).students.map(s=>s.id),['a']);await assert.rejects(f.api.attendance(['b'],context),/no-access/);
});
test('update syncs pending work first and refuses conflicted updates without discarding the queue',async()=>{
 const f=fixture();await f.init();f.offline();await f.api.saveAttendance('a',context,{status:'present',note:'Pending'},0);f.online();await f.api.offline.prepare({date:context.date,students:['a']});assert.equal(f.api.offlinePending(),0);assert.equal(f.events.size,1);f.offline();await f.api.saveAttendance('a',context,{status:'absent',note:'Local'},1);f.remote.set('a'+context.date+context.session,{status:'late',note:'Other device',revision:2});f.online();await assert.rejects(f.api.offline.prepare({date:context.date,students:['a']}),/offline-sync-first/);assert.equal(f.api.offlinePending(),1);assert.equal(f.api.offline.status().queue[0].status,'blocked');
});
test('a local save made during staged preparation prevents replacement and survives',async()=>{
 const f=fixture();await f.init();let entered,release;const started=new Promise(r=>entered=r);f.raw.studentHistory=async()=>{entered();await new Promise(r=>release=r);return [];};const preparing=f.api.offline.prepare({date:context.date,students:['a']});await started;f.offline();await f.api.saveAttendance('a',context,{status:'present',note:'Keep me'},0);release();await assert.rejects(preparing,/offline-sync-first/);assert.equal(f.api.offlinePending(),1);assert.equal((await f.api.attendance(['a'],context)).a.note,'Keep me');
});
test('access denial during preparation removes cached private access',async()=>{const f=fixture();await f.init();f.deny();await assert.rejects(f.api.offline.prepare({date:context.date,students:['a']}),/denied/);assert.equal(f.api.offline.status().enabled,false);assert.deepEqual(f.api.offline.status().cache,{});});
