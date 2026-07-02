import { describe, expect, it } from 'bun:test';
import { MDOMParser } from './m-dom-parser';

// hammer-on/pull-off live in <notations><technical>; slide/glissando sit directly
// in <notations>. All four are note-attached spanners reusing the same pairing
// engine (resolvePartner/resolveMembers) already exercised by slur/tie/pedal, so
// these tests just confirm the per-class wiring: start↔stop pairs, collected off
// the note, and — for slide — that a pair crosses a barline.
const SAMPLE = `<score-partwise><part id="P1">
  <measure number="1">
    <attributes><divisions>4</divisions></attributes>
    <note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration>
      <notations><technical>
        <hammer-on number="1" type="start">H</hammer-on>
        <pull-off number="2" type="start">P</pull-off>
      </technical></notations></note>
    <note><pitch><step>D</step><octave>4</octave></pitch><duration>4</duration>
      <notations>
        <technical>
          <hammer-on number="1" type="stop"/>
          <pull-off number="2" type="stop"/>
        </technical>
        <slide number="1" type="start" line-type="solid"/>
        <glissando number="1" type="start"/>
      </notations></note>
  </measure>
  <measure number="2">
    <note><pitch><step>E</step><octave>4</octave></pitch><duration>4</duration>
      <notations>
        <slide number="1" type="stop" line-type="solid"/>
        <glissando number="1" type="stop"/>
      </notations></note>
  </measure>
</part></score-partwise>`;

describe('tab spanners — hammer-on, pull-off, slide, glissando pair start↔stop', () => {
  const part = new MDOMParser().parseFromString(SAMPLE).score.getPart('P1')!;
  const [first, second] = part.getMeasure('1')!.notes;
  const third = part.getMeasure('2')!.notes[0]!;

  it('collects each kind off its note, empty where absent', () => {
    expect(first!.hammerOns.map((marker) => marker.hammerOnType)).toEqual(['start']);
    expect(first!.pullOffs.map((marker) => marker.pullOffType)).toEqual(['start']);
    expect(first!.slides).toEqual([]); // slide starts on the second note
    expect(second!.slides.map((marker) => marker.slideType)).toEqual(['start']);
    expect(second!.glissandos.map((marker) => marker.glissandoType)).toEqual(['start']);
  });

  it('pairs hammer-on and pull-off across the two notes, keyed by number', () => {
    const hammerStart = first!.hammerOns[0]!;
    const pullStart = first!.pullOffs[0]!;
    expect(hammerStart.partner).toBe(second!.hammerOns[0]!);
    expect(pullStart.partner).toBe(second!.pullOffs[0]!);
    expect(hammerStart.members).toEqual([hammerStart, second!.hammerOns[0]!]);
  });

  it('pairs a slide and a glissando across a barline', () => {
    expect(second!.slides[0]!.partner).toBe(third.slides[0]!);
    expect(second!.glissandos[0]!.partner).toBe(third.glissandos[0]!);
  });

  it('throws through the strict type getter on a marker missing its type', () => {
    const doc = new MDOMParser().parseFromString(
      `<score-partwise><part id="P1"><measure number="1"><note>
        <notations><slide number="1"/></notations></note></measure></part></score-partwise>`
    );
    expect(() => doc.score.getPart('P1')!.getMeasure('1')!.notes[0]!.slides[0]!.slideType).toThrow('type on <slide>');
  });
});
