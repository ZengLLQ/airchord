import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SAMPLE_RATE = 44100;
const DURATION_SEC = 3.0;
const TOTAL_SAMPLES = Math.floor(SAMPLE_RATE * DURATION_SEC);

// Chord definitions with standard guitar tunings and frets
// Standard tuning: E2 (82.41), A2 (110.0), D3 (146.83), G3 (196.0), B3 (246.94), E4 (329.63)
const OPEN_STRING_FREQ = [82.4069, 110.0000, 146.8324, 196.0000, 246.9417, 329.6276];

function getFreq(stringIdx, fret) {
  if (fret < 0) return 0; // muted
  const baseFreq = OPEN_STRING_FREQ[stringIdx];
  return baseFreq * Math.pow(2, fret / 12);
}

const CHORDS = [
  {
    id: 'c-major',
    name: 'C Major',
    // x 3 2 0 1 0
    frets: [-1, 3, 2, 0, 1, 0],
  },
  {
    id: 'g-major',
    name: 'G Major',
    // 3 2 0 0 0 3 (or 3 2 0 0 3 3)
    frets: [3, 2, 0, 0, 0, 3],
  },
  {
    id: 'd-major',
    name: 'D Major',
    // x x 0 2 3 2
    frets: [-1, -1, 0, 2, 3, 2],
  },
  {
    id: 'e-minor',
    name: 'E Minor',
    // 0 2 2 0 0 0
    frets: [0, 2, 2, 0, 0, 0],
  },
  {
    id: 'a-minor',
    name: 'A Minor',
    // x 0 2 2 1 0
    frets: [-1, 0, 2, 2, 1, 0],
  },
];

// Physical acoustic guitar synthesizer (Karplus-Strong with body resonance)
function synthesizeString(freq, sampleRate, totalSamples, decayFactor = 0.995) {
  if (freq <= 0) return new Float32Array(totalSamples);

  const period = Math.round(sampleRate / freq);
  const ringBuffer = new Float32Array(period);
  const output = new Float32Array(totalSamples);

  // Excitation: shaped noise burst (pick attack)
  // Low strings have slightly warmer, longer pick noise
  for (let i = 0; i < period; i++) {
    // Pinkish noise with high-frequency attenuation
    const white = (Math.random() * 2 - 1);
    const envelope = Math.exp(-3 * (i / period));
    ringBuffer[i] = white * envelope;
  }

  let bufIdx = 0;
  let prevSample = 0;

  for (let n = 0; n < totalSamples; n++) {
    const curSample = ringBuffer[bufIdx];
    output[n] = curSample;

    // Karplus-Strong lowpass filter: (cur + prev) / 2 * decay
    const filtered = 0.5 * (curSample + prevSample) * decayFactor;
    ringBuffer[bufIdx] = filtered;
    prevSample = curSample;

    bufIdx = (bufIdx + 1) % period;
  }

  return output;
}

// Biquad filter implementation for guitar acoustic cavity resonance
function applyResonanceFilter(samples, sampleRate) {
  // Acoustic guitar body resonances typically peak around 100 Hz (air) and 200 Hz (soundboard)
  const output = new Float32Array(samples.length);

  // Peak filter 1: 105 Hz (Air cavity resonance / Helmholtz)
  const f0 = 105.0;
  const Q = 3.5;
  const gainDb = 5.0;
  const A = Math.pow(10, gainDb / 40);
  const w0 = (2 * Math.PI * f0) / sampleRate;
  const alpha = Math.sin(w0) / (2 * Q);

  const b0 = 1 + alpha * A;
  const b1 = -2 * Math.cos(w0);
  const b2 = 1 - alpha * A;
  const a0 = 1 + alpha / A;
  const a1 = -2 * Math.cos(w0);
  const a2 = 1 - alpha / A;

  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;

  for (let i = 0; i < samples.length; i++) {
    const x0 = samples[i];
    const y0 = (b0 / a0) * x0 + (b1 / a0) * x1 + (b2 / a0) * x2 - (a1 / a0) * y1 - (a2 / a0) * y2;
    x2 = x1;
    x1 = x0;
    y2 = y1;
    y1 = y0;
    output[i] = y0;
  }

  return output;
}

