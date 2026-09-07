import { MElement } from './m-node';
import type { Score } from './score';

/**
 * One resolved `<part-group>`: the brace or bracket joining a run of parts. The
 * markers in `<part-list>` are flat and interleaved with `<score-part>` entries,
 * so this is the walk that turns them into spans.
 */
export interface PartGroupSpan {
  /** Index into `score.parts` of the group's first member. */
  fromPartIndex: number;
  /** Index into `score.parts` of the group's last member (inclusive). */
  toPartIndex: number;
  /** `<group-symbol>`: 'none' | 'brace' | 'line' | 'bracket' | 'square'; null when absent. */
  symbol: string | null;
  /** `<group-name>`; null when absent. */
  name: string | null;
  /** `<group-abbreviation>`; null when absent. */
  abbreviation: string | null;
  /**
   * `<group-barline>`: 'yes' | 'no' | 'Mensurstrich'; null when absent. MusicXML
   * defines no default, so absence stays distinct from an explicit 'yes'.
   */
  barline: string | null;
  /** Nesting depth; 0 is outermost. */
  depth: number;
}

/**
 * The `<part-group>` spans of a score, outermost first. `<part-group>` markers are
 * paired by `number` and their extent is "the parts between the start and the
 * stop", so a group's members are found by counting `<score-part>` entries as the
 * part-list is walked. Groups whose stop never arrives, or whose span covers no
 * part, are dropped rather than reported as broken spans.
 */
export function partGroupsOf(score: Score): PartGroupSpan[] {
  const partList = score.child('part-list');
  if (!partList) {
    return [];
  }
  const partCount = score.parts.length;
  const spans: Array<PartGroupSpan & { started: number }> = [];
  const open: Array<{ number: string; from: number; depth: number; started: number; marker: MElement }> = [];
  let partIndex = 0;
  let started = 0;

  for (const node of partList.children) {
    if (!(node instanceof MElement)) {
      continue;
    }
    if (node.tag === 'score-part') {
      partIndex++;
      continue;
    }
    if (node.tag !== 'part-group') {
      continue;
    }
    const number = node.getAttribute('number') ?? '1';
    if (node.getAttribute('type') === 'stop') {
      const at = open.findLastIndex((group) => group.number === number);
      if (at < 0) {
        continue;
      }
      const [group] = open.splice(at, 1);
      const toPartIndex = partIndex - 1;
      if (!group || group.from > toPartIndex || toPartIndex >= partCount) {
        continue; // covers no part, or runs past the end of the part list
      }
      spans.push({
        started: group.started,
        fromPartIndex: group.from,
        toPartIndex,
        depth: group.depth,
        symbol: group.marker.child('group-symbol')?.text ?? null,
        name: group.marker.child('group-name')?.text ?? null,
        abbreviation: group.marker.child('group-abbreviation')?.text ?? null,
        barline: group.marker.child('group-barline')?.text ?? null,
      });
    } else {
      open.push({ number, from: partIndex, depth: open.length, started: started++, marker: node });
    }
  }

  // Outermost first = start order: an enclosing group always opens before the one
  // it encloses. Spans are collected as they STOP (so an inner group lands first),
  // hence the re-sort. Unstopped groups are still in `open` and never emitted.
  spans.sort((left, right) => left.started - right.started);
  return spans.map(({ started: _, ...span }) => span);
}
