import { Figure } from "./figure";
import { MElement } from "./m-element";
import { adjacentNote, type Note } from "./note";
import { placementOf } from "./print-style";

/**
 * A `<figured-bass>`: the continuo numerals stacked under a bass note. It sits
 * between notes in the measure like a `<harmony>` does, and binds to the note it
 * decorates the same way, see {@link nextNote}.
 */
export class FiguredBass extends MElement {
	constructor() {
		super("figured-bass");
	}

	/** The stack, top figure first (document order). */
	get figures(): Figure[] {
		return this.childrenOfType(Figure);
	}

	/** The `parentheses="yes"` attribute, the whole stack is printed in brackets. */
	get parentheses(): boolean {
		return this.getAttribute("parentheses") === "yes";
	}

	/** `placement`; null when unstated. */
	get placement(): "above" | "below" | null {
		return placementOf(this);
	}

	/**
	 * The note this stack sits under, the nearest non-`<chord/>` note after it,
	 * the same binding {@link Harmony.nextNote} uses.
	 */
	get nextNote(): Note | null {
		return adjacentNote(this, 1);
	}
}
