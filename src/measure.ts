import { MElement } from './m-node';
import { Note } from './note';
import { Part } from './part';

export class Measure extends MElement {
  constructor() {
    super('measure');
  }

  get number(): string | null {
    return this.getAttribute('number');
  }

  get notes(): Note[] {
    return this.childrenOfType(Note);
  }

  // Position among the part's measures; -1 when detached. Distinct from
  // `number`, which is the (free-form, possibly repeated) printed label.
  get index(): number {
    return this.closest(Part)?.measures.indexOf(this) ?? -1;
  }
}
