import { describe, expect, it } from 'bun:test';
import { MDOMParser } from './m-dom-parser';

// 4/4, divisions=4. A <direction> holding a crescendo wedge sits at beat 0, then
// after two quarter notes a second <direction> holds the closing wedge. A
// <direction> carries no <duration> of its own — its place in the timeline is the
// cursor position where it sits in the backup/forward fold.
const SAMPLE = `<score-partwise>
  <part id="P1">
    <measure number="1">
      <attributes><divisions>4</divisions></attributes>
      <direction placement="below"><direction-type><wedge type="crescendo" number="1"/></direction-type></direction>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration></note>
      <note><pitch><step>D</step><octave>4</octave></pitch><duration>4</duration></note>
      <direction placement="below"><direction-type><wedge type="stop" number="1"/></direction-type></direction>
    </measure>
  </part>
</score-partwise>`;

describe('direction — spanner collectors and timeline position', () => {
  const measure = new MDOMParser().parseFromString(SAMPLE).score.getPart('P1')!.getMeasure('1')!;

  it('collects every <direction> in the measure', () => {
    expect(measure.directions).toHaveLength(2);
  });

  it('reads the wedges under a <direction>, with absent spanner kinds as empty arrays', () => {
    const direction = measure.directions[0]!;
    expect(direction.wedges.map((wedge) => wedge.wedgeType)).toEqual(['crescendo']);
    expect(direction.pedals).toEqual([]);
    expect(direction.octaveShifts).toEqual([]);
  });

  it('places each <direction> on the beat where its cursor sits', () => {
    const [first, second] = measure.directions;
    expect(first!.measureBeat).toBe(0);
    expect(second!.measureBeat).toBe(2); // after two quarter notes
  });
});

// A dotted-quarter = 120 metronome (with a redundant <sound tempo>), a "dolce"
// words direction, and a plain <direction> that carries none of them.
const EXPRESSIVE = `<score-partwise><part id="P1"><measure number="1">
  <attributes><divisions>4</divisions></attributes>
  <direction placement="above">
    <direction-type><metronome><beat-unit>quarter</beat-unit><beat-unit-dot/><per-minute>120</per-minute></metronome></direction-type>
    <sound tempo="180"/>
  </direction>
  <direction placement="above"><direction-type><words>dolce</words><words>espressivo</words></direction-type></direction>
  <note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration></note>
</measure></part></score-partwise>`;

describe('direction — metronome, tempo, words, and neighbor notes', () => {
  const measure = new MDOMParser().parseFromString(EXPRESSIVE).score.getPart('P1')!.getMeasure('1')!;
  const [tempo, text] = measure.directions;

  it('reads the metronome with its beat-unit dots and per-minute string', () => {
    expect(tempo!.metronome).toEqual({ beatUnit: 'quarter', dots: 1, perMinute: '120' });
    expect(text!.metronome).toBeNull();
  });

  it('reads the <sound> tempo as a number, null when absent', () => {
    expect(tempo!.soundTempo).toBe(180);
    expect(text!.soundTempo).toBeNull();
  });

  it('lists every <words> child in order, empty when none', () => {
    expect(text!.words).toEqual(['dolce', 'espressivo']);
    expect(tempo!.words).toEqual([]);
  });

  it('binds to its neighbor notes in the measure', () => {
    expect(text!.nextNote?.pitch?.step).toBe('C'); // the note after the direction
    expect(tempo!.previousNote).toBeNull(); // nothing before the first direction
  });
});
