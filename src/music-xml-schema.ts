import { MusicXMLSerializer } from './music-xml-serializer';
import type { MDocument } from './m-document';

const SCHEMA = new URL('../schema/musicxml.xsd', import.meta.url).pathname;

/**
 * Validate a document against the vendored MusicXML 4.0 XSD, returning
 * xmllint's complaints (empty when it validates). Test-only: nothing in `src/`
 * imports it, and the schema ships with the repo rather than the package.
 *
 * Shelling out to `xmllint` because there is no usable pure-JS XSD validator. A
 * missing binary throws out of `spawnSync` rather than being skipped over — a
 * validation test that quietly passes when it never ran is worse than no test.
 */
export function schemaErrors(doc: MDocument): string[] {
  // The DOCTYPE would send xmllint to musicxml.org for the DTD; the XSD is the
  // stricter of the two and is right here, so drop the line before validating.
  const xml = new MusicXMLSerializer().serializeToString(doc).replace(/^<!DOCTYPE[^>]*>\n?/m, '');
  const xmllint = Bun.spawnSync(['xmllint', '--noout', '--nonet', '--schema', SCHEMA, '-'], {
    stdin: Buffer.from(xml),
  });
  return new TextDecoder()
    .decode(xmllint.stderr)
    .split('\n')
    .filter((line) => line.includes('Schemas validity error') || line.includes('parser error'));
}
