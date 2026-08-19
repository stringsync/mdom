import { MElement, required } from './m-node';
import { Bracket } from './bracket';
import { Dashes } from './dashes';
import { Dynamics } from './dynamics';
import { appendValue, Measure } from './measure';
import { Metronome } from './metronome';
import { Wedge } from './wedge';
import { Pedal } from './pedal';
import { OctaveShift } from './octave-shift';
import { type Note, adjacentNote, type NoteType } from './note';
import { colorOf, placementOf } from './print-style';
import { Rehearsal } from './rehearsal';
import { Sound } from './sound';
import { Words } from './words';
import { onsetOf } from './timeline';
import { divisionsBackFrom } from './signature';

/** A `<metronome>` to write: the beat unit (with its trailing dots) and its rate. */
export interface MetronomeSpec {
  beatUnit: NoteType;
  dots?: number;
  /** `<per-minute>`; a string because MusicXML allows "ca. 120". */
  perMinute: string | number;
  parentheses?: boolean;
}

/** A `<words>` to write: the text, and the font it is measured and drawn in. */
export interface WordsSpec {
  text: string;
  fontStyle?: string;
  fontWeight?: string;
}

/**
 * A `<direction>` to write. At least one printable — words, dynamics or a
 * metronome — is required, since that is what a `<direction-type>` holds; each
 * gets its own block, in the order listed here. `tempo` adds the silent
 * `<sound tempo>` that makes the mark actually play back.
 */
export interface DirectionSpec {
  metronome?: MetronomeSpec;
  words?: string | WordsSpec;
  /**
   * Dynamic marking names. MusicXML names these by TAG (`<dynamics><sfz/>`), so
   * a name is written through as a tag — spell it the way MusicXML does.
   */
  dynamics?: string | string[];
  /** The `<sound>` `tempo` attribute, in quarter notes per minute. */
  tempo?: number;
  placement?: 'above' | 'below';
  staff?: string;
}

/**
 * A `<direction>`: an instruction attached to a point in the timeline, with no
 * `<duration>` of its own. Everything printable it carries hangs off a
 * `<direction-type>` block — often several, side by side (a tempo rate in one and
 * a note-group relation in the next) — so the collectors here read across all of
 * them and the caller never walks the nesting.
 */
export class Direction extends MElement {
  constructor() {
    super('direction');
  }

  /** `<wedge>` (hairpin) markers under this direction. */
  get wedges(): Wedge[] {
    return this.markers(Wedge);
  }

  /** `<pedal>` markers under this direction. */
  get pedals(): Pedal[] {
    return this.markers(Pedal);
  }

  /** `<octave-shift>` markers under this direction. */
  get octaveShifts(): OctaveShift[] {
    return this.markers(OctaveShift);
  }

  /** `<bracket>` (phrase/analysis bracket) markers under this direction. */
  get brackets(): Bracket[] {
    return this.markers(Bracket);
  }

  /** `<dashes>` (the dashed line trailing a "cresc." or "rit.") markers under this direction. */
  get dashes(): Dashes[] {
    return this.markers(Dashes);
  }

  /**
   * Every `<direction-type><metronome>`, document order. A direction routinely
   * carries two — the rate in one `<direction-type>` and a note-group relation in
   * the next, printed side by side.
   */
  get metronomes(): Metronome[] {
    return this.markers(Metronome);
  }

  /** The `<direction-type><dynamics>` blocks under this direction, document order. */
  get dynamics(): Dynamics[] {
    return this.markers(Dynamics);
  }

  /** The `<direction-type><rehearsal>` marks under this direction, document order. */
  get rehearsals(): Rehearsal[] {
    return this.markers(Rehearsal);
  }

  /**
   * The `<direction-type><words>` elements, document order — the typed form of
   * {@link words}, carrying the font attributes a renderer measures with.
   */
  get wordsElements(): Words[] {
    return this.markers(Words);
  }

  /**
   * `<segno/>` and `<coda/>` markers under this direction, document order — the
   * landmarks a D.S./D.C. jumps to.
   */
  get navigations(): Array<'segno' | 'coda'> {
    return this.directionTypeElements()
      .filter((element) => element.tag === 'segno' || element.tag === 'coda')
      .map((element) => element.tag as 'segno' | 'coda');
  }

  /**
   * The first `<direction-type><metronome>`, flattened to its leading beat unit.
   * Kept for compatibility; {@link metronomes} is what a consumer should reach for
   * — this one drops the second beat unit of a metric modulation, the
   * `parentheses` attribute, and the `<metronome-note>` form entirely.
   */
  get metronome(): { beatUnit: NoteType; dots: number; perMinute: string | null } | null {
    const metronome = this.metronomes[0];
    const beatUnit = metronome?.beatUnits[0];
    if (!metronome || !beatUnit) {
      return null;
    }
    return { beatUnit: beatUnit.type, dots: beatUnit.dots, perMinute: metronome.perMinute };
  }

