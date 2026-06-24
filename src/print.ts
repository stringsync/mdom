import { MElement } from './m-node';
import { SystemLayout } from './system-layout';

/**
 * A `<print>`: layout instructions for the measure it leads. Carries the
 * system/page break flags and an optional `<system-layout>` override for the
 * system starting here. Other layout children (page-layout, staff-layout,
 * measure-layout) are left as plain elements and still round-trip.
 */
export class Print extends MElement {
  constructor() {
    super('print');
  }

  /** Whether this measure starts a new system (`new-system="yes"`). */
  get newSystem(): boolean {
    return this.getAttribute('new-system') === 'yes';
  }

  set newSystem(value: boolean) {
    this.setAttribute('new-system', value ? 'yes' : 'no');
  }

  /** Whether this measure starts a new page (`new-page="yes"`). */
  get newPage(): boolean {
    return this.getAttribute('new-page') === 'yes';
  }

  set newPage(value: boolean) {
    this.setAttribute('new-page', value ? 'yes' : 'no');
  }

  /** The `<system-layout>` override for the system starting here; null when unset. */
  get systemLayout(): SystemLayout | null {
    return this.childrenOfType(SystemLayout)[0] ?? null;
  }

  /** Get or create the `<system-layout>` override, placed right after `<page-layout>` (or first). */
  getOrCreateSystemLayout(): SystemLayout {
    const existing = this.systemLayout;
    if (existing) {
      return existing;
    }
    const layout = new SystemLayout();
    const ref = this.children.find((node) => !(node instanceof MElement && node.tag === 'page-layout')) ?? null;
    this.insertBefore(layout, ref);
    return layout;
  }
}
