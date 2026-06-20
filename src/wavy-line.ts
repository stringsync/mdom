import { MElement } from './m-node';
import { Note } from './note';
import { resolveMembers, resolvePartner, noteMarkers, type SpannerSpec } from './spanner';

export type WavyLineType = 'start' | 'stop' | 'continue';

// A <wavy-line> inside <notations><ornaments> (trills, etc.). Paired start/stop
// by `number` like every spanner.
export class WavyLine extends MElement {
  constructor() {
    super('wavy-line');
  }

  get number(): string {
    return this.getAttribute('number') ?? '1';
  }

  get wavyLineType(): WavyLineType | null {
    return this.getAttribute('type') as WavyLineType | null;
  }

  get note(): Note | null {
    return this.closest(Note);
  }

  partner(): WavyLine | null {
    return resolvePartner(this, this.spec());
  }

  // All markers in this spanner (start..stop), not just the far end.
  members(): WavyLine[] {
    return resolveMembers(this, this.spec());
  }

  measureBeat(): number | null {
    return this.note?.measureBeat() ?? null;
  }

  private spec(): SpannerSpec<WavyLine> {
    return {
      siblings: noteMarkers(this, (note) => note.wavyLines),
      isOpen: (wavyLine) => wavyLine.wavyLineType === 'start',
      isClose: (wavyLine) => wavyLine.wavyLineType === 'stop',
    };
  }
}
