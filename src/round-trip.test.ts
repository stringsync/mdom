import { describe, expect, it } from 'bun:test';
import { Measure } from './measure';
import { MDOMParser, MXMLSerializer } from './xml';

// A small but real score-partwise: declaration, doctype, part-list, and one
// part with two measures. Enough to pin the direction without modeling notes.
const SAMPLE = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 4.0 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="4.0">
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

const parser = new MDOMParser();
const serializer = new MXMLSerializer();
const roundTrip = (xml: string) => serializer.serializeToString(parser.parseFromString(xml));

describe('round-trip fidelity', () => {
  // The contract: serialization is a fixpoint. parse -> serialize -> parse ->
  // serialize must equal the first serialization. Any feature that breaks this
  // breaks the library's core promise.
  it('serialization is idempotent', () => {
    const once = roundTrip(SAMPLE);
    expect(roundTrip(once)).toBe(once);
  });

  it('keeps everything it does not model (the part-list survives)', () => {
    expect(roundTrip(SAMPLE)).toContain('<part-name>Music</part-name>');
  });
});

describe('querying', () => {
  it('reads top-down through typed nodes', () => {
    const doc = parser.parseFromString(SAMPLE);
    expect(doc.score?.parts.length).toBe(1);
    expect(doc.score?.part('P1')?.measures.length).toBe(2);
    expect(doc.score?.part('P1')?.measure('2')?.number).toBe('2');
  });
});

describe('in-place mutation', () => {
  it('appends a measure that survives a round-trip', () => {
    const doc = parser.parseFromString(SAMPLE);
    const part = doc.score?.part('P1');
    expect(part).not.toBeNull();

    const measure = new Measure();
    measure.setAttribute('number', '3');
    part?.append(measure);

    const reparsed = parser.parseFromString(serializer.serializeToString(doc));
    expect(reparsed.score?.part('P1')?.measures.length).toBe(3);
  });
});
