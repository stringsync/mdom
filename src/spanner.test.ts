import { describe, expect, it } from 'bun:test';
import { MDOMParser } from './m-dom-parser';
import { Spanner, noteMarkers, directionMarkers } from './spanner';
import type { Slur } from './slur';
import type { Wedge } from './wedge';

// One part exercising the generic resolver directly (not through Slur/Wedge):
// m1 has a self-contained slur; m2→m3 a cross-measure slur reusing number 1;
// m4 nests slurs 1 and 2; m5 is a 3-point slur (start/continue/stop) on number
// 1; a crescendo hairpin spans m1 on a <direction>. The same SpannerSpec rules
// must pair all of these, including the reused number and the nesting.
const SAMPLE = `<score-partwise>
  <part id="P1">
    <measure number="1">
      <direction placement="below"><direction-type><wedge type="crescendo" number="1"/></direction-type></direction>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration>
        <notations><slur number="1" type="start"/></notations></note>
      <note><pitch><step>D</step><octave>4</octave></pitch><duration>4</duration></note>
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>4</duration>
        <notations><slur number="1" type="stop"/></notations></note>
      <direction placement="below"><direction-type><wedge type="stop" number="1"/></direction-type></direction>
    </measure>
    <measure number="2">
      <note><pitch><step>F</step><octave>4</octave></pitch><duration>4</duration>
        <notations><slur number="1" type="start"/></notations></note>
    </measure>
    <measure number="3">
      <note><pitch><step>G</step><octave>4</octave></pitch><duration>4</duration>
        <notations><slur number="1" type="stop"/></notations></note>
    </measure>
    <measure number="4">
      <note><pitch><step>A</step><octave>4</octave></pitch><duration>4</duration>
        <notations><slur number="1" type="start"/><slur number="2" type="start"/></notations></note>
      <note><pitch><step>B</step><octave>4</octave></pitch><duration>4</duration>
        <notations><slur number="2" type="stop"/></notations></note>
      <note><pitch><step>C</step><octave>5</octave></pitch><duration>4</duration>
        <notations><slur number="1" type="stop"/></notations></note>
    </measure>
    <measure number="5">
      <note><pitch><step>D</step><octave>5</octave></pitch><duration>4</duration>
        <notations><slur number="1" type="start"/></notations></note>
      <note><pitch><step>E</step><octave>5</octave></pitch><duration>4</duration>
        <notations><slur number="1" type="continue"/></notations></note>
      <note><pitch><step>F</step><octave>5</octave></pitch><duration>4</duration>
        <notations><slur number="1" type="stop"/></notations></note>
    </measure>
  </part>
</score-partwise>`;

