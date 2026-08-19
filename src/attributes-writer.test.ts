import { describe, expect, it } from 'bun:test';
import { MDocument } from './m-document';
import { MElement } from './m-node';
import type { Measure } from './measure';
import { schemaErrors } from './music-xml-schema';

/** A one-part document plus its first measure, the shape every case here builds on. */
const build = (): { doc: MDocument; measure: Measure } => {
  const doc = MDocument.empty();
  const measure = doc.score.addPart({ id: 'P1', name: 'Piano' }).addMeasure();
  return { doc, measure };
};

/** The `<attributes>` blocks of a measure, each as its child tags in document order. */
const blocks = (measure: Measure): string[][] =>
  measure.childrenNamed('attributes').map((attrs) => attrs.childrenOfType(MElement).map((child) => child.tag));

describe('measure — writing <attributes>', () => {
  it('keeps the block in schema order whatever order the writers are called in', () => {
    // The bug this pins: <divisions> is written by the first addNote, so setting
    // the signatures first used to leave it trailing <clef> — a plain append is
    // only ever in order by luck, and the XSD rejects that one.
    const { doc, measure } = build();
    measure.setKey({ fifths: 3 });
    measure.setTime({ beats: 4, beatType: 4 });
    measure.setClef({ sign: 'G', line: 2 });
    measure.getOrCreateVoice('1').addNote({ step: 'C', octave: 4, type: 'quarter' });

    expect(blocks(measure)).toEqual([['divisions', 'key', 'time', 'clef']]);
    expect(schemaErrors(doc)).toEqual([]);
  });

  it('declares a stave count, so a grand staff can be built', () => {
    const { doc, measure } = build();
    measure.setStaveCount(2);
    measure.setClef({ sign: 'G', line: 2, staff: '1' });
    measure.setClef({ sign: 'F', line: 4, staff: '2' });
    measure.getOrCreateVoice('1', { staff: '1' }).addNote({ step: 'C', octave: 5, type: 'whole' });
    measure.getOrCreateVoice('2', { staff: '2' }).addNote({ step: 'C', octave: 3, type: 'whole', onset: 0 });

    expect(blocks(measure)).toEqual([['divisions', 'staves', 'clef', 'clef']]); // <staves> after <time>, before <clef>
    expect(measure.staveCount).toBe(2);
    expect(measure.part.staveCount).toBe(2);
    expect(schemaErrors(doc)).toEqual([]);
  });

  it('upserts rather than stacking duplicates', () => {
    const { measure } = build();
    measure.setDivisions(4);
    measure.setDivisions(8);
    measure.setStaveCount(2);
    measure.setStaveCount(3);
    measure.setKey({ fifths: 1 });
    measure.setKey({ fifths: -2, mode: 'minor' });

    expect(blocks(measure)).toEqual([['divisions', 'key', 'staves']]);
    expect(measure.staveCount).toBe(3);
    expect(measure.getKey()?.fifths).toBe(-2);
  });

  it('writes to the leading block even once the measure has notes', () => {
    // "The measure opens in this key" has to stay reachable after the first note
    // is added, or it silently becomes a mid-measure change.
    const { doc, measure } = build();
    measure.getOrCreateVoice('1').addNote({ step: 'C', octave: 4, type: 'whole' });
    measure.setKey({ fifths: 2 });

    expect(blocks(measure)).toEqual([['divisions', 'key']]);
    expect(measure.clefChanges()).toEqual([]);
    expect(schemaErrors(doc)).toEqual([]);
  });

  it('writes a mid-measure change when asked for one by onset', () => {
    const { doc, measure } = build();
    measure.setClef({ sign: 'G', line: 2 });
    const voice = measure.getOrCreateVoice('1');
    voice.addNote({ step: 'C', octave: 4, type: 'half' });
    measure.setClef({ sign: 'F', line: 4, onset: 2 });
    voice.addNote({ step: 'E', octave: 3, type: 'half' });

    expect(measure.getClef()?.sign).toBe('G'); // the measure still OPENS on treble
    expect(measure.clefChanges().map((change) => [change.beat, change.clef.sign])).toEqual([[2, 'F']]);
    expect(measure.clefAtEnd()?.sign).toBe('F');
    expect(schemaErrors(doc)).toEqual([]);
  });

  it('reuses a mid-measure block already sitting at that onset', () => {
    const { doc, measure } = build();
    measure.setClef({ sign: 'G', line: 2 });
    measure.getOrCreateVoice('1').addNote({ step: 'C', octave: 4, type: 'half' });
    measure.setClef({ sign: 'F', line: 4, onset: 2 });
    measure.setKey({ fifths: -1, onset: 2 });

    expect(blocks(measure)).toEqual([
      ['divisions', 'clef'],
      ['key', 'clef'], // one block, still in schema order
    ]);
    expect(schemaErrors(doc)).toEqual([]);
  });

  it('rewinds to an earlier onset with a <backup>, the grand-staff spelling', () => {
    const { doc, measure } = build();
    measure.setStaveCount(2);
    measure.setClef({ sign: 'G', line: 2, staff: '1' });
    measure.setClef({ sign: 'F', line: 4, staff: '2' });
    measure.getOrCreateVoice('1', { staff: '1' }).addNote({ step: 'C', octave: 5, type: 'whole' });
    measure.setClef({ sign: 'C', line: 3, staff: '2', onset: 0 });
    measure.getOrCreateVoice('2', { staff: '2' }).addNote({ step: 'C', octave: 3, type: 'whole', onset: 0 });

    expect(measure.children.map((node) => (node instanceof MElement ? node.tag : 'text'))).toEqual([
      'attributes',
      'note',
      'backup',
      'attributes',
      'note',
    ]);
    expect(measure.clefChanges('2').map((change) => [change.beat, change.clef.sign])).toEqual([[0, 'C']]);
    expect(schemaErrors(doc)).toEqual([]);
  });

  it('refuses an onset before anything has declared divisions', () => {
    const { measure } = build();
    expect(() => measure.setClef({ sign: 'G', line: 2, onset: 2 })).toThrow(
      'missing required divisions to place <attributes> at an onset'
    );
  });
});
