const STORAGE_KEY = 'battleship-ai-muted';

let audioContext = null;
let muted = false;

loadMutedPreference();

function loadMutedPreference() {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    muted = window.localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    muted = false;
  }
}

function saveMutedPreference() {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.setItem(STORAGE_KEY, muted ? '1' : '0');
  } catch {
    // ignore
  }
}

function getAudioContext() {
  if (muted) return null;
  if (audioContext) return audioContext;

  try {
    const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextCtor) return null;
    audioContext = new AudioContextCtor();
    return audioContext;
  } catch {
    audioContext = null;
    return null;
  }
}

function withContext(callback) {
  const context = getAudioContext();
  if (!context) return;
  try {
    if (context.state === 'suspended') {
      context.resume()
        .then(() => callback(context))
        .catch(() => {});
      return;
    }
    callback(context);
  } catch {
    // ignore
  }
}

function scheduleTone(context, {
  type = 'sine',
  frequency = 440,
  endFrequency = frequency,
  gain = 0.1,
  duration = 0.2,
  attack = 0.01,
  release = 0.06,
  delay = 0,
  detune = 0,
}) {
  const startTime = context.currentTime + delay;
  const stopTime = startTime + duration + release + 0.05;
  const oscillator = context.createOscillator();
  const envelope = context.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, startTime);
  if (endFrequency !== frequency) {
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, endFrequency), startTime + duration);
  }
  oscillator.detune.setValueAtTime(detune, startTime);

  envelope.gain.setValueAtTime(0.0001, startTime);
  envelope.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), startTime + attack);
  envelope.gain.exponentialRampToValueAtTime(0.0001, startTime + duration + release);

  oscillator.connect(envelope);
  envelope.connect(context.destination);
  oscillator.start(startTime);
  oscillator.stop(stopTime);
}

function playNoise(context, { gain = 0.05, duration = 0.16, lowpass = 1800, delay = 0 } = {}) {
  const startTime = context.currentTime + delay;
  const sampleRate = context.sampleRate;
  const buffer = context.createBuffer(1, Math.ceil(duration * sampleRate), sampleRate);
  const data = buffer.getChannelData(0);
  for (let index = 0; index < data.length; index += 1) {
    data[index] = (Math.random() * 2) - 1;
  }

  const source = context.createBufferSource();
  const filter = context.createBiquadFilter();
  const envelope = context.createGain();

  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(lowpass, startTime);

  envelope.gain.setValueAtTime(0.0001, startTime);
  envelope.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), startTime + 0.015);
  envelope.gain.exponentialRampToValueAtTime(0.0001, startTime + duration + 0.04);

  source.buffer = buffer;
  source.connect(filter);
  filter.connect(envelope);
  envelope.connect(context.destination);
  source.start(startTime);
  source.stop(startTime + duration + 0.08);
}

function playHitSound() {
  withContext((context) => {
    scheduleTone(context, {
      type: 'sine',
      frequency: 260,
      endFrequency: 140,
      gain: 0.13,
      duration: 0.13,
      attack: 0.004,
      release: 0.05,
    });
    scheduleTone(context, {
      type: 'triangle',
      frequency: 520,
      endFrequency: 220,
      gain: 0.045,
      duration: 0.09,
      attack: 0.002,
      release: 0.04,
      delay: 0.012,
    });
  });
}

function playSinkEnemySound() {
  withContext((context) => {
    scheduleTone(context, {
      type: 'triangle',
      frequency: 220,
      endFrequency: 90,
      gain: 0.12,
      duration: 0.18,
      attack: 0.01,
      release: 0.08,
    });
    scheduleTone(context, {
      type: 'sine',
      frequency: 145,
      endFrequency: 60,
      gain: 0.08,
      duration: 0.24,
      attack: 0.01,
      release: 0.1,
      delay: 0.08,
    });
    playNoise(context, {
      gain: 0.03,
      duration: 0.14,
      lowpass: 1500,
      delay: 0.02,
    });
  });
}

function playIncomingHitSound() {
  withContext((context) => {
    scheduleTone(context, {
      type: 'sawtooth',
      frequency: 420,
      endFrequency: 180,
      gain: 0.085,
      duration: 0.12,
      attack: 0.002,
      release: 0.05,
    });
    scheduleTone(context, {
      type: 'square',
      frequency: 180,
      endFrequency: 90,
      gain: 0.055,
      duration: 0.16,
      attack: 0.002,
      release: 0.06,
      delay: 0.02,
    });
    playNoise(context, {
      gain: 0.035,
      duration: 0.1,
      lowpass: 2200,
      delay: 0.01,
    });
  });
}

