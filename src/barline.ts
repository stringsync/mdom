import { MElement } from './m-node';

/**
 * A `<barline>` in a measure: its bar style (final, double, dotted, ...) and any
 * repeat marker. MusicXML attaches it to the measure edge named by
 * {@link location}, and a measure can carry several (a left repeat and a right
 * repeat). A renderer reads it to draw the boundary and reserve its width.
 */
export class Barline extends MElement {
  constructor() {
    super('barline');
  }

  /** Which edge it sits on: 'right' (the MusicXML default), 'left', or 'middle'. */
  get location(): string {
    return this.getAttribute('location') ?? 'right';
  }

  /** `<bar-style>` (light-heavy, heavy-light, light-light, dotted, ...), or null for a plain barline. */
  get barStyle(): string | null {
    return this.child('bar-style')?.text ?? null;
  }

  /** `<repeat>` direction ('forward'/'backward') when this is a repeat barline, else null. */
  get repeat(): string | null {
    return this.child('repeat')?.getAttribute('direction') ?? null;
  }
}
