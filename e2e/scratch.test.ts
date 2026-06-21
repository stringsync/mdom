import { describe, expect, it } from 'bun:test';
import { MDocument, MDOMParser, MusicXMLSerializer } from '../index';

// Authoring a score from nothing: parts, signatures, and the round-trip back out
// to MusicXML. The per-note editing operations live in crud.test.ts.
describe('building a score from scratch', () => {
  it('adds a part, wiring up <part-list> and <part-name>', () => {
    const doc = MDocument.empty();
    const part = doc.score.addPart({ id: 'P1', name: 'Piano' });

    expect(part.id).toBe('P1');
    expect(part.label).toBe('Piano'); // resolved through the <part-list> mdom created
    expect(doc.score.parts.length).toBe(1);
  });

  it('sets clef/key/time without knowing they live in <attributes>', () => {
    const measure = MDocument.empty().score.addPart({ id: 'P1' }).addMeasure();
    measure.setClef({ sign: 'G', line: 2, staff: '1' });
    measure.setKey({ fifths: 2, mode: 'major' });
    measure.setTime({ beats: 3, beatType: 4 });

    expect(measure.getClef('1')!.sign).toBe('G');
    expect(measure.getKey()!.fifths).toBe(2);
    expect(measure.getTime()!.beats).toBe('3');
  });

  it('round-trips a built score through MusicXML', () => {
    const doc = MDocument.empty();
    const measure = doc.score.addPart({ id: 'P1', name: 'Piano' }).addMeasure();
    measure.getOrCreateVoice('1').addNote({ step: 'C', octave: 4, type: 'whole' });

    const xml = new MusicXMLSerializer().serializeToString(doc);
    const reparsed = new MDOMParser().parseFromString(xml);

    expect(reparsed.score.getPart('P1')!.getMeasure('1')!.notes[0]!.pitch?.step).toBe('C');
  });
});
