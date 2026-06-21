import { MElement, MText, required } from './m-node';
import { Note } from './note';
import { Part } from './part';
import { Clef } from './clef';
import { Key } from './key';
import { Time } from './time';
import { Voice } from './voice';
import { Chord, groupChords } from './chord';
import { Direction } from './direction';
import { Barline } from './barline';
import { attributesBackFrom, appliesToStaff } from './signature';

/** A `<measure>`. Holds notes, directions, and `<attributes>` (signatures). */
export class Measure extends MElement {
  constructor() {
    super('measure');
  }

  /**
   * The `number` attribute. Valid MusicXML always carries one, and addMeasure
   * sets it; absence is malformed. (Use {@link index} for position — `number` is
   * the free-form, possibly-repeated printed label.)
   */
  get number(): string {
    return required(this.getAttribute('number'), 'number on <measure>');
  }

  /** The measure's notes. */
  get notes(): Note[] {
    return this.childrenOfType(Note);
  }

  /**
   * Position among the part's measures; -1 when detached. Distinct from
   * {@link number}, which is the (free-form, possibly repeated) printed label.
   */
  get index(): number {
    return this.closest(Part)?.measures.indexOf(this) ?? -1;
  }

  /**
   * The `<clef>` in effect at the start of this measure for `staff` (default
   * '1'): the nearest declaration at or before this measure. Clefs match their
   * staff exactly; a numberless key/time applies to every staff.
   */
  clef(staff = '1'): Clef | null {
    return this.attributeBack((attrs) => attrs.childrenOfType(Clef).find((clef) => clef.staff === staff));
  }

  /** The `<key>` in effect at the start of this measure for `staff`. */
  key(staff = '1'): Key | null {
    return this.attributeBack((attrs) => attrs.childrenOfType(Key).find((key) => appliesToStaff(key, staff)));
  }

  /** The `<time>` in effect at the start of this measure for `staff`. */
  time(staff = '1'): Time | null {
    return this.attributeBack((attrs) => attrs.childrenOfType(Time).find((time) => appliesToStaff(time, staff)));
  }

  /** `<staves>` count in effect (global); 1 when never declared. */
  staveCount(): number {
    const staves = this.attributeBack((attrs) => attrs.child('staves') ?? undefined);
    return staves?.text == null ? 1 : Number(staves.text);
  }

  /** `<staff-lines>` in effect for `staff` (default '1'); 5 lines when unspecified. */
  staveLines(staff = '1'): number {
    const lines = this.attributeBack((attrs) =>
      attrs
        .childrenNamed('staff-details')
        .filter((details) => appliesToStaff(details, staff))
        .map((details) => details.child('staff-lines'))
        .find((node) => node != null)
    );
    return lines?.text == null ? 5 : Number(lines.text);
  }

  /** Notes grouped by `<voice>`, in the order each voice first appears. */
  voices(): Voice[] {
    const order: string[] = [];
    for (const note of this.notes) {
      const id = note.voice;
      if (!order.includes(id)) {
        order.push(id);
      }
    }
    return order.map((id) => {
      const staff = this.notes.find((note) => note.voice === id)?.staff ?? '1';
      return new Voice(this, id, staff);
    });
  }

  /** Notes grouped into chords: `<chord/>` runs collapsed, single notes 1-member. */
  chords(): Chord[] {
    return groupChords(this.notes);
  }

  /** `<measure-style><multiple-rest>` count, when this measure begins a multi-rest. */
  get multiRestCount(): number | null {
    const count = this.attributeBack((attrs) => attrs.child('measure-style')?.child('multiple-rest'));
    return count?.text == null ? null : Number(count.text);
  }

  /** The measure's directions. */
  get directions(): Direction[] {
    return this.childrenOfType(Direction);
  }

  /** The measure's `<barline>` markers (e.g. a left repeat, a right final bar). */
  get barlines(): Barline[] {
    return this.childrenOfType(Barline);
  }

  /**
   * Get or create the reader/writer for a `<voice>`; remembers the staff so notes
   * added through it are positioned and labeled correctly.
   */
  voice(id: string, opts?: { staff?: string }): Voice {
    return new Voice(this, id, opts?.staff ?? '1');
  }

  /**
   * Upsert the `<clef>` in this measure's `<attributes>` (created and positioned
   * first if absent). The caller never assembles `<attributes>` by hand.
   */
  setClef(spec: { sign: string; line?: number; octaveChange?: number; staff?: string }): Clef {
    const attrs = attributesOf(this);
    const staff = spec.staff ?? '1';
    attrs
      .childrenOfType(Clef)
      .find((clef) => clef.staff === staff)
      ?.remove();
    const clef = new Clef();
    if (spec.staff != null) {
      clef.setAttribute('number', spec.staff);
    }
    appendValue(clef, 'sign', spec.sign);
    if (spec.line != null) {
      appendValue(clef, 'line', String(spec.line));
    }
    if (spec.octaveChange != null) {
      appendValue(clef, 'clef-octave-change', String(spec.octaveChange));
    }
    attrs.append(clef);
    return clef;
  }

  /** Upsert the `<key>` in this measure's `<attributes>`. */
  setKey(spec: { fifths: number; mode?: string; staff?: string }): Key {
    const attrs = attributesOf(this);
    const number = spec.staff ?? null;
    attrs
      .childrenOfType(Key)
      .find((key) => key.getAttribute('number') === number)
      ?.remove();
    const key = new Key();
    if (spec.staff != null) {
      key.setAttribute('number', spec.staff);
    }
    appendValue(key, 'fifths', String(spec.fifths));
    if (spec.mode != null) {
      appendValue(key, 'mode', spec.mode);
    }
    attrs.append(key);
    return key;
  }

  /** Upsert the `<time>` in this measure's `<attributes>`. */
  setTime(spec: { beats: number; beatType: number; symbol?: string }): Time {
    const attrs = attributesOf(this);
    attrs.childrenOfType(Time)[0]?.remove();
    const time = new Time();
    if (spec.symbol != null) {
      time.setAttribute('symbol', spec.symbol);
    }
    appendValue(time, 'beats', String(spec.beats));
    appendValue(time, 'beat-type', String(spec.beatType));
    attrs.append(time);
    return time;
  }

  /**
   * First `<attributes>` back from the start of this measure (own leading block,
   * then earlier measures) for which `pick` matches — the carry-forward shape.
   */
  private attributeBack<T>(pick: (attrs: MElement) => T | null | undefined): T | null {
    // "At the start of this measure": scan from the first note, so the measure's
    // own leading <attributes> count but a mid-measure change (after a note,
    // which only a note-level query should see) does not.
    const firstNote = this.notes[0];
    const fromIndex = firstNote ? this.children.indexOf(firstNote) : this.children.length;
    for (const attrs of attributesBackFrom(this, fromIndex)) {
      const found = pick(attrs);
      if (found != null) {
        return found;
      }
    }
    return null;
  }
}

/**
 * Get or create this measure's `<attributes>` block. Appended (so it lands first
 * when the measure is still empty, which is how scores are built — signatures
 * before notes); a later mid-measure change would need explicit positioning.
 */
export function attributesOf(measure: Measure): MElement {
  const existing = measure.childrenNamed('attributes')[0];
  if (existing) {
    return existing;
  }
  const attrs = new MElement('attributes');
  measure.append(attrs);
  return attrs;
}

/** Append a leaf `<tag>text</tag>` child to `parent`. */
export function appendValue(parent: MElement, tag: string, text: string): MElement {
  const element = new MElement(tag);
  element.append(new MText(text));
  parent.append(element);
  return element;
}
