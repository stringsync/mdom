import { MElement } from './m-node';

/** Major/minor tonic by circle-of-fifths position (index = fifths + 7), -7..+7. */
const MAJOR_TONICS = ['Cb', 'Gb', 'Db', 'Ab', 'Eb', 'Bb', 'F', 'C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#'];
const MINOR_TONICS = ['Ab', 'Eb', 'Bb', 'F', 'C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#', 'G#', 'D#', 'A#'];

/**
 * A `<key>` inside `<attributes>`. Traditional signatures use `<fifths>` (sharps
 * when positive, flats when negative) plus `<mode>`; the tonic is derived from
 * both.
 */
export class Key extends MElement {
  constructor() {
    super('key');
  }

  /** Staff this key applies to; '1' when omitted (a numberless key spans all staves). */
  get staff(): string {
    return this.getAttribute('number') ?? '1';
  }

  /** Circle-of-fifths position: +n = n sharps, -n = n flats. */
  get fifths(): number | null {
    const fifths = this.child('fifths')?.text;
    return fifths == null ? null : Number(fifths);
  }

  /** `<mode>` (major, minor, ...), or null. */
  get mode(): string | null {
    return this.child('mode')?.text ?? null;
  }

  /**
   * Tonic implied by fifths + mode, e.g. -3 major -> 'Eb'. Defaults to major when
   * no (or a non-minor) mode is given; null outside the -7..+7 range.
   */
  get rootNote(): string | null {
    const fifths = this.fifths;
    if (fifths == null || fifths < -7 || fifths > 7) {
      return null;
    }
    const tonics = this.mode === 'minor' ? MINOR_TONICS : MAJOR_TONICS;
    return tonics[fifths + 7] ?? null;
  }

  /**
   * The `<key-step>`/`<key-alter>` alterations of a non-traditional key, in the
   * order given — NOT circle-of-fifths order, which is the whole point of the
   * form. Empty for an ordinary `<fifths>` key.
   *
   * MusicXML writes these as interleaved sibling runs read positionally: a
   * `<key-step>` opens an alteration, and the `<key-alter>` and (optional)
   * `<key-accidental>` that TRAIL it belong to it. Only the trailing rule is
   * right — pairing by count breaks the moment one alteration carries an
   * accidental and another doesn't. `<key-octave number="n">` indexes the nth
   * alteration, 1-based.
   */
  get alterations(): Array<{ step: string; alter: number; accidental: string | null; octave: number | null }> {
    const alterations: Array<{ step: string; alter: number; accidental: string | null; octave: number | null }> = [];
    const octaves = new Map<number, number>();
    for (const child of this.children) {
      if (!(child instanceof MElement)) {
        continue;
      }
      const current = alterations[alterations.length - 1];
      if (child.tag === 'key-step') {
        alterations.push({ step: child.text ?? '', alter: 0, accidental: null, octave: null });
      } else if (child.tag === 'key-alter' && current) {
        current.alter = Number(child.text ?? 0);
      } else if (child.tag === 'key-accidental' && current) {
        current.accidental = child.text ?? '';
      } else if (child.tag === 'key-octave' && child.text != null) {
        octaves.set(Number(child.getAttribute('number') ?? 0), Number(child.text));
      }
    }
    for (const [index, octave] of octaves) {
      const alteration = alterations[index - 1];
      if (alteration) {
        alteration.octave = octave;
      }
    }
    return alterations;
  }
}
