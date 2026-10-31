import { FrameNote, type FrameNoteSpec } from "./frame-note";
import { MElement } from "./m-element";
import { appendValue } from "./measure";

/**
 * A `<frame>`: a fretboard/chord diagram carried by a `<harmony>`. Its overall
 * box {@link width}/{@link height} are layout, in tenths, a renderer reads them
 * to reserve space (convert with the score's `scaling`). The played strings and
 * frets live in separate {@link frameNotes}.
 */
export class Frame extends MElement {
	constructor() {
		super("frame");
	}

	/** `<frame-strings>`: how many strings the diagram spans; 6 (guitar) when absent. */
	get strings(): number {
		const strings = this.child("frame-strings")?.text;
		return strings == null ? 6 : Number(strings);
	}

	/** `<frame-frets>`: how many frets the box is tall; 4 (a common window) when absent. */
	get frets(): number {
		const frets = this.child("frame-frets")?.text;
		// ponytail: 4 is an arbitrary fallback; the spec requires <frame-frets>, so
		// this only fires on malformed input. Widen the default if a real doc needs it.
		return frets == null ? 4 : Number(frets);
	}

	/** `<first-fret>`: the fret the box starts at; null when absent (derive from the notes). */
	get firstFret(): number | null {
		const firstFret = this.child("first-fret")?.text;
		return firstFret == null ? null : Number(firstFret);
	}

	/**
	 * `<first-fret text>`: the start fret as printed (`VII`, `7fr`) when it
	 * differs from the plain number; null when unset.
	 */
	get firstFretText(): string | null {
		return this.child("first-fret")?.getAttribute("text") ?? null;
	}

	/** `<first-fret location>`: the side the start fret prints on; null when unstated. */
	get firstFretLocation(): "left" | "right" | null {
		const location = this.child("first-fret")?.getAttribute("location");
		return location === "left" || location === "right" ? location : null;
	}

	/** The `<frame-note>` dots (each a string/fret), in document order. */
	get frameNotes(): FrameNote[] {
		return this.childrenOfType(FrameNote);
	}

	/**
	 * Append a `<frame-note>` dot. Frames are written strings-first, so this lands
	 * after the `<frame-strings>`/`<frame-frets>`/`<first-fret>` header wherever it
	 * is called, which is the order the schema wants.
	 */
	addFrameNote(spec: FrameNoteSpec): FrameNote {
		const note = new FrameNote();
		appendValue(note, "string", String(spec.string));
		appendValue(note, "fret", String(spec.fret));
		if (spec.fingering != null) {
			appendValue(note, "fingering", spec.fingering);
		}
		if (spec.barre != null) {
			const barre = new MElement("barre");
			barre.setAttribute("type", spec.barre);
			note.append(barre);
		}
		this.append(note);
		return note;
	}

	/** The `width` attribute in tenths; null when unset. */
	get width(): number | null {
		const width = this.getAttribute("width");
		return width == null ? null : Number(width);
	}

	set width(tenths: number) {
		this.setAttribute("width", String(tenths));
	}

	/** The `height` attribute in tenths; null when unset. */
	get height(): number | null {
		const height = this.getAttribute("height");
		return height == null ? null : Number(height);
	}

	set height(tenths: number) {
		this.setAttribute("height", String(tenths));
	}
}

/** Build a detached `<frame>` from a spec, header first then its dots. */
export function buildFrame(spec: FrameSpec): Frame {
	const frame = new Frame();
	appendValue(frame, "frame-strings", String(spec.strings ?? 6));
	appendValue(frame, "frame-frets", String(spec.frets ?? 4));
	if (spec.firstFret != null) {
		const firstFret = appendValue(frame, "first-fret", String(spec.firstFret));
		if (spec.firstFretText != null) {
			firstFret.setAttribute("text", spec.firstFretText);
		}
		if (spec.firstFretLocation != null) {
			firstFret.setAttribute("location", spec.firstFretLocation);
		}
	} else if (spec.firstFretText != null || spec.firstFretLocation != null) {
		throw new Error("mdom: a first-fret text or location needs firstFret");
	}
	for (const note of spec.notes) {
		frame.addFrameNote(note);
	}
	return frame;
}

/** A `<frame>` to write: the box, and the dots in it. */
export interface FrameSpec {
	/** `<frame-strings>`; 6 (guitar) when omitted, matching {@link Frame.strings}. */
	strings?: number;
	/** `<frame-frets>`; 4 when omitted, matching {@link Frame.frets}. */
	frets?: number;
	firstFret?: number;
	/** `<first-fret text>`: how the start fret prints, such as `VII`; needs {@link firstFret}. */
	firstFretText?: string;
	/** `<first-fret location>`: which side of the box it prints on. */
	firstFretLocation?: "left" | "right";
	notes: FrameNoteSpec[];
}
