// spec(mdom.api): parse is the only entry point; it returns a Document or
// throws an MdomError so callers handle failure with try/catch.

import { type Element, xml2js } from 'xml-js';
import { InvalidMusicXmlError, XmlParseError } from './errors';
import { normalize } from './normalize';
import { Document } from './nodes/document';

const MUSICXML_ROOTS = ['score-partwise', 'score-timewise'];

function parse(xml: string): Document {
  const tree = getTree(xml);
  const root = getRoot(tree);

  // spec(mdom.api): both MusicXML flavors normalize into one timewise
  // hierarchy (see mdom.hierarchy).
  return normalize(root);
}

function getTree(xml: string) {
  try {
    return xml2js(xml, { compact: false }) as Element;
  } catch (e) {
    // spec(mdom.api): malformed XML throws XmlParseError.
    throw new XmlParseError(e instanceof Error ? e.message : 'malformed XML');
  }
}

function getRoot(tree: Element) {
  const root = tree.elements?.find((el) => el.type === 'element');
  if (!root?.name || !MUSICXML_ROOTS.includes(root.name)) {
    // spec(mdom.api): well-formed but not MusicXML -> InvalidMusicXmlError.
    throw new InvalidMusicXmlError(
      root?.name ? `expected a MusicXML root element, got <${root.name}>` : 'document has no root element'
    );
  }
  return root;
}

// spec(mdom.api): the public surface is the `mdom` namespace exposing parse.
export const mdom = { parse };
