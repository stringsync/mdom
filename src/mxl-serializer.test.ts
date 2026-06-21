import { describe, expect, it } from 'bun:test';
import JSZip from 'jszip';
import { MDocument } from './m-document';
import { MElement, MText } from './m-node';
import { Score } from './score';
import { MDOMParser } from './m-dom-parser';
import { MXLSerializer } from './mxl-serializer';

describe('MXLSerializer', () => {
  it('round-trips a document through .mxl', async () => {
    const score = new Score();
    const title = new MElement('movement-title');
    title.append(new MText('Allegro'));
    score.append(title);
    const doc = new MDocument(score, { version: '1.0', encoding: 'UTF-8' }, null);

    const blob = await new MXLSerializer().serializeToBlob(doc);
    const parsed = await new MDOMParser().parseFromBlob(blob);

    expect(parsed.root).toBeInstanceOf(Score);
    expect(parsed.root.child('movement-title')?.text).toBe('Allegro');
  });

  it('throws on an archive without container.xml', async () => {
    const empty = await new JSZip().generateAsync({ type: 'blob' });
    expect(new MDOMParser().parseFromBlob(empty)).rejects.toThrow('no META-INF/container.xml');
  });
});
