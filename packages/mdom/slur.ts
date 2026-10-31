import { MElement } from "./m-element";
import { required } from "./m-node";
import { Note } from "./note";
import { Part } from "./part";
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
} from "./print-style";
import { noteMarkers, Spanner, type SpannerSpec } from "./spanner";
import { setOrRemove } from "./text-format";

export type SlurType = "start" | "stop" | "continue";

/**
 * A `<slur>` marker inside `<notations>`. Slurs, like ties, wedges, pedals, and
 * every other spanner, are NOT tree-shaped: a `start` on one note pairs with a
 * `stop` on a later note, joined by `number`. The pairing is resolved on demand
 * by {@link partner}, not accumulated into ids by a begin/continue/close walk.
 */
export class Slur extends MElement {
	constructor() {
		super("slur");
	}

	/** Pairing key. MusicXML treats an absent slur number as 1. */
	get number(): string {
		return this.getAttribute("number") ?? "1";
	}

	/**
	 * `type`: required on a `<slur>` and drives pairing; absence is a malformed
	 * marker, not an expected state.
	 */
	get slurType(): SlurType {
		return required(this.getAttribute("type"), "type on <slur>") as SlurType;
	}

	/** `placement` (above/below), or null. */
	get placement(): string | null {
		return this.getAttribute("placement");
	}

	/** `line-type` (solid/dashed/dotted/wavy), the stroke to draw; null when unstated. */
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
	get orientation(): "over" | "under" | null {
		return orientationOf(this);
	}

	/** Set `orientation`, or remove it with null. */
	setOrientation(value: "over" | "under" | null): void {
		setOrRemove(this, "orientation", value);
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
		return required(this.closest(Note), "<note> ancestor of <slur>");
	}

	/** The part this marker belongs to. An attached marker always has one. */
	get part(): Part {
		return required(this.closest(Part), "<part> ancestor of <slur>");
	}

	/**
	 * The marker at the other end, resolved across the part in ONSET order (see
	 * {@link Spanner.partnerOf}), preferring an open start in the same voice and
	 * falling back to the oldest one. Document order is not enough: a `<backup>`
	 * writes a later voice's notes after an earlier voice's, so a cross-stave slur's
	 * stop can sit before its start in the file. Spans measures and systems freely.
	 */
	get partner(): Slur | null {
		return new Spanner(this.spec()).partnerOf(this);
	}

	/** All markers in this spanner (start..stop), not just the far end. */
	get members(): Slur[] {
		return new Spanner(this.spec()).membersOf(this);
	}

	/** Onset of this marker's note within its measure, in beats. */
	get measureBeat(): number | null {
		return this.note.measureBeat;
	}

	private spec(): SpannerSpec<Slur> {
		return {
			siblings: noteMarkers(this, (note) => note.slurs, "slurs"),
			// Raw reads so resolution tolerates a malformed typeless marker (skips it)
			// rather than throwing through the strict `slurType` getter.
			isOpen: (slur) => slur.getAttribute("type") === "start",
			isClose: (slur) => slur.getAttribute("type") === "stop",
		};
	}
}
