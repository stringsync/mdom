import { describe, expect, it } from 'bun:test';
import { MDocument } from './m-document';
import { MElement } from './m-node';
import { MusicXMLSerializer } from './music-xml-serializer';

describe('print — the layout flags a caller writes back', () => {
  it('sets the break flags, and reads them back through both accessors', () => {
    const measure = MDocument.empty().score.addPart({ id: 'P1' }).addMeasure();
    const print = measure.getOrCreatePrint();
    expect(measure.getOrCreatePrint()).toBe(print); // upsert, not a second block

    print.newSystem = true;
    print.newPage = false;
    expect(print.newSystem).toBe(true);
    expect(print.systemBreak).toBe('yes');
    expect(print.newPage).toBe(false);
    expect(print.pageBreak).toBe('no'); // an explicit "no", which is not silence
  });

  it('creates the per-system layout override after <page-layout>', () => {
    const measure = MDocument.empty().score.addPart({ id: 'P1' }).addMeasure();
    const print = measure.getOrCreatePrint();
    expect(print.systemLayout).toBeNull();

    print.append(new MElement('page-layout'));
    const layout = print.getOrCreateSystemLayout();
    layout.systemDistance = 90;

    expect(print.getOrCreateSystemLayout()).toBe(layout);
    expect(print.childrenOfType(MElement).map((child) => child.tag)).toEqual(['page-layout', 'system-layout']);
    expect(print.systemLayout?.systemDistance).toBe(90);
  });

  it('round-trips what it wrote', () => {
    const document = MDocument.empty();
    const measure = document.score.addPart({ id: 'P1' }).addMeasure();
    measure.getOrCreatePrint().newSystem = true;
    expect(new MusicXMLSerializer().serializeToString(document)).toContain('<print new-system="yes"');
  });
});
