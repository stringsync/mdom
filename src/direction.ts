import { MElement, required } from './m-node';
import { Bracket } from './bracket';
import { Dashes } from './dashes';
import { Dynamics } from './dynamics';
import { Measure } from './measure';
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
