import type { Entry } from "./entry";

export class Voice {
  constructor(private readonly entries: Entry[]) {}

  getEntries() {
    return this.entries;
  }
}
