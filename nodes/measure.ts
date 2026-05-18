import type { Document } from "./document";
import type { Part } from "./part";

export class Measure {
  constructor(private readonly parts: Part[]) {}

  getParts(): Part[] {
    return this.parts;
  }
}
