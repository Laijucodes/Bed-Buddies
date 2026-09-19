/*
  Hushroom Web Audio engine.

  Signal flow (per track):
    generators -> trackMix -> volume -> EQ low/mid/high (peaking) -> bus
  Bus:
    bus(headroom) -> master EQ (5 peaking bands) -> compressor -> limiter -> master -> destination

  Headroom: bus gain = min(1, 0.8 / sqrt(sum(volume_i^2))) so stacking loops
  never clips before the limiter. Every parameter change is ramped (no zipper
  noise). Native builds mirror this graph with AVAudioEngine / Oboe.
*/

import type { Family } from "../data/soundCatalog";

type NoiseColor = "white" | "pink" | "brown";
type Bed = { color: NoiseColor; type: BiquadFilterType; freq: number; q?: number; gain: number; lfo?: { rate: number; depth: number } };
type Impulses = { rate: number; freq: number; q: number; decay: number; gain: number; regular?: boolean; jitter?: number; color?: NoiseColor };
type ToneSpec = { type: OscillatorType; freq: number; gain: number; harmonics?: number[]; lfo?: { rate: number; depth: number } };
type Chimes = { notes: number[]; wave: OscillatorType; rate: number; decay: number; gain: number; sweep?: number; metallic?: boolean };
type Rumble = { every: number; gain: number; length: number; harsh?: boolean };
type Breath = { rate: number; freq: number; gain: number; murmur?: number };
export type Recipe = { beds?: Bed[]; impulses?: Impulses[]; tones?: ToneSpec[]; chimes?: Chimes[]; rumble?: Rumble; breath?: Breath; loudness?: number };

const bed = (color: NoiseColor, type: BiquadFilterType, freq: number, gain: number, q = 0.7, lfo?: { rate: number; depth: number }): Bed => ({ color, type, freq, q, gain, lfo });
const imp = (rate: number, freq: number, q: number, decay: number, gain: number, extra: Partial<Impulses> = {}): Impulses => ({ rate, freq, q, decay, gain, ...extra });
const tone = (type: OscillatorType, freq: number, gain: number, extra: Partial<ToneSpec> = {}): ToneSpec => ({ type, freq, gain, ...extra });
const chime = (notes: number[], wave: OscillatorType, rate: number, decay: number, gain: number, extra: Partial<Chimes> = {}): Chimes => ({ notes, wave, rate, decay, gain, ...extra });

const RAIN_SOFT: Recipe = { beds: [bed("pink", "bandpass", 1900, 0.42, 0.5, { rate: 0.07, depth: 0.15 })], impulses: [imp(16, 3400, 2, 0.03, 0.06, { jitter: 0.7 })] };
const RAIN_HEAVY: Recipe = { beds: [bed("white", "bandpass", 2400, 0.4, 0.45), bed("brown", "lowpass", 300, 0.3)], impulses: [imp(45, 3000, 1.5, 0.025, 0.06, { jitter: 0.8 })] };
const WIND: Recipe = { beds: [bed("pink", "bandpass", 520, 0.5, 0.6, { rate: 0.05, depth: 0.7 }), bed("brown", "lowpass", 180, 0.35, 0.7, { rate: 0.031, depth: 0.6 })] };
const FIRE: Recipe = { beds: [bed("brown", "lowpass", 420, 0.36, 0.7, { rate: 0.33, depth: 0.3 })], impulses: [imp(7, 2600, 4, 0.02, 0.14, { jitter: 1 }), imp(1.2, 900, 3, 0.05, 0.1)] };
const CREEK: Recipe = { beds: [bed("white", "bandpass", 1500, 0.32, 0.8, { rate: 0.45, depth: 0.25 }), bed("pink", "bandpass", 650, 0.28, 1, { rate: 0.27, depth: 0.35 })] };
const OCEAN: Recipe = { beds: [bed("brown", "lowpass", 420, 0.5, 0.7, { rate: 0.085, depth: 0.85 }), bed("white", "bandpass", 2200, 0.12, 0.6, { rate: 0.085, depth: 0.9 })] };
const CAFE: Recipe = { beds: [bed("pink", "lowpass", 720, 0.38, 0.7, { rate: 0.2, depth: 0.35 })], chimes: [chime([2400, 3100, 2800, 3600], "sine", 0.3, 0.35, 0.045, { metallic: true })], impulses: [imp(0.5, 500, 1, 0.08, 0.08)] };
const CROWD: Recipe = { beds: [bed("pink", "lowpass", 330, 0.42, 0.7, { rate: 0.13, depth: 0.4 }), bed("brown", "lowpass", 120, 0.2)] };
const ROOM: Recipe = { beds: [bed("brown", "lowpass", 140, 0.32), bed("pink", "lowpass", 520, 0.1, 0.7, { rate: 0.09, depth: 0.3 })] };
const HUM: Recipe = { tones: [tone("sine", 60, 0.06, { harmonics: [1, 2, 3] }), tone("sine", 120, 0.02)], beds: [bed("pink", "lowpass", 260, 0.22)] };
const TRAIN: Recipe = { tones: [tone("sawtooth", 42, 0.05, { lfo: { rate: 0.4, depth: 0.3 } })], beds: [bed("brown", "lowpass", 260, 0.42), bed("pink", "bandpass", 1200, 0.08, 0.6)], impulses: [imp(2.3, 190, 3, 0.07, 0.16, { regular: true }), imp(2.3, 260, 2, 0.05, 0.1, { regular: true })] };
const STATIC: Recipe = { beds: [bed("white", "highpass", 1800, 0.16), bed("pink", "bandpass", 700, 0.05)], tones: [tone("sine", 60, 0.015)] };
const CREAK: Recipe = { beds: [bed("pink", "lowpass", 300, 0.12, 0.7, { rate: 0.05, depth: 0.5 })], impulses: [imp(0.35, 340, 14, 0.4, 0.22, { jitter: 0.5, color: "pink" }), imp(0.2, 180, 10, 0.5, 0.16, { color: "pink" })] };
const BIRDS: Recipe = { beds: [bed("pink", "bandpass", 900, 0.12, 0.6, { rate: 0.04, depth: 0.4 })], chimes: [chime([2600, 3200, 3900, 4400], "sine", 0.9, 0.12, 0.05, { sweep: 1.3 }), chime([1800, 2100], "triangle", 0.3, 0.25, 0.035, { sweep: 0.8 })] };
const CRICKETS: Recipe = { beds: [bed("pink", "lowpass", 260, 0.14)], chimes: [chime([4200, 4400], "sine", 6, 0.06, 0.02), chime([300], "sine", 0.1, 1.2, 0.03)] };
const CLOCK: Recipe = { ...ROOM, impulses: [imp(1, 2200, 6, 0.02, 0.12, { regular: true }), imp(0.5, 1500, 5, 0.02, 0.06, { regular: true })] };
const LIBRARY: Recipe = { ...ROOM, impulses: [imp(0.18, 1300, 0.6, 0.18, 0.09, { color: "pink" }), imp(0.08, 400, 1, 0.1, 0.08)] };
const WORKSHOP: Recipe = { ...ROOM, impulses: [imp(1.1, 900, 3, 0.06, 0.12, { jitter: 0.8 }), imp(0.3, 2400, 5, 0.05, 0.08)] };
const SPACE: Recipe = { tones: [tone("sine", 55, 0.05, { harmonics: [1, 2] }), tone("sine", 110, 0.035, { lfo: { rate: 0.06, depth: 0.5 } }), tone("triangle", 164.8, 0.012, { lfo: { rate: 0.041, depth: 0.7 } })], beds: [bed("pink", "lowpass", 220, 0.18)] };
const CHIMES_METAL: Recipe = { beds: [bed("pink", "bandpass", 480, 0.14, 0.6, { rate: 0.05, depth: 0.6 })], chimes: [chime([880, 987.8, 1174.7, 1318.5, 1568], "sine", 0.55, 3.2, 0.07, { metallic: true })] };
const BREATH_F: Recipe = { breath: { rate: 0.22, freq: 900, gain: 0.26 } };
const BREATH_M: Recipe = { breath: { rate: 0.17, freq: 520, gain: 0.3 } };

