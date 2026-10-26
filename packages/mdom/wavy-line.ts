import { MElement, required } from './m-node';
import { Note } from './note';
import {
	type Position,
	type PositionSpec,
	positionOf,
	setPositionOf,
} from './print-style';
import { noteMarkers, Spanner, type SpannerSpec } from './spanner';

export type WavyLineType = 'start' | 'stop' | 'continue';

/**
 * A `<wavy-line>` inside `<notations><ornaments>` (trills, etc.). Paired
 * start/stop by `number` like every spanner.
 */
export class WavyLine extends MElement {
	constructor() {
		super('wavy-line');
	}

	/** Pairing key; '1' when omitted. */
	get number(): string {
		return this.getAttribute('number') ?? '1';
	}

	/** `type`: required on a `<wavy-line>` and drives pairing. */
	get wavyLineType(): WavyLineType {
		return required(
			this.getAttribute('type'),
			'type on <wavy-line>',
		) as WavyLineType;
	}

	/** The note this marker hangs off of. An attached marker always has one. */
	get note(): Note {
		return required(this.closest(Note), '<note> ancestor of <wavy-line>');
	}

	/** The marker at the far end (same number), or null. */
	get partner(): WavyLine | null {
		return new Spanner(this.spec()).partnerOf(this);
	}

	/** All markers in this spanner (start..stop), not just the far end. */
	get members(): WavyLine[] {
		return new Spanner(this.spec()).membersOf(this);
	}

	/** Remove this marker and its partner so neither end dangles. */
	unlink(): void {
		new Spanner(this.spec()).removeSpan(this);
	}

	/** Onset of this marker's note within its measure, in beats. */
	get measureBeat(): number | null {
		return this.note.measureBeat;
	}

	private spec(): SpannerSpec<WavyLine> {
		return {
			siblings: noteMarkers(this, (note) => note.wavyLines, 'wavyLines'),
			// Raw reads so resolution tolerates a malformed typeless marker.
			isOpen: (wavyLine) => wavyLine.getAttribute('type') === 'start',
			isClose: (wavyLine) => wavyLine.getAttribute('type') === 'stop',
		};
	}
	/** Where this is drawn, in tenths. Layout only: it never moves the onset. */
	get position(): Position {
		return positionOf(this);
	}

	/** Replace the position attributes; null removes them all. */
	setPosition(spec: PositionSpec | null): void {
		setPositionOf(this, spec);
	}
}
