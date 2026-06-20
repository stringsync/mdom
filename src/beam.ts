import { MElement } from './m-node';
import { Note } from './note';
import { resolveMembers, resolvePartner, noteMarkers, type SpannerSpec } from './spanner';

export type BeamValue = 'begin' | 'continue' | 'end' | 'forward hook' | 'backward hook';

// A <beam> directly under <note>. `number` is the beam level (1 = eighth-note
// beam, 2 = sixteenth, ...); each level pairs begin/end like any spanner. The
// value is element text, not an attribute.
export class Beam extends MElement {
  constructor() {
    super('beam');
  }

  // Beam level; '1' when omitted.
  get number(): string {
    return this.getAttribute('number') ?? '1';
  }

  get beamValue(): BeamValue | null {
    return this.text as BeamValue | null;
  }

  get note(): Note | null {
    return this.closest(Note);
  }

  partner(): Beam | null {
    return resolvePartner(this, this.spec());
  }

  // Every marker in this spanner in order — begin, any continues, end. partner()
  // is just the far end; members() is the whole span (e.g. a 3-note beam group).
  members(): Beam[] {
    return resolveMembers(this, this.spec());
  }

  measureBeat(): number | null {
    return this.note?.measureBeat() ?? null;
  }

  private spec(): SpannerSpec<Beam> {
    return {
      siblings: noteMarkers(this, (note) => note.beams),
      isOpen: (beam) => beam.beamValue === 'begin',
      isClose: (beam) => beam.beamValue === 'end',
    };
  }
}
