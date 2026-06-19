import { describe, expect, it } from 'bun:test';
import { MDocument } from './m-document';
import { MElement, MText } from './m-node';
import { Measure } from './measure';
import { Note } from './note';
import { Part } from './part';
import { Pitch } from './pitch';
import { Score } from './score';
import { MDOMParser, MXMLSerializer } from './xml';

describe('MDOMParser / MXMLSerializer', () => {
  const parser = new MDOMParser();
  const serializer = new MXMLSerializer();

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

    const part = doc.score?.part('P1');
    expect(part).toBeInstanceOf(Part);

    const measure = part?.measure('1');
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

  it('drops whitespace-only text/comments/CDATA but keeps significant text', () => {
    const doc = parser.parseFromString(`
      <score-partwise>
        <part id="P1">
          <measure number="1">
            <note>
              <!-- dropped -->
              <![CDATA[dropped too]]>
              <type>  whole  </type>
            </note>
          </measure>
        </part>
      </score-partwise>
    `);

    const note = doc.score?.part('P1')?.measure('1')?.notes[0];
    expect(note).not.toBeUndefined();

    const elementChildren = note?.children.filter((n) => n instanceof MElement) ?? [];
    expect(elementChildren.map((n) => (n as MElement).tag)).toEqual(['type']);

    expect(note?.type).toBe('  whole  ');
  });

  it('throws when the XML has no root element', () => {
    expect(() => parser.parseFromString('<!-- no root -->')).toThrow('MusicXML has no root element');
  });

  it('serializes declaration, doctype, and text nodes', () => {
    const score = new Score();
    const title = new MElement('movement-title');
    title.append(new MText('Allegro'));
    score.append(title);

    const doc = new MDocument(score, { version: '1.0', encoding: 'UTF-8' }, 'score-partwise SYSTEM "partwise.dtd"');

    const xml = serializer.serializeToString(doc);

    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain('<!DOCTYPE score-partwise SYSTEM "partwise.dtd">');
    expect(xml).toContain('<movement-title>Allegro</movement-title>');

    const doctypeIndex = xml.indexOf('<!DOCTYPE');
    const rootIndex = xml.indexOf('<score-partwise');
    expect(doctypeIndex).toBeGreaterThan(-1);
    expect(rootIndex).toBeGreaterThan(-1);
    expect(doctypeIndex).toBeLessThan(rootIndex);
  });
});
