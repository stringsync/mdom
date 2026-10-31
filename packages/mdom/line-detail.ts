import { MElement } from "./m-element";
import { required } from "./m-node";
import { colorOf } from "./print-style";

/** What `setLineDetail` writes onto a `<line-detail>`; `line` comes from the call. */
export interface LineDetailSpec {
	/** Line thickness in tenths. */
	width?: number;
	/** MusicXML `#RRGGBB` or `#AARRGGBB`. */
	color?: string;
	lineType?: "solid" | "dashed" | "dotted" | "wavy";
	/** False hides the line while it still counts for clef and pitch positions. */
	printObject?: boolean;
}

/**
 * A `<line-detail>` inside `<staff-details>`: overrides one staff line's
 * appearance. {@link line} says which line (1 = bottom); {@link width} is its
 * thickness in tenths (null = the default thickness, convert with the score's
 * `scaling`).
 */
export class LineDetail extends MElement {
	constructor() {
		super("line-detail");
	}

	/** The `line` attribute: which staff line (1 = bottom). Required by MusicXML. */
	get line(): number {
		return Number(required(this.getAttribute("line"), "line on <line-detail>"));
	}

	set line(value: number) {
		this.setAttribute("line", String(value));
	}

	/** The `width` attribute in tenths (line thickness); null when unset. */
	get width(): number | null {
		const width = this.getAttribute("width");
		return width == null ? null : Number(width);
	}

	set width(tenths: number) {
		this.setAttribute("width", String(tenths));
	}

	/** The line's `color` as a CSS color; null when unset. */
	get color(): string | null {
		return colorOf(this);
	}

	/** `line-type` (solid/dashed/dotted/wavy); null when unstated. */
	get lineType(): string | null {
		return this.getAttribute("line-type");
	}

	/** Whether the line is drawn (`print-object`); true when unstated. */
	get printObject(): boolean {
		return this.getAttribute("print-object") !== "no";
	}
}
