import { js2xml, xml2js } from 'xml-js';
import { MDocument } from './m-document';
import { MElement, MText, type MNode } from './m-node';
import { Measure } from './measure';
import { Note } from './note';
import { Part } from './part';
import { Pitch } from './pitch';
import { Score } from './score';

// Tag -> typed node. Unlisted tags become a plain MElement and still round-trip.
const REGISTRY: Record<string, new () => MElement> = {
  'score-partwise': Score,
  part: Part,
  measure: Measure,
  note: Note,
  pitch: Pitch,
};

// The slice of xml-js's non-compact JSON shape we read and emit.
interface XmlNode {
  type?: string;
  name?: string;
  text?: string | number;
  doctype?: string;
  attributes?: Record<string, string>;
  elements?: XmlNode[];
  declaration?: { attributes?: Record<string, string> };
}

export class MDOMParser {
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
}

export class MXMLSerializer {
  serializeToString(doc: MDocument): string {
    const elements: XmlNode[] = [];
    if (doc.doctype) {
      elements.push({ type: 'doctype', doctype: doc.doctype });
    }
    elements.push(toJs(doc.root));

    const tree: XmlNode = { elements };
    if (doc.declaration) {
      tree.declaration = { attributes: doc.declaration };
    }
    return js2xml(tree as unknown as Parameters<typeof js2xml>[0], { spaces: 2 });
  }
}

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

function toJs(node: MNode): XmlNode {
  if (node instanceof MText) {
    return { type: 'text', text: node.value };
  }
  const el = node as MElement;
  return {
    type: 'element',
    name: el.tag,
    attributes: el.attributes,
    elements: el.children.map(toJs),
  };
}
