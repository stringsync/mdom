import type { BeamValue } from "./beam";
import { MElement } from "./m-element";
import type { NoteType } from "./note";
import {
	readTimeModification,
	type TimeModificationSpec,
} from "./time-modification";

/**
 * A `<metronome-note>`: one note of the note-group form of a metronome mark -
 * the "two beamed eighths = a triplet quarter-eighth" swing marking, where each
 * side of the equation is drawn as real notation rather than a `<beat-unit>`.
 */
export class MetronomeNote extends MElement {
	constructor() {
		super("metronome-note");
	}

	/** `<metronome-type>`; 'quarter' when absent. */
	get type(): NoteType {
		return (this.child("metronome-type")?.text ?? "quarter") as NoteType;
	}

	/** `<metronome-dot/>` count. */
	get dots(): number {
		return this.childrenNamed("metronome-dot").length;
	}

	/** `<metronome-beam>` values, document order, how this note beams to its neighbors. */
	get beams(): BeamValue[] {
		return this.childrenNamed("metronome-beam").map(
			(beam) => (beam.text ?? "begin") as BeamValue,
		);
	}

	/** `<metronome-tuplet>`: the ratio this note is compressed by, or null. */
	get tuplet() {
		const node = this.child("metronome-tuplet");
		const ratio = readTimeModification(node);
		if (!node || !ratio) {
			return null;
		}
		return {
			...ratio,
			type: node.getAttribute("type") as "start" | "stop",
			bracket:
				node.getAttribute("bracket") == null
					? null
					: node.getAttribute("bracket") === "yes",
			showNumber: node.getAttribute("show-number") as
				| "actual"
				| "both"
				| "none"
				| null,
		};
	}

	get tied(): "start" | "stop" | null {
		return (
			(this.child("metronome-tied")?.getAttribute("type") as
				| "start"
				| "stop"
				| null) ?? null
		);
	}

	/** Beam levels, retaining an omitted number rather than synthesizing the schema default. */
	get beamDetails(): { value: BeamValue; number: number | null }[] {
		return this.childrenNamed("metronome-beam").map((node) => ({
			value: node.text as BeamValue,
			number:
				node.getAttribute("number") == null
					? null
					: Number(node.getAttribute("number")),
		}));
	}
}

export interface MetronomeNoteSpec {
	type: NoteType;
	dots?: number;
	beams?: (BeamValue | { value: BeamValue; number?: number })[];
	tied?: "start" | "stop";
	tuplet?: TimeModificationSpec & {
		type: "start" | "stop";
		bracket?: boolean;
		showNumber?: "actual" | "both" | "none";
	};
}
