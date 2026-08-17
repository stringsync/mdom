import { describe, expect, it } from 'bun:test';
import { MDOMParser } from './m-dom-parser';

// A pickup bar is short BY DECLARATION; a layout engine that misses this pads it
// out to a full bar's width.
const PICKUP = `<score-partwise><part id="P1">
  <measure number="0" implicit="yes">
    <attributes><divisions>4</divisions><time><senza-misura/></time></attributes>
    <note><pitch><step>G</step><octave>4</octave></pitch><duration>4</duration></note>
  </measure>
  <measure number="1">
    <attributes><time symbol="cut"><beats>2</beats><beat-type>2</beat-type></time></attributes>
    <note><pitch><step>C</step><octave>5</octave></pitch><duration>16</duration></note>
  </measure>
</part></score-partwise>`;

describe('measure and time — the declared-shape flags', () => {
  const part = new MDOMParser().parseFromString(PICKUP).score.getPart('P1')!;
  const [pickup, full] = part.measures;

  it('reads implicit="yes" as a pickup, not an underfull bar', () => {
    expect(pickup!.isImplicit).toBe(true);
    expect(full!.isImplicit).toBe(false);
    expect(pickup!.endBeat).toBe(1); // genuinely short, and that is intended
  });

  it('reads an unmetered <senza-misura> signature', () => {
    expect(pickup!.getTime()!.isSenzaMisura).toBe(true);
    expect(full!.getTime()!.isSenzaMisura).toBe(false);
    expect(full!.getTime()!.symbol).toBe('cut');
    expect(pickup!.getTime()!.symbol).toBeNull();
    expect(pickup!.getTime()!.staff).toBe('1');
  });
});
