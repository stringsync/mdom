import { MElement } from "./m-element";
import { required } from "./m-node";
import { insertMetadata, setMetadataText } from "./score-metadata";

/**
 * The transpose group shared by `<transpose>` and `<part-transpose>`. Reads are
 * as DECLARED: an absent `<diatonic>` or `<octave-change>` reads null, not 0,
 * so a round trip writes back exactly what came in. Setters keep schema order.
 *
 * This is metadata about the written notes, never a rewrite of them: setting a
 * transposition leaves every `<pitch>` as it was. It is also unrelated to
 * {@link Clef.octaveChange}, which changes where a clef's notes are drawn.
 */
export abstract class TransposeGroup extends MElement {
	/** `<diatonic>`: steps from written to sounding pitch; null when unstated. */
	get diatonic(): number | null {
		const diatonic = this.child("diatonic")?.text;
		return diatonic == null ? null : Number(diatonic);
	}

	/** Set `<diatonic>`, or remove it with null. */
	setDiatonic(steps: number | null): void {
		setMetadataText(
			this,
			"diatonic",
			steps === null ? null : String(steps),
			TRANSPOSE_ORDER,
		);
	}

	/** `<chromatic>`: semitones from written to sounding pitch. Required by the schema. */
	get chromatic(): number {
		return Number(
			required(this.child("chromatic")?.text, `<chromatic> in <${this.tag}>`),
		);
	}

	/** Set `<chromatic>`. */
	setChromatic(semitones: number): void {
		setMetadataText(this, "chromatic", String(semitones), TRANSPOSE_ORDER);
	}

	/** `<octave-change>`: octaves added on top of the interval; null when unstated. */
	get octaveChange(): number | null {
		const octaves = this.child("octave-change")?.text;
		return octaves == null ? null : Number(octaves);
	}

	/** Set `<octave-change>`, or remove it with null. */
	setOctaveChange(octaves: number | null): void {
		setMetadataText(
			this,
			"octave-change",
			octaves === null ? null : String(octaves),
			TRANSPOSE_ORDER,
		);
	}

	/**
	 * `<double>`: the written music is doubled an octave `above` or `below`; null
	 * when not doubled. A `<double>` without `above="yes"` is `below`.
	 */
	get double(): TransposeDouble | null {
		const double = this.child("double");
		if (!double) {
			return null;
		}
		return double.getAttribute("above") === "yes" ? "above" : "below";
	}

	/** Set `<double>`, or remove it with null. `below` writes the bare element. */
	setDouble(direction: TransposeDouble | null): void {
		this.child("double")?.remove();
		if (direction === null) {
			return;
		}
		const double = new MElement("double");
		if (direction === "above") {
			double.setAttribute("above", "yes");
		}
		insertMetadata(this, double, TRANSPOSE_ORDER);
	}

	/**
	 * The whole interval in semitones, written to sounding: `chromatic` plus 12 per
	 * `octaveChange`. -2 for a B♭ clarinet, -12 for a guitar. A `<double>` is not
	 * part of it: it adds a second line, not a shift.
	 */
	get semitones(): number {
		return this.chromatic + 12 * (this.octaveChange ?? 0);
	}

	/** Replace every field with `spec`'s, leaving out what it leaves out. */
	setTransposition(spec: TransposeSpec): void {
		this.setDiatonic(spec.diatonic ?? null);
		this.setChromatic(spec.chromatic);
		this.setOctaveChange(spec.octaveChange ?? null);
		this.setDouble(spec.double ?? null);
	}
}

/** Canonical child order of the MusicXML transpose group. */
const TRANSPOSE_ORDER = ["diatonic", "chromatic", "octave-change", "double"];

/**
 * Which way a `<double>` doubles the written music: `below` is the schema
 * default (cello and bass), `above` the flute-and-piccolo case.
 */
export type TransposeDouble = "above" | "below";

/**
 * A transposition as MusicXML spells it: what to add to a WRITTEN pitch to get
 * the SOUNDING one. A B♭ clarinet is `{ diatonic: -1, chromatic: -2 }`; a guitar,
 * written an octave above where it sounds, `{ chromatic: 0, octaveChange: -1 }`.
 * `diatonic` and `chromatic` stay within the octave; `octaveChange` holds the
 * rest. Fields left out are left out of the document.
 */
export interface TransposeSpec {
	/** Steps from written to sounding pitch, for spelling; within the octave. */
	diatonic?: number;
	/** Semitones from written to sounding pitch; within the octave. */
	chromatic: number;
	/** Whole octaves to add on top of `diatonic` and `chromatic`. */
	octaveChange?: number;
	/** The written music is also doubled an octave `above` or `below`. */
	double?: TransposeDouble;
}
