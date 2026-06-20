import { MElement, MNode } from './m-node';
import { Pitch } from './pitch';
import { Clef } from './clef';
import { Slur } from './slur';
import { Measure } from './measure';
import { Part } from './part';

// A single note. Chords, ties, beams, slurs, voice/staff grouping, and the
// backup/forward timeline are intentionally not modeled here: they round-trip
// as plain child MElements and belong to a later projection/edit layer.
export class Note extends MElement {
  constructor() {
    super('note');
  }

  get isRest(): boolean {
    return this.child('rest') !== null;
  }

  get pitch(): Pitch | null {
    return this.childrenOfType(Pitch)[0] ?? null; // null for rests / unpitched
  }

  get duration(): number | null {
    const duration = this.child('duration')?.text;
    return duration == null ? null : Number(duration);
  }

  get type(): string | null {
    return this.child('type')?.text ?? null;
  }

  // The staff this note is on; '1' when omitted (single-staff parts).
  get staff(): string {
    return this.child('staff')?.text ?? '1';
  }

  // The <clef> in effect for this note's staff: the nearest one at or before
  // this note, scanning back through the part. This single query is the whole
  // "carried-forward signature" computation — no Signature objects, no
  // per-fragment threading, no carry-forward merge. The same backward walk
  // (`attributesBackFrom`) answers key/time/divisions too; see `divisions`.
  clef(): Clef | null {
    for (const attrs of attributesBackFrom(this)) {
      const clef = attrs.childrenOfType(Clef).find((c) => c.staff === this.staff);
      if (clef) {
        return clef;
      }
    }
    return null;
  }

  // <divisions> in effect (global, not per-staff) — needed to read <duration>
  // as beats. Same helper, different shape: proves it generalizes.
  get divisions(): number | null {
    for (const attrs of attributesBackFrom(this)) {
      const d = attrs.child('divisions')?.text;
      if (d != null) {
        return Number(d);
      }
    }
    return null;
  }

  // The <slur> markers on this note (usually one; can be two when a note ends
  // one slur and begins another). Each resolves its far end via `partner()`.
  get slurs(): Slur[] {
    return this.childrenNamed('notations').flatMap((n) => n.childrenOfType(Slur));
  }

  // Onset of this note within its measure, in quarter-note beats. This is the
  // entire backup/forward story: a left-to-right fold over the measure with one
  // cursor. <backup>/<forward> move the cursor; <chord/> notes share the prior
  // onset and don't advance it. No event stream, no Fraction algebra threaded
  // through a pipeline — just a local scan that composes with `divisions`.
  measureBeat(): number | null {
    const measure = this.closest(Measure);
    const divisions = this.divisions;
    if (!measure || divisions == null) {
      return null;
    }

    let cursor = 0; // divisions elapsed from the measure start
    let chordOnset = 0; // onset of the current chord's first note
    for (const node of measure.children) {
      if (!(node instanceof MElement)) {
        continue;
      }
      if (node.tag === 'backup') {
        cursor -= Number(node.child('duration')?.text ?? 0);
      } else if (node.tag === 'forward') {
        cursor += Number(node.child('duration')?.text ?? 0);
      } else if (node instanceof Note) {
        const isChord = node.child('chord') !== null;
        const onset = isChord ? chordOnset : cursor;
        if (node === this) {
          return onset / divisions;
        }
        if (!isChord) {
          chordOnset = cursor;
          cursor += node.duration ?? 0;
        }
      }
    }
    return null;
  }
}

// <attributes> elements at or before `note`, nearest first, walking back
// through the current measure then earlier measures of the same part. This is
// the carry-forward: scan in reverse document order, first match wins.
function attributesBackFrom(note: Note): MElement[] {
  const measure = note.closest(Measure);
  const part = note.closest(Part);
  if (!measure || !part) {
    return [];
  }

  const result: MElement[] = [];

  // Current measure: <attributes> appearing before this note (handles
  // mid-measure clef/key/time changes).
  const kids: readonly MNode[] = measure.children;
  for (let i = kids.indexOf(note) - 1; i >= 0; i--) {
    const k = kids[i];
    if (k instanceof MElement && k.tag === 'attributes') {
      result.push(k);
    }
  }

  // Earlier measures, nearest first.
  const measures = part.measures;
  for (let m = measures.indexOf(measure) - 1; m >= 0; m--) {
    const attrs = measures[m]!.childrenNamed('attributes');
    for (let i = attrs.length - 1; i >= 0; i--) {
      result.push(attrs[i]!);
    }
  }

  return result;
}
