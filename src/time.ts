import { MElement } from './m-node';

// A <time> inside <attributes>. Usually one beats/beat-type pair; composite
// meters list several. `symbol` covers common/cut/etc.; senza-misura is unmetered.
export class Time extends MElement {
  constructor() {
    super('time');
  }

  // Staff this time applies to; '1' when omitted.
  get staff(): string {
    return this.getAttribute('number') ?? '1';
  }

  // Numerator of the first beats/beat-type pair.
  get beats(): string | null {
    return this.child('beats')?.text ?? null;
  }

  // Denominator of the first beats/beat-type pair.
  get beatType(): string | null {
    return this.child('beat-type')?.text ?? null;
  }

  // Every beats/beat-type pair in order (composite meters have more than one).
  get components(): { beats: string; beatType: string }[] {
    const beats = this.childrenNamed('beats');
    const beatTypes = this.childrenNamed('beat-type');
    return beats.map((numerator, index) => ({
      beats: numerator.text ?? '',
      beatType: beatTypes[index]?.text ?? '',
    }));
  }

  // common, cut, single-number, note, dotted-note, normal.
  get symbol(): string | null {
    return this.getAttribute('symbol');
  }

  get isSenzaMisura(): boolean {
    return this.child('senza-misura') !== null;
  }
}
