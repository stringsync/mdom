import { MElement, required } from './m-node';
import { Note } from './note';
import { Part } from './part';
import {
	type Bezier,
	type BezierSpec,
	bezierOf,
	colorOf,
	type LineStyle,
	type LineStyleSpec,
	type LineType,
	lineStyleOf,
	lineTypeOf,
	orientationOf,
	type Position,
	type PositionSpec,
	positionOf,
	setBezierOf,
	setLineStyleOf,
	setPositionOf,
} from './print-style';
import { noteMarkers, Spanner, type SpannerSpec } from './spanner';
import { setOrRemove } from './text-format';

export type TieType = 'start' | 'stop' | 'continue' | 'let-ring';

/**
 * A `<tied>` inside `<notations>` — the notated tie (distinct from the `<tie>`
 * sound element). Paired start/stop by `number`, resolved on demand by
 * {@link partner}, the same shape every spanner uses.
 */
export class Tie extends MElement {
	constructor() {
		super('tied');
	}

	/** Pairing key; '1' when omitted. */
	get number(): string {
		return this.getAttribute('number') ?? '1';
	}

	/** `type`: required on a `<tied>` and drives pairing. */
	get tieType(): TieType {
		return required(this.getAttribute('type'), 'type on <tied>') as TieType;
	}

	/** `line-type` (solid/dashed/dotted/wavy) — the stroke to draw; null when unstated. */
	get lineType(): LineType | null {
		return lineTypeOf(this);
	}

	/** The stroke: `line-type` and the dash and space lengths in tenths. */
	get lineStyle(): LineStyle {
		return lineStyleOf(this);
	}

	/** Replace the stroke attributes; omitted fields (or all, with null) are removed. */
	setLineStyle(spec: LineStyleSpec | null): void {
		setLineStyleOf(this, spec);
	}

	/** `orientation`: over (tips down) or under (tips up); null when unstated. */
	get orientation(): 'over' | 'under' | null {
		return orientationOf(this);
	}

	/** Set `orientation`, or remove it with null. */
	setOrientation(value: 'over' | 'under' | null): void {
		setOrRemove(this, 'orientation', value);
	}

	/**
	 * Where this end of the curve sits, in tenths, as the exporter laid it out.
	 * Layout only: it never moves {@link measureBeat}.
	 */
	get position(): Position {
		return positionOf(this);
	}

	/** Replace the position attributes; null removes them all. */
	setPosition(spec: PositionSpec | null): void {
		setPositionOf(this, spec);
	}

	/**
	 * The Bezier control point at this end of the curve (see {@link Bezier});
	 * all null when the renderer is left to shape it.
	 */
	get bezier(): Bezier {
		return bezierOf(this);
	}

	/** Replace the Bezier attributes; omitted fields (or all, with null) are removed. */
	setBezier(spec: BezierSpec | null): void {
		setBezierOf(this, spec);
	}

	/** The normalized `color`; null when unset. */
	get color(): string | null {
		return colorOf(this);
	}

	/** The note this marker hangs off of. An attached marker always has one. */
	get note(): Note {
		return required(this.closest(Note), '<note> ancestor of <tied>');
	}

	/** The part this marker belongs to. An attached marker always has one. */
	get part(): Part {
		return required(this.closest(Part), '<part> ancestor of <tied>');
	}

	/** The marker at the other end (same number), resolved across the part in onset order. */
	get partner(): Tie | null {
		return new Spanner(this.spec()).partnerOf(this);
	}

	/** All markers in this spanner (start..stop), not just the far end. */
	get members(): Tie[] {
		return new Spanner(this.spec()).membersOf(this);
	}

	/**
	 * Remove this tie: detach both ends (`<tied start>` and its `<tied stop>`) so the
	 * partner isn't orphaned. A let-ring tie, having no partner, just removes itself.
	 */
	unlink(): void {
		new Spanner(this.spec()).removeSpan(this);
	}

	/** Onset of this end within its measure, in beats. */
	get measureBeat(): number | null {
		return this.note.measureBeat;
	}

	private spec(): SpannerSpec<Tie> {
		return {
			siblings: noteMarkers(this, (note) => note.ties, 'ties'),
			// Raw reads so resolution tolerates a malformed typeless marker.
			isOpen: (tie) =>
				tie.getAttribute('type') === 'start' ||
				tie.getAttribute('type') === 'let-ring',
			isClose: (tie) => tie.getAttribute('type') === 'stop',
		};
	}
}
