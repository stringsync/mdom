import { MElement, required } from './m-node';
import { insertMetadata, setMetadataText } from './score-metadata';

/** Canonical child order of the MusicXML transpose group. */
const TRANSPOSE_ORDER = ['diatonic', 'chromatic', 'octave-change', 'double'];

/** Canonical child order of the MusicXML clef group, as `<part-clef>` uses it. */
const CLEF_ORDER = ['sign', 'line', 'clef-octave-change'];

/** Canonical child order of `<for-part>`. */
const FOR_PART_ORDER = ['part-clef', 'part-transpose'];

/**
 * Which way a `<double>` doubles the written music: `below` is the schema
 * default (cello and bass), `above` the flute-and-piccolo case.
 */
export type TransposeDouble = 'above' | 'below';

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

/** A `<part-clef>`, as the clef group spells it. */
export interface PartClefSpec {
	sign: string;
	line?: number;
	octaveChange?: number;
}

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
		const diatonic = this.child('diatonic')?.text;
		return diatonic == null ? null : Number(diatonic);
	}

	/** Set `<diatonic>`, or remove it with null. */
	setDiatonic(steps: number | null): void {
		setMetadataText(
			this,
			'diatonic',
			steps === null ? null : String(steps),
			TRANSPOSE_ORDER,
		);
	}

	/** `<chromatic>`: semitones from written to sounding pitch. Required by the schema. */
	get chromatic(): number {
		return Number(
			required(this.child('chromatic')?.text, `<chromatic> in <${this.tag}>`),
		);
	}

	/** Set `<chromatic>`. */
	setChromatic(semitones: number): void {
		setMetadataText(this, 'chromatic', String(semitones), TRANSPOSE_ORDER);
	}

	/** `<octave-change>`: octaves added on top of the interval; null when unstated. */
	get octaveChange(): number | null {
		const octaves = this.child('octave-change')?.text;
		return octaves == null ? null : Number(octaves);
	}

	/** Set `<octave-change>`, or remove it with null. */
	setOctaveChange(octaves: number | null): void {
		setMetadataText(
			this,
			'octave-change',
			octaves === null ? null : String(octaves),
			TRANSPOSE_ORDER,
		);
	}

	/**
	 * `<double>`: the written music is doubled an octave `above` or `below`; null
	 * when not doubled. A `<double>` without `above="yes"` is `below`.
	 */
	get double(): TransposeDouble | null {
		const double = this.child('double');
		if (!double) {
			return null;
		}
		return double.getAttribute('above') === 'yes' ? 'above' : 'below';
	}

	/** Set `<double>`, or remove it with null. `below` writes the bare element. */
	setDouble(direction: TransposeDouble | null): void {
		this.child('double')?.remove();
		if (direction === null) {
			return;
		}
		const double = new MElement('double');
		if (direction === 'above') {
			double.setAttribute('above', 'yes');
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

/**
 * A `<transpose>` inside `<attributes>`: how the part's written pitches relate
 * to sounding ones, from here until the next declaration for its staff. A
 * numberless one applies to every staff of the part. Read it in effect with
 * {@link Measure.getTranspose} or {@link Note.transpose}.
 */
export class Transpose extends TransposeGroup {
	constructor() {
		super('transpose');
	}

	/** The staff this applies to; null when numberless, which means every staff. */
	get staff(): string | null {
		return this.getAttribute('number');
	}
}

/**
 * A `<part-transpose>` inside `<for-part>`: the transposition a transposed part
 * created from a concert score would use. Same fields as {@link Transpose}.
 */
export class PartTranspose extends TransposeGroup {
	constructor() {
		super('part-transpose');
	}
}

/**
 * A `<part-clef>` inside `<for-part>`: the clef a transposed part created from
 * a concert score switches to, as for a bass clarinet read in treble clef.
 */
export class PartClef extends MElement {
	constructor() {
		super('part-clef');
	}

	/** `<sign>`. Required by the schema. */
	get sign(): string {
		return required(this.child('sign')?.text, '<sign> in <part-clef>');
	}

	/** `<line>`; null when unstated, its default depending on the sign. */
	get line(): number | null {
		const line = this.child('line')?.text;
		return line == null ? null : Number(line);
	}

	/** `<clef-octave-change>`; null when unstated. */
	get octaveChange(): number | null {
		const octaves = this.child('clef-octave-change')?.text;
		return octaves == null ? null : Number(octaves);
	}
}

/**
 * A `<for-part>` inside `<attributes>` of a concert score: how a transposed part
 * created from it is to be written. The concert score itself stays at sounding
 * pitch; this only declares the alternate. A numberless one applies to every
 * staff of the created part.
 */
export class ForPart extends MElement {
	constructor() {
		super('for-part');
	}

	/** The staff this applies to; null when numberless, which means every staff. */
	get staff(): string | null {
		return this.getAttribute('number');
	}

	/** `<part-clef>`; null when the created part keeps the score's clef. */
	get partClef(): PartClef | null {
		return this.childrenOfType(PartClef)[0] ?? null;
	}

	/** Set `<part-clef>`, or remove it with null. */
	setPartClef(spec: PartClefSpec | null): PartClef | null {
		this.partClef?.remove();
		if (spec === null) {
			return null;
		}
		const clef = new PartClef();
		setMetadataText(clef, 'sign', spec.sign, CLEF_ORDER);
		if (spec.line != null) {
			setMetadataText(clef, 'line', String(spec.line), CLEF_ORDER);
		}
		if (spec.octaveChange != null) {
			setMetadataText(
				clef,
				'clef-octave-change',
				String(spec.octaveChange),
				CLEF_ORDER,
			);
		}
		insertMetadata(this, clef, FOR_PART_ORDER);
		return clef;
	}

	/** `<part-transpose>`. Required by the schema. */
	get partTranspose(): PartTranspose {
		return required(
			this.childrenOfType(PartTranspose)[0],
			'<part-transpose> in <for-part>',
		);
	}

	/** Set `<part-transpose>`, replacing any earlier one. */
	setPartTranspose(spec: TransposeSpec): PartTranspose {
		let transpose = this.childrenOfType(PartTranspose)[0];
		if (!transpose) {
			transpose = new PartTranspose();
			insertMetadata(this, transpose, FOR_PART_ORDER);
		}
		transpose.setTransposition(spec);
		return transpose;
	}
}

/** A `<transpose>` element built from `spec`, detached. */
export function buildTranspose(spec: TransposeSpec, staff?: string): Transpose {
	const transpose = new Transpose();
	if (staff != null) {
		transpose.setAttribute('number', staff);
	}
	transpose.setTransposition(spec);
	return transpose;
}

/** A `<for-part>` element built from `spec`, detached. */
export function buildForPart(spec: ForPartSpec, staff?: string): ForPart {
	const forPart = new ForPart();
	if (staff != null) {
		forPart.setAttribute('number', staff);
	}
	if (spec.clef) {
		forPart.setPartClef(spec.clef);
	}
	forPart.setPartTranspose(spec.transpose);
	return forPart;
}

/** What a `<for-part>` declares: the created part's transposition and clef. */
export interface ForPartSpec {
	/** The created part's clef, when it changes (a bass clarinet's treble clef). */
	clef?: PartClefSpec;
	transpose: TransposeSpec;
}

/**
 * Whether `transpose` shifts pitch class, which a concert score may not state
 * on a `<transpose>`: non-zero `<diatonic>` or `<chromatic>`. Octave shifts and
 * doublings are allowed there.
 */
export function shiftsPitchClass(transpose: TransposeGroup): boolean {
	return (transpose.diatonic ?? 0) !== 0 || transpose.chromatic !== 0;
}
