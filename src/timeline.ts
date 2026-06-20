import { MElement } from './m-node';
import { Note } from './note';
import type { Measure } from './measure';

// Onset of `target` within `measure`, in divisions (not beats): a single
// left-to-right cursor fold. <backup>/<forward> move the cursor; <chord/> notes
// share the prior onset and don't advance it; a zero-duration node (e.g. a
// <direction>) sits at the cursor. Returns null if `target` isn't in the measure.
// Callers divide by the divisions in effect to get quarter-note beats.
export function onsetOf(measure: Measure, target: MElement): number | null {
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
      const onset = isChord ? chordOnset : cursor;
      if (node === target) {
        return onset;
      }
      if (!isChord && !isGrace) {
        chordOnset = cursor;
        cursor += node.duration ?? 0;
      }
    } else if (node === target) {
      return cursor;
    }
  }
  return null;
}

// The write cursor: divisions elapsed after all current content, in document
// order — where the next appended note lands unless an onset says otherwise.
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
