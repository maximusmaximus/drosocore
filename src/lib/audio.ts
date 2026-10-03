let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let music: GainNode | null = null;
let sfx: GainNode | null = null;
let ambientStarted = false;
let ambientNodes: { stop: () => void } | null = null;
let danceTimer: number | null = null;
let muted = false;

function ensure(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new AC({ latencyHint: "interactive" });
    master = ctx.createGain();
    music = ctx.createGain();
    sfx = ctx.createGain();
    master.gain.value = 0.72;
    music.gain.value = 0.32;
    sfx.gain.value = 0.4;
    music.connect(master);
    sfx.connect(master);
    master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

export function unlockAudio() {
  const ac = ensure();
  if (!ac) return;
  if (!ambientStarted) {
    ambientStarted = true;
    ambientNodes = startAmbient(ac);
  }
}

export function setMuted(next: boolean) {
  muted = next;
  if (!ctx || !master) return;
  master.gain.setTargetAtTime(next ? 0 : 0.72, ctx.currentTime, 0.04);
}

export function isMuted() {
  return muted;
}

function osc(
  ac: AudioContext,
  dest: AudioNode,
  type: OscillatorType,
  freq: number,
  t0: number,
  dur: number,
  gain: number,
) {
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g);
  g.connect(dest);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}

function noiseBurst(ac: AudioContext, dest: AudioNode, t0: number, dur: number, gain: number) {
  const n = Math.floor(ac.sampleRate * dur);
  const buf = ac.createBuffer(1, n, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < n; i++) data[i] = Math.random() * 2 - 1;
  const src = ac.createBufferSource();
  src.buffer = buf;
  const f = ac.createBiquadFilter();
  f.type = "highpass";
  f.frequency.value = 1200;
  const g = ac.createGain();
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(f);
  f.connect(g);
  g.connect(dest);
  src.start(t0);
  src.stop(t0 + dur);
}

function startAmbient(ac: AudioContext) {
  if (!music) return { stop() {} };
  const bus = music;
  const drone = ac.createOscillator();
  drone.type = "sine";
  drone.frequency.value = 48;
  const drone2 = ac.createOscillator();
  drone2.type = "triangle";
  drone2.frequency.value = 96.3;
  const hum = ac.createOscillator();
  hum.type = "sawtooth";
  hum.frequency.value = 32;
  const filter = ac.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 180;
  const g = ac.createGain();
  g.gain.value = 0.18;
  const g2 = ac.createGain();
  g2.gain.value = 0.05;
  const g3 = ac.createGain();
  g3.gain.value = 0.04;
  drone.connect(g);
  drone2.connect(g2);
  hum.connect(filter);
  filter.connect(g3);
  g.connect(bus);
  g2.connect(bus);
  g3.connect(bus);
  drone.start();
  drone2.start();
  hum.start();

  const lfo = ac.createOscillator();
  lfo.frequency.value = 0.12;
  const lfoG = ac.createGain();
  lfoG.gain.value = 12;
  lfo.connect(lfoG);
  lfoG.connect(filter.frequency);
  lfo.start();

  return {
    stop() {
      drone.stop();
      drone2.stop();
      hum.stop();
      lfo.stop();
    },
  };
}

/** Circus-polka parody of Entrance of the Gladiators, detuned on purpose. */
const LEAD: [number, number, number][] = [
  [0.0, 77, 0.18],
  [0.18, 74, 0.18],
  [0.36, 77, 0.18],
  [0.54, 74, 0.18],
  [0.72, 77, 0.18],
  [0.9, 74, 0.18],
  [1.08, 70, 0.18],
  [1.26, 74, 0.18],
  [1.44, 77, 0.22],
  [1.66, 81, 0.22],
  [1.88, 82, 0.36],
  [2.28, 81, 0.16],
  [2.44, 77, 0.16],
  [2.6, 74, 0.16],
  [2.76, 70, 0.28],
  [3.12, 69, 0.14],
  [3.26, 70, 0.14],
  [3.4, 74, 0.14],
  [3.54, 77, 0.22],
  [3.8, 74, 0.4],
  [4.28, 82, 0.16],
  [4.44, 81, 0.16],
  [4.6, 77, 0.16],
  [4.76, 81, 0.28],
  [5.12, 77, 0.16],
  [5.28, 74, 0.16],
  [5.44, 70, 0.4],
  [5.92, 65, 0.2],
  [6.12, 67, 0.2],
  [6.32, 69, 0.2],
  [6.52, 70, 0.2],
  [6.72, 74, 0.2],
  [6.92, 77, 0.55],
];

