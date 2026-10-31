import { Direction } from "./direction";
import { MElement } from "./m-element";
import { required } from "./m-node";
import { Measure } from "./measure";
import {
	colorOf,
	type LineStyle,
	type LineStyleSpec,
	lineStyleOf,
	numberOf,
	type Position,
	type PositionSpec,
	positionOf,
	setLineStyleOf,
	setPositionOf,
	setYesNo,
	yesNoOf,
} from "./print-style";
import { directionMarkers, Spanner, type SpannerSpec } from "./spanner";
import { setOrRemove } from "./text-format";

export type WedgeType = "crescendo" | "diminuendo" | "stop" | "continue";

/**
 * A `<wedge>` (hairpin) under `<direction-type>`. Like every spanner it pairs
 * start/stop by `number`, but it hangs off a `<direction>`, not a note, so its
 * endpoint is {@link direction}, and its onset comes from {@link measureBeat}.
 */
export class Wedge extends MElement {
	constructor() {
		super("wedge");
	}

	/** Pairing key; '1' when omitted. */
	get number(): string {
		return this.getAttribute("number") ?? "1";
	}

	/** `type`: required on a `<wedge>` and drives pairing. */
	get wedgeType(): WedgeType {
		return required(this.getAttribute("type"), "type on <wedge>") as WedgeType;
	}

	/**
	 * `spread`: the distance between the hairpin's lines at this end, in tenths.
	 * A crescendo usually states 0 at its start and its opening at its stop,
	 * a diminuendo the reverse. Null when unstated, for the renderer to choose.
	 */
	get spread(): number | null {
		return numberOf(this, "spread");
	}

	/** Set `spread` in tenths, or remove it with null. */
	setSpread(tenths: number | null): void {
		setOrRemove(this, "spread", tenths === null ? null : String(tenths));
	}

	/**
	 * `niente`: whether a circle marks the closed end as dal niente or al
	 * niente; false when unstated.
	 */
	get niente(): boolean {
		return yesNoOf(this, "niente", false);
	}

	/** Set `niente`, or remove it with null. */
	setNiente(value: boolean | null): void {
		setYesNo(this, "niente", value);
	}

	/** The stroke: `line-type` and the dash and space lengths in tenths. */
	get lineStyle(): LineStyle {
		return lineStyleOf(this);
	}

	/** Replace the stroke attributes; omitted fields (or all, with null) are removed. */
	setLineStyle(spec: LineStyleSpec | null): void {
		setLineStyleOf(this, spec);
	}

	/**
	 * Where this end of the hairpin sits, in tenths. Layout only: the onset
	 * comes from {@link direction}, never from these.
	 */
	get position(): Position {
		return positionOf(this);
	}

	/** Replace the position attributes; null removes them all. */
	setPosition(spec: PositionSpec | null): void {
		setPositionOf(this, spec);
	}

	/** The normalized `color`; null when unset. */
	get color(): string | null {
		return colorOf(this);
	}

	/**
	 * The `<direction>` this marker hangs off of (direction spanners have no note);
	 * an attached marker always has one.
	 */
	get direction(): Direction {
		return required(this.closest(Direction), "<direction> ancestor of <wedge>");
	}

	/** The measure this marker sits in. An attached marker always has one. */
	get measure(): Measure {
		return required(this.closest(Measure), "<measure> ancestor of <wedge>");
	}

	/** The marker at the far end (same number), or null. */
	get partner(): Wedge | null {
		return new Spanner(this.spec()).partnerOf(this);
	}

	/** All markers in this spanner (start..stop), not just the far end. */
	get members(): Wedge[] {
		return new Spanner(this.spec()).membersOf(this);
	}

	/** Onset of this marker's direction within its measure, in beats. */
	get measureBeat(): number | null {
		return this.direction.measureBeat;
	}

	private spec(): SpannerSpec<Wedge> {
		return {
			siblings: directionMarkers(
				this,
				(direction) => direction.wedges,
				"wedges",
			),
			// Raw reads so resolution tolerates a malformed typeless marker.
			isOpen: (wedge) =>
				wedge.getAttribute("type") === "crescendo" ||
				wedge.getAttribute("type") === "diminuendo",
			isClose: (wedge) => wedge.getAttribute("type") === "stop",
		};
	}
}
