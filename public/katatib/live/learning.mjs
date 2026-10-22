import {cleanPassage} from './recitation-passage.mjs';
import { attendanceId } from './attendance.mjs';
export const LEARNING_KINDS = Object.freeze(['memorization','practice','revision','evaluation']);
export const isGradedLearning = kind => ['revision','evaluation'].includes(kind);
export const sameLearningFamily = (a,b) => a===b || (['memorization','practice'].includes(a)&&['memorization','practice'].includes(b));
export function cleanLearning(input) {
  if(!input || !LEARNING_KINDS.includes(input.kind)) throw new Error('invalid-learning');
  attendanceId(input.studentId,input.date,input.session);
  const passage=input.passage?cleanPassage(input.passage):null;
  if(passage)input={...input,hizb:Math.floor(passage.startCell/8)+1,fromEighth:passage.startCell%8+1,toEighth:Math.min(8,passage.endCell-Math.floor(passage.startCell/8)*8+1)};
  const integer=(n,min,max)=>Number.isInteger(n)&&n>=min&&n<=max;
  if(!integer(input.hizb,1,60)||!integer(input.fromEighth,1,8)||!integer(input.toEighth,input.fromEighth,8))throw new Error('invalid-portion');
  if(typeof input.note!=='string'||input.note.length>500)throw new Error('invalid-note');
  const graded=isGradedLearning(input.kind);
  if(graded&&(!integer(input.mistakes,0,999)||!integer(input.score,0,100)))throw new Error('invalid-grade');
  if(!graded&&(input.mistakes!==null||input.score!==null))throw new Error('invalid-grade');
  const supersedesId=input.supersedesId??null;
  if(supersedesId!==null&&(typeof supersedesId!=='string'||!/^[A-Za-z0-9-]{16,80}$/.test(supersedesId)))throw new Error('invalid-correction');
  return {...(passage?{passage}:{}),studentId:input.studentId,kind:input.kind,date:input.date,session:input.session,hizb:input.hizb,fromEighth:input.fromEighth,toEighth:input.toEighth,quantity:passage?(passage.mode==='divisions'?passage.endCell-passage.startCell+1:null):input.toEighth-input.fromEighth+1,mistakes:input.mistakes,score:input.score,note:input.note,supersedesId};
}
export function sameLearning(stored,input,userId) {
  return stored.createdBy===userId&&Object.entries(input).every(([key,value])=>JSON.stringify(stored[key])===JSON.stringify(value));
}
export async function commitLearning(db,sdk,userId,input,id) {
  const clean=cleanLearning(input);
  if(!userId||!/^[A-Za-z0-9-]{16,80}$/.test(id)||id===clean.supersedesId)throw new Error('invalid-identity');
  const ref=sdk.doc(db,'katatib_learning',id);
  return sdk.runTransaction(db,async tx=>{
    const snap=await tx.get(ref);
    if(snap.exists()) {
      if(!sameLearning(snap.data(),clean,userId))throw Object.assign(new Error('learning-conflict'),{code:'learning-conflict'});
      return {id,...clean};
    }
    if(clean.supersedesId){
      const prior=await tx.get(sdk.doc(db,'katatib_learning',clean.supersedesId));
      if(!prior.exists()||prior.data().studentId!==clean.studentId||!sameLearningFamily(prior.data().kind,clean.kind))throw new Error('invalid-correction');
    }
    tx.set(ref,{schemaVersion:clean.passage?3:2,...clean,createdBy:userId,createdAt:sdk.serverTimestamp()});
    return {id,...clean};
  });
}

// A correction is another version of one logical record, never another lesson.
export function currentLearning(records) {
  const byId=new Map(records.map(r=>[r.id,r]));
  if(byId.size!==records.length)throw new Error('invalid-learning-history');
  const parent=new Map(records.map(r=>[r.id,r.id]));
  function find(id){let root=id;while(parent.get(root)!==root)root=parent.get(root);while(id!==root){const next=parent.get(id);parent.set(id,root);id=next;}return root;}
  const replaced=new Set();
  for(const record of records){
    if(!record.supersedesId)continue;
    const prior=byId.get(record.supersedesId);
    if(!prior||prior.studentId!==record.studentId||!sameLearningFamily(prior.kind,record.kind))throw new Error('invalid-learning-history');
    const a=find(record.id),b=find(prior.id);
    if(a===b)throw new Error('invalid-learning-history');
    parent.set(a,b);replaced.add(prior.id);
  }
  const chains=new Map();
  for(const r of records){const key=find(r.id);if(!chains.has(key))chains.set(key,[]);chains.get(key).push(r);}
  const newest=(a,b)=>(b.createdAt?.seconds??0)-(a.createdAt?.seconds??0)||(b.createdAt?.nanoseconds??0)-(a.createdAt?.nanoseconds??0)||b.id.localeCompare(a.id);
  return [...chains.values()].map(versions=>{
    const leaves=versions.filter(r=>!replaced.has(r.id)).sort(newest);
    if(!leaves.length)throw new Error('invalid-learning-history');
    return {...leaves[0],previousVersions:versions.filter(r=>r.id!==leaves[0].id).sort(newest),competingEdits:leaves.length>1};
  }).sort((a,b)=>b.date.localeCompare(a.date)||newest(a,b));
}

// Resolve full chains before rendering; a truncated page could resurrect an old version.
export async function readLearningPages(readPage,maxRecords=1000) {
  const records=[],seen=new Set();let after=null;
  while(true){
    const page=await readPage(after);
    if(!Array.isArray(page)||page.length>30)throw new Error('invalid-learning-page');
    for(const record of page){if(typeof record.id!=='string'||seen.has(record.id))throw new Error('invalid-learning-page');seen.add(record.id);records.push(record);}
    if(records.length>maxRecords)throw new Error('learning-history-limit');
    if(page.length<30)return records;
    after=page[page.length-1].id;
  }
}
