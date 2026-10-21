// Horizontal reading gestures only; vertical scrolling and pinch zoom remain native.
export function swipeTurn({dx,dy,duration,width,direction='ltr',zoom=100,pointers=1}){
 if(![dx,dy,duration,width,zoom].every(Number.isFinite)||zoom!==100||pointers!==1||duration<0||duration>900||width<=0||!['rtl','ltr'].includes(direction))return 0;
 const threshold=Math.min(110,Math.max(55,width*.16));
 if(Math.abs(dx)<threshold||Math.abs(dx)<Math.abs(dy)*1.7)return 0;
 return (dx>0?1:-1)*(direction==='rtl'?1:-1);
}
export function bindMushafSwipe(host,{enabled,direction,zoom,onTurn,now=()=>performance.now()}){
 let gesture=null,suppressUntil=0;
 const suppress=()=>{suppressUntil=now()+500;};
 function start(e){
  if(e.touches.length!==1){gesture=null;suppress();return;}
  const viewport=e.target.closest?.('.mushaf-page-viewport');
  if(!viewport||!host.contains(viewport)||!enabled()||zoom()!==100){gesture=null;return;}
  const t=e.touches[0];gesture={id:t.identifier,x:t.clientX,y:t.clientY,at:now(),viewport,width:viewport.getBoundingClientRect().width,vertical:false};
 }
 function move(e){
  if(!gesture)return;
  if(e.touches.length!==1){gesture=null;suppress();return;}
  const t=[...e.touches].find(t=>t.identifier===gesture.id);if(!t){gesture=null;return;}
  const dx=t.clientX-gesture.x,dy=t.clientY-gesture.y;
  if(Math.hypot(dx,dy)>9)suppress();
  // A scroll that began vertically must never become a page turn later.
  if(Math.abs(dy)>14&&Math.abs(dy)>Math.abs(dx))gesture.vertical=true;
 }
 function end(e){
  const g=gesture;gesture=null;if(!g)return;
  const t=[...e.changedTouches].find(t=>t.identifier===g.id);if(!t)return;
  const dx=t.clientX-g.x,dy=t.clientY-g.y;if(Math.hypot(dx,dy)>9)suppress();
  if(e.touches.length||g.vertical||!g.viewport.isConnected||!enabled())return;
  const turn=swipeTurn({dx,dy,duration:now()-g.at,width:g.width,direction:direction(),zoom:zoom()});
  if(turn){suppress();onTurn(turn);suppress();}
 }
 function cancel(){gesture=null;suppress();}
 function click(e){if(e.detail!==0&&now()<suppressUntil&&e.target.closest?.('.mushaf-page-viewport')){e.preventDefault();e.stopImmediatePropagation();}}
 const visual=globalThis.visualViewport;
 function nativeZoom(){for(const viewport of host.querySelectorAll('.mushaf-page-viewport'))viewport.dataset.nativeZoomed=String((visual?.scale||1)>1.05);}
 visual?.addEventListener('resize',nativeZoom);nativeZoom();
 host.addEventListener('touchstart',start,{passive:true});host.addEventListener('touchmove',move,{passive:true});host.addEventListener('touchend',end,{passive:true});host.addEventListener('touchcancel',cancel,{passive:true});host.addEventListener('click',click,true);
 return ()=>{gesture=null;visual?.removeEventListener('resize',nativeZoom);host.removeEventListener('touchstart',start);host.removeEventListener('touchmove',move);host.removeEventListener('touchend',end);host.removeEventListener('touchcancel',cancel);host.removeEventListener('click',click,true);};
}