describe('spanner — the generic start/stop resolver', () => {
  const part = new MDOMParser().parseFromString(SAMPLE).score.getPart('P1')!;

  // Build a SpannerSpec<Slur> exactly the way Slur.spec() does — every slur in
  // the part in document order, plus how a marker's type opens or closes a span.
  const slurSpanner = (anySlur: Slur): Spanner<Slur> =>
    new Spanner({
      siblings: noteMarkers(anySlur, (note) => note.slurs),
      isOpen: (slur) => slur.slurType === 'start',
      isClose: (slur) => slur.slurType === 'stop',
    });

  const step = (slur: Slur | null): string | null => slur?.note?.pitch?.step ?? null;

  it('collects note-attached markers across the part in document order', () => {
    // noteMarkers walks every measure's notes and flat-maps the picked markers,
    // so the slur types come out in the order they appear in the source.
    const firstSlur = part.getMeasure('1')!.notes[0]!.slurs[0]!;
    const types = noteMarkers(firstSlur, (note) => note.slurs).map((slur) => slur.slurType);
    expect(types).toEqual([
      'start', // m1 C
      'stop', // m1 E
      'start', // m2 F
      'stop', // m3 G
      'start', // m4 A, slur 1
      'start', // m4 A, slur 2
      'stop', // m4 B, slur 2
      'stop', // m4 C5, slur 1
      'start', // m5 D5
      'continue', // m5 E5
      'stop', // m5 F5
    ]);
  });

  it('pairs a start with its stop, both directions', () => {
    // partnerOf: an opener finds the next closer of the same number; a
    // closer finds the previous opener. m1's slur is self-contained C..E.
    const [startC, , stopE] = part.getMeasure('1')!.notes;
    const spanner = slurSpanner(startC!.slurs[0]!);
    expect(step(spanner.partnerOf(startC!.slurs[0]!))).toBe('E');
    expect(step(spanner.partnerOf(stopE!.slurs[0]!))).toBe('C');
  });

  it('does not let a reused number cross-link spans', () => {
    // C(m1) and F(m2) both open number 1. C must pair with E (its own stop),
    // not jump past it to G — a number can't reopen before it closes.
    const startC = part.getMeasure('1')!.notes[0]!.slurs[0]!;
    const startF = part.getMeasure('2')!.notes[0]!.slurs[0]!;
    const spanner = slurSpanner(startC);
    expect(step(spanner.partnerOf(startC))).toBe('E');
    expect(step(spanner.partnerOf(startF))).toBe('G');
  });

  it('resolves nested numbers independently', () => {
    // m4: A opens 1 and 2; B closes 2 (inner), C5 closes 1 (outer). The first
    // matching closer per number is the true partner regardless of nesting.
    const [noteA, noteB, noteC5] = part.getMeasure('4')!.notes;
    const outerStart = noteA!.slurs.find((slur) => slur.number === '1')!;
    const innerStart = noteA!.slurs.find((slur) => slur.number === '2')!;
    const spanner = slurSpanner(outerStart);
    expect(step(spanner.partnerOf(innerStart))).toBe('B'); // inner 2: A→B
    expect(step(spanner.partnerOf(outerStart))).toBe('C'); // outer 1: A→C5
    expect(step(spanner.partnerOf(noteB!.slurs[0]!))).toBe('A');
    expect(step(spanner.partnerOf(noteC5!.slurs[0]!))).toBe('A');
  });

  it('returns the whole start..stop run from any member', () => {
    // membersOf from the opener returns every marker of that number in the
    // span — here the 3-point start/continue/stop slur on number 1 in m5.
    const startD5 = part.getMeasure('5')!.notes[0]!.slurs[0]!;
    const spanner = slurSpanner(startD5);
    const members = spanner.membersOf(startD5);
    expect(members.map((slur) => step(slur))).toEqual(['D', 'E', 'F']);
    expect(members.map((slur) => slur.slurType)).toEqual(['start', 'continue', 'stop']);
  });

  it('returns the whole run from a middle member via spanOpener', () => {
    // membersOf walks back to the opener first (spanOpener), so a continue
    // or stop in the middle/end still yields the full begin..end run.
    const continueE5 = part.getMeasure('5')!.notes[1]!.slurs[0]!;
    const stopF5 = part.getMeasure('5')!.notes[2]!.slurs[0]!;
    const spanner = slurSpanner(continueE5);
    expect(spanner.membersOf(continueE5).map((slur) => step(slur))).toEqual(['D', 'E', 'F']);
    expect(spanner.membersOf(stopF5).map((slur) => step(slur))).toEqual(['D', 'E', 'F']);
  });

  it('collects direction-attached markers from <direction>s', () => {
    // directionMarkers is the same walk for direction-hung spanners: it pulls
    // the part's wedges, here the crescendo open and its stop, in document order.
    const firstWedge = part.getMeasure('1')!.directions.flatMap((direction) => direction.wedges)[0]!;
    const wedges = directionMarkers(firstWedge, (direction) => direction.wedges);
    expect(wedges.map((wedge) => wedge.wedgeType)).toEqual(['crescendo', 'stop']);

    // And the generic resolver pairs them with a wedge-flavored spec.
    const wedgeSpanner = new Spanner<Wedge>({
      siblings: wedges,
      isOpen: (wedge) => wedge.wedgeType === 'crescendo' || wedge.wedgeType === 'diminuendo',
      isClose: (wedge) => wedge.wedgeType === 'stop',
    });
    expect(wedgeSpanner.partnerOf(firstWedge)!.wedgeType).toBe('stop');
  });
});

// A Guitar Pro tab export: every slur is number 1 in voice 1, and the note that
// stops the second span also carries a stray unnumbered start that nothing ever
// closes. Left open, that stale start swallows the next measure's stops and the
// arcs slide one span to the right — a tab curve drawn across a whole measure.
const STRAY_START = `<score-partwise><part id="P1">
  <measure number="1">
    <attributes><divisions>1</divisions></attributes>
    <note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice>
      <notations><slur type="start" number="1"/></notations></note>
    <note><pitch><step>D</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice>
      <notations><slur type="stop" number="1"/></notations></note>
    <note><pitch><step>E</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice>
      <notations><slur type="start" number="1"/></notations></note>
    <note><pitch><step>F</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice>
      <notations><slur type="stop" number="1"/><slur type="start"/></notations></note>
  </measure>
  <measure number="2">
    <note><pitch><step>G</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice>
      <notations><slur type="start" number="1"/></notations></note>
    <note><pitch><step>A</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice>
      <notations><slur type="stop" number="1"/></notations></note>
    <note><pitch><step>B</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice>
      <notations><slur type="start" number="1"/></notations></note>
    <note><pitch><step>C</step><octave>5</octave></pitch><duration>1</duration><voice>1</voice>
      <notations><slur type="stop" number="1"/></notations></note>
  </measure>
</part></score-partwise>`;

