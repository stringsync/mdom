import { MElement } from './m-node';

// Mirrors <pitch>: the typed leaf values of a pitched note.
export class Pitch extends MElement {
  constructor() {
    super('pitch');
  }

  get step(): string | null {
    return this.child('step')?.text ?? null;
  }

  get alter(): number | null {
    const alter = this.child('alter')?.text;
    return alter == null ? null : Number(alter); // ± semitones; decimals for microtones
  }

  get octave(): number | null {
    const octave = this.child('octave')?.text;
    return octave == null ? null : Number(octave);
  }
}
