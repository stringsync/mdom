import { MElement } from './m-node';
import { placementOf } from './print-style';

/**
 * Every tag this class is registered for — the `<technical>` children that carry
 * a playing instruction. `<hammer-on>`/`<pull-off>` are left out: they're
 * spanners with their own classes.
 */
export const TECHNICAL_TAGS = [
  'up-bow',
  'down-bow',
  'harmonic',
  'open-string',
  'thumb-position',
  'fingering',
  'pluck',
  'double-tongue',
  'triple-tongue',
  'stopped',
  'snap-pizzicato',
  'fret',
  'string',
  'tap',
  'heel',
  'toe',
  'fingernails',
  'hole',
  'arrow',
  'handbell',
  'brass-bend',
  'flip',
  'smear',
  'golpe',
  'half-muted',
  'harmon-mute',
  'bend',
  'other-technical',
];

/**
 * One child of `<notations><technical>`: a fingering, a pluck letter, a bowing
 * mark, an open string, and so on. Like an ornament, MusicXML names the marking
 * by the TAG, so {@link technicalType} identifies it and {@link text} carries the
 * value when there is one (a fingering's digit, a pluck's letter).
 *
 * Read them through {@link Note.technicals}. The common tablature reads —
 * `string`, `fret`, `bend`, `isHarmonic` — stay on {@link Note} directly.
 *
 * Like {@link Ornament} it stands in for a whole family of tags, so it keeps
 * `MElement`'s tag-taking constructor: the registry passes the tag it matched.
 */
export class Technical extends MElement {
  /** Which mark this is — the element's own tag. */
  get technicalType(): string {
    return this.tag;
  }

  /** `placement`; null when unstated. */
  get placement(): 'above' | 'below' | null {
    return placementOf(this);
  }

  /** `<fingering alternate="yes">` — a second option, printed "(2)". */
  get alternate(): boolean {
    return this.getAttribute('alternate') === 'yes';
  }

  /** `<fingering substitution="yes">` — change fingers while the key is held, printed "5-3". */
  get substitution(): boolean {
    return this.getAttribute('substitution') === 'yes';
  }
}
