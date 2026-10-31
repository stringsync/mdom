import type { MElement } from "./m-element";

/** The CSS keyword sizes MusicXML allows in place of a point size. */
export type CssFontSize =
	| "xx-small"
	| "x-small"
	| "small"
	| "medium"
	| "large"
	| "x-large"
	| "xx-large";

/** A MusicXML `font-size`: points, or a CSS keyword size. */
export type FontSize = number | CssFontSize;

/** Horizontal text alignment (`justify`, `halign`). */
export type TextAlign = "left" | "center" | "right";

/** Vertical text alignment (`valign`). */
export type TextVerticalAlign = "top" | "middle" | "bottom" | "baseline";

/**
 * The MusicXML `font` attribute group as read. Each field is null when that
 * attribute is absent, which means inherited: from the score's `<defaults>`
 * fonts, and past those from the application.
 */
export interface Font {
	/** A comma-separated list of family names, or a generic family (`serif`). */
	family: string | null;
	size: FontSize | null;
	style: "normal" | "italic" | null;
	weight: "normal" | "bold" | null;
}

/** The font attributes to write; an omitted field is left to inheritance. */
export interface FontSpec {
	family?: string;
	size?: FontSize;
	style?: "normal" | "italic";
	weight?: "normal" | "bold";
}

/** The explicit font attributes of `element`; all null when it is null. */
// vet-ignore noop-objects-over-null: an absent optional child is XML data, passed straight in from child(), not a missing collaborator.
export function fontOf(element: MElement | null | undefined): Font {
	const style = element?.getAttribute("font-style") ?? null;
	const weight = element?.getAttribute("font-weight") ?? null;
	return {
		family: element?.getAttribute("font-family") ?? null,
		size: fontSizeOf(element?.getAttribute("font-size") ?? null),
		style: style === "normal" || style === "italic" ? style : null,
		weight: weight === "normal" || weight === "bold" ? weight : null,
	};
}

/** Whether any font attribute is present. */
export function hasFont(font: Font): boolean {
	return (
		font.family !== null ||
		font.size !== null ||
		font.style !== null ||
		font.weight !== null
	);
}

/**
 * Replace the font attributes of `element` with `spec`: fields it omits are
 * removed, so they inherit again. Null removes them all.
 */
export function setFontOf(element: MElement, spec: FontSpec | null): void {
	setOrRemove(element, "font-family", spec?.family);
	setOrRemove(
		element,
		"font-size",
		spec?.size === undefined ? undefined : String(spec.size),
	);
	setOrRemove(element, "font-style", spec?.style);
	setOrRemove(element, "font-weight", spec?.weight);
}

/** Each field of `explicit`, falling back to `inherited` where it is null. */
export function resolveFont(explicit: Font, inherited: Font | null): Font {
	return {
		family: explicit.family ?? inherited?.family ?? null,
		size: explicit.size ?? inherited?.size ?? null,
		style: explicit.style ?? inherited?.style ?? null,
		weight: explicit.weight ?? inherited?.weight ?? null,
	};
}

/** A `justify` or `halign` value; null when absent or unrecognized. */
export function textAlignOf(
	element: MElement,
	name: "justify" | "halign",
): TextAlign | null {
	const value = element.getAttribute(name);
	return value === "left" || value === "center" || value === "right"
		? value
		: null;
}

/** The `valign` value; null when absent or unrecognized. */
export function verticalAlignOf(element: MElement): TextVerticalAlign | null {
	const value = element.getAttribute("valign");
	return value === "top" ||
		value === "middle" ||
		value === "bottom" ||
		value === "baseline"
		? value
		: null;
}

/** Set attribute `name`, or remove it when `value` is null or undefined. */
export function setOrRemove(
	element: MElement,
	name: string,
	value: string | null | undefined,
): void {
	if (value == null) {
		element.removeAttribute(name);
	} else {
		element.setAttribute(name, value);
	}
}

function fontSizeOf(text: string | null): FontSize | null {
	if (text === null) {
		return null;
	}
	if (CSS_FONT_SIZES.has(text)) {
		return text as CssFontSize;
	}
	const points = Number(text);
	return text.trim() === "" || Number.isNaN(points) ? null : points;
}

/** Which lyrics a `<lyric-font>` or `<lyric-language>` applies to; an absent field matches any. */
export interface LyricTarget {
	/** The lyric `number` (verse). */
	number?: string;
	/** The lyric `name` ("verse", "chorus", …). */
	name?: string;
}

/** A `<defaults><lyric-font>`: the default font of the lyrics it targets. */
export interface LyricFont {
	number: string | null;
	name: string | null;
	font: Font;
}

/** A `<defaults><lyric-language>`: the default `xml:lang` of the lyrics it targets. */
export interface LyricLanguage {
	number: string | null;
	name: string | null;
	language: string;
}

/**
 * The entry among `entries` that applies to the lyric of `verse` and `name`:
 * one whose stated `number` and `name` both match, the most specific winning,
 * then the first written. Null when none applies.
 */
export function lyricDefaultFor<
	T extends { number: string | null; name: string | null },
>(entries: readonly T[], verse: string, name: string | null): T | null {
	let best: T | null = null;
	let bestScore = -1;
	for (const entry of entries) {
		if (
			(entry.number !== null && entry.number !== verse) ||
			(entry.name !== null && entry.name !== name)
		) {
			continue;
		}
		const score =
			(entry.number === null ? 0 : 2) + (entry.name === null ? 0 : 1);
		if (score > bestScore) {
			best = entry;
			bestScore = score;
		}
	}
	return best;
}

const CSS_FONT_SIZES = new Set<string>([
	"xx-small",
	"x-small",
	"small",
	"medium",
	"large",
	"x-large",
	"xx-large",
]);
