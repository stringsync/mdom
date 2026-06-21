import { describe, expect, it } from 'bun:test';
import { MDocument } from './m-document';
import { Measure } from './measure';
import { Part } from './part';
import { MDOMParser } from './m-dom-parser';
import { MusicXMLSerializer } from './music-xml-serializer';

const SAMPLE = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 4.0 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="4.0">
  <probe/>
  <part-list>
    <score-part id="P1">
      <part-name>Music</part-name>
    </score-part>
  </part-list>
  <part id="P1">
    <measure number="1">
      <note>
        <pitch>
          <step>C</step>
          <alter>1</alter>
          <octave>4</octave>
        </pitch>
        <duration>4</duration>
        <type>whole</type>
      </note>
    </measure>
    <measure number="2">
      <note>
        <rest/>
        <duration>4</duration>
      </note>
    </measure>
  </part>
</score-partwise>`;

describe('MDocument', () => {
  const parser = new MDOMParser();
  const serializer = new MusicXMLSerializer();
  const roundTrip = (xml: string) => serializer.serializeToString(parser.parseFromString(xml));

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

  // The contract: serialization is a fixpoint. parse -> serialize -> parse ->
  // serialize must equal the first serialization. Any feature that breaks this
  // breaks the library's core promise.
  it('is idempotent', () => {
    const once = roundTrip(SAMPLE);
    expect(roundTrip(once)).toBe(once);
  });

  it('keeps everything it does not model', () => {
    expect(roundTrip(SAMPLE)).toContain('probe');
  });
});
