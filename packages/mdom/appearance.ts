import { MElement } from "./m-element";
import { insertMetadata } from "./score-metadata";

/** Canonical child order of the MusicXML `<appearance>` sequence. */
const ORDER = [
	"line-width",
	"note-size",
	"distance",
	"glyph",
	"other-appearance",
];

/** Which notes a `<note-size>` sizes: cue, grace, grace-cue or large. */
export type NoteSizeType = "cue" | "grace" | "grace-cue" | "large";

/** One typed value in `<appearance>`: its `type` attribute and its number. */
export interface AppearanceValue<T extends string = string> {
	type: T;
	value: number;
}

const NOTE_SIZE_TYPES = new Set(["cue", "grace", "grace-cue", "large"]);

/**
 * The score-wide `<defaults><appearance>`: line thicknesses and standard
 * distances in tenths, and cue/grace/large note sizes as percentages. Each
 * entry is keyed by its `type`, an open token for line widths and distances
 * (`"stem"`, `"light barline"`, `"hyphen"`, `"beam"`, ...). Per-staff drawing
 * lives on `<staff-details>`, not here. `<glyph>` and `<other-appearance>` have
 * no getters but round-trip as written. Setters keep the schema's child order.
 */
export class Appearance extends MElement {
	constructor() {
		super("appearance");
	}

	/** Every `<line-width>` as written, in tenths. */
	get lineWidths(): AppearanceValue[] {
		return this.typedValues("line-width");
	}

	/** The `<line-width>` of `type` in tenths; null when unset. */
	getLineWidth(type: string): number | null {
		return this.numberOf("line-width", type);
	}

	/** Set the `<line-width>` of `type` in tenths, or remove it with null. */
	setLineWidth(type: string, tenths: number | null): void {
		this.setValue("line-width", type, tenths);
	}

	/** Every `<note-size>` as written, as percentages of the regular note size. */
	get noteSizes(): AppearanceValue<NoteSizeType>[] {
		return this.typedValues("note-size").filter(
			(each): each is AppearanceValue<NoteSizeType> =>
				NOTE_SIZE_TYPES.has(each.type),
		);
	}

	/** The `<note-size>` of `type` as a percentage; null when unset. */
	getNoteSize(type: NoteSizeType): number | null {
		return this.numberOf("note-size", type);
	}

	/** Set the `<note-size>` of `type` as a percentage, or remove it with null. */
	setNoteSize(type: NoteSizeType, percent: number | null): void {
		this.setValue("note-size", type, percent);
	}

	/** Every `<distance>` as written, in tenths. */
	get distances(): AppearanceValue[] {
		return this.typedValues("distance");
	}

	/** The `<distance>` of `type` in tenths; null when unset. */
	getDistance(type: string): number | null {
		return this.numberOf("distance", type);
	}

	/** Set the `<distance>` of `type` in tenths, or remove it with null. */
	setDistance(type: string, tenths: number | null): void {
		this.setValue("distance", type, tenths);
	}

	private typedValues(tag: string): AppearanceValue[] {
		return this.childrenNamed(tag).flatMap((node) => {
			const type = node.getAttribute("type");
			const text = node.text;
			return type === null || text == null
				? []
				: [{ type, value: Number(text) }];
		});
	}

	private numberOf(tag: string, type: string): number | null {
		const text = this.entry(tag, type)?.text;
		return text == null ? null : Number(text);
	}

	/** Patch the entry of `type` in place, so its position and other attributes stay. */
	private setValue(tag: string, type: string, value: number | null): void {
		let node = this.entry(tag, type);
		if (value === null) {
			node?.remove();
			return;
		}
		if (!node) {
			node = new MElement(tag);
			node.setAttribute("type", type);
			insertMetadata(this, node, ORDER);
		}
		node.setText(String(value));
	}

	private entry(tag: string, type: string): MElement | null {
		return (
			this.childrenNamed(tag).find(
				(node) => node.getAttribute("type") === type,
			) ?? null
		);
	}
}
