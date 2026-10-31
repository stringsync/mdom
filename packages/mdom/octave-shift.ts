import { Direction } from "./direction";
import { MElement } from "./m-element";
import { required } from "./m-node";
import { appendValue, Measure } from "./measure";
import {
	type DashStyle,
	type DashStyleSpec,
	dashStyleOf,
	type Position,
	type PositionSpec,
	positionOf,
	setDashStyleOf,
	setPositionOf,
} from "./print-style";
import { directionMarkers, Spanner, type SpannerSpec } from "./spanner";

export type OctaveShiftType = "up" | "down" | "stop" | "continue";

/**
 * The printed ottava: 8va/15ma/22ma sound higher than written, 8vb/15mb/22mb
 * lower. MusicXML names these backwards (`down` is 8va), so writers take this.
 */
export type Ottava = "8va" | "8vb" | "15ma" | "15mb" | "22ma" | "22mb";

/** The ottava a start marker prints, or null for a stop or a size mdom has no name for. */
export function ottavaOf(shift: OctaveShift): Ottava | null {
	const type = shift.getAttribute("type");
	return (
		(Object.keys(OTTAVAS) as Ottava[]).find(
			(name) =>
				OTTAVAS[name].type === type && OTTAVAS[name].size === shift.size,
		) ?? null
	);
}

/** Build a `<direction>` holding one `<octave-shift>`; `ottava` null builds the stop. */
export function buildOctaveShiftDirection(
	ottava: Ottava | null,
	number: string,
	staff: string,
): Direction {
	const shift = new OctaveShift();
	if (ottava) {
		shift.setAttribute("type", OTTAVAS[ottava].type);
		shift.setAttribute("size", String(OTTAVAS[ottava].size));
	} else {
		shift.setAttribute("type", "stop");
	}
	shift.setAttribute("number", number);
	const block = new MElement("direction-type");
	block.append(shift);
	const direction = new Direction();
	direction.append(block);
	if (staff !== "1") {
		appendValue(direction, "staff", staff);
	}
	return direction;
}

/**
 * An `<octave-shift>` (ottava) under `<direction-type>`. Direction-attached
 * spanner; `size` is 8/15/22, and it pairs by `number`.
 */
export class OctaveShift extends MElement {
	constructor() {
		super("octave-shift");
	}

	/** Pairing key; '1' when omitted. */
	get number(): string {
		return this.getAttribute("number") ?? "1";
	}

	/** `type`: required on an `<octave-shift>` and drives pairing. */
	get octaveShiftType(): OctaveShiftType {
		return required(
			this.getAttribute("type"),
			"type on <octave-shift>",
		) as OctaveShiftType;
	}

	/** Interval span: 8, 15, or 22. The MusicXML default for an absent size is 8. */
	get size(): number {
		return Number(this.getAttribute("size") ?? 8);
	}

	/** The `<direction>` this marker hangs off of. An attached marker always has one. */
	get direction(): Direction {
		return required(
			this.closest(Direction),
			"<direction> ancestor of <octave-shift>",
		);
	}

	/** The measure this marker sits in. An attached marker always has one. */
	get measure(): Measure {
		return required(
			this.closest(Measure),
			"<measure> ancestor of <octave-shift>",
		);
	}

	/** The printed ottava (8va, 15mb, …) of a start marker; null on a stop. */
	get ottava(): Ottava | null {
		return ottavaOf(this);
	}

	/** `line-type` (solid/dashed/dotted/wavy), the stroke to draw; null when unstated. */
	get lineType(): string | null {
		return this.getAttribute("line-type");
	}

	/** The marker at the far end (same number), or null. */
	get partner(): OctaveShift | null {
		return new Spanner(this.spec()).partnerOf(this);
	}

	/** All markers in this spanner (start..stop), not just the far end. */
	get members(): OctaveShift[] {
		return new Spanner(this.spec()).membersOf(this);
	}

	/** Onset of this marker's direction within its measure, in beats. */
	get measureBeat(): number | null {
		return this.direction.measureBeat;
	}

	private spec(): SpannerSpec<OctaveShift> {
		return {
			siblings: directionMarkers(
				this,
				(direction) => direction.octaveShifts,
				"octaveShifts",
			),
			// Raw reads so resolution tolerates a malformed typeless marker.
			isOpen: (shift) =>
				shift.getAttribute("type") === "up" ||
				shift.getAttribute("type") === "down",
			isClose: (shift) => shift.getAttribute("type") === "stop",
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

	/** The dash and space lengths of a dashed stroke, in tenths. */
	get dashStyle(): DashStyle {
		return dashStyleOf(this);
	}

	/** Replace the dash lengths; omitted fields (or all, with null) are removed. */
	setDashStyle(spec: DashStyleSpec | null): void {
		setDashStyleOf(this, spec);
	}
}

const OTTAVAS: Record<Ottava, { type: "up" | "down"; size: number }> = {
	"8va": { type: "down", size: 8 },
	"8vb": { type: "up", size: 8 },
	"15ma": { type: "down", size: 15 },
	"15mb": { type: "up", size: 15 },
	"22ma": { type: "down", size: 22 },
	"22mb": { type: "up", size: 22 },
};
