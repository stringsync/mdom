import { MElement } from './m-node';
import { colorOf, placementOf } from './print-style';

/**
 * A `<dynamics>` under `<direction-type>`: one or more dynamic markings printed
 * as a unit. MusicXML names the marking by the TAG — `<dynamics><sfz/>` — so
 * {@link marks} returns tag names, which are also the text to print.
 */
export class Dynamics extends MElement {
  constructor() {
    super('dynamics');
  }

  /**
   * The marking names, document order: the child tags (`p`, `ff`, `sfz`, …).
   * `<other-dynamics>` contributes its own text instead of its tag.
   */
  get marks(): string[] {
    return this.childrenOfType(MElement).map((mark) => (mark.tag === 'other-dynamics' ? (mark.text ?? '') : mark.tag));
  }

  /** `placement`; null when unstated. */
  get placement(): 'above' | 'below' | null {
    return placementOf(this);
  }

  /** The normalized `color`; null when unset. */
  get color(): string | null {
    return colorOf(this);
  }
}
