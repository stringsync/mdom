import { MElement } from './m-node';
import { Measure } from './measure';

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
    return this.measures.find((m) => m.number === number) ?? null;
  }
}
