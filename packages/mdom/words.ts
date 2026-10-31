import { FormattedTextElement } from "./formatted-text";

/**
 * A `<words>` under `<direction-type>`: free text printed over or under the staff
 * ("dolce", "rit.", "Swing"). The font attributes matter to a renderer because a
 * "cresc." in italics and a "Fine" in bold are the same element with different
 * intent, and the width they measure to differs.
 */
export class Words extends FormattedTextElement {
	constructor() {
		super("words");
	}

	/** `font-style` (italic/normal); null when unstated. */
	get fontStyle(): string | null {
		return this.getAttribute("font-style");
	}

	/** `font-weight` (bold/normal); null when unstated. */
	get fontWeight(): string | null {
		return this.getAttribute("font-weight");
	}
}
