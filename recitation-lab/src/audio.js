// Microphone capture and a rolling buffer of 16 kHz mono audio.

export const SAMPLE_RATE = 16000;

export class AudioBuffer16k {
  constructor(keepAll = false) {
    this.chunks = [];
    this.total = 0; // samples
    this.keepAll = keepAll;
    this.maxKeep = SAMPLE_RATE * 40; // rolling copy for the model
  }
  append(f32) {
    this.chunks.push(f32);
    this.total += f32.length;
    if (!this.keepAll) {
      let held = this.chunks.reduce((n, c) => n + c.length, 0);
      while (held - this.chunks[0].length > this.maxKeep) { held -= this.chunks[0].length; this.chunks.shift(); }
    }
  }
  seconds() { return this.total / SAMPLE_RATE; }
  tail(seconds) {
    const want = Math.round(seconds * SAMPLE_RATE);
    const out = new Float32Array(Math.min(want, this.chunks.reduce((n, c) => n + c.length, 0)));
    let pos = out.length;
    for (let i = this.chunks.length - 1; i >= 0 && pos > 0; i--) {
      const c = this.chunks[i];
      const take = Math.min(c.length, pos);
      out.set(c.subarray(c.length - take), pos - take);
      pos -= take;
    }
    return out;
  }
  all() {
    const out = new Float32Array(this.chunks.reduce((n, c) => n + c.length, 0));
    let p = 0;
    for (const c of this.chunks) { out.set(c, p); p += c.length; }
    return out;
  }
}

export function rms(f32) {
  if (!f32.length) return 0;
  let s = 0;
  for (let i = 0; i < f32.length; i++) s += f32[i] * f32[i];
  return Math.sqrt(s / f32.length);
}

const WORKLET = `
class Grab extends AudioWorkletProcessor {
  constructor() { super(); this.buf = new Float32Array(2048); this.n = 0; }
  process(inputs) {
    const ch = inputs[0][0];
    if (ch) {
      for (let i = 0; i < ch.length; i++) {
        this.buf[this.n++] = ch[i];
        if (this.n === this.buf.length) { this.port.postMessage(this.buf.slice(0)); this.n = 0; }
      }
    }
    return true;
  }
}
registerProcessor('grab', Grab);`;

export async function startMic(onChunk) {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { channelCount: 1, echoCancellation: false, noiseSuppression: true, autoGainControl: true },
  });
  const ctx = new AudioContext({ sampleRate: SAMPLE_RATE });
  const url = URL.createObjectURL(new Blob([WORKLET], { type: 'application/javascript' }));
  await ctx.audioWorklet.addModule(url);
  URL.revokeObjectURL(url);
  const src = ctx.createMediaStreamSource(stream);
  const node = new AudioWorkletNode(ctx, 'grab');
  node.port.onmessage = (e) => onChunk(e.data);
  src.connect(node);
  return {
    actualRate: ctx.sampleRate,
    async stop() {
      node.disconnect(); src.disconnect();
      stream.getTracks().forEach((t) => t.stop());
      await ctx.close();
    },
  };
}

// Feeds an audio file into the buffer at real-time speed, as if it came from the microphone.
export async function startFile(file, onChunk, onEnd) {
  const ctx = new AudioContext({ sampleRate: SAMPLE_RATE });
  const decoded = await ctx.decodeAudioData(await file.arrayBuffer());
  await ctx.close();
  const data = decoded.getChannelData(0);
  const step = 2048;
  let pos = 0;
  const timer = setInterval(() => {
    if (pos >= data.length) { clearInterval(timer); onEnd(); return; }
    onChunk(data.slice(pos, pos + step));
    pos += step;
  }, (step / SAMPLE_RATE) * 1000);
  return { actualRate: SAMPLE_RATE, durationSec: data.length / SAMPLE_RATE, async stop() { clearInterval(timer); } };
}

export function encodeWav(f32, rate = SAMPLE_RATE) {
  const buf = new ArrayBuffer(44 + f32.length * 2);
  const v = new DataView(buf);
  const w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  w(0, 'RIFF'); v.setUint32(4, 36 + f32.length * 2, true); w(8, 'WAVEfmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  w(36, 'data'); v.setUint32(40, f32.length * 2, true);
  for (let i = 0; i < f32.length; i++) {
    const s = Math.max(-1, Math.min(1, f32[i]));
    v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Blob([buf], { type: 'audio/wav' });
}
