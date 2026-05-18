import type { Stave } from './stave';

export class Part {
  constructor(private readonly staves: Stave[]) {}

  getStaves(): Stave[] {
    return this.staves;
  }
}
