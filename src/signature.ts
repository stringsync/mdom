import { MElement, type MNode } from './m-node';
import { Part } from './part';
import type { Measure } from './measure';

// <attributes> in effect, nearest first: scan backward from `fromIndex`
// (exclusive) within `measure`, then through earlier measures of the part. This
// one backward walk is the entire carry-forward — first match wins. A Note passes
// its own index (so mid-measure changes count); a Measure passes its child count
// ("at the start of this measure", which still includes its own leading
// <attributes>). The same helper answers clef/key/time/divisions/staves.
export function attributesBackFrom(measure: Measure, fromIndex: number): MElement[] {
  const result: MElement[] = [];

  const kids: readonly MNode[] = measure.children;
  for (let index = fromIndex - 1; index >= 0; index--) {
    const node = kids[index];
    if (node instanceof MElement && node.tag === 'attributes') {
      result.push(node);
    }
  }

  const part = measure.closest(Part);
  if (part) {
    const measures = part.measures;
    for (let earlier = measures.indexOf(measure) - 1; earlier >= 0; earlier--) {
      const attrs = measures[earlier]!.childrenNamed('attributes');
      for (let index = attrs.length - 1; index >= 0; index--) {
        result.push(attrs[index]!);
      }
    }
  }

  return result;
}

// <divisions> in effect (global) at `fromIndex` within `measure`.
export function divisionsBackFrom(measure: Measure, fromIndex: number): number | null {
  for (const attrs of attributesBackFrom(measure, fromIndex)) {
    const value = attrs.child('divisions')?.text;
    if (value != null) {
      return Number(value);
    }
  }
  return null;
}

// Whether a per-staff signature element (<key>/<time>/<staff-details>) applies to
// `staff`: a `number` attribute targets one staff; its absence means all staves.
// (Clefs are the exception — they match by exact staff, never all-staves.)
export function appliesToStaff(element: MElement, staff: string): boolean {
  const number = element.getAttribute('number');
  return number === null || number === staff;
}
