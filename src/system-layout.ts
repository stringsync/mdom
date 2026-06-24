import { MElement, MText } from './m-node';

/** Canonical child order of the MusicXML `<system-layout>` sequence. */
const ORDER = ['system-margins', 'system-distance', 'top-system-distance', 'system-dividers'];

function tenths(text: string | null | undefined): number | null {
  return text == null ? null : Number(text);
}

/**
 * A `<system-layout>`: how a system is spaced and indented, all in tenths
 * (convert with the score's `scaling`). Appears in `<defaults>` for the
 * score-wide default and in a measure's `<print>` to override the system that
 * starts there. System *breaks* live on `<print>` (`new-system`/`new-page`), not
 * here. Setters keep the schema's child order so the result stays valid.
 *
 * `<system-dividers>` (the marks drawn between systems) isn't modeled yet — it
 * still round-trips as a plain child; add getters if a score needs to read it.
 */
export class SystemLayout extends MElement {
  constructor() {
    super('system-layout');
  }

  /** `<system-margins><left-margin>` in tenths (system indent); null when unset. */
  get leftMargin(): number | null {
    return tenths(this.child('system-margins')?.child('left-margin')?.text);
  }

  set leftMargin(value: number) {
    this.setMargin('left-margin', value);
  }

  /** `<system-margins><right-margin>` in tenths; null when unset. */
  get rightMargin(): number | null {
    return tenths(this.child('system-margins')?.child('right-margin')?.text);
  }

  set rightMargin(value: number) {
    this.setMargin('right-margin', value);
  }

  /** `<system-distance>`: vertical gap above this system from the previous one; null when unset. */
  get systemDistance(): number | null {
    return tenths(this.child('system-distance')?.text);
  }

  set systemDistance(value: number) {
    this.upsert('system-distance', value);
  }

  /** `<top-system-distance>`: gap from the top page margin to the first system on a page; null when unset. */
  get topSystemDistance(): number | null {
    return tenths(this.child('top-system-distance')?.text);
  }

  set topSystemDistance(value: number) {
    this.upsert('top-system-distance', value);
  }

  /** Upsert a direct value child, inserted to keep the schema's child order. */
  private upsert(tag: string, value: number): void {
    const existing = this.child(tag);
    if (existing) {
      existing.setText(String(value));
      return;
    }
    const element = new MElement(tag);
    element.append(new MText(String(value)));
    this.insertBefore(element, this.firstChildAfter(tag));
  }

  /** Upsert `left-margin`/`right-margin` inside `<system-margins>` (created if absent). */
  private setMargin(tag: 'left-margin' | 'right-margin', value: number): void {
    let margins = this.child('system-margins');
    if (!margins) {
      margins = new MElement('system-margins');
      this.insertBefore(margins, this.firstChildAfter('system-margins'));
    }
    const existing = margins.child(tag);
    if (existing) {
      existing.setText(String(value));
      return;
    }
    const element = new MElement(tag);
    element.append(new MText(String(value)));
    // left-margin precedes right-margin.
    margins.insertBefore(element, tag === 'left-margin' ? margins.child('right-margin') : null);
  }

  /** First child whose tag sorts after `tag` in the canonical order, or null. */
  private firstChildAfter(tag: string): MElement | null {
    const rank = ORDER.indexOf(tag);
    for (const node of this.children) {
      if (node instanceof MElement && ORDER.indexOf(node.tag) > rank) {
        return node;
      }
    }
    return null;
  }
}
