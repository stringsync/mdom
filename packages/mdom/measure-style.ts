import { MElement } from "./m-element";
import type { NoteType } from "./note";

export type MeasureStyleKind =
	| "multiple-rest"
	| "measure-repeat"
	| "beat-repeat"
	| "slash";
export type StatefulMeasureStyleKind = Exclude<
	MeasureStyleKind,
	"multiple-rest"
>;
export type MeasureStyleType = "start" | "stop";
/** MusicXML graphical durations, including values beyond Note's duration writer. */
export type SlashType =
	| NoteType
	| "maxima"
	| "long"
	| "breve"
	| "256th"
	| "512th"
	| "1024th";

interface SlashDisplaySpec {
	slashType?: SlashType;
	dots?: number;
	exceptVoices?: readonly string[];
	useDots?: boolean;
}

/** One notation declaration. Omitted options stay absent in MusicXML. */
export type MeasureStyleSpec = { staff?: string } & (
	| { kind: "multiple-rest"; count: number; useSymbols?: boolean }
	| {
			kind: "measure-repeat";
			type: MeasureStyleType;
			count?: number;
			slashes?: number;
	  }
	| ({
			kind: "beat-repeat";
			type: MeasureStyleType;
			slashes?: number;
	  } & SlashDisplaySpec)
	| ({
			kind: "slash";
			type: MeasureStyleType;
			useStems?: boolean;
	  } & SlashDisplaySpec)
);

/** A declared style, not an expansion of the music or a barline repeat. */
export class MeasureStyle extends MElement {
	constructor() {
		super("measure-style");
	}

	get notation(): MElement | null {
		return (
			this.child("multiple-rest") ??
			this.child("measure-repeat") ??
			this.child("beat-repeat") ??
			this.child("slash")
		);
	}

	get kind(): MeasureStyleKind | null {
		return (this.notation?.tag as MeasureStyleKind | undefined) ?? null;
	}

	/** Written staff number; null when absent (applies to all staves). */
	get staff(): string | null {
		return this.getAttribute("number");
	}

	get type(): MeasureStyleType | null {
		const value = this.notation?.getAttribute("type");
		return value === "start" || value === "stop" ? value : null;
	}

	/** Multiple-rest extent or measure-repeat pattern length; null for empty stops. */
	get count(): number | null {
		if (this.kind !== "multiple-rest" && this.kind !== "measure-repeat") {
			return null;
		}
		const text = this.notation?.text?.trim();
		return text ? Number(text) : null;
	}

	get slashes(): number | null {
		const value = this.notation?.getAttribute("slashes");
		return value == null ? null : Number(value);
	}

	get useSymbols(): boolean | null {
		return this.yesNo("use-symbols");
	}
	get useStems(): boolean | null {
		return this.yesNo("use-stems");
	}
	get useDots(): boolean | null {
		return this.yesNo("use-dots");
	}

	/** Written graphical duration; no time-signature default is supplied. */
	get slashType(): SlashType | null {
		return (
			(this.notation?.child("slash-type")?.text as SlashType | undefined) ??
			null
		);
	}

	get dots(): number {
		return this.notation?.childrenNamed("slash-dot").length ?? 0;
	}
	get exceptVoices(): string[] {
		return (
			this.notation
				?.childrenNamed("except-voice")
				.map((node) => node.text ?? "") ?? []
		);
	}

	private yesNo(name: string): boolean | null {
		const value = this.notation?.getAttribute(name);
		if (value === "yes") {
			return true;
		}
		if (value === "no") {
			return false;
		}
		return null;
	}
}

/** Build before attaching, so invalid display specs leave the measure untouched. */
export function buildMeasureStyle(spec: MeasureStyleSpec): MeasureStyle {
	const positive = (value: number, name: string) => {
		if (!Number.isInteger(value) || value < 1) {
			throw new Error(`${name} must be a positive integer`);
		}
	};
	if (spec.staff !== undefined) {
		positive(Number(spec.staff), "staff");
	}
	if ("count" in spec && spec.count !== undefined) {
		positive(spec.count, "count");
	}
	if ("slashes" in spec && spec.slashes !== undefined) {
		positive(spec.slashes, "slashes");
	}
	if ("dots" in spec && spec.dots !== undefined) {
		if (!Number.isInteger(spec.dots) || spec.dots < 0) {
			throw new Error("dots must be a nonnegative integer");
		}
		if (spec.dots > 0 && spec.slashType === undefined) {
			throw new Error("slash dots require slashType");
		}
	}
	const style = new MeasureStyle();
	if (spec.staff !== undefined) {
		style.setAttribute("number", spec.staff);
	}
	const node = new MElement(spec.kind);
	style.append(node);
	if ("type" in spec) {
		node.setAttribute("type", spec.type);
	}
	if ("count" in spec && spec.count !== undefined) {
		node.setText(String(spec.count));
	}

	const attribute = (name: string, value: number | boolean | undefined) => {
		if (value === undefined) {
			return;
		}
		let text = String(value);
		if (typeof value === "boolean") {
			text = value ? "yes" : "no";
		}
		node.setAttribute(name, text);
	};
	if ("slashes" in spec) {
		attribute("slashes", spec.slashes);
	}
	if ("useSymbols" in spec) {
		attribute("use-symbols", spec.useSymbols);
	}
	if ("useStems" in spec) {
		attribute("use-stems", spec.useStems);
	}
	if ("useDots" in spec) {
		attribute("use-dots", spec.useDots);
	}

	if ("slashType" in spec && spec.slashType !== undefined) {
		const type = new MElement("slash-type");
		type.setText(spec.slashType);
		node.append(type);
	}
	if ("dots" in spec) {
		for (let i = 0; i < (spec.dots ?? 0); i++) {
			node.append(new MElement("slash-dot"));
		}
	}
	if ("exceptVoices" in spec) {
		for (const voice of spec.exceptVoices ?? []) {
			const except = new MElement("except-voice");
			except.setText(voice);
			node.append(except);
		}
	}
	return style;
}
