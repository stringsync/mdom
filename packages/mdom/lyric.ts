import { MElement } from './m-node';
import { colorOf } from './print-style';

/** How a syllable joins its neighbours: a whole word, or one piece of one. */
export type Syllabic = 'single' | 'begin' | 'end' | 'middle';

/**
 * A `<lyric>` under a `<note>`: one syllable of one verse. A note carries one
 * per verse (see {@link Note.lyrics}). The syllable text is often the widest
 * thing under a note, so a renderer measures it for horizontal spacing.
 */
export class Lyric extends MElement {
  constructor() {
    super('lyric');
  }

  /** Verse/line this belongs to; '1' when omitted (read off `number`, like a staff off a clef). */
  get verse(): string {
    return this.getAttribute('number') ?? '1';
  }

  /**
   * The syllable, all `<text>` runs joined (an elided syllable holds several).
   * '' when the lyric carries no text — an empty syllable takes no width.
   */
  get syllable(): string {
    return this.childrenNamed('text')
      .map((textNode) => textNode.text ?? '')
      .join('');
  }

  /** `<syllabic>`: where this sits in a word, or null when unspecified. */
  get syllabic(): Syllabic | null {
    return (this.child('syllabic')?.text ?? null) as Syllabic | null;
  }

  /**
   * The syllable's runs in document order, so a consumer can render the elision
   * separators {@link syllable} joins away. An empty `<elision/>` leaves the
   * symbol to the renderer (a space is the conventional pick); one carrying text
   * (an undertie, an underscore) uses that.
   */
  get runs(): Array<{ kind: 'text' | 'elision'; text: string }> {
    const runs: Array<{ kind: 'text' | 'elision'; text: string }> = [];
    for (const child of this.children) {
      if (child instanceof MElement && (child.tag === 'text' || child.tag === 'elision')) {
        runs.push({ kind: child.tag, text: child.text ?? '' });
      }
    }
    return runs;
  }

  /** Whether a melisma `<extend>` line trails this syllable. */
  get extend(): boolean {
    return this.child('extend') !== null;
  }

  /** The normalized `color`; null when unset. */
  get color(): string | null {
    return colorOf(this);
  }
}
