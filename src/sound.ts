import { MElement } from './m-node';

/** Quarter-note beats per swing unit; MusicXML's default swing type is the eighth. */
const SWING_UNITS: Record<string, number> = { eighth: 0.5, '16th': 0.25, '32nd': 0.125 };

/**
 * A `<sound>`: playback instructions with no printed form. It appears both inside
 * a `<direction>` and as a direct `<measure>` child, with the same meaning — see
 * {@link Measure.sounds}, which merges the two so a consumer looks in one place.
 */
export class Sound extends MElement {
  constructor() {
    super('sound');
  }

  /** The `tempo` attribute in quarter notes per minute; null when unset. */
  get tempo(): number | null {
    const tempo = this.getAttribute('tempo');
    return tempo == null ? null : Number(tempo);
  }

  /** The `dynamics` attribute (percent of a forte velocity); null when unset. */
  get dynamics(): number | null {
    const dynamics = this.getAttribute('dynamics');
    return dynamics == null ? null : Number(dynamics);
  }

  /**
   * `<swing>`: the on-beat:off-beat ratio and the note value it divides.
   * `<straight/>` reads as an even 1:1 so it cancels a carried swing rather than
   * reading as "no instruction". `unit` is in quarter-note beats — eighth = 0.5,
   * 16th = 0.25. Null when this sound states no swing at all.
   */
  get swing(): { first: number; second: number; unit: number } | null {
    const swing = this.child('swing');
    if (!swing) {
      return null;
    }
    const unit = SWING_UNITS[swing.child('swing-type')?.text ?? 'eighth'] ?? 0.5;
    if (swing.child('straight')) {
      return { first: 1, second: 1, unit };
    }
    const first = swing.child('first')?.text;
    const second = swing.child('second')?.text;
    if (first == null || second == null) {
      return null;
    }
    return { first: Number(first), second: Number(second), unit };
  }
}