const BASS: [number, number][] = [
  [0, 38],
  [0.72, 45],
  [1.44, 38],
  [2.16, 43],
  [2.88, 38],
  [3.6, 45],
  [4.32, 41],
  [5.04, 38],
  [5.76, 33],
  [6.48, 38],
];

function midi(n: number) {
  return 440 * Math.pow(2, (n - 69) / 12);
}

function playBar(ac: AudioContext, t0: number) {
  if (!music || !sfx) return;
  for (const [off, note, dur] of LEAD) {
    osc(ac, music, "square", midi(note), t0 + off, dur, 0.07);
    osc(ac, music, "square", midi(note) * 2.005, t0 + off, dur * 0.85, 0.025);
  }
  for (const [off, note] of BASS) {
    osc(ac, music, "triangle", midi(note), t0 + off, 0.68, 0.11);
    osc(ac, music, "sine", midi(note) / 2, t0 + off, 0.68, 0.08);
  }
  for (let i = 0; i < 16; i++) {
    const t = t0 + i * 0.45;
    noiseBurst(ac, sfx, t, 0.05, i % 2 === 0 ? 0.05 : 0.025);
    osc(ac, sfx, "square", i % 4 === 0 ? 180 : 140, t, 0.04, 0.04);
  }
  // kazoo buzz on the last held note
  osc(ac, music, "sawtooth", midi(86), t0 + 6.92, 0.55, 0.04);
}

function slideWhistle(ac: AudioContext, t0: number) {
  if (!sfx) return;
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = "triangle";
  o.frequency.setValueAtTime(420, t0);
  o.frequency.exponentialRampToValueAtTime(1400, t0 + 0.28);
  o.frequency.exponentialRampToValueAtTime(380, t0 + 0.55);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(0.09, t0 + 0.04);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.58);
  o.connect(g);
  g.connect(sfx);
  o.start(t0);
  o.stop(t0 + 0.6);
}

export function playCelebration() {
  const ac = ensure();
  if (!ac || !music) return;
  if (danceTimer) {
    window.clearInterval(danceTimer);
    danceTimer = null;
  }
  const now = ac.currentTime + 0.05;
  slideWhistle(ac, now);
  playBar(ac, now + 0.5);
  playBar(ac, now + 0.5 + 7.4);
  playBar(ac, now + 0.5 + 14.8);
  danceTimer = window.setInterval(() => {
    if (!ctx) return;
    playBar(ctx, ctx.currentTime + 0.02);
  }, 7400);
  window.setTimeout(() => {
    if (danceTimer) {
      window.clearInterval(danceTimer);
      danceTimer = null;
    }
  }, 22000);
}

export function playClick() {
  const ac = ensure();
  if (!ac || !sfx) return;
  osc(ac, sfx, "square", 880, ac.currentTime, 0.05, 0.05);
  osc(ac, sfx, "sine", 1320, ac.currentTime, 0.07, 0.03);
}

export function playNotify(kind: "vote" | "vote-end" | "generate" | "delivery" = "vote") {
  const ac = ensure();
  if (!ac || !sfx) return;
  const t0 = ac.currentTime;
  if (kind === "delivery") {
    osc(ac, sfx, "triangle", 220, t0, 0.12, 0.06);
    osc(ac, sfx, "sine", 440, t0 + 0.1, 0.16, 0.05);
    osc(ac, sfx, "sine", 660, t0 + 0.22, 0.2, 0.04);
    return;
  }
  if (kind === "generate") {
    osc(ac, sfx, "sine", 520, t0, 0.1, 0.05);
    osc(ac, sfx, "sine", 780, t0 + 0.12, 0.14, 0.045);
    return;
  }
  if (kind === "vote-end") {
    osc(ac, sfx, "triangle", 392, t0, 0.14, 0.055);
    osc(ac, sfx, "sine", 262, t0 + 0.14, 0.22, 0.05);
    return;
  }
  osc(ac, sfx, "sine", 660, t0, 0.08, 0.045);
  osc(ac, sfx, "sine", 880, t0 + 0.08, 0.1, 0.035);
}

export function playCrate() {
  const ac = ensure();
  if (!ac || !sfx) return;
  const t0 = ac.currentTime;
  noiseBurst(ac, sfx, t0, 0.18, 0.08);
  osc(ac, sfx, "square", 90, t0, 0.22, 0.07);
  osc(ac, sfx, "triangle", 140, t0 + 0.16, 0.28, 0.05);
  osc(ac, sfx, "sine", 55, t0 + 0.32, 0.4, 0.06);
}

export function resumeIfNeeded() {
  if (ctx && ctx.state === "suspended") void ctx.resume();
}
