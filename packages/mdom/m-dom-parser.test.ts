import { describe, expect, it } from 'bun:test';
import { MDOMParser } from './m-dom-parser';
import { MCData, MElement } from './m-node';
import { Measure } from './measure';
import { MusicXMLSerializer } from './music-xml-serializer';
import { Note } from './note';
import { Part } from './part';
import { Pitch } from './pitch';
import { Score } from './score';

describe('MDOMParser', () => {
  const parser = new MDOMParser();

  it('builds typed nodes from the registry and leaves unknown tags as MElement', () => {
    const doc = parser.parseFromString(`
      <score-partwise>
        <part id="P1">
          <measure number="1">
            <note>
              <pitch>
                <step>C</step>
                <octave>4</octave>
              </pitch>
            </note>
            <unmodeled flag="yes"/>
          </measure>
        </part>
      </score-partwise>
    `);

    expect(doc.root).toBeInstanceOf(Score);

    const part = doc.score?.getPart('P1');
    expect(part).toBeInstanceOf(Part);

    const measure = part?.getMeasure('1');
    expect(measure).toBeInstanceOf(Measure);

    const note = measure?.notes[0];
    expect(note).toBeInstanceOf(Note);
    expect(note?.pitch).toBeInstanceOf(Pitch);

    const unknown = measure?.child('unmodeled');
    expect(unknown).toBeInstanceOf(MElement);
    expect(unknown?.getAttribute('flag')).toBe('yes');
  });

  it('preserves declaration + doctype metadata on parse', () => {
    const doc = parser.parseFromString(`<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise SYSTEM "partwise.dtd">
<score-partwise/>`);

    expect(doc.declaration).toEqual({ version: '1.0', encoding: 'UTF-8' });
    expect(doc.doctype).toBe('score-partwise SYSTEM "partwise.dtd"');
  });

  it('drops whitespace-only text and comments but keeps significant text', () => {
    const doc = parser.parseFromString(`
      <score-partwise>
        <part id="P1">
          <measure number="1">
            <note>
              <!-- dropped -->
              <type>  whole  </type>
            </note>
          </measure>
        </part>
      </score-partwise>
    `);

    const note = doc.score?.getPart('P1')?.getMeasure('1')?.notes[0];
    expect(note).not.toBeUndefined();

    const elementChildren = note?.children.filter((n) => n instanceof MElement) ?? [];
    expect(elementChildren.map((n) => (n as MElement).tag)).toEqual(['type']);

    expect(note?.type).toBe('  whole  ');
  });

  it('preserves CDATA sections through a parse + serialize round trip', () => {
    const doc = parser.parseFromString(
      `<score-partwise><credit><credit-words><![CDATA[a < b & c]]></credit-words></credit></score-partwise>`
    );

    const words = doc.score?.child('credit')?.child('credit-words');
    expect(words?.children[0]).toBeInstanceOf(MCData);
    expect((words?.children[0] as MCData).value).toBe('a < b & c');

    const xml = new MusicXMLSerializer().serializeToString(doc);
    expect(xml).toContain('<![CDATA[a < b & c]]>');
  });

  it('throws when the XML has no root element', () => {
    expect(() => parser.parseFromString('<!-- no root -->')).toThrow('MusicXML has no root element');
  });
});
