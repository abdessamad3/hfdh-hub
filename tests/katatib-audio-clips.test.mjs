import test from 'node:test';
import assert from 'node:assert/strict';
import {clipWindow,waveClip,audioMetrics} from '../public/katatib/live/audio-clips.mjs';
test('mistake windows preserve five seconds before and ten after, and label boundary truncation',()=>{
 assert.deepEqual(clipWindow(8,30),{start:3,end:18,cue:8,before:5,after:10,partial:false});
 assert.deepEqual(clipWindow(2,7),{start:0,end:7,cue:2,before:2,after:5,partial:true});
 for(const args of [[-1,10],[12,10],[NaN,10],[1,0],[1,10,-1,3],[1,10,0,0],[1,10,20,20]])assert.throws(()=>clipWindow(...args));
});
test('each standalone WAV has the correct PCM header, rate, sample count and selected audio',()=>{
 const sampleRate=48000,length=sampleRate*30,data=new Float32Array(length);
 for(let i=0;i<length;i++)data[i]=i/sampleRate>=3&&i/sampleRate<18?0.5:-0.5;
 const buffer={numberOfChannels:1,sampleRate,length,duration:30,getChannelData:()=>data};
 const bytes=waveClip(buffer,clipWindow(8,30)),v=new DataView(bytes);
 assert.equal(bytes.byteLength,44+15*16000*2);assert.equal(v.getUint32(24,true),16000);assert.equal(v.getUint16(22,true),1);assert.equal(v.getUint16(34,true),16);assert.equal(v.getUint32(40,true),480000);
 assert.equal(Buffer.from(bytes).toString('ascii',0,4),'RIFF');assert.equal(Buffer.from(bytes).toString('ascii',8,12),'WAVE');
 assert.ok(v.getInt16(44,true)>16000);assert.ok(v.getInt16(bytes.byteLength-2,true)>16000);
 assert.throws(()=>waveClip({...buffer,numberOfChannels:3},clipWindow(8,30)));
 assert.throws(()=>waveClip(buffer,{start:4,end:3}));
});
test('downmixing, resampling, saturation and nonfinite samples produce bounded playable PCM',()=>{
 const a=new Float32Array(44100).fill(2),b=new Float32Array(44100).fill(-1);a[0]=NaN;
 const buffer={numberOfChannels:2,sampleRate:44100,length:44100,duration:1,getChannelData:i=>[a,b][i]};
 const v=new DataView(waveClip(buffer,clipWindow(0.5,1)));assert.equal(v.byteLength,32044);assert.equal(v.getInt16(44,true),0);assert.ok(v.getInt16(46,true)>16000);
});
test('the report contains measured codec/size/playback results and excludes discarded clip storage',()=>{
 const make=(id,removed)=>({id,surah:1,ayah:1,mark:'forgot',window:clipWindow(8,30),wave:new Blob([new Uint8Array(100)]),compressed:new Blob([new Uint8Array(20)],{type:'audio/webm'}),played:true,removed});
 const report=audioMetrics({mime:'audio/webm',reportedBitrate:24000,sourceBytes:30000,elapsed:10,decoded:{duration:10,sampleRate:48000,numberOfChannels:1},clips:[make('a',false),make('b',true)]});
 assert.equal(report.uploaded,false);assert.equal(report.measuredSourceBitsPerSecond,24000);assert.equal(report.retainedWaveBytes,100);assert.equal(report.clips[0].compressedBytes,20);assert.equal(report.clips[0].played,true);
 assert.equal(Object.hasOwn(report,'studentId'),false);
});
