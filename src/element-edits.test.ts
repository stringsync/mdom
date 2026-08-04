import { describe, expect, it } from 'bun:test';
import { MDocument } from './m-document';
import { MDOMParser } from './m-dom-parser';
import { MElement, MText, required } from './m-node';
import { MusicXMLSerializer } from './music-xml-serializer';
import { durationDivisions } from './note';

// The positional half of the tree API: everything that puts a node somewhere
// specific rather than at the end. MusicXML's content models are sequences, so a
// `<grace/>` has to land ahead of everything and a `<dot>` right after `<type>`.
describe('MElement — positional mutation', () => {
  const build = (): { parent: MElement; first: MElement; second: MElement } => {
    const parent = new MElement('note');
    const first = new MElement('pitch');
    const second = new MElement('duration');
    parent.append(first);
    parent.append(second);
    return { parent, first, second };
  };

  it('inserts before a reference child', () => {
    const { parent, second } = build();
    parent.insertBefore(new MElement('grace'), second);
    expect(parent.childrenOfType(MElement).map((child) => child.tag)).toEqual(['pitch', 'grace', 'duration']);
  });

  it('leaves an existing earlier sibling where it is', () => {
    // Reordering in place: detaching `first` shifts `second` down one, so an index
    // read before the detach would drop `first` past it — a silent swap.
    const { parent, first, second } = build();
    parent.insertBefore(first, second);
    expect(parent.childrenOfType(MElement).map((child) => child.tag)).toEqual(['pitch', 'duration']);
  });

  it('appends when the reference is null', () => {
    const { parent } = build();
    parent.insertBefore(new MElement('staff'), null);
    expect(parent.childrenOfType(MElement).map((child) => child.tag)).toEqual(['pitch', 'duration', 'staff']);
  });

  it('detaches from an old parent before inserting', () => {
    const { parent, first, second } = build();
    const other = new MElement('note');
    other.append(new MElement('rest'));
    other.insertBefore(first, other.children[0]!);
    expect(parent.children).toEqual([second]);
    expect(first.parent).toBe(other);
  });

  it('throws when the reference is not a child', () => {
    const { parent } = build();
    expect(() => parent.insertBefore(new MElement('dot'), new MElement('stray'))).toThrow(
      'insertBefore reference is not a child'
    );
  });

  it('replaces a child in place, keeping its position', () => {
    const { parent, first } = build();
    parent.replaceChild(first, new MElement('rest'));
    expect(parent.childrenOfType(MElement).map((child) => child.tag)).toEqual(['rest', 'duration']);
    expect(first.parent).toBeNull();
  });

  it('throws when the replacement target is not a child', () => {
    const { parent } = build();
    expect(() => parent.replaceChild(new MElement('stray'), new MElement('rest'))).toThrow(
      'replaceChild target is not a child'
    );
  });

  it('rewrites leaf text in place, and appends a text node when there is none', () => {
    const withText = new MElement('duration');
    withText.append(new MText('4'));
    withText.append(new MElement('marker')); // text node must keep its position
    withText.setText('8');
    expect(withText.text).toBe('8');
    expect(withText.children).toHaveLength(2);

    const empty = new MElement('duration');
    empty.setText('16');
    expect(empty.text).toBe('16');
    expect(empty.children).toHaveLength(1);
  });
});

describe('required — the hygienic replacement for a bang', () => {
  it('passes a present value through, including falsy ones', () => {
    expect(required(0, 'a count')).toBe(0);
    expect(required('', 'a label')).toBe('');
    expect(required(false, 'a flag')).toBe(false);
  });

  it('throws a located error for null and undefined', () => {
    expect(() => required(null, '<sign> in <clef>')).toThrow('mdom: missing required <sign> in <clef>');
    expect(() => required(undefined, 'a part')).toThrow('missing required a part');
  });
});

describe('durationDivisions — the write-side duration math', () => {
  it('converts a note type and dots to divisions', () => {
    expect(durationDivisions({ type: 'quarter' }, 256)).toBe(256);
    expect(durationDivisions({ type: 'whole' }, 256)).toBe(1024);
    expect(durationDivisions({ type: 'quarter', dots: 1 }, 256)).toBe(384);
    expect(durationDivisions({ type: 'quarter', dots: 3 }, 256)).toBe(480);
    expect(durationDivisions({ type: '128th' }, 256)).toBe(8);
  });

  it('throws loudly rather than emit a fractional <duration>', () => {
    expect(() => durationDivisions({ type: '128th', dots: 2 }, 4)).toThrow('fractional duration');
  });
});

// A pickup bar is short BY DECLARATION; a layout engine that misses this pads it
// out to a full bar's width.
const PICKUP = `<score-partwise><part id="P1">
  <measure number="0" implicit="yes">
    <attributes><divisions>4</divisions><time><senza-misura/></time></attributes>
    <note><pitch><step>G</step><octave>4</octave></pitch><duration>4</duration></note>
  </measure>
  <measure number="1">
    <attributes><time symbol="cut"><beats>2</beats><beat-type>2</beat-type></time></attributes>
    <note><pitch><step>C</step><octave>5</octave></pitch><duration>16</duration></note>
  </measure>
</part></score-partwise>`;

describe('measure and time — the declared-shape flags', () => {
  const part = new MDOMParser().parseFromString(PICKUP).score.getPart('P1')!;
  const [pickup, full] = part.measures;

  it('reads implicit="yes" as a pickup, not an underfull bar', () => {
    expect(pickup!.isImplicit).toBe(true);
    expect(full!.isImplicit).toBe(false);
    expect(pickup!.endBeat).toBe(1); // genuinely short, and that is intended
  });

  it('reads an unmetered <senza-misura> signature', () => {
    expect(pickup!.getTime()!.isSenzaMisura).toBe(true);
    expect(full!.getTime()!.isSenzaMisura).toBe(false);
    expect(full!.getTime()!.symbol).toBe('cut');
    expect(pickup!.getTime()!.symbol).toBeNull();
    expect(pickup!.getTime()!.staff).toBe('1');
  });
});

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
