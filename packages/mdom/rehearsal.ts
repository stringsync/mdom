import { MElement } from './m-node';
import { colorOf } from './print-style';

/**
 * A `<rehearsal>` under `<direction-type>`: the boxed letter or number a
 * conductor calls out. Its {@link enclosure} is what distinguishes it visually
 * from a plain `<words>` direction.
 */
export class Rehearsal extends MElement {
  constructor() {
    super('rehearsal');
  }

  /** The printed mark ('A', '12', …); '' when the element carries no text. */
  override get text(): string {
    return super.text ?? '';
  }

  /**
   * `enclosure`: 'square' | 'circle' | 'rectangle' | 'none' | …; null when
   * unstated. MusicXML's default is a square, but that's a renderer's rule to
   * apply — absence stays distinct from an explicit value.
   */
  get enclosure(): string | null {
    return this.getAttribute('enclosure');
  }

  /** The normalized `color`; null when unset. */
  get color(): string | null {
    return colorOf(this);
  }
}
