import { LineDetail, type LineDetailSpec } from './line-detail';
import { MElement } from './m-node';
import { insertMetadata, setMetadataText } from './score-metadata';
import { StaffTuning } from './staff-tuning';

/** Canonical child order of the MusicXML `<staff-details>` sequence. */
const ORDER = [
	'staff-type',
	'staff-lines',
	'line-detail',
	'staff-tuning',
	'capo',
	'staff-size',
];

/** What a staff is for: `regular`, or an ossia, editorial, cue or alternate staff. */
export type StaffType = 'ossia' | 'editorial' | 'cue' | 'alternate' | 'regular';

const STAFF_TYPES = new Set([
	'ossia',
	'editorial',
	'cue',
	'alternate',
	'regular',
]);

/** One open string for `setStaffTunings`, as MusicXML spells it. */
export interface StaffTuningSpec {
	step: string;
	octave: number;
	/** Semitones; left out when 0 or absent. */
	alter?: number;
}

/**
 * A `<staff-details>` inside `<attributes>`: how one staff is drawn — its line
 * count, its string tunings, its size. Everything here is as DECLARED: absence
 * stays absence, because "was `<staff-lines>` written?" is a real question. A
 * tablature staff that Guitar Pro exported carries six `<staff-tuning>`s AND an
 * explicit `<staff-lines>`; the spurious tunings it copies onto the notation
 * staff of a notation+tab part carry no line count. Reach for
 * {@link Measure.getStaveLines} when the renderer's 5-line default is what you
 * want instead. Setters keep the schema's child order.
 */
export class StaffDetails extends MElement {
	constructor() {
		super('staff-details');
	}

	/** `<staff-type>`: what the staff is for; null when unstated (a regular staff). */
	get staffType(): StaffType | null {
		const type = this.child('staff-type')?.text?.trim() ?? null;
		return type !== null && STAFF_TYPES.has(type) ? (type as StaffType) : null;
	}

	/** Set `<staff-type>`, or remove it with null. */
	setStaffType(type: StaffType | null): void {
		setMetadataText(this, 'staff-type', type, ORDER);
	}

	/** `<staff-lines>` as DECLARED; null when this block states none. */
	get staffLines(): number | null {
		const lines = this.child('staff-lines')?.text;
		return lines == null ? null : Number(lines);
	}

	/**
	 * Set `<staff-lines>`, or remove it with null. Throws on removing it while
	 * `<line-detail>`s remain, since the schema only allows those after a line count.
	 */
	setStaffLines(count: number | null): void {
		if (count === null && this.lineDetails.length > 0) {
			throw new Error('Remove the line details before the staff line count');
		}
		setMetadataText(
			this,
			'staff-lines',
			count === null ? null : String(count),
			ORDER,
		);
	}

	/** `<staff-tuning>` declarations, bottom line first (see {@link StaffTuning.line}). */
	get staffTunings(): StaffTuning[] {
		return this.childrenOfType(StaffTuning);
	}

	/**
	 * Replace every `<staff-tuning>` with `tunings`, bottom line first: the first
	 * entry is line 1, the lowest-sounding string of a guitar. An empty list
	 * removes them all, which makes the staff stop reading as tablature.
	 */
	setStaffTunings(tunings: readonly StaffTuningSpec[]): void {
		for (const tuning of this.staffTunings) {
			tuning.remove();
		}
		for (const [index, spec] of tunings.entries()) {
			const tuning = new StaffTuning();
			tuning.setAttribute('line', String(index + 1));
			appendText(tuning, 'tuning-step', spec.step);
			if (spec.alter) {
				appendText(tuning, 'tuning-alter', String(spec.alter));
			}
			appendText(tuning, 'tuning-octave', String(spec.octave));
			insertMetadata(this, tuning, ORDER);
		}
	}

	/** `<staff-size>` as a percentage of the score's default size; null when unstated. */
	get staffSize(): number | null {
		const size = this.child('staff-size')?.text;
		return size == null ? null : Number(size);
	}

