import type { Voice } from './voice';

export class Stave {
  constructor(private readonly voices: Voice[]) {}

  getVoices() {
    return this.voices;
  }
}