function synthesizeChord(frets, direction) {
  // Determine playable strings
  const playedStrings = [];
  for (let s = 0; s < 6; s++) {
    const fret = frets[s];
    if (fret >= 0) {
      playedStrings.push({
        stringIdx: s,
        freq: getFreq(s, fret),
        pan: (s - 2.5) / 3.0 * 0.4, // Subtle stereo spread
      });
    }
  }

  // Downstroke: lowest string first -> highest string last
  // Upstroke: highest string first -> lowest string last
  const strumOrder = direction === 'down' ? playedStrings : [...playedStrings].reverse();

  const leftChannel = new Float32Array(TOTAL_SAMPLES);
  const rightChannel = new Float32Array(TOTAL_SAMPLES);

  // Strumming delay between strings (around 16ms for natural brisk strum)
  const stringDelaySec = 0.016;
  const stringDelaySamples = Math.round(SAMPLE_RATE * stringDelaySec);

  strumOrder.forEach((str, pickIdx) => {
    const startSample = pickIdx * stringDelaySamples;
    if (startSample >= TOTAL_SAMPLES) return;

    // Decay factor is slightly higher for thicker/lower strings
    const decay = 0.993 + (str.stringIdx < 3 ? 0.003 : 0.001);
    const stringSamples = synthesizeString(str.freq, SAMPLE_RATE, TOTAL_SAMPLES - startSample, decay);

    // Filter with body resonance
    const resonantSamples = applyResonanceFilter(stringSamples, SAMPLE_RATE);

    const panL = 0.5 * (1 - str.pan);
    const panR = 0.5 * (1 + str.pan);

    for (let i = 0; i < resonantSamples.length; i++) {
      const outIdx = startSample + i;
      if (outIdx >= TOTAL_SAMPLES) break;
      leftChannel[outIdx] += resonantSamples[i] * panL;
      rightChannel[outIdx] += resonantSamples[i] * panR;
    }
  });

  // Normalize
  let maxAmp = 0;
  for (let i = 0; i < TOTAL_SAMPLES; i++) {
    const absL = Math.abs(leftChannel[i]);
    const absR = Math.abs(rightChannel[i]);
    if (absL > maxAmp) maxAmp = absL;
    if (absR > maxAmp) maxAmp = absR;
  }

  if (maxAmp > 0) {
    const normFactor = 0.88 / maxAmp;
    for (let i = 0; i < TOTAL_SAMPLES; i++) {
      leftChannel[i] *= normFactor;
      rightChannel[i] *= normFactor;
    }
  }

  return { left: leftChannel, right: rightChannel };
}

// Convert stereo Float32 to 16-bit PCM WAV Buffer
function createWavBuffer(left, right, sampleRate) {
  const numChannels = 2;
  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = left.length * blockAlign;
  const buffer = Buffer.alloc(44 + dataSize);

  // RIFF chunk descriptor
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);

  // "fmt " sub-chunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // subchunk1size (16 for PCM)
  buffer.writeUInt16LE(1, 20); // audio format (1 = PCM)
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bytesPerSample * 8, 34); // bits per sample

  // "data" sub-chunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  let offset = 44;
  for (let i = 0; i < left.length; i++) {
    // Clamp between -1 and 1
    const sL = Math.max(-1, Math.min(1, left[i]));
    const sR = Math.max(-1, Math.min(1, right[i]));
    const intL = sL < 0 ? Math.round(sL * 32768) : Math.round(sL * 32767);
    const intR = sR < 0 ? Math.round(sR * 32768) : Math.round(sR * 32767);

    buffer.writeInt16LE(intL, offset);
    buffer.writeInt16LE(intR, offset + 2);
    offset += 4;
  }

  return buffer;
}

// Ensure output directory exists
const outputDir = path.resolve(__dirname, '../public/audio/chords');
fs.mkdirSync(outputDir, { recursive: true });

console.log(`Generating acoustic guitar chord samples in: ${outputDir}`);

for (const chord of CHORDS) {
  for (const direction of ['down', 'up']) {
    const filename = `${chord.id}-${direction}.wav`;
    const filePath = path.join(outputDir, filename);

    console.log(`Synthesizing ${chord.name} (${direction})...`);
    const { left, right } = synthesizeChord(chord.frets, direction);
    const wavBuffer = createWavBuffer(left, right, SAMPLE_RATE);

    fs.writeFileSync(filePath, wavBuffer);
    console.log(`Saved ${filename} (${(wavBuffer.length / 1024).toFixed(1)} KB)`);
  }
}

// Also write an asset manifest file in public/audio/
const manifest = {
  version: '1.0.0',
  sampleRate: SAMPLE_RATE,
  chords: CHORDS.map((c) => ({
    id: c.id,
    name: c.name,
    frets: c.frets,
    down: `/audio/chords/${c.id}-down.wav`,
    up: `/audio/chords/${c.id}-up.wav`,
  })),
};

fs.writeFileSync(
  path.resolve(__dirname, '../public/audio/manifest.json'),
  JSON.stringify(manifest, null, 2)
);
console.log('Audio asset manifest created successfully.');
