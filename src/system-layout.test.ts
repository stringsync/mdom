import { describe, expect, it } from 'bun:test';
import { MDocument } from './m-document';
import { MDOMParser } from './m-dom-parser';
import { MElement, required } from './m-node';
import { MusicXMLSerializer } from './music-xml-serializer';
import { Measure } from './measure';
import { Score } from './score';
import { SystemLayout } from './system-layout';

const parser = new MDOMParser();
const serializer = new MusicXMLSerializer();

function parse(xml: string): Score {
  return parser.parseFromString(xml).root as Score;
}

/** Child element tags in document order — to assert the schema sequence. */
function tags(element: MElement): string[] {
  return element.children.map((node) => (node instanceof MElement ? node.tag : '#text'));
}

describe('SystemLayout reads', () => {
  it('reads margins and distances from <defaults>', () => {
    const score = parse(`
      <score-partwise>
        <defaults>
          <system-layout>
            <system-margins><left-margin>30</left-margin><right-margin>10</right-margin></system-margins>
            <system-distance>120</system-distance>
            <top-system-distance>200</top-system-distance>
          </system-layout>
        </defaults>
      </score-partwise>`);
    const layout = score.systemLayout;
    expect(layout).toBeInstanceOf(SystemLayout);
    expect(layout?.leftMargin).toBe(30);
    expect(layout?.rightMargin).toBe(10);
    expect(layout?.systemDistance).toBe(120);
    expect(layout?.topSystemDistance).toBe(200);
  });

  it('returns null fields when unset and null layout when absent', () => {
    const score = parse('<score-partwise><defaults><system-layout/></defaults></score-partwise>');
    expect(score.systemLayout?.leftMargin).toBeNull();
    expect(parse('<score-partwise/>').systemLayout).toBeNull();
  });

  it('reads a per-system <print> override and break flags', () => {
    const score = parse(`
      <score-partwise><part><measure number="1">
        <print new-system="yes" new-page="no">
          <system-layout><system-distance>150</system-distance></system-layout>
        </print>
      </measure></part></score-partwise>`);
    const print = score.parts[0]?.measures[0]?.print;
    expect(print?.newSystem).toBe(true);
    expect(print?.newPage).toBe(false);
    expect(print?.systemLayout?.systemDistance).toBe(150);
  });
});

describe('SystemLayout writes', () => {
  it('builds nested margins and distances in schema order', () => {
    const layout = new SystemLayout();
    // Deliberately out of order; setters must still emit the canonical sequence.
    layout.topSystemDistance = 200;
    layout.systemDistance = 120;
    layout.rightMargin = 10;
    layout.leftMargin = 30;

    expect(tags(layout)).toEqual(['system-margins', 'system-distance', 'top-system-distance']);
    expect(tags(required(layout.child('system-margins'), 'system-margins'))).toEqual(['left-margin', 'right-margin']);
    expect(layout.leftMargin).toBe(30);
    expect(layout.systemDistance).toBe(120);
  });

  it('upserts in place rather than duplicating', () => {
    const layout = new SystemLayout();
    layout.systemDistance = 100;
    layout.systemDistance = 140;
    expect(layout.childrenNamed('system-distance').length).toBe(1);
    expect(layout.systemDistance).toBe(140);
  });

  it('creates <defaults><system-layout> and serializes valid XML', () => {
    const score = new Score();
    const layout = score.getOrCreateSystemLayout();
    layout.systemDistance = 120;
    expect(score.getOrCreateSystemLayout()).toBe(layout); // idempotent

    const xml = serializer.serializeToString(new MDocument(score, null, null));
    expect(xml).toContain('<defaults>');
    expect(xml).toContain('<system-layout>');
    expect(xml).toContain('<system-distance>120</system-distance>');
  });

  it('sets a system break by upserting a leading <print>', () => {
    const measure = new Measure();
    measure.setAttribute('number', '2');
    const print = measure.getOrCreatePrint();
    print.newSystem = true;
    expect(measure.children[0]).toBe(print);
    expect(measure.getOrCreatePrint()).toBe(print); // idempotent

    const score = new Score();
    const part = score.addPart();
    part.append(measure);
    const xml = serializer.serializeToString(new MDocument(score, null, null));
    expect(xml).toContain('new-system="yes"');
  });
});
