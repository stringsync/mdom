// spec(mdom.entries): note.pitch is the resolved pitch — step/octave/alter as
// parsed, plus derived midi and scientific name (e.g. "C#4"). Timing and mods
// live elsewhere (see mdom.timing, mdom.mods); a Note carries only pitch.

export type Step = 'C' | 'D' | 'E' | 'F' | 'G' | 'A' | 'B';

export type Pitch = {
  step: Step;
  octave: number;
  alter: number;
  midi: number;
  name: string;
};

const SEMITONE: Record<Step, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

// spec(mdom.entries): midi and name are derived from step/octave/alter so
// callers never recompute them. MIDI 60 is C4 (octave + 1 octaves above -1).
export function pitch(step: Step, octave: number, alter: number): Pitch {
  const midi = (octave + 1) * 12 + SEMITONE[step] + alter;
  const accidental = alter > 0 ? '#'.repeat(alter) : 'b'.repeat(-alter);
  return { step, octave, alter, midi, name: `${step}${accidental}${octave}` };
}

export type Note = {
  pitch: Pitch;
};
