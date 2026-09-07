import JSZip from 'jszip';
import type { MDocument } from './m-document';
import { MusicXMLSerializer } from './music-xml-serializer';

const SCORE_PATH = 'score.musicxml';

const CONTAINER_XML = `<?xml version="1.0" encoding="UTF-8"?>
<container>
  <rootfiles>
    <rootfile full-path="${SCORE_PATH}" media-type="application/vnd.recordare.musicxml+xml"/>
  </rootfiles>
</container>
`;

/** Serializes an {@link MDocument} into a compressed `.mxl` archive. */
export class MXLSerializer {
  private readonly xml = new MusicXMLSerializer();

  async serializeToBlob(doc: MDocument): Promise<Blob> {
    const zip = new JSZip();
    // mimetype must be first and uncompressed per the MXL spec.
    zip.file('mimetype', 'application/vnd.recordare.musicxml', { compression: 'STORE' });
    zip.file('META-INF/container.xml', CONTAINER_XML);
    zip.file(SCORE_PATH, this.xml.serializeToString(doc));
    return zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
  }
}