export const FAMILIES: Record<Family, Recipe> = {
  "rain-soft": RAIN_SOFT,
  "rain-heavy": RAIN_HEAVY,
  "rain-tin": { beds: [bed("pink", "bandpass", 2600, 0.3, 0.5)], impulses: [imp(22, 4200, 6, 0.04, 0.09, { jitter: 0.6 }), imp(3, 1900, 8, 0.08, 0.07)] },
  "rain-glass": { beds: [bed("pink", "bandpass", 2200, 0.24, 0.6)], impulses: [imp(18, 5200, 7, 0.05, 0.07, { jitter: 0.5 })] },
  "rain-car": { beds: [bed("pink", "lowpass", 900, 0.34, 0.7, { rate: 0.07, depth: 0.15 }), bed("brown", "lowpass", 160, 0.24)], impulses: [imp(20, 2200, 2, 0.03, 0.05)], tones: [tone("sine", 48, 0.025, { lfo: { rate: 0.5, depth: 0.4 } })] },
  "rain-city": { beds: [bed("pink", "bandpass", 1700, 0.34, 0.5), bed("brown", "lowpass", 200, 0.3, 0.7, { rate: 0.06, depth: 0.5 })], impulses: [imp(14, 3200, 2, 0.03, 0.05)], tones: [tone("sine", 65, 0.02)] },
  "rain-forest": { beds: [bed("pink", "bandpass", 1500, 0.36, 0.5, { rate: 0.09, depth: 0.2 })], impulses: [imp(10, 2400, 1.2, 0.05, 0.08, { color: "pink", jitter: 0.8 }), imp(2, 900, 2, 0.06, 0.06)] },
  "attic-rain": { beds: [bed("pink", "lowpass", 1100, 0.3, 0.7), bed("brown", "lowpass", 150, 0.28)], impulses: [imp(10, 2400, 2, 0.03, 0.04), imp(0.25, 340, 12, 0.4, 0.14, { color: "pink" })] },
  "diner-rain": { beds: [bed("pink", "lowpass", 800, 0.3, 0.7, { rate: 0.2, depth: 0.3 }), bed("pink", "bandpass", 1900, 0.16, 0.5)], chimes: [chime([2400, 3100], "sine", 0.2, 0.3, 0.04, { metallic: true })], impulses: [imp(12, 3200, 2, 0.03, 0.03)], tones: [tone("sine", 60, 0.02)] },
  "bus-rain": { beds: [bed("pink", "lowpass", 700, 0.34), bed("brown", "lowpass", 140, 0.3)], impulses: [imp(16, 2600, 2, 0.03, 0.04)], tones: [tone("sawtooth", 38, 0.03, { lfo: { rate: 0.3, depth: 0.3 } })] },
  "station-rain": { beds: [bed("pink", "bandpass", 1600, 0.3, 0.5), bed("pink", "lowpass", 300, 0.22)], impulses: [imp(12, 3000, 2, 0.03, 0.04), imp(0.05, 200, 2, 0.6, 0.08)], chimes: [chime([1046, 1318], "sine", 0.03, 1.5, 0.05)] },
  "thunder-soft": { ...RAIN_SOFT, rumble: { every: 16, gain: 0.8, length: 7 } },
  "thunder-harsh": { ...RAIN_HEAVY, rumble: { every: 11, gain: 1, length: 6, harsh: true } },
  hail: { beds: [bed("white", "bandpass", 3200, 0.2, 0.6)], impulses: [imp(50, 4800, 4, 0.02, 0.07, { jitter: 0.7 }), imp(6, 2600, 3, 0.03, 0.06)] },
  snow: { beds: [bed("pink", "lowpass", 380, 0.34, 0.7, { rate: 0.04, depth: 0.6 }), bed("brown", "lowpass", 120, 0.24)], impulses: [imp(0.15, 600, 2, 0.2, 0.06, { color: "pink" })] },
  hurricane: { beds: [bed("pink", "bandpass", 480, 0.5, 0.6, { rate: 0.06, depth: 0.7 }), bed("white", "bandpass", 2400, 0.22, 0.5)], impulses: [imp(30, 3000, 1.5, 0.025, 0.05)], rumble: { every: 20, gain: 0.5, length: 5 } },
  wind: WIND,
  "wind-howl": { ...WIND, tones: [tone("sine", 210, 0.03, { lfo: { rate: 0.09, depth: 0.9 } }), tone("sine", 315, 0.015, { lfo: { rate: 0.07, depth: 0.9 } })] },
  "wind-desert": { beds: [bed("pink", "bandpass", 700, 0.36, 0.5, { rate: 0.04, depth: 0.7 }), bed("white", "highpass", 3000, 0.04, 0.7, { rate: 0.06, depth: 0.9 })] },
  fire: FIRE,
  "fire-night": { ...FIRE, chimes: [chime([4200, 4400], "sine", 4, 0.06, 0.012)] },
  "fire-forge": { ...FIRE, chimes: [chime([1200, 1230], "sine", 0.45, 0.7, 0.14, { metallic: true })], impulses: [imp(9, 2800, 4, 0.02, 0.14), imp(0.5, 500, 1, 0.3, 0.12, { color: "pink" })] },
  bothy: { beds: [...(WIND.beds ?? []), ...(FIRE.beds ?? [])], impulses: FIRE.impulses },
  cauldron: { beds: [bed("brown", "lowpass", 380, 0.28, 0.7, { rate: 0.3, depth: 0.3 })], impulses: [imp(5, 2400, 4, 0.02, 0.09)], chimes: [chime([420, 520, 640, 760], "sine", 3, 0.09, 0.05, { sweep: 2.2 })] },
  creek: CREEK,
  waterfall: { beds: [bed("white", "lowpass", 3000, 0.36, 0.5), bed("brown", "lowpass", 220, 0.36), bed("pink", "bandpass", 1200, 0.16, 0.6, { rate: 0.5, depth: 0.15 })] },
  ocean: OCEAN,
  lake: { beds: [bed("brown", "lowpass", 260, 0.3, 0.7, { rate: 0.12, depth: 0.6 })], impulses: [imp(1.2, 700, 1.2, 0.12, 0.08, { color: "pink" }), imp(0.2, 220, 8, 0.5, 0.1, { color: "pink" })] },
  "hot-spring": { beds: [bed("pink", "bandpass", 900, 0.22, 0.8, { rate: 0.3, depth: 0.3 }), bed("white", "highpass", 4000, 0.05)], chimes: [chime([300, 380, 460], "sine", 2.5, 0.12, 0.05, { sweep: 2 })] },
  underwater: { beds: [bed("brown", "lowpass", 260, 0.42, 0.7, { rate: 0.08, depth: 0.5 })], chimes: [chime([260, 330, 410], "sine", 1.4, 0.25, 0.05, { sweep: 2.6 })] },
  drips: { ...ROOM, chimes: [chime([1400, 1700, 2100, 2500], "sine", 1.6, 0.18, 0.06, { sweep: 0.7 })] },
  pool: { beds: [bed("pink", "lowpass", 600, 0.26, 0.7, { rate: 0.15, depth: 0.4 })], chimes: [chime([900, 1200, 1500], "sine", 0.8, 0.5, 0.045, { sweep: 0.8 })], tones: [tone("sine", 60, 0.03)] },
  cafe: CAFE,
  pub: { beds: [bed("pink", "lowpass", 480, 0.42, 0.7, { rate: 0.17, depth: 0.4 })], chimes: [chime([1800, 2200, 2600], "sine", 0.22, 0.4, 0.04, { metallic: true })], impulses: [imp(0.4, 300, 1, 0.1, 0.08)] },
  crowd: CROWD,
  kitchen: { ...CAFE, beds: [bed("pink", "lowpass", 800, 0.3, 0.7, { rate: 0.25, depth: 0.3 }), bed("white", "bandpass", 3200, 0.07, 0.6, { rate: 0.3, depth: 0.5 })], impulses: [imp(0.8, 1500, 3, 0.06, 0.09), imp(0.3, 500, 2, 0.1, 0.08)] },
  radio: { beds: [bed("pink", "bandpass", 1100, 0.14, 1.6, { rate: 2.3, depth: 0.6 }), bed("white", "highpass", 3000, 0.03)], tones: [tone("sine", 190, 0.02, { lfo: { rate: 3.1, depth: 0.9 } })] },
  arcade: { ...HUM, chimes: [chime([523, 659, 784, 1046], "square", 0.35, 0.18, 0.02), chime([220, 330], "triangle", 0.15, 0.3, 0.02)] },
  club: { beds: [bed("pink", "lowpass", 220, 0.36)], tones: [tone("sine", 52, 0.06, { lfo: { rate: 2, depth: 0.95 } })], impulses: [imp(2, 90, 2, 0.12, 0.15, { regular: true, color: "brown" })] },
  town: { beds: [bed("pink", "lowpass", 380, 0.3, 0.7, { rate: 0.1, depth: 0.4 })], chimes: [chime([2800, 3300], "sine", 0.35, 0.15, 0.03, { sweep: 1.2 })], impulses: [imp(0.3, 600, 1.5, 0.1, 0.06)] },
  city: { beds: [bed("brown", "lowpass", 220, 0.36, 0.7, { rate: 0.05, depth: 0.5 }), bed("pink", "lowpass", 600, 0.14)], tones: [tone("sine", 70, 0.02)], impulses: [imp(0.15, 800, 1, 0.5, 0.06, { color: "pink" })] },
  mall: { ...CROWD, tones: [tone("sine", 120, 0.02)], impulses: [imp(0.1, 1200, 0.8, 0.8, 0.05, { color: "pink" })] },
  ballroom: { ...ROOM, chimes: [chime([261.6, 329.6, 392, 523.3, 659.3], "triangle", 0.9, 1.8, 0.035)] },
  caravan: { beds: [bed("pink", "lowpass", 420, 0.22, 0.7, { rate: 0.1, depth: 0.4 })], chimes: [chime([293.7, 349.2, 440, 523.3], "triangle", 0.7, 1.2, 0.04)], impulses: [imp(0.4, 260, 6, 0.3, 0.1, { color: "pink" })] },
  whisper: { breath: { rate: 0.2, freq: 1400, gain: 0.12, murmur: 210 }, beds: [bed("brown", "lowpass", 140, 0.2)] },
  "engine-car": { tones: [tone("sawtooth", 58, 0.045, { lfo: { rate: 0.7, depth: 0.25 } })], beds: [bed("brown", "lowpass", 220, 0.4), bed("pink", "lowpass", 900, 0.12, 0.7, { rate: 0.15, depth: 0.5 })] },
  "engine-motorcycle": { tones: [tone("sawtooth", 84, 0.055, { harmonics: [1, 2], lfo: { rate: 6, depth: 0.25 } })], beds: [bed("brown", "lowpass", 300, 0.3), bed("pink", "bandpass", 1400, 0.1, 0.7)] },
  "engine-train": TRAIN,
  "train-blizzard": { ...TRAIN, beds: [...(TRAIN.beds ?? []), bed("pink", "bandpass", 600, 0.2, 0.6, { rate: 0.05, depth: 0.7 })] },
  steam: { tones: [tone("sine", 36, 0.05, { lfo: { rate: 0.6, depth: 0.7 } })], beds: [bed("white", "bandpass", 2200, 0.12, 0.6, { rate: 0.6, depth: 0.9 }), bed("brown", "lowpass", 200, 0.32)], impulses: [imp(1.2, 240, 2, 0.1, 0.12, { regular: true })] },
  station: { ...CROWD, chimes: [chime([1046.5, 1318.5, 1568], "sine", 0.04, 1.6, 0.05)], impulses: [imp(0.06, 180, 2, 0.8, 0.1, { color: "brown" })] },
  airplane: { beds: [bed("pink", "lowpass", 480, 0.46), bed("white", "highpass", 2500, 0.05)], tones: [tone("sine", 95, 0.03), tone("sine", 190, 0.012)] },
  ship: { beds: [bed("brown", "lowpass", 260, 0.34, 0.7, { rate: 0.09, depth: 0.5 })], tones: [tone("sine", 48, 0.035)], impulses: [imp(0.25, 240, 10, 0.5, 0.12, { color: "pink" })] },
  submarine: { tones: [tone("sine", 50, 0.05), tone("sine", 100, 0.02)], beds: [bed("brown", "lowpass", 180, 0.3)], chimes: [chime([1900], "sine", 0.12, 1.4, 0.03)] },
  space: SPACE,
  carriage: { beds: [bed("pink", "lowpass", 500, 0.2)], impulses: [imp(3.4, 700, 4, 0.05, 0.12, { regular: true }), imp(0.3, 300, 10, 0.35, 0.1, { color: "pink" })] },
  hum: HUM,
  fan: { beds: [bed("pink", "bandpass", 900, 0.34, 0.4)], tones: [tone("sine", 48, 0.03, { lfo: { rate: 11, depth: 0.15 } })] },
  static: STATIC,
  servers: { ...HUM, beds: [bed("pink", "bandpass", 1600, 0.28, 0.5), bed("brown", "lowpass", 160, 0.2)] },
  printing: { ...ROOM, impulses: [imp(3, 500, 3, 0.05, 0.14, { regular: true }), imp(1.5, 1800, 4, 0.03, 0.08, { regular: true })], tones: [tone("sine", 90, 0.025)] },
  laundromat: { tones: [tone("sine", 42, 0.04, { lfo: { rate: 1.1, depth: 0.4 } })], beds: [bed("pink", "lowpass", 700, 0.3, 0.7, { rate: 1.1, depth: 0.2 })], impulses: [imp(1.1, 400, 3, 0.06, 0.08, { regular: true })] },
  bowling: { ...CROWD, impulses: [imp(0.12, 150, 2, 1.2, 0.18, { color: "brown" }), imp(0.12, 2200, 3, 0.08, 0.1)] },
  "chimes-metal": CHIMES_METAL,
  "chimes-bamboo": { beds: CHIMES_METAL.beds, impulses: [imp(1.3, 520, 18, 0.14, 0.16, { jitter: 0.4, color: "pink" }), imp(0.8, 780, 16, 0.12, 0.12, { color: "pink" })] },
  "chimes-bones": { beds: CHIMES_METAL.beds, impulses: [imp(1.1, 1600, 22, 0.09, 0.12, { jitter: 0.3, color: "pink" }), imp(0.6, 2400, 20, 0.07, 0.08, { color: "pink" })] },
  bells: { beds: [bed("pink", "lowpass", 300, 0.1)], chimes: [chime([523.3, 659.3, 784, 1046.5], "sine", 0.35, 4.5, 0.09, { metallic: true })] },
  creak: CREAK,
  birds: BIRDS,
  crickets: CRICKETS,
  farm: { ...BIRDS, beds: [bed("pink", "lowpass", 600, 0.16, 0.7, { rate: 0.06, depth: 0.5 })], chimes: [chime([2600, 3200], "sine", 0.6, 0.12, 0.04, { sweep: 1.3 }), chime([150, 180], "sawtooth", 0.08, 0.9, 0.025, { sweep: 0.7 })] },
  horses: { beds: [bed("pink", "lowpass", 700, 0.16, 0.7, { rate: 0.07, depth: 0.5 })], impulses: [imp(0.6, 600, 2, 0.06, 0.08), imp(0.15, 220, 3, 0.4, 0.09, { color: "pink" })], chimes: [chime([2600, 3200], "sine", 0.3, 0.12, 0.03, { sweep: 1.3 })] },
  monkeys: { beds: [bed("pink", "bandpass", 900, 0.22, 0.8, { rate: 0.3, depth: 0.3 })], chimes: [chime([300, 380], "sine", 2, 0.12, 0.05, { sweep: 2 }), chime([700, 900], "triangle", 0.15, 0.3, 0.03, { sweep: 1.4 })] },
  greenhouse: { beds: [bed("pink", "lowpass", 500, 0.14, 0.7, { rate: 0.05, depth: 0.5 })], chimes: [chime([1400, 1700, 2100], "sine", 1, 0.18, 0.05, { sweep: 0.7 }), chime([3000, 3600], "sine", 0.25, 0.12, 0.025, { sweep: 1.3 })] },
  "room-tone": ROOM,
  office: { ...ROOM, impulses: [imp(3.2, 2200, 2.5, 0.012, 0.05, { jitter: 0.6 }), imp(0.1, 700, 1, 0.2, 0.05)], tones: [tone("sine", 120, 0.012)] },
  workshop: WORKSHOP,
  anvil: { ...WORKSHOP, chimes: [chime([1180, 1210, 2360], "sine", 0.7, 0.9, 0.16, { metallic: true })], beds: [...(FIRE.beds ?? [])], impulses: FIRE.impulses },
  clock: CLOCK,
  library: LIBRARY,
  writing: { ...ROOM, impulses: [imp(6, 3200, 1.2, 0.02, 0.05, { jitter: 0.8, color: "pink" }), imp(0.12, 1300, 0.6, 0.18, 0.07, { color: "pink" })] },
  church: { beds: [bed("pink", "lowpass", 380, 0.24, 0.7, { rate: 0.05, depth: 0.5 })], chimes: [chime([130.8, 164.8, 196], "sine", 0.05, 6, 0.08, { metallic: true })], impulses: [imp(0.08, 300, 1, 1.5, 0.06, { color: "pink" })] },
  gym: { ...ROOM, tones: [tone("sine", 120, 0.02)], impulses: [imp(0.1, 180, 2, 0.9, 0.1, { color: "brown" })] },
  tailor: { ...ROOM, impulses: [imp(0.5, 3600, 8, 0.04, 0.07), imp(0.2, 900, 1, 0.12, 0.06, { color: "pink" })] },
  cellar: { ...ROOM, chimes: [chime([1200, 1500, 1900], "sine", 0.4, 0.3, 0.05, { sweep: 0.7 })] },
  "voice-talk-f": { ...BREATH_F, breath: { ...BREATH_F.breath!, murmur: 205 } },
  "voice-talk-m": { ...BREATH_M, breath: { ...BREATH_M.breath!, murmur: 108 } },
  "voice-breath-f": BREATH_F,
  "voice-breath-m": BREATH_M,
};

