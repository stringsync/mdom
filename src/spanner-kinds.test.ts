import { describe, expect, it } from 'bun:test';
import type { Direction } from './direction';
import { MDOMParser } from './m-dom-parser';
import { MElement } from './m-node';
import type { Measure } from './measure';
import type { Note } from './note';
import type { Part } from './part';
import { Slur } from './slur';

// The surface every spanner class shares, structurally — so one table can drive
// all six note-attached kinds (and one more all five direction-attached kinds)
// without a union that TypeScript has to reconcile class by class.
interface NoteSpanner {
  number: string;
  note: Note;
  part: Part;
  measureBeat: number | null;
  partner: NoteSpanner | null;
  members: NoteSpanner[];
}

interface DirectionSpanner {
  number: string;
  direction: Direction;
  measure: Measure;
  measureBeat: number | null;
  partner: DirectionSpanner | null;
  members: DirectionSpanner[];
}

// Every spanner family in one part, so the shared surface — number, the typed
// endpoint, partner in BOTH directions, members across a `continue`, and the
// part/measure ancestors — is exercised once per kind rather than once overall.
// Note-attached kinds hang off `<notations>`; direction-attached kinds hang off
// `<direction-type>`. The only difference between them is the endpoint.
const SAMPLE = `<score-partwise><part id="P1">
  <measure number="1">
    <attributes><divisions>4</divisions></attributes>
    <direction><direction-type>
      <wedge type="crescendo" number="1"/>
      <pedal type="start" number="1" line="yes"/>
      <octave-shift type="down" size="15" number="1" line-type="dashed"/>
      <bracket type="start" number="1" line-end="up"/>
      <dashes type="start" number="1"/>
    </direction-type></direction>
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
    <direction><direction-type>
      <wedge type="stop" number="1"/>
      <pedal type="stop" number="1"/>
      <octave-shift type="stop" number="1"/>
      <bracket type="stop" number="1" line-end="up"/>
      <dashes type="stop" number="1"/>
    </direction-type></direction>
  </measure>
</part></score-partwise>`;

const part = new MDOMParser().parseFromString(SAMPLE).score.getPart('P1')!;
const [opening, middle] = part.getMeasure('1')!.notes;
const closing = part.getMeasure('2')!.notes[0]!;
const openDirection = part.getMeasure('1')!.directions[0]!;
const closeDirection = part.getMeasure('2')!.directions[0]!;

