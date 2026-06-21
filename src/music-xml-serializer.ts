import { js2xml } from 'xml-js';
import { MDocument } from './m-document';
import { MElement, MText, MCData, type MNode } from './m-node';
import type { XmlNode } from './xml';

/** Serializes an {@link MDocument} back to a MusicXML string. */
export class MusicXMLSerializer {
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

/** Convert an mdom node back to the xml-js shape, recursively. */
function toJs(node: MNode): XmlNode {
  if (node instanceof MText) {
    return { type: 'text', text: node.value };
  }
  if (node instanceof MCData) {
    return { type: 'cdata', cdata: node.value };
  }
  const el = node as MElement;
  return {
    type: 'element',
    name: el.tag,
    attributes: el.attributes,
    elements: el.children.map(toJs),
  };
}
