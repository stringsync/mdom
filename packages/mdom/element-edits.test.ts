import { describe, expect, it } from 'bun:test';
import { MElement, MText } from './m-node';

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
