import { xml2js } from 'xml-js';
import JSZip from 'jszip';
import { MDocument } from './m-document';
import { type MElement, MText, MCData } from './m-node';
import { elementFor } from './registry';
import type { XmlNode } from './xml';

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
  const el = elementFor(node.name ?? '');

  for (const [key, value] of Object.entries(node.attributes ?? {})) {
    el.setAttribute(key, value);
  }

  for (const child of node.elements ?? []) {
    if (child.type === 'element') {
      el.append(build(child));
    } else if (child.type === 'text' && typeof child.text === 'string' && child.text.trim() !== '') {
      el.append(new MText(child.text));
    } else if (child.type === 'cdata' && typeof child.cdata === 'string') {
      el.append(new MCData(child.cdata));
    }
    // Whitespace-only text and comments are dropped so serialization stays
    // idempotent; add an MComment node if a real document needs them preserved.
  }

  return el;
}
