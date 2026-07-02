import { MElement } from './m-node';
import { Measure } from './measure';
import { Wedge } from './wedge';
import { Pedal } from './pedal';
import { OctaveShift } from './octave-shift';
import { type Note, adjacentNote, type NoteType } from './note';
import { onsetOf } from './timeline';
import { divisionsBackFrom } from './signature';

/**
 * A `<direction>`: an instruction attached to a point in the timeline, with no
 * `<duration>` of its own. This pass exposes only the spanners under
 * `<direction-type>`; dynamics/words/metronome/segno/coda/rehearsal are deferred.
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

  /**
   * The `<direction-type><metronome>`: `beatUnit` from `<beat-unit>`, `dots` counts
   * `<beat-unit-dot/>` children, `perMinute` kept as a string (MusicXML allows
   * `"ca. 120"`) or null. Null overall when the direction carries no metronome.
   */
  get metronome(): { beatUnit: NoteType; dots: number; perMinute: string | null } | null {
    const metronome = this.directionTypeChild('metronome');
    const beatUnit = metronome?.child('beat-unit')?.text;
    if (beatUnit == null) {
      return null;
    }
    return {
      beatUnit: beatUnit as NoteType,
      dots: metronome!.childrenNamed('beat-unit-dot').length,
      perMinute: metronome!.child('per-minute')?.text ?? null,
    };
  }

  /**
   * The `tempo` attribute of this direction's `<sound>` child, in quarter notes
   * per minute; null when there is no `<sound>` or no `tempo`.
   */
  get soundTempo(): number | null {
    const tempo = this.child('sound')?.getAttribute('tempo');
    return tempo == null ? null : Number(tempo);
  }

  /** Text of each `<direction-type><words>` (e.g. `ritardando`), document order. */
  get words(): string[] {
    return this.directionTypeChildren('words').map((node) => node.text ?? '');
  }

  /** The nearest non-chord note after this direction in its measure (a pedal start binds here). */
  get nextNote(): Note | null {
    return adjacentNote(this, 1);
  }

  /** The nearest non-chord note before this direction in its measure (a pedal stop binds here). */
  get previousNote(): Note | null {
    return adjacentNote(this, -1);
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

  private markers<T extends MElement>(type: new () => T): T[] {
    return this.childrenNamed('direction-type').flatMap((directionType) => directionType.childrenOfType(type));
  }

  /** First `<tag>` across this direction's `<direction-type>` blocks, or null. */
  private directionTypeChild(tag: string): MElement | null {
    return this.directionTypeChildren(tag)[0] ?? null;
  }

  /** Every `<tag>` across this direction's `<direction-type>` blocks, document order. */
  private directionTypeChildren(tag: string): MElement[] {
    return this.childrenNamed('direction-type').flatMap((directionType) => directionType.childrenNamed(tag));
  }
}
