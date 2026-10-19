export const AUDIO_TEST_LIMITS={seconds:60,marks:8,sourceBytes:8*1024*1024,decodedSamples:8*1024*1024,clipSeconds:15};
export function clipWindow(at,duration,before=5,after=10){
 if(![at,duration,before,after].every(Number.isFinite)||at<0||duration<=0||at>duration+0.5||before<0||after<0||before+after<=0||before+after>30)throw new Error('invalid-audio-window');
 const point=Math.min(at,duration),start=Math.max(0,point-before),end=Math.min(duration,point+after);
 return {start,end,cue:point,before:point-start,after:end-point,partial:point<before||duration-point<after};
}
// A complete WAV per clip avoids assuming a MediaRecorder timeslice is independently playable.
export function waveClip(buffer,window){
 const rate=16000,channels=buffer.numberOfChannels;
 if(!window||!Number.isFinite(window.start)||!Number.isFinite(window.end)||!Number.isInteger(buffer.length)||buffer.length<1||!Number.isInteger(channels)||channels<1||channels>2||!Number.isFinite(buffer.sampleRate)||buffer.sampleRate<8000||buffer.sampleRate>192000||buffer.length*channels>AUDIO_TEST_LIMITS.decodedSamples||window.start<0||window.end>buffer.duration||window.end<=window.start||window.end-window.start>30)throw new Error('invalid-audio-buffer');
 const count=Math.round((window.end-window.start)*rate);if(count<1)throw new Error('empty-audio-window');const bytes=new ArrayBuffer(44+count*2),view=new DataView(bytes);
 const word=(offset,text)=>[...text].forEach((c,i)=>view.setUint8(offset+i,c.charCodeAt(0)));
 word(0,'RIFF');view.setUint32(4,36+count*2,true);word(8,'WAVE');word(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);view.setUint32(24,rate,true);view.setUint32(28,rate*2,true);view.setUint16(32,2,true);view.setUint16(34,16,true);word(36,'data');view.setUint32(40,count*2,true);
 const data=Array.from({length:channels},(_,i)=>buffer.getChannelData(i));
 for(let i=0;i<count;i++){
  const position=(window.start+i/rate)*buffer.sampleRate,index=Math.floor(position),fraction=position-index;
  let value=0;for(const channel of data){const a=channel[Math.min(index,channel.length-1)],b=channel[Math.min(index+1,channel.length-1)];value+=(a+(b-a)*fraction)/channels;}
  value=Number.isFinite(value)?Math.max(-1,Math.min(1,value)):0;view.setInt16(44+i*2,value<0?Math.round(value*32768):Math.round(value*32767),true);
 }
 return bytes;
}
export function audioMetrics({mime,reportedBitrate,sourceBytes,elapsed,decoded,clips}){
 return {schemaVersion:1,purpose:'local-phone-clipping-test',uploaded:false,sourceMime:mime,requestedBitsPerSecond:24000,reportedBitsPerSecond:Number.isFinite(reportedBitrate)?reportedBitrate:null,sourceBytes,captureSeconds:elapsed,decodedSeconds:decoded?.duration??null,decodedSampleRate:decoded?.sampleRate??null,decodedChannels:decoded?.numberOfChannels??null,measuredSourceBitsPerSecond:elapsed>0?Math.round(sourceBytes*8/elapsed):null,outputFormat:'PCM WAV, mono, 16000 Hz, 16 bit',clips:clips.map(c=>({id:c.id,surah:c.surah,ayah:c.ayah,mark:c.mark,start:c.window.start,end:c.window.end,before:c.window.before,after:c.window.after,partial:c.window.partial,waveBytes:c.wave.size,compressedBytes:c.compressed?.size??null,compressedMime:c.compressed?.type??null,played:c.played,removed:c.removed})),retainedWaveBytes:clips.filter(c=>!c.removed).reduce((n,c)=>n+c.wave.size,0)};
}
