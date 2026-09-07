import { describe, expect, it } from 'bun:test';
import { MDOMParser } from './m-dom-parser';

// The <direction-type> children a renderer draws: dynamics named by TAG, a
// rehearsal mark, styled words, the segno/coda landmarks, and the two spanners
// (bracket, dashes) that pair start/stop like a wedge. The <staff> child decides
// which staff of a multi-staff part the directive prints over.
const SAMPLE = `<score-partwise><part id="P1">
  <measure number="1">
    <attributes><divisions>4</divisions><staves>2</staves></attributes>
    <direction placement="below">
      <direction-type><dynamics placement="below"><sfz/><p/><other-dynamics>fp-ish</other-dynamics></dynamics></direction-type>
      <staff>2</staff>
    </direction>
    <direction placement="above">
      <direction-type><rehearsal enclosure="circle">A</rehearsal></direction-type>
      <direction-type><segno/></direction-type>
      <direction-type><words font-style="italic" font-weight="bold" color="#FF00FF00">cresc.</words></direction-type>
      <direction-type><dashes type="start" number="1"/></direction-type>
      <direction-type><bracket type="start" number="1" line-end="down" line-type="dashed"/></direction-type>
    </direction>
    <note><pitch><step>C</step><octave>4</octave></pitch><duration>16</duration></note>
  </measure>
  <measure number="2">
    <direction>
      <direction-type><dashes type="stop" number="1"/></direction-type>
      <direction-type><bracket type="stop" number="1" line-end="none"/></direction-type>
      <direction-type><coda/></direction-type>
    </direction>
    <note><pitch><step>D</step><octave>4</octave></pitch><duration>16</duration></note>
  </measure>
</part></score-partwise>`;

describe('bracket and dashes — direction spanners paired across measures', () => {
  const part = new MDOMParser().parseFromString(SAMPLE).score.getPart('P1')!;
  const opening = part.getMeasure('1')!.directions[1]!;
  const closing = part.getMeasure('2')!.directions[0]!;

  it('pairs a bracket start with its stop a measure later', () => {
    const start = opening.brackets[0]!;
    expect(start.bracketType).toBe('start');
    expect(start.lineEnd).toBe('down');
    expect(start.lineType).toBe('dashed');
    expect(start.partner).toBe(closing.brackets[0]!);
    expect(start.members).toHaveLength(2);
    expect(start.measureBeat).toBe(0);
    expect(start.direction).toBe(opening);
  });

  it('defaults a missing line-end to none, and leaves line-type unstated as null', () => {
    expect(closing.brackets[0]!.lineEnd).toBe('none');
    expect(closing.brackets[0]!.lineType).toBeNull();
  });

  it('pairs dashes the same way', () => {
    const start = opening.dashes[0]!;
    expect(start.dashesType).toBe('start');
    expect(start.partner).toBe(closing.dashes[0]!);
    expect(start.number).toBe('1');
  });

  it('binds both ends to the note that follows the direction', () => {
    // A bracket's stop marks where the passage ends, and MusicXML writes it
    // before the last note it covers — so both ends read nextNote.
    expect(opening.nextNote?.pitch?.step).toBe('C');
    expect(closing.nextNote?.pitch?.step).toBe('D');
  });
});
