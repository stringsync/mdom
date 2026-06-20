import { MElement } from './m-node';

// Major/minor tonic by circle-of-fifths position (index = fifths + 7), -7..+7.
const MAJOR_TONICS = ['Cb', 'Gb', 'Db', 'Ab', 'Eb', 'Bb', 'F', 'C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#'];
const MINOR_TONICS = ['Ab', 'Eb', 'Bb', 'F', 'C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#', 'G#', 'D#', 'A#'];

// A <key> inside <attributes>. Traditional signatures use <fifths> (sharps when
// positive, flats when negative) plus <mode>; the tonic is derived from both.
export class Key extends MElement {
  constructor() {
    super('key');
  }

  // Staff this key applies to; '1' when omitted (a numberless key spans all staves).
  get staff(): string {
    return this.getAttribute('number') ?? '1';
  }

  // Circle-of-fifths position: +n = n sharps, -n = n flats.
  get fifths(): number | null {
    const fifths = this.child('fifths')?.text;
    return fifths == null ? null : Number(fifths);
  }

  get mode(): string | null {
    return this.child('mode')?.text ?? null;
  }

  // Tonic implied by fifths + mode, e.g. -3 major -> 'Eb'. Defaults to major when
  // no (or a non-minor) mode is given; null outside the -7..+7 range.
  get rootNote(): string | null {
    const fifths = this.fifths;
    if (fifths == null || fifths < -7 || fifths > 7) {
      return null;
    }
    const tonics = this.mode === 'minor' ? MINOR_TONICS : MAJOR_TONICS;
    return tonics[fifths + 7] ?? null;
  }
}
