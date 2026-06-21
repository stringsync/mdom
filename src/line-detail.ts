import { MElement, required } from './m-node';

/**
 * A `<line-detail>` inside `<staff-details>`: overrides one staff line's
 * appearance. {@link line} says which line (1 = bottom); {@link width} is its
 * thickness in tenths (null = the default thickness, convert with the score's
 * `scaling`).
 */
export class LineDetail extends MElement {
  constructor() {
    super('line-detail');
  }

  /** The `line` attribute: which staff line (1 = bottom). Required by MusicXML. */
  get line(): number {
    return Number(required(this.getAttribute('line'), 'line on <line-detail>'));
  }

  set line(value: number) {
    this.setAttribute('line', String(value));
  }

  /** The `width` attribute in tenths (line thickness); null when unset. */
  get width(): number | null {
    const width = this.getAttribute('width');
    return width == null ? null : Number(width);
  }

  set width(tenths: number) {
    this.setAttribute('width', String(tenths));
  }
}
