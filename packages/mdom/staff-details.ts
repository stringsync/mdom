import { LineDetail } from './line-detail';
import { MElement } from './m-node';
import { StaffTuning } from './staff-tuning';

/**
 * A `<staff-details>` inside `<attributes>`: how one staff is drawn — its line
 * count, its string tunings, its size. Everything here is as DECLARED: absence
 * stays absence, because "was `<staff-lines>` written?" is a real question. A
 * tablature staff that Guitar Pro exported carries six `<staff-tuning>`s AND an
 * explicit `<staff-lines>`; the spurious tunings it copies onto the notation
 * staff of a notation+tab part carry no line count. Reach for
 * {@link Measure.getStaveLines} when the renderer's 5-line default is what you
 * want instead.
 */
export class StaffDetails extends MElement {
  constructor() {
    super('staff-details');
  }

  /** `<staff-lines>` as DECLARED; null when this block states none. */
  get staffLines(): number | null {
    const lines = this.child('staff-lines')?.text;
    return lines == null ? null : Number(lines);
  }

  /** `<staff-tuning>` declarations, bottom line first (see {@link StaffTuning.line}). */
  get staffTunings(): StaffTuning[] {
    return this.childrenOfType(StaffTuning);
  }

  /** `<staff-size>` as a percentage of the score's default size; null when unstated. */
  get staffSize(): number | null {
    const size = this.child('staff-size')?.text;
    return size == null ? null : Number(size);
  }

  /** `<show-frets>`: how a tab staff labels its stops; null when unstated. */
  get showFrets(): 'numbers' | 'letters' | null {
    return (this.child('show-frets')?.text as 'numbers' | 'letters' | undefined) ?? null;
  }

  /** `<capo>` fret; null when unstated. */
  get capo(): number | null {
    const capo = this.child('capo')?.text;
    return capo == null ? null : Number(capo);
  }

  /** `<line-detail>` per-line appearance overrides. */
  get lineDetails(): LineDetail[] {
    return this.childrenOfType(LineDetail);
  }

  /** Whether the staff is drawn at all (`print-object`); true when unstated. */
  get printObject(): boolean {
    return this.getAttribute('print-object') !== 'no';
  }
}
