import { MElement } from './m-node';
import { Measure } from './measure';
import { Score } from './score';

export class Part extends MElement {
  constructor() {
    super('part');
  }

  get id(): string | null {
    return this.getAttribute('id');
  }

  get measures(): Measure[] {
    return this.childrenOfType(Measure);
  }

  measure(number: string): Measure | null {
    return this.measures.find((measure) => measure.number === number) ?? null;
  }

  // Display name for this part, resolved from its <score-part><part-name> in the
  // <part-list> (a sibling cross-reference, joined by this part's id).
  get label(): string | null {
    const partList = this.closest(Score)?.child('part-list');
    const scorePart = partList?.childrenNamed('score-part').find((entry) => entry.getAttribute('id') === this.id);
    return scorePart?.child('part-name')?.text ?? null;
  }

  // Append a <measure>, numbered after the last one when `number` is omitted.
  addMeasure(opts?: { number?: string }): Measure {
    const measure = new Measure();
    measure.setAttribute('number', opts?.number ?? String(this.measures.length + 1));
    this.append(measure);
    return measure;
  }

  // <staves> count for this part (first declaration in any measure's attributes).
  get staveCount(): number | null {
    for (const measure of this.measures) {
      for (const attrs of measure.childrenNamed('attributes')) {
        const staves = attrs.child('staves')?.text;
        if (staves != null) {
          return Number(staves);
        }
      }
    }
    return null;
  }
}
