import { describe, expect, it } from 'bun:test';
import { MDOMParser } from './m-dom-parser';

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