  /** This direction's `<sound>` child (playback instructions), or null. */
  get sound(): Sound | null {
    return this.childrenOfType(Sound)[0] ?? null;
  }

  /**
   * The `tempo` attribute of this direction's `<sound>` child, in quarter notes
   * per minute; null when there is no `<sound>` or no `tempo`.
   */
  get soundTempo(): number | null {
    return this.sound?.tempo ?? null;
  }

  /** Text of each `<direction-type><words>` (e.g. `ritardando`), document order. */
  get words(): string[] {
    return this.wordsElements.map((node) => node.text);
  }

  /**
   * The staff this direction prints over; '1' when omitted, matching
   * {@link Note.staff}. Without it every directive in a multi-staff part piles
   * onto the top staff.
   */
  get staff(): string {
    return this.child('staff')?.text ?? '1';
  }

  /** `placement`; null when unstated (the default is the renderer's choice). */
  get placement(): 'above' | 'below' | null {
    return placementOf(this);
  }

  /** The normalized `color`; null when unset. */
  get color(): string | null {
    return colorOf(this);
  }

  /** The nearest non-chord note after this direction in its measure (a pedal start binds here). */
  get nextNote(): Note | null {
    return adjacentNote(this, 1);
  }

  /** The nearest non-chord note before this direction in its measure (a pedal stop binds here). */
  get previousNote(): Note | null {
    return adjacentNote(this, -1);
  }

  /** The measure this direction sits in. An attached direction always has one. */
  get measure(): Measure {
    return required(this.closest(Measure), '<measure> ancestor of <direction>');
  }

  /**
   * Onset within the measure, in beats — the cursor position where this
   * `<direction>` sits in the backup/forward fold.
   */
  get measureBeat(): number | null {
    const measure = this.closest(Measure);
    if (!measure) {
      return null;
    }
    const divisions = divisionsBackFrom(measure, measure.children.indexOf(this));
    const onset = onsetOf(measure, this);
    if (divisions == null || onset == null) {
      return null;
    }
    return onset / divisions;
  }

  private markers<T extends MElement>(type: new (...args: never[]) => T): T[] {
    return this.childrenNamed('direction-type').flatMap((directionType) => directionType.childrenOfType(type));
  }

  /** Every element across this direction's `<direction-type>` blocks, document order. */
  private directionTypeElements(): MElement[] {
    return this.childrenNamed('direction-type').flatMap((directionType) => directionType.childrenOfType(MElement));
  }
}

/** Build a detached `<direction>` from a spec, children in schema order. */
export function buildDirection(spec: DirectionSpec): Direction {
  const direction = new Direction();
  if (spec.placement != null) {
    direction.setAttribute('placement', spec.placement);
  }
  if (spec.metronome) {
    directionType(direction).append(buildMetronome(spec.metronome));
  }
  if (spec.words != null) {
    const words = typeof spec.words === 'string' ? { text: spec.words } : spec.words;
    const element = new Words();
    element.setText(words.text);
    if (words.fontStyle != null) {
      element.setAttribute('font-style', words.fontStyle);
    }
    if (words.fontWeight != null) {
      element.setAttribute('font-weight', words.fontWeight);
    }
    directionType(direction).append(element);
  }
  if (spec.dynamics != null) {
    const dynamics = new Dynamics();
    for (const mark of typeof spec.dynamics === 'string' ? [spec.dynamics] : spec.dynamics) {
      dynamics.append(new MElement(mark));
    }
    directionType(direction).append(dynamics);
  }
  if (direction.children.length === 0) {
    throw new Error('mdom: a <direction> needs at least one of metronome, words or dynamics');
  }
  if (spec.staff != null) {
    appendValue(direction, 'staff', spec.staff);
  }
  if (spec.tempo != null) {
    const sound = new Sound();
    sound.setAttribute('tempo', String(spec.tempo));
    direction.append(sound);
  }
  return direction;
}

/** Append a fresh `<direction-type>` — one per printable, which is how they print side by side. */
function directionType(direction: Direction): MElement {
  const block = new MElement('direction-type');
  direction.append(block);
  return block;
}

/**
 * Build a `<metronome>` in the `<beat-unit>` form. The dots TRAIL the unit they
 * modify, which is the whole reason {@link Metronome.beatUnits} reads positionally.
 */
function buildMetronome(spec: MetronomeSpec): Metronome {
  const metronome = new Metronome();
  if (spec.parentheses) {
    metronome.setAttribute('parentheses', 'yes');
  }
  appendValue(metronome, 'beat-unit', spec.beatUnit);
  for (let dot = 0; dot < (spec.dots ?? 0); dot++) {
    metronome.append(new MElement('beat-unit-dot'));
  }
  appendValue(metronome, 'per-minute', String(spec.perMinute));
  return metronome;
}
