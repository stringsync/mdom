import { MElement, required } from './m-node';

// A <clef>. Lives inside <attributes>; one per staff in multi-staff parts.
export class Clef extends MElement {
  constructor() {
    super('clef');
  }

  // Staff this clef applies to; '1' when omitted (single-staff parts).
  get staff(): string {
    return this.getAttribute('number') ?? '1';
  }

  // <sign> is required in a well-formed <clef>; absence is a malformed document.
  get sign(): string {
    return required(this.child('sign')?.text, '<sign> in <clef>'); // G, F, C, percussion, TAB
  }

  // <line> is optional; its default is sign-dependent (G→2, F→4, C→3), so absence
  // stays null for the caller (or renderer) to resolve.
  get line(): number | null {
    const line = this.child('line')?.text;
    return line == null ? null : Number(line);
  }

  // <clef-octave-change>: ±1 = ottava (e.g. treble-8 for guitar). Absent means no
  // transposition — the spec default of 0.
  get octaveChange(): number {
    return Number(this.child('clef-octave-change')?.text ?? 0);
  }
}
