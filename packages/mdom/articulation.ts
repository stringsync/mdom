import { MElement } from "./m-element";
import {
	type Position,
	type PositionSpec,
	placementOf,
	positionOf,
	setPositionOf,
} from "./print-style";

/** Every tag this class is registered for, the `<articulations>` children. */
export const ARTICULATION_TAGS = [
	"accent",
	"strong-accent",
	"staccato",
	"tenuto",
	"detached-legato",
	"staccatissimo",
	"spiccato",
	"scoop",
	"plop",
	"doit",
	"falloff",
	"breath-mark",
	"caesura",
	"stress",
	"unstress",
	"soft-accent",
	"other-articulation",
];

/**
 * One child of `<notations><articulations>`: an accent, staccato, breath mark,
 * and so on. MusicXML names the mark by its TAG, so {@link articulationType}
 * identifies it. Read them through {@link Note.articulationMarks}; the bare
 * names stay on {@link Note.articulations}.
 *
 * Like {@link Ornament} it stands in for a whole family of tags, so it keeps
 * `MElement`'s tag-taking constructor: the registry passes the tag it matched.
 */
export class Articulation extends MElement {
	/** Which mark this is, the element's own tag. */
	get articulationType(): string {
		return this.tag;
	}

	/** `placement`; null when unstated. */
	get placement(): "above" | "below" | null {
		return placementOf(this);
	}

	/**
	 * The `smufl` glyph name, which an `other-*` mark gives to say how its free
	 * text draws; null when unset.
	 */
	get smufl(): string | null {
		return this.getAttribute("smufl");
	}

	/** `line-shape` of a scoop, plop, doit or falloff; null when unstated. */
	get lineShape(): "straight" | "curved" | null {
		const shape = this.getAttribute("line-shape");
		return shape === "straight" || shape === "curved" ? shape : null;
	}

	/** `line-type` of a scoop, plop, doit or falloff; null when unstated. */
	get lineType(): "solid" | "dashed" | "dotted" | "wavy" | null {
		const type = this.getAttribute("line-type");
		return type === "solid" ||
			type === "dashed" ||
			type === "dotted" ||
			type === "wavy"
			? type
			: null;
	}

	/** Where this is drawn, in tenths. Layout only: it never moves the onset. */
	get position(): Position {
		return positionOf(this);
	}

	/** Replace the position attributes; null removes them all. */
	setPosition(spec: PositionSpec | null): void {
		setPositionOf(this, spec);
	}
}
