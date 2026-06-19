import { MElement } from './m-node';
import { Note } from './note';

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
}
