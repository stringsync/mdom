import { MElement } from './m-node';

/**
 * A `<frame>`: a fretboard/chord diagram carried by a `<harmony>`. Its overall
 * box {@link width}/{@link height} are layout, in tenths — a renderer reads them
 * to reserve space (convert with the score's `scaling`). The played strings and
 * frets live in separate `<frame-note>` children.
 */
export class Frame extends MElement {
  constructor() {
    super('frame');
  }

  /** The `width` attribute in tenths; null when unset. */
  get width(): number | null {
    const width = this.getAttribute('width');
    return width == null ? null : Number(width);
  }

  set width(tenths: number) {
    this.setAttribute('width', String(tenths));
  }

  /** The `height` attribute in tenths; null when unset. */
  get height(): number | null {
    const height = this.getAttribute('height');
    return height == null ? null : Number(height);
  }

  set height(tenths: number) {
    this.setAttribute('height', String(tenths));
  }
}
