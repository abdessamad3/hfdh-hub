import {createClient} from 'npm:@supabase/supabase-js@2.57.4';
import {createRemoteJWKSet,jwtVerify} from 'npm:jose@6.1.0';
import {cleanPassage} from './recitation-passage.mjs';
const project='katatib-64049',bucket='recitations';
const jwks=createRemoteJWKSet(new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'));
const origins=new Set(['https://katatib-64049.web.app','https://katatib-64049.firebaseapp.com']);
const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}});
const base=`https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents`;
function unpack(v:any):any {if('stringValue'in v)return v.stringValue;if('booleanValue'in v)return v.booleanValue;if('arrayValue'in v)return (v.arrayValue.values||[]).map(unpack);return null;}
async function document(path:string,token:string){const response=await fetch(base+'/'+path,{headers:{Authorization:'Bearer '+token}});if(response.status===404)return null;if(!response.ok)throw Error('forbidden');const raw=await response.json();return Object.fromEntries(Object.entries(raw.fields||{}).map(([k,v])=>[k,unpack(v)]));}
function canonical(value:any):string{return JSON.stringify(value,(_k,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b))):v);}
function metadata(body:any){
 if(!/^[a-f0-9]{64}$/.test(body.sha256)||!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.id)||!Number.isSafeInteger(body.bytes)||body.bytes<1||body.bytes>33554432||!['audio/webm','audio/ogg','audio/mp4'].includes(body.mime)||!Number.isFinite(body.duration)||body.duration<0||body.duration>2705||!['morning','afternoon','evening'].includes(body.session)||!/^\d{4}-\d{2}-\d{2}$/.test(body.date)||new Date(body.date+'T12:00:00Z').toISOString().slice(0,10)!==body.date)throw Error('invalid');
 if(body.recitationId!==undefined&&!/^[A-Za-z0-9-]{16,80}$/.test(body.recitationId))throw Error('invalid');
 return {...(body.recitationId?{recitationId:body.recitationId}:{}),sha256:body.sha256,id:body.id,studentId:body.studentId,date:body.date,session:body.session,passage:cleanPassage(body.passage),bytes:body.bytes,mime:body.mime,duration:body.duration};
}
Deno.serve(async req=>{
 const origin=req.headers.get('origin')||'',cors={'Access-Control-Allow-Origin':origins.has(origin)?origin:'https://katatib-64049.web.app','Access-Control-Allow-Headers':'authorization,apikey,content-type','Access-Control-Allow-Methods':'POST,OPTIONS','Vary':'Origin'};
 const json=(data:any,status=200)=>new Response(JSON.stringify(data),{status,headers:{...cors,'Content-Type':'application/json','Cache-Control':'no-store'}});
 if(req.method==='OPTIONS')return new Response(null,{headers:cors});
 try{
  if(req.method!=='POST'||origin&&!origins.has(origin))return json({error:'forbidden'},403);
  const token=req.headers.get('authorization')?.replace(/^Bearer /,'');if(!token)throw Error('forbidden');
  const {payload}=await jwtVerify(token,jwks,{issuer:`https://securetoken.google.com/${project}`,audience:project,algorithms:['RS256']});
  if(!payload.sub||typeof payload.email!=='string')throw Error('forbidden');
  const body=await req.json(),studentId=body.studentId;
  if(typeof studentId!=='string'||!studentId||studentId.length>128||/[~/\r\n]/.test(studentId))throw Error('invalid');
  // Firestore enforces current membership, provider identity and student scope on every request.
  const grant=await document('katatib_access/'+encodeURIComponent(payload.email.toLowerCase()),token);
  if(!grant?.active)throw Error('forbidden');
  const original=await document('students/'+encodeURIComponent(studentId),token);
  const overlay=await document('katatib_students/'+encodeURIComponent(studentId),token);
  if(!original&&!overlay)throw Error('forbidden');
  const staff=['admin','manager','teacher'].includes(grant.role);
  const key=`${studentId}/${payload.sub}/${body.id}`;
  if(body.action==='usage'){const {data,error}=await db.rpc('recitation_storage_usage');if(error)throw error;return json({used:Number(data),limit:900000000});}
  if(body.action==='list'){
   const {data,error}=await db.from('recitations').select('id,metadata,created_at').eq('student_id',studentId).eq('state','online').order('created_at',{ascending:false}).range(Number.isSafeInteger(body.offset)&&body.offset>=0?body.offset:0,(Number.isSafeInteger(body.offset)&&body.offset>=0?body.offset:0)+999);
   if(error)throw error;return json(data.map(r=>({...r.metadata,id:r.id,createdAt:r.created_at,state:'online'})));
  }
  if(body.action==='begin'||body.action==='finish'){
   if(!staff||overlay?.status==='archived')throw Error('forbidden');const meta=metadata(body);if(meta.recitationId){const lesson=await document('katatib_learning/'+encodeURIComponent(meta.recitationId),token);if(!lesson||lesson.studentId!==studentId)throw Error('forbidden');}
   const {data:existing,error:readError}=await db.from('recitations').select('*').eq('id',meta.id).maybeSingle();if(readError)throw readError;
   if(existing&&(existing.owner_uid!==payload.sub||canonical(existing.metadata)!==canonical(meta)))throw Error('conflict');
   if(body.action==='begin'){
    // Serialize reservations in SQL, including unfinished uploads, below the Free plan allowance.
    const {error}=await db.rpc('reserve_recitation',{record_id:meta.id,student:studentId,owner:payload.sub,path:key,meta,size:meta.bytes});if(error)throw error;
    if(existing?.state==='online')return json({url:Deno.env.get('SUPABASE_URL')+'/storage/v1/object/'+bucket+'/'+key,origin:Deno.env.get('SUPABASE_URL'),alreadySaved:true});
    const present=await db.storage.from(bucket).info(key);if(!present.error)return json({url:Deno.env.get('SUPABASE_URL')+'/storage/v1/object/'+bucket+'/'+key,origin:Deno.env.get('SUPABASE_URL'),alreadyUploaded:true});
    const signed=await db.storage.from(bucket).createSignedUploadUrl(key,{upsert:false});if(signed.error)throw signed.error;return json({url:signed.data.signedUrl,origin:Deno.env.get('SUPABASE_URL')});
   }
   if(!existing)throw Error('invalid');if(existing.state==='online')return json({...meta,createdAt:existing.created_at,state:'online'});
   const {data:info,error}=await db.storage.from(bucket).info(key);if(error||Number(info?.size)!==meta.bytes)throw Error('incomplete');
   const content=await db.storage.from(bucket).download(key);if(content.error)throw content.error;const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await content.data.arrayBuffer())),x=>x.toString(16).padStart(2,'0')).join('');if(hash!==meta.sha256)throw Error('audio-integrity');
   const {error:updateError}=await db.from('recitations').update({state:'online'}).eq('id',meta.id).eq('owner_uid',payload.sub);if(updateError)throw updateError;
   return json({...meta,createdAt:existing.created_at,state:'online'});
  }
  if(body.action==='play'){
   if(typeof body.id!=='string')throw Error('invalid');const {data,error}=await db.from('recitations').select('*').eq('id',body.id).eq('student_id',studentId).eq('state','online').single();if(error)throw Error('forbidden');
   const signed=await db.storage.from(bucket).createSignedUrl(data.object_path,60);if(signed.error)throw signed.error;return json({url:signed.data.signedUrl});
  }
  throw Error('invalid');
 }catch(e){const message=e instanceof Error?e.message:'';return json({error:/forbidden|JWT|token/i.test(message)?'forbidden':/conflict/.test(message)?'conflict':'recording-service-unavailable'},/forbidden|JWT|token/i.test(message)?403:/conflict/.test(message)?409:400);}
});
