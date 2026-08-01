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

  // The container is a pointer file; each way it can dangle gets its own message,
  // because "the .mxl is broken" is useless to whoever has to fix the file.
  const archiveWith = async (container: string, entries: Record<string, string> = {}): Promise<Blob> => {
    const zip = new JSZip();
    zip.file('META-INF/container.xml', container);
    for (const [name, content] of Object.entries(entries)) {
      zip.file(name, content);
    }
    return zip.generateAsync({ type: 'blob' });
  };

  it('throws when the container names no rootfile', async () => {
    const blob = await archiveWith('<container><rootfiles/></container>');
    expect(new MDOMParser().parseFromBlob(blob)).rejects.toThrow('container.xml has no <rootfile>');
  });

  it('throws when the rootfile it names is not in the archive', async () => {
    const blob = await archiveWith('<container><rootfiles><rootfile full-path="score.xml"/></rootfiles></container>');
    expect(new MDOMParser().parseFromBlob(blob)).rejects.toThrow('missing its rootfile: score.xml');
  });

  it('follows the container to a rootfile nested anywhere in the archive', async () => {
    const blob = await archiveWith(
      '<container><rootfiles><rootfile full-path="nested/dir/score.xml"/></rootfiles></container>',
      { 'nested/dir/score.xml': '<score-partwise><part id="P1"><measure number="1"/></part></score-partwise>' }
    );
    const parsed = await new MDOMParser().parseFromBlob(blob);
    expect(parsed.score.getPart('P1')?.measures).toHaveLength(1);
  });
});
