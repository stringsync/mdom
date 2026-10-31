import { MElement } from "./m-element";
import { required } from "./m-node";

/**
 * A `<frame-note>`: one dot in a fretboard diagram, a string stopped at a fret,
 * optionally under a barre. Strings and frets are required by the spec, so their
 * absence throws (fret 0 = open must stay distinct from a missing fret).
 */
export class FrameNote extends MElement {
	constructor() {
		super("frame-note");
	}

	/** `<string>`: 1 = highest-pitched string. */
	get string(): number {
		return Number(
			required(this.child("string")?.text, "<string> in <frame-note>"),
		);
	}

	/** `<fret>`: 0 = open string. */
	get fret(): number {
		return Number(required(this.child("fret")?.text, "<fret> in <frame-note>"));
	}

	/** `<fingering>`: the finger that stops this dot (`1`-`4`, `T`); null when unmarked. */
	get fingering(): string | null {
		return this.child("fingering")?.text ?? null;
	}

	/** The `type` of the `<barre>` child (a barre spanning strings), or null when there is none. */
	get barre(): "start" | "stop" | null {
		const type = this.child("barre")?.getAttribute("type");
		return type === "start" || type === "stop" ? type : null;
	}
}

/** A `<frame-note>` to write: one string stopped at a fret, optionally under a barre. */
export interface FrameNoteSpec {
	string: number;
	fret: number;
	/** `<fingering>`: the finger printed on the dot. */
	fingering?: string;
	barre?: "start" | "stop";
}
