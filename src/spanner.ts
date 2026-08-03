import type { MElement } from './m-node';
import { Measure } from './measure';
import { Part } from './part';
import type { Note } from './note';
import type { Direction } from './direction';
import { onsetsIn } from './timeline';

/**
 * One spanner type's pairing rules: every marker of that type in the part (in
 * document order), plus how a marker's value classifies as an opener or closer.
 * The number that pairs start<->stop is read generically off the `number`
 * attribute, so the spec only has to say which values open and which close.
 */
export interface SpannerSpec<T extends MElement> {
  siblings: T[];
  isOpen(marker: T): boolean;
  isClose(marker: T): boolean;
}

/** The marker's pairing number; MusicXML treats an absent number as 1. */
function numberOf(marker: MElement): string {
  return marker.getAttribute('number') ?? '1';
}

/**
 * The direct child of `measure` that `marker` hangs under — the note or direction
 * that puts it on the timeline.
 */
function anchorIn(marker: MElement, measure: Measure): MElement {
  let node: MElement = marker;
  while (node.parent && node.parent !== measure) {
    node = node.parent;
  }
  return node;
}

/**
 * The `<voice>` in effect for a marker: the nearest ancestor (up to the measure)
 * that declares one. Null when nothing does — direction markers usually don't.
 */
function voiceOf(marker: MElement): string | null {
  for (let node: MElement | null = marker; node; node = node.parent) {
    const voice = node.child('voice')?.text;
    if (voice != null) {
      return voice;
    }
    if (node instanceof Measure) {
      break;
    }
  }
  return null;
}

/**
 * Markers reordered by when they SOUND rather than where they're written: measure
 * by measure (already document order), then by the backup/forward fold's onset
 * within each. A `<backup>` writes a later voice's notes *after* an earlier
 * voice's even though they sound together, so a slur opening in the left hand and
 * closing on a right-hand note the exporter wrote earlier has its stop sitting
 * before its start in the file. Document order pairs that slur with the wrong end
 * — or with none at all, and it runs on for bars. The sort is stable, so markers
 * sounding together keep document order.
 */
function onsetOrdered<T extends MElement>(markers: T[]): { order: T[]; keys: Map<T, OnsetKey> } {
  const folds = new Map<Measure, { index: number; onsets: Map<MElement, number> }>();
  const keys = new Map<T, OnsetKey>();
  for (const marker of markers) {
    const measure = marker.closest(Measure);
    if (!measure) {
      keys.set(marker, { measure: 0, onset: 0 });
      continue;
    }
    let fold = folds.get(measure);
    if (!fold) {
      fold = { index: measure.index, onsets: onsetsIn(measure) };
      folds.set(measure, fold);
    }
    keys.set(marker, { measure: fold.index, onset: fold.onsets.get(anchorIn(marker, measure)) ?? 0 });
  }
  const order = [...markers].sort((left, right) => {
    const leftKey = keys.get(left)!;
    const rightKey = keys.get(right)!;
    return leftKey.measure - rightKey.measure || leftKey.onset - rightKey.onset;
  });
  return { order, keys };
}

/** Where a marker sounds: measure index first, then divisions within it. */
interface OnsetKey {
  measure: number;
  onset: number;
}

function soundsLater(candidate: OnsetKey, incumbent: OnsetKey): boolean {
  return candidate.measure !== incumbent.measure
    ? candidate.measure > incumbent.measure
    : candidate.onset > incumbent.onset;
}

/**
 * Every marker paired to its far end, resolved across the part in onset order.
 *
 * A closer takes the open start with the SAME VOICE when there is one: two voices
 * running in parallel each keep their own arc even when their spans are different
 * lengths, which no purely positional rule gets right. Among the remaining
 * candidates it takes the one at the MOST RECENT ONSET, and the oldest of those
 * sounding together. Recency because a start that reopens a number while it is
 * still open supersedes the stale one — an exporter that emits a start with no
 * stop anywhere (Guitar Pro does) would otherwise leave it open forever, eating
 * every later closer and dragging spans across the rest of the part. Oldest-first
 * within one onset because that's a chord, whose members open together (so voice
 * can't separate them) and whose first start belongs with the first stop.
 *
 * All three rules are needed because exporters break the "a number can't reopen
 * before it closes" rule constantly: a divisi stave's two voices, or a chord's
 * members, all slurring under number 1.
 *
 * ponytail: recomputed per query, like every other mdom read — the marker walk it
 * builds on is already O(part). Add a part-level cache if profiling asks for one,
 * but it needs an edit epoch to invalidate against: the tree is mutable.
 */
