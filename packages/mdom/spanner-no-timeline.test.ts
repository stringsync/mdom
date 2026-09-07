import { describe, expect, it } from 'bun:test';
import { MDOMParser } from './m-dom-parser';
import { MElement } from './m-node';
import { Slur } from './slur';

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
