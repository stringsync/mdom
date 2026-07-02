import { MElement } from './m-node';
import { Frame } from './frame';
import { type Note, adjacentNote } from './note';

/**
 * The MusicXML kind-value enum: the harmonic quality printed for a chord symbol.
 * A closed union, not `string` — a renderer switches on it exhaustively.
 */
export type HarmonyKindValue =
  | 'major'
  | 'minor'
  | 'augmented'
  | 'diminished'
  | 'dominant'
  | 'major-seventh'
  | 'minor-seventh'
  | 'diminished-seventh'
  | 'augmented-seventh'
  | 'half-diminished'
  | 'major-minor'
  | 'major-sixth'
  | 'minor-sixth'
  | 'dominant-ninth'
  | 'major-ninth'
  | 'minor-ninth'
  | 'dominant-11th'
  | 'major-11th'
  | 'minor-11th'
  | 'dominant-13th'
  | 'major-13th'
  | 'minor-13th'
  | 'suspended-second'
  | 'suspended-fourth'
  | 'Neapolitan'
  | 'Italian'
  | 'French'
  | 'German'
  | 'pedal'
  | 'power'
  | 'Tristan'
  | 'other'
  | 'none';

/** A `<root>`/`<bass>` scale degree: a step plus an explicit alteration (or none). */
export interface HarmonyStep {
  step: string;
  /**
   * `<root-alter>`/`<bass-alter>` in semitones, or null when absent. An explicit
   * `0` (print a natural) stays distinct from absence — hence `number | null`,
   * not a default of 0.
   */
  alter: number | null;
}

/**
 * A `<harmony>`: a chord symbol (and optionally a fretboard {@link Frame}) that
 * sits above a note. Its fields — root, kind, bass — round-trip as plain child
 * elements; this class reads them typed, and {@link nextNote} binds the symbol
 * to the note it decorates the way {@link Direction} binds to its neighbor.
 */
export class Harmony extends MElement {
  constructor() {
    super('harmony');
  }

  /** The chord root from `<root>` (`<root-step>` + `<root-alter>`), or null. */
  get root(): HarmonyStep | null {
    return readStep(this.child('root'), 'root-step', 'root-alter');
  }

  /** The chord quality from `<kind>`: the enum `value` plus its printed `text` suffix. */
  get kind(): { value: HarmonyKindValue; text: string | null } | null {
    const kind = this.child('kind');
    const value = kind?.text;
    if (value == null) {
      return null;
    }
    return { value: value as HarmonyKindValue, text: kind!.getAttribute('text') };
  }

  /** The slash-chord bass from `<bass>` (`<bass-step>` + `<bass-alter>`), or null. */
  get bass(): HarmonyStep | null {
    return readStep(this.child('bass'), 'bass-step', 'bass-alter');
  }

  /** The fretboard/chord diagram (`<frame>`) carried by this harmony, or null. */
  get frame(): Frame | null {
    return this.childrenOfType(Frame)[0] ?? null;
  }

  /**
   * The nearest non-`<chord/>`-member note after this harmony in its measure —
   * the note the chord symbol sits above. Same semantics as {@link Direction.nextNote}.
   */
  get nextNote(): Note | null {
    return adjacentNote(this, 1);
  }
}

/** Read a `<root>`/`<bass>` block's step + alter into a {@link HarmonyStep}. */
function readStep(parent: MElement | null, stepTag: string, alterTag: string): HarmonyStep | null {
  const step = parent?.child(stepTag)?.text;
  if (step == null) {
    return null;
  }
  const alter = parent!.child(alterTag)?.text;
  return { step, alter: alter == null ? null : Number(alter) };
}
