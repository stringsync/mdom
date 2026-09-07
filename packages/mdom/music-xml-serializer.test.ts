import { describe, expect, it } from 'bun:test';
import { MDocument } from './m-document';
import { MElement, MText } from './m-node';
import { Score } from './score';
import { MusicXMLSerializer } from './music-xml-serializer';

describe('MusicXMLSerializer', () => {
  const serializer = new MusicXMLSerializer();

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
