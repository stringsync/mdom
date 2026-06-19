import { MElement } from './m-node';
import { Part } from './part';

// The score-partwise root. Parts are first-class and queried top-down.
export class Score extends MElement {
  constructor() {
    super('score-partwise');
  }

  get parts(): Part[] {
    return this.childrenOfType(Part);
  }

  part(id: string): Part | null {
    return this.parts.find((p) => p.id === id) ?? null;
  }
}
