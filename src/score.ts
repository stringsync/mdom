import { MElement } from './m-node';
import { Part } from './part';
import { appendValue } from './measure';
import { Scaling } from './scaling';
import { SystemLayout } from './system-layout';

/** The `<score-partwise>` root. Holds the parts and the part-list metadata. */
export class Score extends MElement {
  constructor() {
    super('score-partwise');
  }

  /** The score's parts. */
  get parts(): Part[] {
    return this.childrenOfType(Part);
  }

  /** The part with this id, or null. */
  getPart(id: string): Part | null {
    return this.parts.find((part) => part.id === id) ?? null;
  }

  /**
   * The `<defaults><scaling>` for converting tenths to a physical size (mm or
   * px) — e.g. `score.scaling.toMillimeters(measure.width)`. Falls back to
   * {@link Scaling.default} when `<scaling>` is absent, so it always converts.
   */
  get scaling(): Scaling {
    const scaling = this.child('defaults')?.child('scaling');
    const millimeters = scaling?.child('millimeters')?.text;
    const tenths = scaling?.child('tenths')?.text;
    return millimeters != null && tenths != null ? new Scaling(Number(millimeters), Number(tenths)) : Scaling.default;
  }

  /**
   * The `<defaults><system-layout>`: the score-wide default system spacing and
   * indents. Null when unset. Per-system overrides live on a measure's `<print>`.
   */
  get systemLayout(): SystemLayout | null {
    return this.child('defaults')?.childrenOfType(SystemLayout)[0] ?? null;
  }

  /** Get or create the `<defaults><system-layout>` (both created if absent), keeping `<defaults>` order. */
  getOrCreateSystemLayout(): SystemLayout {
    const existing = this.systemLayout;
    if (existing) {
      return existing;
    }
    let defaults = this.child('defaults');
    if (!defaults) {
      defaults = new MElement('defaults');
      this.append(defaults);
    }
    const layout = new SystemLayout();
    // <defaults> is a sequence; system-layout precedes these.
    const after = new Set(['staff-layout', 'appearance', 'music-font', 'word-font', 'lyric-font', 'lyric-language']);
    const ref = defaults.children.find((node) => node instanceof MElement && after.has(node.tag)) ?? null;
    defaults.insertBefore(layout, ref);
    return layout;
  }

  /** `<movement-title>`, falling back to `<work><work-title>`. */
  get title(): string | null {
    return this.child('movement-title')?.text ?? this.child('work')?.child('work-title')?.text ?? null;
  }

  /**
   * The programs that wrote this file: every `<identification><encoding><software>`,
   * in document order. Often several — an exporter plus its MusicXML plugin (e.g.
   * `['Finale 2011 for Windows', 'Dolet 5.5 for Finale']`). Empty when unstated.
   * The source key for handling exporter quirks; not all writers fill it in.
   */
  get software(): string[] {
    const encoding = this.child('identification')?.child('encoding');
    return (encoding?.childrenNamed('software') ?? [])
      .map((node) => node.text)
      .filter((text): text is string => text != null);
  }

  /**
   * Create a `<part>`, registering its `<score-part>`/`<part-name>` in the
   * `<part-list>` (created if absent). The id is generated when omitted.
   */
  addPart(opts?: { id?: string; name?: string }): Part {
    const id = opts?.id ?? `P${this.parts.length + 1}`;

    let partList = this.child('part-list');
    if (!partList) {
      partList = new MElement('part-list');
      this.append(partList);
    }
    const scorePart = new MElement('score-part');
    scorePart.setAttribute('id', id);
    if (opts?.name != null) {
      appendValue(scorePart, 'part-name', opts.name);
    }
    partList.append(scorePart);

    const part = new Part();
    part.setAttribute('id', id);
    this.append(part);
    return part;
  }
}
