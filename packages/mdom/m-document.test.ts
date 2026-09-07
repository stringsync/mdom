import { describe, expect, it } from 'bun:test';
import { MDocument } from './m-document';
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

  // empty() is a scaffold, not a finished score: it carries the declaration,
  // doctype, and version so that once a part/measure is added the output is a
  // real, DTD-valid MusicXML file.
  it('empty() scaffolds a valid MusicXML file once a part is added', () => {
    const doc = MDocument.empty();
    doc.score.addPart({ id: 'P1', name: 'Music' }).addMeasure();

    const xml = serializer.serializeToString(doc);
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain('<!DOCTYPE score-partwise PUBLIC');
    expect(xml).toContain('<score-partwise version="4.0">');
    expect(xml).toContain('<score-part id="P1">');
    expect(xml).toContain('<part-name>Music</part-name>');
    expect(xml).toContain('<measure number="1"/>');
    expect(roundTrip(xml)).toBe(xml);
  });

  it('queries top-down through typed nodes', () => {
    const doc = MDocument.empty();
    const part = doc.score.addPart({ id: 'P1' });
    part.addMeasure();
    part.addMeasure();

    expect(doc.score.parts.length).toBe(1);
    expect(doc.score.getPart('P1')?.measures.length).toBe(2);
    expect(doc.score.getPart('P1')?.getMeasure('2')?.number).toBe('2');
  });

  it('builds a usable document from scratch, with no MusicXML to start from', () => {
    const doc = MDocument.empty();
    expect(doc.score.parts.length).toBe(0);

    doc.score.addPart({ id: 'P1' });

    expect(serializer.serializeToString(doc)).toContain('<part id="P1"/>');
  });

  it('appends a measure that survives a round-trip', () => {
    const doc = MDocument.empty();
    doc.score.addPart({ id: 'P1' }).addMeasure();

    const reparsed = parser.parseFromString(serializer.serializeToString(doc));
    expect(reparsed.score.getPart('P1')?.measures.length).toBe(1);
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
