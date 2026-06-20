import { MElement } from './m-node';
import { Part } from './part';
import { appendValue } from './measure';

/** The `<score-partwise>` root. Holds the parts and the part-list metadata. */
export class Score extends MElement {
  constructor() {
    super('score-partwise');
  }

  /** The score's parts. */
  get parts(): Part[] {
    return this.childrenOfType(Part);
  }

  /** The part with this id, or null. */
  part(id: string): Part | null {
    return this.parts.find((part) => part.id === id) ?? null;
  }

  /** `<movement-title>`, falling back to `<work><work-title>`. */
  get title(): string | null {
    return this.child('movement-title')?.text ?? this.child('work')?.child('work-title')?.text ?? null;
  }

  /**
   * Create a `<part>`, registering its `<score-part>`/`<part-name>` in the
   * `<part-list>` (created if absent). The id is generated when omitted.
   */
  addPart(opts?: { id?: string; name?: string }): Part {
    const id = opts?.id ?? `P${this.parts.length + 1}`;

    let partList = this.child('part-list');
    if (!partList) {
      partList = new MElement('part-list');
      this.append(partList);
    }
    const scorePart = new MElement('score-part');
    scorePart.setAttribute('id', id);
    if (opts?.name != null) {
      appendValue(scorePart, 'part-name', opts.name);
    }
    partList.append(scorePart);

    const part = new Part();
    part.setAttribute('id', id);
    this.append(part);
    return part;
  }
}