export type TrackEq = [number, number, number];
export const TRACK_EQ_FREQS = [120, 1000, 6000] as const;
export const MASTER_EQ_FREQS = [80, 250, 1000, 4000, 10000] as const;
export const FLAT_MASTER_EQ = [0, 0, 0, 0, 0];
export const EQ_PRESETS: Record<string, number[]> = {
  Flat: [0, 0, 0, 0, 0],
  "Sleep soft": [2, 1, -1, -3, -5],
  "Rain detail": [-2, -1, 0, 2, 1],
  "Warm fire": [3, 2, 0, -2, -3],
  Airy: [-3, -1, 0, 1, 3],
};

type Live = { input: GainNode; eq: BiquadFilterNode[]; beds: AudioBufferSourceNode[]; nodes: AudioNode[]; timers: Set<number>; alive: boolean; volume: number; preview: boolean };

export class HushAudioEngine {
  private ctx: AudioContext | null = null;
  private bus!: GainNode;
  private previewBus!: GainNode;
  private masterEq: BiquadFilterNode[] = [];
  private master!: GainNode;
  private live = new Map<string, Live>();
  private noise: Partial<Record<NoiseColor, AudioBuffer>> = {};
  private scrubRate = 1;
  private alarmTimer: number | null = null;
  private previewTimer: number | null = null;
  paused = false;