describe('note-attached spanners — one shape, six kinds', () => {
  const kinds: Array<[string, () => NoteSpanner, () => NoteSpanner]> = [
    ['slide', () => opening!.slides[0]!, () => closing.slides[0]!],
    ['glissando', () => opening!.glissandos[0]!, () => closing.glissandos[0]!],
    ['tied', () => opening!.ties[0]!, () => closing.ties[0]!],
    ['slur', () => opening!.slurs[0]!, () => closing.slurs[0]!],
    ['hammer-on', () => opening!.hammerOns[0]!, () => closing.hammerOns[0]!],
    ['pull-off', () => opening!.pullOffs[0]!, () => closing.pullOffs[0]!],
  ];

  it.each(kinds)('%s pairs in both directions and knows its note and part', (_kind, startOf, stopOf) => {
    const start = startOf();
    const stop = stopOf();
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

describe('direction-attached spanners — the same shape off a <direction>', () => {
  const kinds: Array<[string, () => DirectionSpanner, () => DirectionSpanner]> = [
    ['wedge', () => openDirection.wedges[0]!, () => closeDirection.wedges[0]!],
    ['pedal', () => openDirection.pedals[0]!, () => closeDirection.pedals[0]!],
    ['octave-shift', () => openDirection.octaveShifts[0]!, () => closeDirection.octaveShifts[0]!],
    ['bracket', () => openDirection.brackets[0]!, () => closeDirection.brackets[0]!],
    ['dashes', () => openDirection.dashes[0]!, () => closeDirection.dashes[0]!],
  ];

  it.each(kinds)('%s pairs in both directions and knows its direction and measure', (_kind, startOf, stopOf) => {
    const start = startOf();
    const stop = stopOf();
    expect(start.partner).toBe(stop);
    expect(stop.partner).toBe(start);
    expect(start.number).toBe('1');
    expect(start.direction).toBe(openDirection);
    expect(start.measure).toBe(part.getMeasure('1')!);
    expect(stop.measure).toBe(part.getMeasure('2')!);
    expect(start.members).toEqual([start, stop]);
    expect(start.measureBeat).toBe(0);
  });

  it('reads each kind own attributes', () => {
    expect(openDirection.wedges[0]!.wedgeType).toBe('crescendo');
    expect(openDirection.pedals[0]!.pedalType).toBe('start');
    expect(openDirection.pedals[0]!.line).toBe(true);
    expect(openDirection.octaveShifts[0]!.size).toBe(15);
    expect(openDirection.octaveShifts[0]!.lineType).toBe('dashed');
    expect(closeDirection.octaveShifts[0]!.size).toBe(8); // absent size defaults to 8
    expect(openDirection.brackets[0]!.lineEnd).toBe('up');
    expect(openDirection.dashes[0]!.dashesType).toBe('start');
  });
});

// Half-written spans are everywhere in real exports; resolution has to answer
// null rather than pair the wrong ends or throw.
const ORPHANS = `<score-partwise><part id="P1"><measure number="1">
  <attributes><divisions>4</divisions></attributes>
  <note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration>
    <notations><slur type="start" number="1"/><tied type="let-ring"/></notations></note>
  <note><pitch><step>D</step><octave>4</octave></pitch><duration>4</duration>
    <notations><slur type="stop" number="2"/><slur type="continue" number="3"/></notations></note>
</measure></part></score-partwise>`;

describe('spanners — the half-written spans exporters emit', () => {
  const notes = new MDOMParser().parseFromString(ORPHANS).score.getPart('P1')!.getMeasure('1')!.notes;
  const [first, second] = notes;

  it('leaves an unclosed start with no partner, and itself as its only member', () => {
    const start = first!.slurs[0]!;
    expect(start.partner).toBeNull();
    expect(start.members).toEqual([start]);
  });

  it('leaves a stop with no matching start unpaired', () => {
    const stop = second!.slurs.find((slur) => slur.slurType === 'stop')!;
    expect(stop.partner).toBeNull();
    expect(stop.members).toEqual([stop]);
  });

  it('leaves a continue with no start as its own member', () => {
    const stray = second!.slurs.find((slur) => slur.slurType === 'continue')!;
    expect(stray.partner).toBeNull();
    expect(stray.members).toEqual([stray]);
  });

  it('unlinks a let-ring tie, which has no partner to detach', () => {
    const letRing = first!.ties[0]!;
    expect(letRing.tieType).toBe('let-ring');
    expect(letRing.partner).toBeNull();
    letRing.unlink();
    expect(first!.ties).toEqual([]);
  });

  it('answers null for a marker detached from any part', () => {
    const loose = new Slur();
    loose.setAttribute('type', 'start');
    expect(loose.partner).toBeNull();
    expect(loose.members).toEqual([loose]);
    expect(() => loose.note).toThrow('<note> ancestor of <slur>');
    expect(() => loose.part).toThrow('<part> ancestor of <slur>');
  });
});

describe('tie — removing a span detaches both ends', () => {
  const TIED = `<score-partwise><part id="P1"><measure number="1">
    <attributes><divisions>4</divisions></attributes>
    <note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration>
      <notations><tied type="start"/></notations></note>
    <note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration>
      <notations><tied type="stop"/></notations></note>
  </measure></part></score-partwise>`;

  it('leaves neither end dangling', () => {
    const notes = new MDOMParser().parseFromString(TIED).score.getPart('P1')!.getMeasure('1')!.notes;
    notes[0]!.ties[0]!.unlink();
    expect(notes[0]!.ties).toEqual([]);
    expect(notes[1]!.ties).toEqual([]);
  });

  it('removeTie works from either end and is a no-op on untied notes', () => {
    const notes = new MDOMParser().parseFromString(TIED).score.getPart('P1')!.getMeasure('1')!.notes;
    notes[1]!.removeTie(notes[0]!);
    expect(notes[0]!.ties).toEqual([]);
    expect(notes[1]!.ties).toEqual([]);
    expect(() => notes[0]!.removeTie(notes[1]!)).not.toThrow();
  });
});

describe('spanner resolution — markers whose measure carries no timeline', () => {
  it('still pairs when a measure declares no <divisions> to order onsets by', () => {
    // No <attributes> at all: every onset folds to 0, so the sort is a no-op and
    // pairing falls back to document order — which is the right answer here.
    const notes = new MDOMParser()
      .parseFromString(
        `<score-partwise><part id="P1"><measure number="1">
        <note><notations><slur type="start" number="1"/></notations></note>
        <note><notations><slur type="stop" number="1"/></notations></note>
      </measure></part></score-partwise>`
      )
      .score.getPart('P1')!
      .getMeasure('1')!.notes;
    expect(notes[0]!.slurs[0]!.partner).toBe(notes[1]!.slurs[0]!);
    expect(notes[0]!.slurs[0]!.measureBeat).toBeNull(); // no divisions to divide by
  });

  it('ignores a marker nested somewhere the walk does not model', () => {
    const stray = new MElement('notations');
    const slur = new Slur();
    slur.setAttribute('type', 'stop');
    stray.append(slur);
    expect(slur.partner).toBeNull();
  });
});
