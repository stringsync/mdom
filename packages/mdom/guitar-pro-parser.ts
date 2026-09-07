import JSZip from 'jszip';
import type { MDocument } from './m-document';
import type { GuitarProOptions } from './guitar-pro-options';

/** Imports core notation and tablature from Guitar Pro 7/8 `.gp` archives. */
export class GuitarProParser {
  async parseFromBlob(blob: Blob, opts: GuitarProOptions = {}): Promise<MDocument> {
    return this.parseFromBytes(new Uint8Array(await blob.arrayBuffer()), opts);
  }

  /** Throws for malformed archives, older Guitar Pro formats, or unsupported musical features. */
  async parseFromBytes(bytes: Uint8Array, opts: GuitarProOptions = {}): Promise<MDocument> {
    if (bytes[0] !== 0x50 || bytes[1] !== 0x4b) {
      throw new Error('Expected a Guitar Pro 7/8 .gp ZIP archive; .gp3, .gp4, .gp5 and .gpx are not supported');
    }
    const zip = await JSZip.loadAsync(bytes);
    if (!zip.file('Content/score.gpif')) {
      throw new Error('Guitar Pro archive has no Content/score.gpif');
    }
    // Keep the notation codec out of the startup path for MusicXML-only consumers.
    const codec = await import('@coderline/alphatab');
    const { GuitarProDocumentReader } = await import('./guitar-pro-document-reader');
    const score = codec.importer.ScoreLoader.loadScoreFromBytes(bytes);
    return new GuitarProDocumentReader(codec, opts).read(score);
  }
}
