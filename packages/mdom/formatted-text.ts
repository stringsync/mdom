import { MElement } from './m-node';
import {
	colorOf,
	type Position,
	type PositionSpec,
	positionOf,
	setPositionOf,
} from './print-style';
import type { Score } from './score';
import {
	type Font,
	type FontSpec,
	fontOf,
	resolveFont,
	setFontOf,
	setOrRemove,
	type TextAlign,
	type TextVerticalAlign,
	textAlignOf,
	verticalAlignOf,
} from './text-format';

/**
 * A direction text element (`<words>`, `<rehearsal>`) and the formatting it
 * shares: font and alignment. Reads return only what the element states, null
 * where it inherits; {@link resolvedFont} fills those from the score's
 * `<defaults><word-font>`.
 */
export abstract class FormattedTextElement extends MElement {
	/** The printed text; '' when the element carries none. */
	override get text(): string {
		return super.text ?? '';
	}

	/** The font attributes this element states; a null field inherits. */
	get font(): Font {
		return fontOf(this);
	}

	/**
	 * {@link font} with each unstated field taken from the score's
	 * `<defaults><word-font>`; a field neither states stays null, for the
	 * application to choose.
	 */
	get resolvedFont(): Font {
		return resolveFont(this.font, scoreOf(this)?.wordFont ?? null);
	}

	/** Replace the font attributes; omitted fields (or all, with null) inherit again. */
	setFont(spec: FontSpec | null): void {
		setFontOf(this, spec);
	}

	/** `justify`: how lines of a multi-line text align to each other; null when unstated. */
	get justify(): TextAlign | null {
		return textAlignOf(this, 'justify');
	}

	/** Set `justify`, or remove it with null. */
	setJustify(value: TextAlign | null): void {
		setOrRemove(this, 'justify', value);
	}

	/**
	 * `halign`: which side of the text sits at its x position; null when
	 * unstated, in which case MusicXML has it follow {@link justify}.
	 */
	get halign(): TextAlign | null {
		return textAlignOf(this, 'halign');
	}

	/** Set `halign`, or remove it with null. */
	setHalign(value: TextAlign | null): void {
		setOrRemove(this, 'halign', value);
	}

	/** `valign`: which part of the text sits at its y position; null when unstated. */
	get valign(): TextVerticalAlign | null {
		return verticalAlignOf(this);
	}

	/** Set `valign`, or remove it with null. */
	setValign(value: TextVerticalAlign | null): void {
		setOrRemove(this, 'valign', value);
	}

	/** The normalized `color`; null when unset. */
	get color(): string | null {
		return colorOf(this);
	}

	/** Where the text sits, in tenths; each field null when the renderer places it. */
	get position(): Position {
		return positionOf(this);
	}

	/** Replace the position attributes; null removes them all. */
	setPosition(spec: PositionSpec | null): void {
		setPositionOf(this, spec);
	}
}

/**
 * The `<score-partwise>` holding `element`; null when detached. Climbs by tag,
 * since importing `Score` here would cycle back through the direction types
 * this class is the base of.
 */
function scoreOf(element: MElement): Score | null {
	let node = element.parent;
	while (node && node.tag !== 'score-partwise') {
		node = node.parent;
	}
	return node as Score | null;
}
