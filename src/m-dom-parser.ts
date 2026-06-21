import { xml2js } from 'xml-js';
import JSZip from 'jszip';
import { MDocument } from './m-document';
import { MElement, MText } from './m-node';
import { Clef } from './clef';
import { Measure } from './measure';
import { Note } from './note';
import { Part } from './part';
import { Pitch } from './pitch';
import { Accidental } from './accidental';
import { Lyric } from './lyric';
import { Barline } from './barline';
import { Score } from './score';
import { Slur } from './slur';
import { Key } from './key';
import { Time } from './time';
import { Tie } from './tie';
import { Beam } from './beam';
import { Tuplet } from './tuplet';
import { WavyLine } from './wavy-line';
import { Wedge } from './wedge';
import { Pedal } from './pedal';
import { OctaveShift } from './octave-shift';
import { Direction } from './direction';
import type { XmlNode } from './xml';

/** Tag -> typed node. Unlisted tags become a plain MElement and still round-trip. */
const REGISTRY: Record<string, new () => MElement> = {
  'score-partwise': Score,
  part: Part,
  measure: Measure,
  note: Note,
  pitch: Pitch,
  accidental: Accidental,
  lyric: Lyric,
  barline: Barline,
  clef: Clef,
  slur: Slur,
  key: Key,
  time: Time,
  tied: Tie,
  beam: Beam,
  tuplet: Tuplet,
  'wavy-line': WavyLine,
  wedge: Wedge,
  pedal: Pedal,
  'octave-shift': OctaveShift,
  direction: Direction,
};

/** Parses a MusicXML string into an {@link MDocument} tree of typed nodes. */
export class MDOMParser {
  /**
   * Parses a MusicXML string into an {@link MDocument}, mapping known tags to
   * typed nodes and preserving the XML declaration and doctype. Throws if the
   * input has no root element.
   */
  parseFromString(xml: string): MDocument {
    const tree = xml2js(xml, { compact: false }) as unknown as XmlNode;
    const top = tree.elements ?? [];
    const root = top.find((n) => n.type === 'element');
    if (!root) {
      throw new Error('MusicXML has no root element');
    }
    const doctype = top.find((n) => n.type === 'doctype');
    return new MDocument(build(root), tree.declaration?.attributes ?? null, doctype?.doctype ?? null);
  }

  /**
   * Parses a compressed `.mxl` archive into an {@link MDocument}. Reads
   * `META-INF/container.xml`, follows its first `<rootfile>` to the MusicXML
   * entry, and parses that. Throws if the container or rootfile is missing.
   */
  async parseFromBlob(blob: Blob): Promise<MDocument> {
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    const containerFile = zip.file('META-INF/container.xml');
    if (!containerFile) {
      throw new Error('MXL archive has no META-INF/container.xml');
    }
    const container = xml2js(await containerFile.async('string'), { compact: false }) as unknown as XmlNode;
    const fullPath = findRootfilePath(container);
    if (!fullPath) {
      throw new Error('MXL container.xml has no <rootfile>');
    }
    const rootFile = zip.file(fullPath);
    if (!rootFile) {
      throw new Error(`MXL archive is missing its rootfile: ${fullPath}`);
    }
    return this.parseFromString(await rootFile.async('string'));
  }
}

/** Depth-first search for the first `<rootfile>` element's full-path attribute. */
function findRootfilePath(node: XmlNode): string | undefined {
  if (node.name === 'rootfile') {
    return node.attributes?.['full-path'];
  }
  for (const child of node.elements ?? []) {
    const found = findRootfilePath(child);
    if (found) {
      return found;
    }
  }
  return undefined;
}

/** Build a typed (or plain) element tree from an xml-js node, recursively. */
function build(node: XmlNode): MElement {
  const name = node.name ?? '';
  const Cls = REGISTRY[name];
  const el = Cls ? new Cls() : new MElement(name);

  for (const [key, value] of Object.entries(node.attributes ?? {})) {
    el.setAttribute(key, value);
  }

  for (const child of node.elements ?? []) {
    if (child.type === 'element') {
      el.append(build(child));
    } else if (child.type === 'text' && typeof child.text === 'string' && child.text.trim() !== '') {
      el.append(new MText(child.text));
    }
    // Whitespace-only text, comments, and CDATA are dropped so serialization
    // stays idempotent; add MComment/MCData nodes if a real document needs them
    // preserved.
  }

  return el;
}
