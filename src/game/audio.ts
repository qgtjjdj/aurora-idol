let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let sfx: GainNode | null = null;
let music: GainNode | null = null;
let musicTimer = 0;
let musicOn = false;
let muted = false;

const BED = [220, 261.63, 293.66, 329.63, 392, 329.63, 293.66, 246.94];
let step = 0;

function ensure() {
  if (ctx) return ctx;
  const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  ctx = new Ctx({ latencyHint: "interactive" });
  master = ctx.createGain();
  sfx = ctx.createGain();
  music = ctx.createGain();
  master.gain.value = 0.9;
  sfx.gain.value = 0.85;
  music.gain.value = 0.22;
  sfx.connect(master);
  music.connect(master);
  master.connect(ctx.destination);
  return ctx;
}

export function unlockAudio() {
  const audio = ensure();
  if (audio.state === "suspended") void audio.resume();
}

export function resumeAudio() {
  if (ctx && ctx.state === "suspended") void ctx.resume();
}

export function setMuted(next: boolean) {
  muted = next;
  if (!master || !ctx) return;
  master.gain.setTargetAtTime(next ? 0 : 0.9, ctx.currentTime, 0.02);
}

function envGain(at: number, peak: number, dur: number) {
  const audio = ctx!;
  const g = audio.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(Math.max(0.001, peak), at + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  return g;
}

function tone(freq: number, dur: number, type: OscillatorType, peak: number, when = 0, slide?: number) {
  if (!ctx || !sfx || muted) return;
  const at = ctx.currentTime + when;
  const o = ctx.createOscillator();
  const g = envGain(at, peak, dur);
  o.type = type;
  o.frequency.setValueAtTime(freq, at);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, slide), at + dur);
  o.connect(g);
  g.connect(sfx);
  o.start(at);
  o.stop(at + dur + 0.02);
  o.onended = () => {
    o.disconnect();
    g.disconnect();
  };
}

export function playSpin() {
  if (!ctx || muted) return;
  tone(180, 0.18, "sawtooth", 0.04, 0, 90);
  tone(420, 0.09, "square", 0.03);
}

export function playStop(index: number) {
  const wobble = 0.96 + Math.random() * 0.08;
  tone((240 + index * 55) * wobble, 0.07, "triangle", 0.08);
}

export function playScatter() {
  tone(520, 0.12, "sine", 0.08);
  tone(780, 0.16, "sine", 0.06, 0.07);
  tone(1040, 0.2, "triangle", 0.05, 0.14);
}

export function playWin(level: 1 | 2 | 3 | 4) {
  const chords = [
    [523, 659, 784],
    [523, 659, 784, 1046],
    [392, 523, 659, 784, 1046],
    [349, 440, 523, 698, 880, 1046],
  ];
  const notes = chords[level - 1]!;
  notes.forEach((freq, i) => tone(freq, 0.18 + level * 0.04, "triangle", 0.05 + level * 0.008, i * 0.07));
}

export function playClick() {
  tone(640, 0.04, "square", 0.03);
}

function musicTick() {
  if (!ctx || !music || !musicOn) return;
  const at = ctx.currentTime;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = "sine";
  o.frequency.value = BED[step % BED.length]!;
  step++;
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(muted ? 0.0001 : 0.045, at + 0.04);
  g.gain.exponentialRampToValueAtTime(0.0001, at + 0.46);
  o.connect(g);
  g.connect(music);
  o.start(at);
  o.stop(at + 0.48);
  o.onended = () => {
    o.disconnect();
    g.disconnect();
  };
  musicTimer = window.setTimeout(musicTick, 520);
}

export function startMusic() {
  unlockAudio();
  if (musicOn) return;
  musicOn = true;
  window.clearTimeout(musicTimer);
  musicTick();
}

export function stopMusic() {
  musicOn = false;
  window.clearTimeout(musicTimer);
}