	/**
	 * The `<staff-size>` `scaling` attribute: the percentage the notation on the
	 * staff is scaled by, which can differ from the line spacing (a widely spaced
	 * percussion staff); null when unstated.
	 */
	get staffScaling(): number | null {
		const scaling = this.child('staff-size')?.getAttribute('scaling');
		return scaling == null ? null : Number(scaling);
	}

	/**
	 * Set `<staff-size>` as a percentage, or remove it with null. `scaling` sets
	 * the notation scaling; left out, an existing one is kept, and null removes it.
	 */
	setStaffSize(percent: number | null, scaling?: number | null): void {
		setMetadataText(
			this,
			'staff-size',
			percent === null ? null : String(percent),
			ORDER,
		);
		const node = this.child('staff-size');
		if (!node || scaling === undefined) {
			return;
		}
		if (scaling === null) {
			node.removeAttribute('scaling');
		} else {
			node.setAttribute('scaling', String(scaling));
		}
	}

	/** The `show-frets` attribute: how a tab staff labels its stops; null when unstated (numbers). */
	get showFrets(): 'numbers' | 'letters' | null {
		const value = this.getAttribute('show-frets');
		return value === 'numbers' || value === 'letters' ? value : null;
	}

	/** Set `show-frets`, or remove it with null. */
	setShowFrets(value: 'numbers' | 'letters' | null): void {
		if (value === null) {
			this.removeAttribute('show-frets');
		} else {
			this.setAttribute('show-frets', value);
		}
	}

	/** `<capo>` fret; null when unstated. */
	get capo(): number | null {
		const capo = this.child('capo')?.text;
		return capo == null ? null : Number(capo);
	}

	/** Set the `<capo>` fret, or remove it with null. */
	setCapo(fret: number | null): void {
		setMetadataText(this, 'capo', fret === null ? null : String(fret), ORDER);
	}

	/** `<line-detail>` per-line appearance overrides. */
	get lineDetails(): LineDetail[] {
		return this.childrenOfType(LineDetail);
	}

	/**
	 * Set the appearance of staff `line` (1 = bottom), replacing any earlier
	 * detail for it, or remove it with null. Throws without `<staff-lines>`, which
	 * the schema requires first.
	 */
	setLineDetail(line: number, spec: LineDetailSpec | null): LineDetail | null {
		const existing = this.lineDetails.find((detail) => detail.line === line);
		existing?.remove();
		if (spec === null) {
			return null;
		}
		if (this.staffLines === null) {
			throw new Error('Set the staff line count before a line detail');
		}
		const detail = new LineDetail();
		detail.line = line;
		if (spec.width !== undefined) {
			detail.width = spec.width;
		}
		if (spec.color !== undefined) {
			detail.setAttribute('color', spec.color);
		}
		if (spec.lineType !== undefined) {
			detail.setAttribute('line-type', spec.lineType);
		}
		if (spec.printObject !== undefined) {
			detail.setAttribute('print-object', spec.printObject ? 'yes' : 'no');
		}
		const after = this.lineDetails.find((each) => each.line > line);
		if (after) {
			this.insertBefore(detail, after);
		} else {
			insertMetadata(this, detail, ORDER);
		}
		return detail;
	}

	/** Whether the staff is drawn at all (`print-object`); true when unstated. */
	get printObject(): boolean {
		return this.getAttribute('print-object') !== 'no';
	}

	/** Set `print-object`: false hides the staff, as large scores do for empty parts. */
	setPrintObject(value: boolean): void {
		this.setAttribute('print-object', value ? 'yes' : 'no');
	}

	/**
	 * Whether a hidden staff still takes its vertical space (`print-spacing`, the
	 * cutaway format); true when unstated.
	 */
	get printSpacing(): boolean {
		return this.getAttribute('print-spacing') !== 'no';
	}

	/** Set `print-spacing`. */
	setPrintSpacing(value: boolean): void {
		this.setAttribute('print-spacing', value ? 'yes' : 'no');
	}
}

function appendText(parent: MElement, tag: string, text: string): void {
	const element = new MElement(tag);
	element.setText(text);
	parent.append(element);
}
