import { describe, expect, it } from 'bun:test';
import { MDOMParser } from './m-dom-parser';

// Every note-attached spanner family opening on one note and closing on another a
// measure later, so the surface they share — number, the typed note/part
// endpoints, partner in BOTH directions, and members — is exercised once per
// kind. The wavy line adds a `continue` in between, the only three-marker span.
const SAMPLE = `<score-partwise><part id="P1">
  <measure number="1">
    <attributes><divisions>4</divisions></attributes>
    <note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice>
      <notations>
        <slide type="start" number="1" line-type="solid"/>
        <glissando type="start" number="1" line-type="wavy"/>
        <tied type="start" line-type="dotted"/>
        <slur type="start" number="1" placement="above" line-type="dashed"/>
        <ornaments><wavy-line type="start" number="1"/></ornaments>
        <technical><hammer-on type="start" number="1">H</hammer-on><pull-off type="start" number="1">P</pull-off></technical>
      </notations></note>
    <note><pitch><step>D</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice>
      <notations><ornaments><wavy-line type="continue" number="1"/></ornaments></notations></note>
  </measure>
  <measure number="2">
    <note><pitch><step>E</step><octave>4</octave></pitch><duration>8</duration><voice>1</voice>
      <notations>
        <slide type="stop" number="1"/>
        <glissando type="stop" number="1"/>
        <tied type="stop"/>
        <slur type="stop" number="1"/>
        <ornaments><wavy-line type="stop" number="1"/></ornaments>
        <technical><hammer-on type="stop" number="1"/><pull-off type="stop" number="1"/></technical>
      </notations></note>
  </measure>
</part></score-partwise>`;

describe('note-attached spanners — one shape, six kinds', () => {
  const part = new MDOMParser().parseFromString(SAMPLE).score.getPart('P1')!;
  const [opening, middle] = part.getMeasure('1')!.notes;
  const closing = part.getMeasure('2')!.notes[0]!;

  it('pairs a slide in both directions, knowing its note and part', () => {
    const start = opening!.slides[0]!;
    const stop = closing.slides[0]!;
    expect(start.partner).toBe(stop);
    expect(stop.partner).toBe(start);
    expect(start.number).toBe('1');
    expect(start.note).toBe(opening!);
    expect(stop.note).toBe(closing);
    expect(start.part).toBe(part);
    expect(start.measureBeat).toBe(0);
    expect(stop.measureBeat).toBe(0);
    expect(start.members).toEqual([start, stop]);
  });

  it('pairs a glissando in both directions, knowing its note and part', () => {
    const start = opening!.glissandos[0]!;
    const stop = closing.glissandos[0]!;
    expect(start.partner).toBe(stop);
    expect(stop.partner).toBe(start);
    expect(start.number).toBe('1');
    expect(start.note).toBe(opening!);
    expect(stop.note).toBe(closing);
    expect(start.part).toBe(part);
    expect(start.measureBeat).toBe(0);
    expect(stop.measureBeat).toBe(0);
    expect(start.members).toEqual([start, stop]);
  });

  it('pairs a tie in both directions, knowing its note and part', () => {
    const start = opening!.ties[0]!;
    const stop = closing.ties[0]!;
    expect(start.partner).toBe(stop);
    expect(stop.partner).toBe(start);
    expect(start.number).toBe('1'); // no number attribute: MusicXML reads that as 1
    expect(start.note).toBe(opening!);
    expect(stop.note).toBe(closing);
    expect(start.part).toBe(part);
    expect(start.measureBeat).toBe(0);
    expect(stop.measureBeat).toBe(0);
    expect(start.members).toEqual([start, stop]);
  });

  it('pairs a slur in both directions, knowing its note and part', () => {
    const start = opening!.slurs[0]!;
    const stop = closing.slurs[0]!;
    expect(start.partner).toBe(stop);
    expect(stop.partner).toBe(start);
    expect(start.number).toBe('1');
    expect(start.note).toBe(opening!);
    expect(stop.note).toBe(closing);
    expect(start.part).toBe(part);
    expect(start.measureBeat).toBe(0);
    expect(stop.measureBeat).toBe(0);
    expect(start.members).toEqual([start, stop]);
  });

  it('pairs a hammer-on in both directions, knowing its note and part', () => {
    const start = opening!.hammerOns[0]!;
    const stop = closing.hammerOns[0]!;
    expect(start.partner).toBe(stop);
    expect(stop.partner).toBe(start);
    expect(start.number).toBe('1');
    expect(start.note).toBe(opening!);
    expect(stop.note).toBe(closing);
    expect(start.part).toBe(part);
    expect(start.measureBeat).toBe(0);
    expect(stop.measureBeat).toBe(0);
    expect(start.members).toEqual([start, stop]);
  });

  it('pairs a pull-off in both directions, knowing its note and part', () => {
    const start = opening!.pullOffs[0]!;
    const stop = closing.pullOffs[0]!;
    expect(start.partner).toBe(stop);
    expect(stop.partner).toBe(start);
    expect(start.number).toBe('1');
    expect(start.note).toBe(opening!);
    expect(stop.note).toBe(closing);
    expect(start.part).toBe(part);
    expect(start.measureBeat).toBe(0);
    expect(stop.measureBeat).toBe(0);
    expect(start.members).toEqual([start, stop]);
  });

  it('reads the stroke instruction, null when unstated', () => {
    expect(opening!.slides[0]!.lineType).toBe('solid');
    expect(opening!.glissandos[0]!.lineType).toBe('wavy');
    expect(opening!.ties[0]!.lineType).toBe('dotted');
    expect(opening!.slurs[0]!.lineType).toBe('dashed');
    expect(closing.slurs[0]!.lineType).toBeNull();
    expect(opening!.slurs[0]!.placement).toBe('above');
  });

  it('walks a three-marker span through its continue', () => {
    const wavy = opening!.wavyLines[0]!;
    expect(wavy.members.map((marker) => marker.wavyLineType)).toEqual(['start', 'continue', 'stop']);
    expect(middle!.wavyLines[0]!.members).toHaveLength(3); // any member yields the whole run
    expect(wavy.partner).toBe(closing.wavyLines[0]!);
    expect(wavy.measureBeat).toBe(0);
    expect(closing.wavyLines[0]!.note).toBe(closing);
  });

  it('carries the text a technical marker prints', () => {
    expect(opening!.hammerOns[0]!.text).toBe('H');
    expect(opening!.pullOffs[0]!.text).toBe('P');
  });
});
