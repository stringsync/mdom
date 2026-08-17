import { MElement, type MNode } from './m-node';
import { Note } from './note';
import type { Measure } from './measure';

/**
 * Onset of `target` within `measure`, in divisions (not beats): a single
 * left-to-right cursor fold. `<backup>`/`<forward>` move the cursor; `<chord/>`
 * notes share the prior onset and don't advance it; a zero-duration node (e.g. a
 * `<direction>`) sits at the cursor. Returns null if `target` isn't in the
 * measure. Callers divide by the divisions in effect to get quarter-note beats.
 */
export function onsetOf(measure: Measure, target: MElement): number | null {
  return onsetsIn(measure).get(target) ?? null;
}

/**
 * Every element child's onset within `measure`, in divisions, from a single fold
 * — the whole timeline in one pass. {@link onsetOf} is a lookup into it; readers
 * that need many onsets at once (ordering a measure's spanner markers by when
 * they sound) fold once instead of once per element. `<backup>`/`<forward>` move
 * the cursor and get no onset of their own.
 */
export function onsetsIn(measure: Measure): Map<MElement, number> {
  const onsets = new Map<MElement, number>();
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
      // <chord/> notes share the prior onset; <grace/> notes are stolen time and
      // sit at the cursor — neither advances it.
      const isChord = node.child('chord') !== null;
      const isGrace = node.child('grace') !== null;
      onsets.set(node, isChord ? chordOnset : cursor);
      if (!isChord && !isGrace) {
        chordOnset = cursor;
        cursor += node.duration ?? 0;
      }
    } else {
      onsets.set(node, cursor);
    }
  }
  return onsets;
}

/**
 * Divisions elapsed at the end of the measure's content: the furthest the fold
 * reaches, across every voice. Not the same as {@link writeCursor}, which is
 * where the cursor *finishes* — a measure ending with a `<backup>` leaves that
 * behind the content. Callers divide by divisions in effect to get beats.
 */
export function contentEnd(measure: Measure): number {
  let cursor = 0;
  let end = 0;
  for (const node of measure.children) {
    if (!(node instanceof MElement)) {
      continue;
    }
    if (node.tag === 'backup') {
      cursor -= Number(node.child('duration')?.text ?? 0);
    } else if (node.tag === 'forward') {
      cursor += Number(node.child('duration')?.text ?? 0);
    } else if (node instanceof Note && node.child('chord') === null && node.child('grace') === null) {
      cursor += node.duration ?? 0;
    } else {
      continue;
    }
    end = Math.max(end, cursor);
  }
  return end;
}

/**
 * The write cursor: divisions elapsed after all current content, in document
 * order — where the next appended note lands unless an onset says otherwise.
 */
export function writeCursor(measure: Measure): number {
  let cursor = 0;
  for (const node of measure.children) {
    if (!(node instanceof MElement)) {
      continue;
    }
    if (node.tag === 'backup') {
      cursor -= Number(node.child('duration')?.text ?? 0);
    } else if (node.tag === 'forward') {
      cursor += Number(node.child('duration')?.text ?? 0);
    } else if (node instanceof Note && node.child('chord') === null && node.child('grace') === null) {
      cursor += node.duration ?? 0;
    }
  }
  return cursor;
}

/**
 * After an edit changed `edited`'s duration by `delta` divisions, keep sibling
 * voices anchored. Within `edited`'s own voice the change ripples for free
 * (onsets are derived), but the `<backup>`/`<forward>` that hands off to the
 * *next* voice was sized for the old length: find that voice-separating mover and
 * shift it by `delta` (a `<backup>` reaches further back, a `<forward>` less far)
 * so the next voice still starts where it did. A same-voice mover (a mid-voice
 * gap) is left to ride along, exactly matching the single-voice ripple.
 */
export function repairTimelineAfter(measure: Measure, edited: Note, delta: number): void {
  // ponytail: repairs the first separator after the edit, which is all the standard
  // one-`<backup>`-per-voice layout needs; pathological interleavings aren't fixed.
  if (delta === 0) {
    return;
  }
  const children = measure.children;
  for (let index = children.indexOf(edited) + 1; index < children.length; index++) {
    const mover = children[index];
    if (!(mover instanceof MElement) || (mover.tag !== 'backup' && mover.tag !== 'forward')) {
      continue;
    }
    const next = nextNoteFrom(children, index + 1);
    if (next && next.voice !== edited.voice) {
      const duration = mover.child('duration');
      if (duration) {
        const current = Number(duration.text ?? 0);
        duration.setText(String(mover.tag === 'backup' ? current + delta : current - delta));
      }
      return;
    }
  }
}

/** The first `<note>` at or after `from` in `children`, or null. */
function nextNoteFrom(children: readonly MNode[], from: number): Note | null {
  for (let index = from; index < children.length; index++) {
    const node = children[index];
    if (node instanceof Note) {
      return node;
    }
  }
  return null;
}
