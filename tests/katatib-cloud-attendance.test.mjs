import test from 'node:test';
import assert from 'node:assert/strict';
import {attendanceId,cleanAttendance,emptyAttendance,decideSave} from '../public/katatib/live/attendance.mjs';
test('cloud record identity separates students, dates and sessions',()=>{
 const ids=[attendanceId('a','2026-10-18','morning'),attendanceId('a','2026-10-18','evening'),attendanceId('b','2026-10-18','morning'),attendanceId('a','2026-10-19','morning')];assert.equal(new Set(ids).size,4);
});
test('impossible dates, unsupported sessions and ambiguous student IDs are rejected',()=>{
 for(const [id,date,session] of [['a','2026-02-30','morning'],['a','2026-10-18','night'],['x/y','2026-10-18','morning'],['a~b','2026-10-18','morning']])assert.throws(()=>attendanceId(id,date,session));
});
test('only the attendance payload is accepted and notes are bounded',()=>{
 assert.deepEqual(cleanAttendance({status:'late',note:'متأخر',admin:true}),{status:'late',note:'متأخر'});
 for(const x of [{status:'other',note:''},{status:'present',note:'x'.repeat(501)},{status:'present',note:null}])assert.throws(()=>cleanAttendance(x));
});
test('unmarked stays distinct from absent and can be explicitly restored',()=>{
 assert.equal(emptyAttendance().status,'unmarked');assert.deepEqual(decideSave({status:'absent',note:'',revision:2},{status:'unmarked',note:''},2),{unchanged:false,revision:3});
});
test('a fresh save starts revision one and a changed save increments',()=>{
 assert.deepEqual(decideSave(null,{status:'present',note:''},0),{unchanged:false,revision:1});
 assert.deepEqual(decideSave({status:'present',note:'',revision:3},{status:'late',note:'bus'},3),{unchanged:false,revision:4});
});
test('a stale edit fails rather than replacing newer attendance',()=>{
 assert.throws(()=>decideSave({status:'late',note:'new',revision:2},{status:'absent',note:''},1),e=>e.code==='conflict');
});
test('retry after a lost acknowledgement is idempotent when the payload already matches',()=>{
 assert.deepEqual(decideSave({status:'present',note:'same',revision:2},{status:'present',note:'same'},1),{unchanged:true,revision:2});
});
