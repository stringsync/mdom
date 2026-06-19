import { describe, expect, it } from 'bun:test';
import { MDocument } from './m-document';
import { Measure } from './measure';
import { Part } from './part';
import { MDOMParser, MXMLSerializer } from './xml';

describe('MDocument', () => {
  const parser = new MDOMParser();
  const serializer = new MXMLSerializer();

  it('queries top-down through typed nodes', () => {
    const doc = MDocument.empty();
    const part = new Part();
    part.setAttribute('id', 'P1');
    doc.score?.append(part);
    for (const number of ['1', '2']) {
      const measure = new Measure();
      measure.setAttribute('number', number);
      part.append(measure);
    }

    expect(doc.score?.parts.length).toBe(1);
    expect(doc.score?.part('P1')?.measures.length).toBe(2);
    expect(doc.score?.part('P1')?.measure('2')?.number).toBe('2');
  });

  it('builds a usable document from scratch, with no MusicXML to start from', () => {
    const doc = MDocument.empty();
    expect(doc.score).not.toBeNull();
    expect(doc.score?.parts.length).toBe(0);

    const part = new Part();
    part.setAttribute('id', 'P1');
    doc.score?.append(part);

    expect(serializer.serializeToString(doc)).toContain('<part id="P1"/>');
  });

  it('appends a measure that survives a round-trip', () => {
    const doc = MDocument.empty();
    const part = new Part();
    part.setAttribute('id', 'P1');
    doc.score?.append(part);

    const measure = new Measure();
    measure.setAttribute('number', '1');
    part.append(measure);

    const reparsed = parser.parseFromString(serializer.serializeToString(doc));
    expect(reparsed.score?.part('P1')?.measures.length).toBe(1);
  });
});