describe('spanner — a stray start that never closes', () => {
  const part = new MDOMParser().parseFromString(STRAY_START).score.getPart('P1')!;
  const [noteC4, noteD4, noteE4, noteF4] = part.getMeasure('1')!.notes;
  const [noteG4, noteA4, noteB4, noteC5] = part.getMeasure('2')!.notes;
  const strayStart = noteF4!.slurs.find((slur) => slur.slurType === 'start')!;
  const stopOnF4 = noteF4!.slurs.find((slur) => slur.slurType === 'stop')!;

  it('leaves the stray dangling instead of letting it eat later stops', () => {
    // A later start supersedes the stale one, so no span slides right.
    expect(noteC4!.slurs[0]!.partner).toBe(noteD4!.slurs[0]!);
    expect(noteE4!.slurs[0]!.partner).toBe(stopOnF4);
    expect(noteG4!.slurs[0]!.partner).toBe(noteA4!.slurs[0]!);
    expect(noteB4!.slurs[0]!.partner).toBe(noteC5!.slurs[0]!);
    expect(strayStart.partner).toBeNull();
  });
});

// A Guitar Pro / Finale chain: the middle note of a run of legato slurs ends one
// span and begins the next, and the exporter writes its start BEFORE its stop.
// The new start is on the stack when the stop is processed, so a recency rule
// would hand the stop its own note's start — a zero-length span, with the real
// opener stranded and its arc stretched across the note in between. Every slur is
// unnumbered, so they all share one stack (an absent number means 1).
const START_BEFORE_STOP = `<score-partwise><part id="P1">
  <measure number="1">
    <attributes><divisions>1</divisions></attributes>
    <note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice>
      <notations><slur type="start"/></notations></note>
    <note><pitch><step>D</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice>
      <notations><slur type="start"/><slur type="stop"/></notations></note>
    <note><pitch><step>E</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice>
      <notations><slur type="stop"/></notations></note>
  </measure>
</part></score-partwise>`;

describe('spanner — a chain-middle note written start-before-stop', () => {
  const part = new MDOMParser().parseFromString(START_BEFORE_STOP).score.getPart('P1')!;
  const [noteC4, noteD4, noteE4] = part.getMeasure('1')!.notes;
  const startOnD4 = noteD4!.slurs.find((slur) => slur.slurType === 'start')!;
  const stopOnD4 = noteD4!.slurs.find((slur) => slur.slurType === 'stop')!;

  it('pairs each marker with its neighbor, never with the note it sits on', () => {
    expect(noteC4!.slurs[0]!.partner).toBe(stopOnD4);
    expect(stopOnD4.partner).toBe(noteC4!.slurs[0]!);
    expect(startOnD4.partner).toBe(noteE4!.slurs[0]!);
    expect(noteE4!.slurs[0]!.partner).toBe(startOnD4);
  });
});

// The one case where opener and closer really do share an onset: a `<grace/>`
// steals time from the note it leans on, so both sit at the same cursor position.
// Same-onset openers are skipped only while better candidates exist.
const GRACE_SLUR = `<score-partwise><part id="P1">
  <measure number="1">
    <attributes><divisions>1</divisions></attributes>
    <note><grace slash="yes"/><pitch><step>B</step><octave>3</octave></pitch><voice>1</voice>
      <notations><slur type="start"/></notations></note>
    <note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice>
      <notations><slur type="stop"/></notations></note>
  </measure>
</part></score-partwise>`;

describe('spanner — an acciaccatura slur', () => {
  const part = new MDOMParser().parseFromString(GRACE_SLUR).score.getPart('P1')!;
  const [grace, main] = part.getMeasure('1')!.notes;

  it('pairs the grace note to its main note despite the shared onset', () => {
    expect(grace!.slurs[0]!.partner).toBe(main!.slurs[0]!);
  });
});
