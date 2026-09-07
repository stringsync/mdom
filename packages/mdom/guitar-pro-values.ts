import type { model } from '@coderline/alphatab';
import type { PitchSpec } from './note';
import type { GuitarProOptions } from './guitar-pro-options';

interface GuitarProRhythmOptions {
  dots?: number;
  actual?: number;
  normal?: number;
}

interface GuitarProPitchOptions {
  flats?: boolean;
}

export class GuitarProValues {
  constructor(private readonly opts: GuitarProOptions = {}) {}

  unsupported(feature: string): void {
    if (this.opts.unsupported !== 'omit') {
      throw new Error(`Guitar Pro conversion does not support ${feature}. Use { unsupported: 'omit' } to omit it.`);
    }
  }

  static readonly durations: Record<string, model.Duration> = {
    whole: 1,
    half: 2,
    quarter: 4,
    eighth: 8,
    '16th': 16,
    '32nd': 32,
    '64th': 64,
    '128th': 128,
  };

  static noteType(duration: model.Duration): string {
    const type = Object.entries(GuitarProValues.durations).find(([, value]) => value === duration)?.[0];
    if (!type) {
      throw new Error(`Unsupported Guitar Pro duration: ${duration}`);
    }
    return type;
  }

  static beats(duration: model.Duration, opts: GuitarProRhythmOptions = {}): number {
    return ((4 / duration) * (2 - 2 ** -(opts.dots ?? 0)) * (opts.normal ?? 1)) / (opts.actual ?? 1);
  }

  static pitch(midi: number, opts: GuitarProPitchOptions = {}): PitchSpec {
    GuitarProValues.integer(midi, 'MIDI pitch', 0, 127);
    const names = opts.flats
      ? ['C', 'D', 'D', 'E', 'E', 'F', 'G', 'G', 'A', 'A', 'B', 'B']
      : ['C', 'C', 'D', 'D', 'E', 'F', 'F', 'G', 'G', 'A', 'A', 'B'];
    const step = names[midi % 12]!;
    const natural = GuitarProValues.semitones[step]!;
    return { step, octave: Math.floor(midi / 12) - 1, alter: (midi % 12) - natural };
  }

  static midi(pitch: PitchSpec): number {
    const semitone = GuitarProValues.semitones[pitch.step];
    if (semitone == null) {
      throw new Error(`Invalid pitch step: ${pitch.step}`);
    }
    return GuitarProValues.integer((pitch.octave + 1) * 12 + semitone + (pitch.alter ?? 0), 'MIDI pitch', 0, 127);
  }

  static integer(value: number, name: string, min: number, max: number): number {
    if (!Number.isInteger(value) || value < min || value > max) {
      throw new Error(`Invalid ${name}: ${value}; expected an integer from ${min} to ${max}`);
    }
    return value;
  }

  private static readonly semitones: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
}
