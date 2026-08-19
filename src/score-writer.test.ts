import { describe, expect, it } from 'bun:test';
import { MDocument } from './m-document';
import { schemaErrors } from './music-xml-schema';

describe('score — writing parts', () => {
  const doc = MDocument.empty();
  const unnamed = doc.score.addPart({ id: 'P1' });
  const named = doc.score.addPart({ id: 'P2', name: 'Piano' });
  for (const part of [unnamed, named]) {
    part.addMeasure().getOrCreateVoice('1').addNote({ step: 'C', octave: 4, type: 'whole' });
  }

  it('validates whether or not the caller named the part', () => {
    // The schema requires <part-name> on every <score-part>, so omitting `name`
    // used to produce a document no validator would accept.
    expect(schemaErrors(doc)).toEqual([]);
  });

  it('leaves an unnamed part with no label, rather than a blank one', () => {
    expect(unnamed.label).toBeNull();
    expect(named.label).toBe('Piano');
  });
});
