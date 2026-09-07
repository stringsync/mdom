import { MElement, required } from './m-node';
import { buildFrame, Frame, type FrameSpec } from './frame';
import { appendValue, Measure } from './measure';
import { type Note, adjacentNote } from './note';
import { placementOf } from './print-style';

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

/** A `<root>`/`<bass>` to write. `alter` is omitted rather than 0 when there is none. */
export interface HarmonyStepSpec {
  step: string;
  alter?: number;
}

/** A `<harmony>` to write: the chord symbol, and optionally the diagram under it. */
export interface HarmonySpec {
  root: HarmonyStepSpec;
  /**
   * `<kind>`. The bare enum value prints the renderer's default suffix; pass
   * `text` to override what is printed (`'maj7'` for a `major-seventh`).
   */
  kind: HarmonyKindValue | { value: HarmonyKindValue; text?: string };
  bass?: HarmonyStepSpec;
  frame?: FrameSpec;
  placement?: 'above' | 'below';
}

/** `<harmony>` children that follow `<frame>`, so a later {@link Harmony.setFrame} inserts ahead of them. */
const AFTER_FRAME = new Set(['offset', 'footnote', 'level', 'staff']);

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
   * Upsert the fretboard diagram (`<frame>`), positioned after the chord symbol's
   * own children and before the `<offset>`/`<staff>` tail.
   */
  setFrame(spec: FrameSpec): Frame {
    this.frame?.remove();
    const frame = buildFrame(spec);
    const tail = this.childrenOfType(MElement).find((child) => AFTER_FRAME.has(child.tag)) ?? null;
    this.insertBefore(frame, tail);
    return frame;
  }

  /**
   * The nearest non-`<chord/>`-member note after this harmony in its measure —
   * the note the chord symbol sits above. Same semantics as {@link Direction.nextNote}.
   */
  get nextNote(): Note | null {
    return adjacentNote(this, 1);
  }

  /** `placement`; null when unstated. */
  get placement(): 'above' | 'below' | null {
    return placementOf(this);
  }

  /** The measure this harmony sits in. An attached harmony always has one. */
  get measure(): Measure {
    return required(this.closest(Measure), '<measure> ancestor of <harmony>');
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

/** Build a detached `<harmony>` from a spec, children in schema order. */
export function buildHarmony(spec: HarmonySpec): Harmony {
  const harmony = new Harmony();
  if (spec.placement != null) {
    harmony.setAttribute('placement', spec.placement);
  }
  harmony.append(buildStep('root', spec.root));
  const kind = typeof spec.kind === 'string' ? { value: spec.kind, text: undefined } : spec.kind;
  const kindElement = appendValue(harmony, 'kind', kind.value);
  if (kind.text != null) {
    kindElement.setAttribute('text', kind.text);
  }
  if (spec.bass) {
    harmony.append(buildStep('bass', spec.bass));
  }
  if (spec.frame) {
    harmony.setFrame(spec.frame);
  }
  return harmony;
}

/** Build a `<root>`/`<bass>` block: `<root-step>` plus `<root-alter>` when stated. */
function buildStep(tag: 'root' | 'bass', spec: HarmonyStepSpec): MElement {
  const element = new MElement(tag);
  appendValue(element, `${tag}-step`, spec.step);
  if (spec.alter != null) {
    appendValue(element, `${tag}-alter`, String(spec.alter));
  }
  return element;
}