function pairingOf<T extends MElement>(spec: SpannerSpec<T>): { order: T[]; partners: Map<T, T> } {
  const { order, keys } = onsetOrdered(spec.siblings);
  const partners = new Map<T, T>();
  const open = new Map<string, T[]>();

  for (const marker of order) {
    const number = numberOf(marker);
    if (spec.isOpen(marker)) {
      const starts = open.get(number);
      if (starts) {
        starts.push(marker);
      } else {
        open.set(number, [marker]);
      }
    } else if (spec.isClose(marker)) {
      const starts = open.get(number);
      if (!starts || starts.length === 0) {
        continue;
      }
      const opener = starts.splice(openerFor(marker, starts, keys), 1)[0]!;
      partners.set(opener, marker);
      partners.set(marker, opener);
    }
  }

  return { order, partners };
}

/**
 * Index in `starts` of the opener `closer` claims: same voice beats a different
 * one, then a later onset beats an earlier one, and a tie keeps the earliest
 * still-open start (see {@link pairingOf}). `starts` is already in onset order.
 */
function openerFor<T extends MElement>(closer: T, starts: T[], keys: Map<T, OnsetKey>): number {
  const voice = voiceOf(closer);
  const matchesVoice = (start: T): boolean => voice != null && voiceOf(start) === voice;
  let best = 0;
  for (let index = 1; index < starts.length; index++) {
    const candidate = starts[index]!;
    const incumbent = starts[best]!;
    if (matchesVoice(candidate) !== matchesVoice(incumbent)) {
      if (matchesVoice(candidate)) {
        best = index;
      }
    } else if (soundsLater(keys.get(candidate)!, keys.get(incumbent)!)) {
      best = index;
    }
  }
  return best;
}

/**
 * The marker at the far end: the start this stop closes, or the stop that closes
 * this start, paired in onset order (see {@link pairingOf}). Spans cross measures
 * — and systems, and `<backup>`s — for free.
 */
export function resolvePartner<T extends MElement>(marker: T, spec: SpannerSpec<T>): T | null {
  if (!spec.siblings.includes(marker)) {
    return null;
  }
  return pairingOf(spec).partners.get(marker) ?? null;
}

/**
 * Every marker in the span (opener..closer inclusive) sharing this number — the
 * whole run, not just the far end. A 3-note beam returns begin/continue/end.
 */
export function resolveMembers<T extends MElement>(marker: T, spec: SpannerSpec<T>): T[] {
  const { order, partners } = pairingOf(spec);
  const self = order.indexOf(marker);
  if (self < 0) {
    return [marker];
  }
  const number = numberOf(marker);
  // A `continue` is neither end of the pairing, so it looks back for the start it
  // belongs to; a `stop` already knows its opener.
  const opener = spec.isOpen(marker) ? marker : (partners.get(marker) ?? earlierOpener(order, self, number, spec));
  if (!opener) {
    return [marker];
  }
  const start = order.indexOf(opener);
  const closer = partners.get(opener);
  const end = closer ? order.indexOf(closer) : start;
  return order.slice(start, end + 1).filter((candidate) => numberOf(candidate) === number);
}

/** The nearest opener with this number before `self` in onset order, or null. */
function earlierOpener<T extends MElement>(order: T[], self: number, number: string, spec: SpannerSpec<T>): T | null {
  for (let index = self - 1; index >= 0; index--) {
    const candidate = order[index]!;
    if (numberOf(candidate) === number && spec.isOpen(candidate)) {
      return candidate;
    }
  }
  return null;
}

/**
 * Remove a span outright: detach `marker` and its partner (if any), so neither end
 * is left dangling. An opener with no closer — a let-ring tie, say — drops itself.
 */
export function removeSpan<T extends MElement>(marker: T, spec: SpannerSpec<T>): void {
  const partner = resolvePartner(marker, spec);
  marker.remove();
  partner?.remove();
}

/** All markers of one note-attached spanner type across the part, document order. */
export function noteMarkers<T extends MElement>(marker: MElement, pick: (note: Note) => T[]): T[] {
  const part = marker.closest(Part);
  if (!part) {
    return [];
  }
  return part.measures.flatMap((measure) => measure.notes).flatMap(pick);
}

/** The same, for direction-attached spanner types. */
export function directionMarkers<T extends MElement>(marker: MElement, pick: (direction: Direction) => T[]): T[] {
  const part = marker.closest(Part);
  if (!part) {
    return [];
  }
  return part.measures.flatMap((measure) => measure.directions).flatMap(pick);
}