  get isReady() { return this.ctx !== null; }

  private ensure(): AudioContext {
    if (!this.ctx) {
      const Ctor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) throw new Error("Web Audio unavailable");
      const ctx = new Ctor();
      this.ctx = ctx;
      this.bus = ctx.createGain();
      this.master = ctx.createGain();
      this.master.gain.value = 1;
      let last: AudioNode = this.bus;
      this.masterEq = MASTER_EQ_FREQS.map((f) => {
        const b = ctx.createBiquadFilter();
        b.type = "peaking"; b.frequency.value = f; b.Q.value = 0.9; b.gain.value = 0;
        last.connect(b); last = b; return b;
      });
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -18; comp.knee.value = 12; comp.ratio.value = 2.5; comp.attack.value = 0.01; comp.release.value = 0.25;
      const limiter = ctx.createDynamicsCompressor();
      limiter.threshold.value = -3; limiter.knee.value = 0; limiter.ratio.value = 20; limiter.attack.value = 0.001; limiter.release.value = 0.05;
      last.connect(comp).connect(limiter).connect(this.master).connect(ctx.destination);
      this.previewBus = ctx.createGain();
      this.previewBus.gain.value = 0.9;
      this.previewBus.connect(ctx.destination);
    }
    if (this.ctx.state === "suspended" && !this.paused) void this.ctx.resume();
    return this.ctx;
  }

  private noiseBuffer(ctx: AudioContext, color: NoiseColor): AudioBuffer {
    const cached = this.noise[color];
    if (cached) return cached;
    const length = ctx.sampleRate * 3;
    const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch += 1) {
      const data = buffer.getChannelData(ch);
      let b0 = 0, b1 = 0, b2 = 0, brown = 0;
      for (let i = 0; i < length; i += 1) {
        const white = Math.random() * 2 - 1;
        if (color === "white") data[i] = white * 0.5;
        else if (color === "pink") {
          b0 = 0.99765 * b0 + white * 0.099046; b1 = 0.963 * b1 + white * 0.2965164; b2 = 0.57 * b2 + white * 1.0526913;
          data[i] = (b0 + b1 + b2 + white * 0.1848) * 0.12;
        } else { brown = (brown + 0.02 * white) / 1.02; data[i] = brown * 3.2; }
      }
    }
    this.noise[color] = buffer;
    return buffer;
  }

  private schedule(live: Live, mean: number, regular: boolean, fn: () => void) {
    const tick = () => {
      if (!live.alive) return;
      if (!this.paused || live.preview) fn();
      const wait = regular ? mean : mean * Math.min(4, -Math.log(1 - Math.random()));
      const id = window.setTimeout(tick, Math.max(12, wait * 1000));
      live.timers.add(id);
    };
    const first = window.setTimeout(tick, Math.random() * mean * 500);
    live.timers.add(first);
  }

  private addBed(ctx: AudioContext, live: Live, spec: Bed, dest: AudioNode) {
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer(ctx, spec.color); src.loop = true; src.playbackRate.value = this.scrubRate;
    src.loopStart = Math.random() * 0.5;
    const f = ctx.createBiquadFilter(); f.type = spec.type; f.frequency.value = spec.freq; f.Q.value = spec.q ?? 0.7;
    const g = ctx.createGain(); g.gain.value = spec.gain;
    src.connect(f).connect(g).connect(dest);
    if (spec.lfo) {
      [[spec.lfo.rate, 1], [spec.lfo.rate * 0.37 + 0.011, 0.55]].forEach(([rate, scale]) => {
        const lfo = ctx.createOscillator(); lfo.type = "sine"; lfo.frequency.value = rate;
        const lg = ctx.createGain(); lg.gain.value = spec.gain * spec.lfo!.depth * 0.5 * scale;
        lfo.connect(lg).connect(g.gain); lfo.start(); live.nodes.push(lfo, lg);
      });
    }
    src.start(0, Math.random() * 2);
    live.beds.push(src); live.nodes.push(f, g);
  }

  private addTone(ctx: AudioContext, live: Live, spec: ToneSpec, dest: AudioNode) {
    const g = ctx.createGain(); g.gain.value = spec.gain; g.connect(dest);
    (spec.harmonics ?? [1]).forEach((h, i) => {
      const o = ctx.createOscillator(); o.type = spec.type; o.frequency.value = spec.freq * h;
      const pg = ctx.createGain(); pg.gain.value = 1 / ((i + 1) * (i + 1));
      o.connect(pg).connect(g); o.start(); live.nodes.push(o, pg);
    });
    if (spec.lfo) {
      const lfo = ctx.createOscillator(); lfo.frequency.value = spec.lfo.rate;
      const lg = ctx.createGain(); lg.gain.value = spec.gain * spec.lfo.depth * 0.5;
      lfo.connect(lg).connect(g.gain); lfo.start(); live.nodes.push(lfo, lg);
    }
    live.nodes.push(g);
  }

  private burst(ctx: AudioContext, dest: AudioNode, spec: Impulses) {
    const t = ctx.currentTime;
    const src = ctx.createBufferSource(); src.buffer = this.noiseBuffer(ctx, spec.color ?? "white");
    const f = ctx.createBiquadFilter(); f.type = "bandpass"; f.Q.value = spec.q;
    f.frequency.value = spec.freq * (1 + (Math.random() - 0.5) * (spec.jitter ?? 0.4));
    const g = ctx.createGain(); const peak = spec.gain * (0.4 + Math.random() * 0.6);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.004 + spec.decay);
    src.connect(f).connect(g).connect(dest);
    src.start(t, Math.random() * 2, spec.decay + 0.06); src.stop(t + spec.decay + 0.08);
    src.onended = () => { src.disconnect(); f.disconnect(); g.disconnect(); };
  }

  private chimeHit(ctx: AudioContext, dest: AudioNode, spec: Chimes) {
    const t = ctx.currentTime;
    const note = spec.notes[Math.floor(Math.random() * spec.notes.length)] * (1 + (Math.random() - 0.5) * 0.012);
    const g = ctx.createGain(); const peak = spec.gain * (0.5 + Math.random() * 0.5);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + spec.decay);
    g.connect(dest);
    const partials = spec.metallic ? [[1, 1], [2.76, 0.35], [5.4, 0.12]] : [[1, 1]];
    partials.forEach(([ratio, amp]) => {
      const o = ctx.createOscillator(); o.type = spec.wave; o.frequency.setValueAtTime(note * ratio, t);
      if (spec.sweep) o.frequency.exponentialRampToValueAtTime(note * ratio * spec.sweep, t + spec.decay);
      const pg = ctx.createGain(); pg.gain.value = amp;
      o.connect(pg).connect(g); o.start(t); o.stop(t + spec.decay + 0.05);
      o.onended = () => { o.disconnect(); pg.disconnect(); };
    });
    window.setTimeout(() => g.disconnect(), (spec.decay + 0.2) * 1000);
  }

  private rumbleHit(ctx: AudioContext, dest: AudioNode, spec: Rumble) {
    const t = ctx.currentTime;
    const src = ctx.createBufferSource(); src.buffer = this.noiseBuffer(ctx, "brown"); src.loop = true;
    const f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = spec.harsh ? 170 : 110;
    const g = ctx.createGain(); const peak = spec.gain * (0.6 + Math.random() * 0.4);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + (spec.harsh ? 0.06 : 0.5));
    g.gain.exponentialRampToValueAtTime(0.0001, t + spec.length);
    src.connect(f).connect(g).connect(dest); src.start(t, Math.random() * 2); src.stop(t + spec.length + 0.1);
    src.onended = () => { src.disconnect(); f.disconnect(); g.disconnect(); };
    if (spec.harsh) this.burst(ctx, dest, imp(0, 1600, 0.5, 0.3, spec.gain * 0.45));
  }

  private addBreath(ctx: AudioContext, live: Live, spec: Breath, dest: AudioNode) {
    const src = ctx.createBufferSource(); src.buffer = this.noiseBuffer(ctx, "pink"); src.loop = true;
    const f = ctx.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = spec.freq; f.Q.value = 1.3;
    const g = ctx.createGain(); g.gain.value = spec.gain * 0.55;
    const lfo = ctx.createOscillator(); lfo.frequency.value = spec.rate;
    const lg = ctx.createGain(); lg.gain.value = spec.gain * 0.45;
    lfo.connect(lg).connect(g.gain); lfo.start();
    src.connect(f).connect(g).connect(dest); src.start();
    live.beds.push(src); live.nodes.push(f, g, lfo, lg);
    if (spec.murmur) {
      const base = spec.murmur;
      this.schedule(live, 7, false, () => {
        const syllables = 3 + Math.floor(Math.random() * 4);
        for (let i = 0; i < syllables; i += 1) {
          const id = window.setTimeout(() => {
            if (!live.alive || this.paused) return;
            const t = ctx.currentTime;
            const o = ctx.createOscillator(); o.type = "triangle";
            o.frequency.setValueAtTime(base * (0.92 + Math.random() * 0.16), t);
            o.frequency.linearRampToValueAtTime(base * (0.9 + Math.random() * 0.2), t + 0.16);
            const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 700;
            const og = ctx.createGain(); og.gain.setValueAtTime(0.0001, t); og.gain.exponentialRampToValueAtTime(0.028, t + 0.04); og.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
            o.connect(lp).connect(og).connect(dest); o.start(t); o.stop(t + 0.22);
            o.onended = () => { o.disconnect(); lp.disconnect(); og.disconnect(); };
          }, i * 190 + Math.random() * 60);
          live.timers.add(id);
        }
      });
    }
  }

  start(id: string, family: Family, volume: number, eq: TrackEq, preview = false) {
    const ctx = this.ensure();
    if (this.live.has(id)) return;
    const recipe = FAMILIES[family];
    const live: Live = { input: ctx.createGain(), eq: [], beds: [], nodes: [], timers: new Set(), alive: true, volume, preview };
    live.input.gain.value = 0;
    let last: AudioNode = live.input;
    live.eq = TRACK_EQ_FREQS.map((f, i) => {
      const b = ctx.createBiquadFilter(); b.type = "peaking"; b.frequency.value = f; b.Q.value = 0.9; b.gain.value = eq[i];
      last.connect(b); last = b; return b;
    });
    last.connect(preview ? this.previewBus : this.bus);
    const mixIn = ctx.createGain(); mixIn.gain.value = recipe.loudness ?? 1; mixIn.connect(live.input); live.nodes.push(mixIn);
    recipe.beds?.forEach((b) => this.addBed(ctx, live, b, mixIn));
    recipe.tones?.forEach((t) => this.addTone(ctx, live, t, mixIn));
    if (recipe.breath) this.addBreath(ctx, live, recipe.breath, mixIn);
    recipe.impulses?.forEach((spec) => { if (spec.rate > 0) this.schedule(live, 1 / spec.rate, spec.regular ?? false, () => this.burst(ctx, mixIn, spec)); });
    recipe.chimes?.forEach((spec) => this.schedule(live, 1 / spec.rate, false, () => this.chimeHit(ctx, mixIn, spec)));
    if (recipe.rumble) { const r = recipe.rumble; this.schedule(live, r.every, false, () => this.rumbleHit(ctx, mixIn, r)); }
    live.input.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.7);
    this.live.set(id, live);
    this.rebalance();
  }

  stop(id: string, fadeMs = 450) {
    const live = this.live.get(id); const ctx = this.ctx;
    if (!live || !ctx) return;
    this.live.delete(id);
    const t = ctx.currentTime;
    live.input.gain.cancelScheduledValues(t); live.input.gain.setValueAtTime(live.input.gain.value, t); live.input.gain.linearRampToValueAtTime(0, t + fadeMs / 1000);
    window.setTimeout(() => {
      live.alive = false;
      live.timers.forEach((timer) => window.clearTimeout(timer));
      live.beds.forEach((b) => { try { b.stop(); } catch { /* already stopped */ } });
      live.nodes.forEach((n) => { if ("stop" in n) { try { (n as OscillatorNode).stop(); } catch { /* ok */ } } n.disconnect(); });
      live.eq.forEach((n) => n.disconnect()); live.input.disconnect();
    }, fadeMs + 60);
    this.rebalance();
  }

  has(id: string) { return this.live.has(id); }
  activeIds() { return [...this.live.keys()]; }

  setVolume(id: string, value: number) {
    const live = this.live.get(id); if (!live || !this.ctx) return;
    live.volume = value; live.input.gain.setTargetAtTime(value, this.ctx.currentTime, 0.05); this.rebalance();
  }

  setTrackEq(id: string, band: number, db: number) {
    const live = this.live.get(id); if (!live || !this.ctx) return;
    live.eq[band]?.gain.setTargetAtTime(db, this.ctx.currentTime, 0.03);
  }

  setMasterEq(bands: number[]) {
    if (!this.ctx) return;
    bands.forEach((db, i) => this.masterEq[i]?.gain.setTargetAtTime(db, this.ctx!.currentTime, 0.03));
  }

  private rebalance() {
    if (!this.ctx) return;
    let sum = 0; this.live.forEach((l) => { if (!l.preview) sum += l.volume * l.volume; });
    const headroom = sum > 0 ? Math.min(1, 0.8 / Math.sqrt(sum)) : 1;
    this.bus.gain.setTargetAtTime(headroom, this.ctx.currentTime, 0.08);
  }

  setScrubRate(rate: number) {
    this.scrubRate = rate; if (!this.ctx) return;
    this.live.forEach((l) => l.beds.forEach((b) => b.playbackRate.setTargetAtTime(rate, this.ctx!.currentTime, 0.08)));
  }

  async pause() {
    if (!this.ctx) return;
    this.paused = true;
    this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.06);
    await new Promise((r) => window.setTimeout(r, 220));
    if (this.paused && this.ctx.state === "running") await this.ctx.suspend();
  }

  async resume() {
    const ctx = this.ensure();
    this.paused = false;
    if (ctx.state === "suspended") await ctx.resume();
    this.master.gain.cancelScheduledValues(ctx.currentTime);
    this.master.gain.setTargetAtTime(1, ctx.currentTime, 0.12);
  }

  fadeOut(seconds: number) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(t); this.master.gain.setValueAtTime(this.master.gain.value, t);
    this.master.gain.linearRampToValueAtTime(0.0001, t + seconds);
  }

  stopAll(fadeMs = 600) { [...this.live.keys()].forEach((id) => this.stop(id, fadeMs)); }

  click(kind: "tap" | "pop" | "lock" | "soft" = "tap") {
    try {
      const ctx = this.ensure(); const t = ctx.currentTime;
      if (ctx.state === "suspended") void ctx.resume();
      const o = ctx.createOscillator(); const g = ctx.createGain();
      const [f0, f1, dur, gain] = kind === "pop" ? [520, 180, 0.09, 0.05] : kind === "lock" ? [240, 200, 0.12, 0.03] : kind === "soft" ? [700, 600, 0.05, 0.015] : [660, 330, 0.06, 0.035];
      o.type = kind === "pop" ? "triangle" : "sine";
      o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
      g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.02);
      o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + dur + 0.03);
      o.onended = () => { o.disconnect(); g.disconnect(); };
    } catch { /* audio blocked until first gesture */ }
  }

  preview(id: string, family: Family, seconds = 9) {
    this.stopPreview();
    const ctx = this.ensure();
    if (ctx.state === "suspended") void ctx.resume();
    this.start(`preview:${id}`, family, 0.7, [0, 0, 0], true);
    this.previewTimer = window.setTimeout(() => this.stopPreview(), seconds * 1000);
  }

  stopPreview() {
    if (this.previewTimer) { window.clearTimeout(this.previewTimer); this.previewTimer = null; }
    [...this.live.keys()].filter((k) => k.startsWith("preview:")).forEach((k) => this.stop(k, 300));
  }

  startAlarm() {
    if (this.alarmTimer) return;
    const ctx = this.ensure();
    void ctx.resume();
    let step = 0;
    const play = () => {
      const t = ctx.currentTime; const notes = [523.3, 659.3, 784, 1046.5];
      const gain = Math.min(0.28, 0.06 + step * 0.02);
      notes.forEach((n, i) => {
        const o = ctx.createOscillator(); o.type = "triangle"; o.frequency.value = n;
        const g = ctx.createGain(); const at = t + i * 0.16;
        g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(gain, at + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, at + 0.5);
        o.connect(g).connect(ctx.destination); o.start(at); o.stop(at + 0.55);
        o.onended = () => { o.disconnect(); g.disconnect(); };
      });
      step += 1;
    };
    play();
    this.alarmTimer = window.setInterval(play, 1500);
  }

  stopAlarm() { if (this.alarmTimer) { window.clearInterval(this.alarmTimer); this.alarmTimer = null; } }
}
