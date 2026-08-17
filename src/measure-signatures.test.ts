import { describe, expect, it } from 'bun:test';
import { MDocument } from './m-document';

describe('measure — writing signatures back', () => {
  const emptyMeasure = () => MDocument.empty().score.addPart({ id: 'P1' }).addMeasure();

  it('targets a key at one staff, and upserts rather than stacking', () => {
    const measure = emptyMeasure();
    measure.setKey({ fifths: 2, mode: 'major', staff: '2' });
    expect(measure.getKey('2')?.fifths).toBe(2);
    expect(measure.getKey('2')?.staff).toBe('2');
    expect(measure.getKey('1')).toBeNull(); // numbered: staff 2 alone

    measure.setKey({ fifths: -3, staff: '2' });
    expect(measure.getKey('2')?.fifths).toBe(-3);
    expect(measure.getKey('2')?.mode).toBeNull();
    expect(measure.childrenNamed('attributes')[0]!.childrenNamed('key')).toHaveLength(1);
  });

  it('writes a time symbol, and a clef on a numbered staff', () => {
    const measure = emptyMeasure();
    measure.setTime({ beats: 2, beatType: 2, symbol: 'cut' });
    expect(measure.getTime()?.symbol).toBe('cut');
    expect(measure.getTime()?.beats).toBe('2');

    measure.setClef({ sign: 'F', line: 4, octaveChange: -1, staff: '2' });
    expect(measure.getClef('2')?.sign).toBe('F');
    expect(measure.getClef('2')?.octaveChange).toBe(-1);
    expect(measure.getClef('1')).toBeNull(); // a clef matches one staff exactly
  });
});
