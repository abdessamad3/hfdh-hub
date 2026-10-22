import test from 'node:test';
import assert from 'node:assert/strict';
import {cleanNotice,cleanAcknowledgement,cleanConsent,CONSENT_POLICY,noticeRows} from '../public/katatib/live/family-model.mjs';
test('notice validation keeps one exact student recipient and rejects empty/oversized content',()=>{
 const n={studentId:'a',title:' Lesson ',body:' Bring the book ',kind:'info',active:true};
 assert.equal(cleanNotice(n).body,'Bring the book');
 for(const edit of [{studentId:'../b'},{body:''},{title:'x'.repeat(121)},{body:'x'.repeat(2001)},{kind:'all-schools'},{active:'true'}])assert.throws(()=>cleanNotice({...n,...edit}));
});
test('read receipts cover only the message revision actually read',()=>{
 const notices=[{id:'one',revision:2,active:true,updatedAt:{seconds:20}},{id:'two',revision:1,active:true,updatedAt:{seconds:9}},{id:'hidden',revision:1,active:false}];
 assert.equal(noticeRows(notices,[{noticeId:'one',noticeRevision:1}])[0].acknowledged,false);
 const result=noticeRows(notices,[{noticeId:'one',noticeRevision:2}]);assert.deepEqual(result.map(r=>r.id),['two','one']);assert.equal(result[1].acknowledged,true);
 assert.throws(()=>cleanAcknowledgement({studentId:'a',noticeId:'one',readerUid:'uid',noticeRevision:0}));
});
test('parent choices require explicit boolean decision and versioned, purpose-specific policy',()=>{
 const c={studentId:'a',guardianUid:'parent@example.com',purpose:'audio',approved:false,policyVersion:CONSENT_POLICY};
 assert.equal(cleanConsent(c).approved,false);
 for(const edit of [{approved:'false'},{purpose:'model-training'},{policyVersion:'unreviewed'},{guardianUid:'../uid'},{studentId:''}])assert.throws(()=>cleanConsent({...c,...edit}));
});
