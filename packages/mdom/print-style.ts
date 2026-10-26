import type { MElement } from './m-node';
import { setOrRemove } from './text-format';

/**
 * The MusicXML `color` of `element`, normalized to a CSS color. MusicXML writes
 * `"#RRGGBB"` or `"#AARRGGBB"` — alpha FIRST, which CSS and canvas read as
 * `#RRGGBBAA` — so the eight-digit form drops its alpha rather than handing a
 * renderer the wrong color. Null when unset, or when `element` is null (so a
 * caller can pass an optional child straight in).
 */
export function colorOf(element: MElement | null | undefined): string | null {
	const color = element?.getAttribute('color');
	if (color == null) {
		return null;
	}
	return /^#[0-9a-fA-F]{8}$/.test(color) ? `#${color.slice(3)}` : color;
}

/**
 * The MusicXML `placement` of `element`: above or below the staff. Null when
 * unstated — the default is the renderer's choice, so mdom doesn't pick one.
 */
export function placementOf(
	element: MElement | null | undefined,
): 'above' | 'below' | null {
	const placement = element?.getAttribute('placement');
	return placement === 'above' || placement === 'below' ? placement : null;
}

/**
 * The MusicXML `position` attribute group, in tenths (convert with the score's
 * `scaling`). `defaultX`/`defaultY` move the origin the application computes,
 * `relativeX`/`relativeY` nudge from it; each is null when unstated, which
 * leaves the layout to the renderer. Geometry only: none of it moves the onset.
 */
export interface Position {
	defaultX: number | null;
	defaultY: number | null;
	relativeX: number | null;
	relativeY: number | null;
}

/** The position attributes to write, in tenths; an omitted field is left unstated. */
export interface PositionSpec {
	defaultX?: number;
	defaultY?: number;
	relativeX?: number;
	relativeY?: number;
}

/** The position attributes of `element`; all null when it is null. */
export function positionOf(element: MElement | null | undefined): Position {
	return {
		defaultX: numberOf(element, 'default-x'),
		defaultY: numberOf(element, 'default-y'),
		relativeX: numberOf(element, 'relative-x'),
		relativeY: numberOf(element, 'relative-y'),
	};
}

/**
 * Replace the position attributes of `element` with `spec`: fields it omits
 * are removed. Null removes them all, handing the layout back to the renderer.
 */
export function setPositionOf(
	element: MElement,
	spec: PositionSpec | null,
): void {
	setNumber(element, 'default-x', spec?.defaultX);
	setNumber(element, 'default-y', spec?.defaultY);
	setNumber(element, 'relative-x', spec?.relativeX);
	setNumber(element, 'relative-y', spec?.relativeY);
}

/** A MusicXML `line-type`: the stroke a line or curve is drawn with. */
export type LineType = 'solid' | 'dashed' | 'dotted' | 'wavy';

/**
 * How a line is drawn: its `line-type` and, for dashed lines, the
 * `dash-length` and `space-length` in tenths. Each is null when unstated.
 */
export interface LineStyle {
	type: LineType | null;
	dashLength: number | null;
	spaceLength: number | null;
}

/** The line style to write; an omitted field is left unstated. */
export interface LineStyleSpec {
	type?: LineType;
	dashLength?: number;
	spaceLength?: number;
}

/** The `line-type` of `element`; null when absent or unrecognized. */
export function lineTypeOf(
	element: MElement | null | undefined,
): LineType | null {
	const type = element?.getAttribute('line-type');
	return type === 'solid' ||
		type === 'dashed' ||
		type === 'dotted' ||
		type === 'wavy'
		? type
		: null;
}

/** The line style attributes of `element`. */
export function lineStyleOf(element: MElement): LineStyle {
	return {
		type: lineTypeOf(element),
		dashLength: numberOf(element, 'dash-length'),
		spaceLength: numberOf(element, 'space-length'),
	};
}

/** Replace the line style attributes of `element`; null removes them all. */
export function setLineStyleOf(
	element: MElement,
	spec: LineStyleSpec | null,
): void {
	setOrRemove(element, 'line-type', spec?.type);
	setNumber(element, 'dash-length', spec?.dashLength);
	setNumber(element, 'space-length', spec?.spaceLength);
}

/**
 * The MusicXML `bezier` attribute group of a `<slur>` or `<tied>`: the control
 * point leaving a start marker, or entering a stop or continue marker, as
 * `x`/`y` in tenths relative to the marker's position; `x2`/`y2` are the point
 * leaving a continue marker. `offset`/`offset2` are in divisions, like
 * `<offset>`, and only place the curve: they never move an onset. Each field
 * is null when unstated, leaving the curve's shape to the renderer.
 */
export interface Bezier {
	x: number | null;
	y: number | null;
	x2: number | null;
	y2: number | null;
	offset: number | null;
	offset2: number | null;
}

/** The Bezier attributes to write; an omitted field is left unstated. */
export interface BezierSpec {
	x?: number;
	y?: number;
	x2?: number;
	y2?: number;
	offset?: number;
	offset2?: number;
}

/** The Bezier attributes of `element`. */
export function bezierOf(element: MElement): Bezier {
	return {
		x: numberOf(element, 'bezier-x'),
		y: numberOf(element, 'bezier-y'),
		x2: numberOf(element, 'bezier-x2'),
		y2: numberOf(element, 'bezier-y2'),
		offset: numberOf(element, 'bezier-offset'),
		offset2: numberOf(element, 'bezier-offset2'),
	};
}

/** Replace the Bezier attributes of `element`; null removes them all. */
export function setBezierOf(element: MElement, spec: BezierSpec | null): void {
	setNumber(element, 'bezier-x', spec?.x);
	setNumber(element, 'bezier-y', spec?.y);
	setNumber(element, 'bezier-x2', spec?.x2);
	setNumber(element, 'bezier-y2', spec?.y2);
	setNumber(element, 'bezier-offset', spec?.offset);
	setNumber(element, 'bezier-offset2', spec?.offset2);
}

/**
 * A slur or tie's `orientation`: `over` (overhand, tips down) or `under`
 * (underhand, tips up). Null when unstated or unrecognized.
 */
export function orientationOf(element: MElement): 'over' | 'under' | null {
	const orientation = element.getAttribute('orientation');
	return orientation === 'over' || orientation === 'under' ? orientation : null;
}

/**
 * A yes-no attribute of `element` as a boolean, `fallback` when unstated or
 * unrecognized.
 */
export function yesNoOf(
	element: MElement,
	name: string,
	fallback: boolean,
): boolean {
	const value = element.getAttribute(name);
	if (value === 'yes' || value === 'no') {
		return value === 'yes';
	}
	return fallback;
}

/** Write a yes-no attribute, or remove it with null. */
export function setYesNo(
	element: MElement,
	name: string,
	value: boolean | null,
): void {
	if (value === null) {
		element.removeAttribute(name);
	} else {
		element.setAttribute(name, value ? 'yes' : 'no');
	}
}

/** A numeric attribute; null when absent or not a number. */
export function numberOf(
	element: MElement | null | undefined,
	name: string,
): number | null {
	const text = element?.getAttribute(name);
	if (text == null || text.trim() === '') {
		return null;
	}
	const value = Number(text);
	return Number.isNaN(value) ? null : value;
}

function setNumber(
	element: MElement,
	name: string,
	value: number | null | undefined,
): void {
	setOrRemove(element, name, value == null ? null : String(value));
}
