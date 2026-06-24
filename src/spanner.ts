import type { MElement } from './m-node';
import { Part } from './part';
import type { Note } from './note';
import type { Direction } from './direction';

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
 * The marker that opens this span: the marker itself when it's an opener, else
 * the nearest earlier opener with the same number (so a `continue`/`stop` finds
 * its start).
 */
function spanOpener<T extends MElement>(marker: T, spec: SpannerSpec<T>): T | null {
  if (spec.isOpen(marker)) {
    return marker;
  }
  const number = numberOf(marker);
  const self = spec.siblings.indexOf(marker);
  for (let index = self - 1; index >= 0; index--) {
    const candidate = spec.siblings[index]!;
    if (numberOf(candidate) === number && spec.isOpen(candidate)) {
      return candidate;
    }
  }
  return null;
}

/**
 * The marker at the far end: an opener finds the next closer with the same
 * number; a closer finds the previous opener. A number can't reopen before it
 * closes, so the first match in each direction is the true partner. Reused
 * numbers and nesting resolve correctly; spans cross measures (and systems) free.
 */
export function resolvePartner<T extends MElement>(marker: T, spec: SpannerSpec<T>): T | null {
  const { siblings, isOpen, isClose } = spec;
  const self = siblings.indexOf(marker);
  if (self < 0) {
    return null;
  }
  const number = numberOf(marker);
  if (isOpen(marker)) {
    for (let index = self + 1; index < siblings.length; index++) {
      const candidate = siblings[index]!;
      if (numberOf(candidate) === number && isClose(candidate)) {
        return candidate;
      }
    }
  } else if (isClose(marker)) {
    for (let index = self - 1; index >= 0; index--) {
      const candidate = siblings[index]!;
      if (numberOf(candidate) === number && isOpen(candidate)) {
        return candidate;
      }
    }
  }
  return null;
}

/**
 * Every marker in the span (opener..closer inclusive) sharing this number — the
 * whole run, not just the far end. A 3-note beam returns begin/continue/end.
 */
export function resolveMembers<T extends MElement>(marker: T, spec: SpannerSpec<T>): T[] {
  const opener = spanOpener(marker, spec);
  if (!opener) {
    return [marker];
  }
  const closer = resolvePartner(opener, spec);
  const start = spec.siblings.indexOf(opener);
  const end = closer ? spec.siblings.indexOf(closer) : start;
  const number = numberOf(marker);
  return spec.siblings.slice(start, end + 1).filter((candidate) => numberOf(candidate) === number);
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