function playSinkPlayerSound() {
  withContext((context) => {
    scheduleTone(context, {
      type: 'triangle',
      frequency: 160,
      endFrequency: 58,
      gain: 0.12,
      duration: 0.24,
      attack: 0.01,
      release: 0.1,
    });
    scheduleTone(context, {
      type: 'sine',
      frequency: 92,
      endFrequency: 36,
      gain: 0.1,
      duration: 0.36,
      attack: 0.01,
      release: 0.15,
      delay: 0.08,
    });
    playNoise(context, {
      gain: 0.04,
      duration: 0.18,
      lowpass: 1200,
      delay: 0.05,
    });
  });
}

function playVictorySound() {
  withContext((context) => {
    scheduleTone(context, {
      type: 'triangle',
      frequency: 440,
      endFrequency: 587,
      gain: 0.08,
      duration: 0.11,
      attack: 0.004,
      release: 0.04,
    });
    scheduleTone(context, {
      type: 'triangle',
      frequency: 587,
      endFrequency: 740,
      gain: 0.09,
      duration: 0.11,
      attack: 0.004,
      release: 0.04,
      delay: 0.12,
    });
    scheduleTone(context, {
      type: 'sine',
      frequency: 740,
      endFrequency: 988,
      gain: 0.1,
      duration: 0.16,
      attack: 0.004,
      release: 0.06,
      delay: 0.24,
    });
    scheduleTone(context, {
      type: 'triangle',
      frequency: 988,
      endFrequency: 1175,
      gain: 0.08,
      duration: 0.18,
      attack: 0.004,
      release: 0.06,
      delay: 0.38,
    });
  });
}

function playDefeatSound() {
  withContext((context) => {
    scheduleTone(context, {
      type: 'sine',
      frequency: 196,
      endFrequency: 164,
      gain: 0.045,
      duration: 0.18,
      attack: 0.01,
      release: 0.08,
    });
    scheduleTone(context, {
      type: 'triangle',
      frequency: 164,
      endFrequency: 130,
      gain: 0.038,
      duration: 0.18,
      attack: 0.01,
      release: 0.08,
      delay: 0.12,
    });
    scheduleTone(context, {
      type: 'sine',
      frequency: 130,
      endFrequency: 98,
      gain: 0.03,
      duration: 0.22,
      attack: 0.01,
      release: 0.1,
      delay: 0.26,
    });
    playNoise(context, {
      gain: 0.012,
      duration: 0.12,
      lowpass: 700,
      delay: 0.04,
    });
  });
}

function playMissSound() {
  withContext((context) => {
    playNoise(context, {
      gain: 0.02,
      duration: 0.08,
      lowpass: 900,
    });
    scheduleTone(context, {
      type: 'sine',
      frequency: 620,
      endFrequency: 440,
      gain: 0.018,
      duration: 0.05,
      attack: 0.002,
      release: 0.03,
      delay: 0.01,
    });
  });
}

export function playHit() {
  if (muted) return;
  playHitSound();
}

export function playSinkEnemy() {
  if (muted) return;
  playSinkEnemySound();
}

export function playIncomingHit() {
  if (muted) return;
  playIncomingHitSound();
}

export function playSinkPlayer() {
  if (muted) return;
  playSinkPlayerSound();
}

export function playVictory() {
  if (muted) return;
  playVictorySound();
}

export function playDefeat() {
  if (muted) return;
  playDefeatSound();
}

export function playMiss() {
  if (muted) return;
  playMissSound();
}

export function unlockAudio() {
  const context = getAudioContext();
  if (!context) return false;

  try {
    if (context.state === 'suspended') {
      void context.resume();
    }
    const buffer = context.createBuffer(1, 1, 22050);
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(context.destination);
    source.start(0);
    return true;
  } catch {
    return false;
  }
}

export function isMuted() {
  return muted;
}

export function setMuted(nextMuted) {
  muted = Boolean(nextMuted);
  saveMutedPreference();
  if (muted && audioContext) {
    try {
      void audioContext.suspend();
    } catch {
      // ignore
    }
  }
}

export function toggleMuted() {
  setMuted(!muted);
  return muted;
}

export async function resume() {
  if (muted) return false;
  const context = getAudioContext();
  if (!context) return false;
  try {
    if (context.state === 'suspended') {
      await context.resume();
    }
    return true;
  } catch {
    return false;
  }
}
