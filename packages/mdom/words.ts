import { MElement } from './m-node';
import { colorOf } from './print-style';

/**
 * A `<words>` under `<direction-type>`: free text printed over or under the staff
 * ("dolce", "rit.", "Swing"). The font attributes matter to a renderer because a
 * "cresc." in italics and a "Fine" in bold are the same element with different
 * intent, and the width they measure to differs.
 */
export class Words extends MElement {
  constructor() {
    super('words');
  }

  /** The printed text; '' when the element carries none. */
  override get text(): string {
    return super.text ?? '';
  }

  /** `font-style` (italic/normal); null when unstated. */
  get fontStyle(): string | null {
    return this.getAttribute('font-style');
  }

  /** `font-weight` (bold/normal); null when unstated. */
  get fontWeight(): string | null {
    return this.getAttribute('font-weight');
  }

  /** The normalized `color`; null when unset. */
  get color(): string | null {
    return colorOf(this);
  }
}
