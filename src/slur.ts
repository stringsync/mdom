import { MElement, required } from './m-node';
import { Note } from './note';
import { Part } from './part';
import { resolveMembers, resolvePartner, noteMarkers, type SpannerSpec } from './spanner';

export type SlurType = 'start' | 'stop' | 'continue';

/**
 * A `<slur>` marker inside `<notations>`. Slurs — like ties, wedges, pedals, and
 * every other spanner — are NOT tree-shaped: a `start` on one note pairs with a
 * `stop` on a later note, joined by `number`. The pairing is resolved on demand
 * by {@link partner}, not accumulated into ids by a begin/continue/close walk.
 */
export class Slur extends MElement {
  constructor() {
    super('slur');
  }

  /** Pairing key. MusicXML treats an absent slur number as 1. */
  get number(): string {
    return this.getAttribute('number') ?? '1';
  }

  /**
   * `type`: required on a `<slur>` and drives pairing; absence is a malformed
   * marker, not an expected state.
   */
  get slurType(): SlurType {
    return required(this.getAttribute('type'), 'type on <slur>') as SlurType;
  }

  /** `placement` (above/below), or null. */
  get placement(): string | null {
    return this.getAttribute('placement');
  }

  /** `line-type` (solid/dashed/dotted/wavy) — the stroke to draw; null when unstated. */
  get lineType(): string | null {
    return this.getAttribute('line-type');
  }

  /** The note this marker hangs off of. An attached marker always has one. */
  get note(): Note {
    return required(this.closest(Note), '<note> ancestor of <slur>');
  }

  /** The part this marker belongs to. An attached marker always has one. */
  get part(): Part {
    return required(this.closest(Part), '<part> ancestor of <slur>');
  }

  /**
   * The marker at the other end, resolved across the part in ONSET order (see
   * {@link resolvePartner}), preferring an open start in the same voice and
   * falling back to the oldest one. Document order is not enough: a `<backup>`
   * writes a later voice's notes after an earlier voice's, so a cross-stave slur's
   * stop can sit before its start in the file. Spans measures and systems freely.
   */
  get partner(): Slur | null {
    return resolvePartner(this, this.spec());
  }

  /** All markers in this spanner (start..stop), not just the far end. */
  get members(): Slur[] {
    return resolveMembers(this, this.spec());
  }

  /** Onset of this marker's note within its measure, in beats. */
  get measureBeat(): number | null {
    return this.note.measureBeat;
  }

  private spec(): SpannerSpec<Slur> {
    return {
      siblings: noteMarkers(this, (note) => note.slurs),
      // Raw reads so resolution tolerates a malformed typeless marker (skips it)
      // rather than throwing through the strict `slurType` getter.
      isOpen: (slur) => slur.getAttribute('type') === 'start',
      isClose: (slur) => slur.getAttribute('type') === 'stop',
    };
  }
}
