import type { MElement } from './m-node';
import { Score } from './score';

/** A parsed document: the root element plus the XML declaration and doctype. */
export class MDocument {
  constructor(
    readonly root: MElement,
    readonly declaration: Record<string, string> | null = null,
    readonly doctype: string | null = null
  ) {}

  /**
   * An empty `<score-partwise>` scaffold carrying the XML declaration, doctype,
   * and `version` so serialization produces a real MusicXML file. Add at least
   * one part with a measure (e.g. `doc.score.addPart().addMeasure()`) to reach a
   * DTD-valid document — `<score-partwise>` requires `part-list` plus `part+`.
   */
  static empty(): MDocument {
    const score = new Score();
    score.setAttribute('version', '4.0');
    return new MDocument(
      score,
      { version: '1.0', encoding: 'UTF-8' },
      'score-partwise PUBLIC "-//Recordare//DTD MusicXML 4.0 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd"'
    );
  }

  /** The root as a {@link Score}. Throws when the root is something else. */
  get score(): Score {
    if (!(this.root instanceof Score)) {
      throw new Error(`mdom: expected a <score-partwise> root, got <${this.root.tag}>`);
    }
    return this.root;
  }
}
