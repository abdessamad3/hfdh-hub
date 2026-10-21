import {passageCopy,passageText} from './recitation-passage.mjs';
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function createRecordingHistory(){
 let generation=0,host=null,urls=[];
 const reset=()=>{generation++;for(const url of urls)URL.revokeObjectURL(url);urls=[];if(host)host.onclick=null;host=null;};
 return {reset,async mount(target,{gateway,studentId,language}){
  reset();host=target;if(!host||!gateway.audio)return;const token=generation,l=passageCopy[language];
  let rows=[],failed=false;try{rows=await gateway.audio.list(studentId);}catch{failed=true;rows=gateway.audio.rows().filter(r=>r.studentId===studentId);}if(token!==generation||!host?.isConnected)return;
  host.innerHTML=`<h3>${l.history}</h3>${failed?`<p role="status">${l.unavailable}</p>`:''}${rows.length?`<ul class="recording-history-list">${rows.map(r=>`<li><strong>${esc(r.date)} · ${esc(passageText(r.passage))}</strong><p>${r.state==='online'?l.online:l.local}</p><button type="button" data-recording-play="${esc(r.id)}">▶</button><button type="button" data-recording-keep="${esc(r.id)}">${l.offlineCopy}</button><button type="button" data-recording-download="${esc(r.id)}">${l.download}</button><span role="status"></span></li>`).join('')}</ul>`:`<p>${l.empty}</p>`}`;
  host.onclick=async e=>{const button=e.target.closest('[data-recording-play],[data-recording-keep],[data-recording-download]');if(!button)return;button.disabled=true;const message=button.parentElement.querySelector('[role=status]');try{const id=button.dataset.recordingPlay||button.dataset.recordingKeep||button.dataset.recordingDownload;
   if(button.dataset.recordingKeep){await gateway.audio.keep(id);if(token===generation)message.textContent=l.saved;return;}
   const blob=await gateway.audio.play(id);if(token!==generation)return;const url=URL.createObjectURL(blob);urls.push(url);
   if(button.dataset.recordingDownload){const a=document.createElement('a');a.href=url;a.download='katatib-'+id;a.click();}
   else {button.parentElement.querySelector('audio')?.remove();const player=document.createElement('audio');player.controls=true;player.src=url;button.parentElement.append(player);await player.play();}
  }catch{if(token===generation)message.textContent=l.unavailable;}finally{if(button.isConnected)button.disabled=false;}};
 }};
}
