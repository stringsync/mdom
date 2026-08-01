import { MElement, required } from './m-node';
import { Note, type NoteType } from './note';
import { Part } from './part';
import { placementOf } from './print-style';
import { resolveMembers, resolvePartner, noteMarkers, type SpannerSpec } from './spanner';

export type TupletType = 'start' | 'stop';

/** How a `<tuplet-actual>`/`<tuplet-normal>` block prints its side of the ratio. */
export interface TupletDisplay {
  number: number | null;
  type: NoteType | null;
  dots: number;
}

/** Narrow a raw `show-number`/`show-type` attribute to its enum; null when unstated. */
function showValue(value: string | null): 'actual' | 'both' | 'none' | null {
  return value === 'actual' || value === 'both' || value === 'none' ? value : null;
}

/** Read a `<tuplet-actual>`/`<tuplet-normal>` block, or null when the marker has none. */
function readDisplay(block: MElement | null): TupletDisplay | null {
  if (!block) {
    return null;
  }
  const number = block.child('tuplet-number')?.text;
  const type = block.child('tuplet-type')?.text;
  return {
    number: number == null ? null : Number(number),
    type: (type ?? null) as NoteType | null,
    dots: block.childrenNamed('tuplet-dot').length,
  };
}

/**
 * A `<tuplet>` inside `<notations>` (the bracket/number). The ratio itself lives
 * in the note's `<time-modification>`; this marks where the group starts and stops.
 */
export class Tuplet extends MElement {
  constructor() {
    super('tuplet');
  }

  /** Pairing key; '1' when omitted. */
  get number(): string {
    return this.getAttribute('number') ?? '1';
  }

  /** `type`: required on a `<tuplet>` and drives pairing. */
  get tupletType(): TupletType {
    return required(this.getAttribute('type'), 'type on <tuplet>') as TupletType;
  }

  /** The note this marker hangs off of. An attached marker always has one. */
  get note(): Note {
    return required(this.closest(Note), '<note> ancestor of <tuplet>');
  }

  /** The part this marker belongs to. An attached marker always has one. */
  get part(): Part {
    return required(this.closest(Part), '<part> ancestor of <tuplet>');
  }

  /** `placement`; null when unstated. */
  get placement(): 'above' | 'below' | null {
    return placementOf(this);
  }

  /** The `bracket` attribute; null when unstated (leave it to the renderer's own rule). */
  get bracket(): boolean | null {
    const bracket = this.getAttribute('bracket');
    return bracket == null ? null : bracket === 'yes';
  }

  /** `show-number`: which side(s) of the ratio to print; null when unstated. */
  get showNumber(): 'actual' | 'both' | 'none' | null {
    return showValue(this.getAttribute('show-number'));
  }

  /** `show-type`: whether to print the note-type glyphs alongside; null when unstated. */
  get showType(): 'actual' | 'both' | 'none' | null {
    return showValue(this.getAttribute('show-type'));
  }

  /**
   * `<tuplet-actual>`: the numbers PRINTED for the actual side, which can differ
   * from the `<time-modification>` ratio (a "7:5" label over a 3:2 compression).
   * Null when the marker states none — fall back to {@link Note.timeModification}.
   */
  get actual(): TupletDisplay | null {
    return readDisplay(this.child('tuplet-actual'));
  }

  /** `<tuplet-normal>`: the printed normal side; null when the marker states none. */
  get normal(): TupletDisplay | null {
    return readDisplay(this.child('tuplet-normal'));
  }

  /** The marker at the far end (same number), or null. */
  get partner(): Tuplet | null {
    return resolvePartner(this, this.spec());
  }

  /** All markers in this spanner (start..stop), not just the far end. */
  get members(): Tuplet[] {
    return resolveMembers(this, this.spec());
  }

  /** Onset of this marker's note within its measure, in beats. */
  get measureBeat(): number | null {
    return this.note.measureBeat;
  }

  private spec(): SpannerSpec<Tuplet> {
    return {
      siblings: noteMarkers(this, (note) => note.tuplets),
      // Raw reads so resolution tolerates a malformed typeless marker.
      isOpen: (tuplet) => tuplet.getAttribute('type') === 'start',
      isClose: (tuplet) => tuplet.getAttribute('type') === 'stop',
    };
  }
}
