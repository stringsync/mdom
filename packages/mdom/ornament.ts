import { MElement } from './m-node';
import { placementOf } from './print-style';

/**
 * The tag of an `<ornaments>` child — a closed union so a renderer can switch on
 * it exhaustively. `accidental-mark` is in the list even though it isn't an
 * ornament in its own right: it's the small sharp/flat drawn *with* the ornament
 * it follows, which is why {@link Ornament} is read in document order.
 */
export type OrnamentType =
  | 'trill-mark'
  | 'turn'
  | 'delayed-turn'
  | 'inverted-turn'
  | 'delayed-inverted-turn'
  | 'vertical-turn'
  | 'inverted-vertical-turn'
  | 'shake'
  | 'mordent'
  | 'inverted-mordent'
  | 'schleifer'
  | 'tremolo'
  | 'haydn'
  | 'accidental-mark'
  | 'other-ornament';

/** Every tag this class is registered for — the `<ornaments>` children. */
export const ORNAMENT_TAGS: OrnamentType[] = [
  'trill-mark',
  'turn',
  'delayed-turn',
  'inverted-turn',
  'delayed-inverted-turn',
  'vertical-turn',
  'inverted-vertical-turn',
  'shake',
  'mordent',
  'inverted-mordent',
  'schleifer',
  'tremolo',
  'haydn',
  'accidental-mark',
  'other-ornament',
];

/**
 * One child of `<notations><ornaments>`: a trill, turn, mordent, tremolo, or the
 * `<accidental-mark>` that qualifies the ornament before it. MusicXML names the
 * marking by the TAG, so {@link ornamentType} — not the text — is what identifies
 * it. Read them through {@link Note.ornaments}, which keeps document order so a
 * consumer can attach each accidental mark to the ornament it follows (a turn's
 * pair reads one above and one below).
 *
 * `<wavy-line>` is also an `<ornaments>` child but stays its own spanner class;
 * see {@link Note.wavyLines}.
 *
 * Unlike the fixed-tag element classes this one stands in for a whole family, so
 * it keeps `MElement`'s tag-taking constructor: the registry passes the tag it
 * matched.
 */
export class Ornament extends MElement {
  /** Which ornament this is — the element's own tag. */
  get ornamentType(): OrnamentType {
    return this.tag as OrnamentType;
  }

  /** `placement`; null when unstated. */
  get placement(): 'above' | 'below' | null {
    return placementOf(this);
  }

  /** `<tremolo>` slash count (its text), when this is a tremolo; null otherwise. */
  get tremoloMarks(): number | null {
    if (this.tag !== 'tremolo') {
      return null;
    }
    // The spec's default is 3 when the element is empty.
    return this.text == null ? 3 : Number(this.text);
  }

  /** `<tremolo type>`: 'single' | 'start' | 'stop' | 'unmeasured'; 'single' when unstated. */
  get tremoloType(): string | null {
    return this.tag === 'tremolo' ? (this.getAttribute('type') ?? 'single') : null;
  }

  /** An `<accidental-mark>`'s glyph name (its text); null otherwise. */
  get accidentalMark(): string | null {
    return this.tag === 'accidental-mark' ? this.text : null;
  }
}
