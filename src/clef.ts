import { MElement } from './m-node';

// A <clef>. Lives inside <attributes>; one per staff in multi-staff parts.
export class Clef extends MElement {
  constructor() {
    super('clef');
  }

  // Staff this clef applies to; '1' when omitted (single-staff parts).
  get staff(): string {
    return this.getAttribute('number') ?? '1';
  }

  get sign(): string | null {
    return this.child('sign')?.text ?? null; // G, F, C, percussion, TAB
  }

  get line(): number | null {
    const line = this.child('line')?.text;
    return line == null ? null : Number(line);
  }

  // <clef-octave-change>: ±1 = ottava (e.g. treble-8 for guitar).
  get octaveChange(): number | null {
    const oc = this.child('clef-octave-change')?.text;
    return oc == null ? null : Number(oc);
  }
}
