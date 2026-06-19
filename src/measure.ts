import { MElement } from './m-node';

export class Measure extends MElement {
  constructor() {
    super('measure');
  }

  get number(): string | null {
    return this.getAttribute('number');
  }
}
