import type { Mod } from './mod';

export class Entry {
  constructor(private readonly mods: Mod[]) {}

  getMods() {
    return this.mods;
  }
}
