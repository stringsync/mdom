import { MElement, required } from './m-node';
import { Measure } from './measure';
import { memo } from './read-cache';
import { Score } from './score';
import type { StaffTuning } from './staff-tuning';

/** A `<part>`: a sequence of measures, keyed to a `<score-part>` by id. */
export class Part extends MElement {
	constructor() {
		super('part');
	}

	/**
	 * The part's id (IDREF to its `<score-part>`). Always present in valid
	 * MusicXML, and addPart sets one; absence is a malformed document.
	 */
	get id(): string {
		return required(this.getAttribute('id'), 'id on <part>');
	}

	/** The score this part belongs to. An attached part always has one. */
	get score(): Score {
		return required(this.closest(Score), '<score-partwise> ancestor of <part>');
	}

	/**
	 * The part's measures, frozen and shared until the next document change, so
	 * indexing it per measure is O(1). Copy it before sorting or splicing.
	 */
	get measures(): readonly Measure[] {
		return measuresOf(this);
	}

	/** The measure with this `number`, or null. */
	getMeasure(number: string): Measure | null {
		return (
			measuresOf(this).find((measure) => measure.number === number) ?? null
		);
	}

	/**
	 * Display name, resolved from this part's `<score-part><part-name>` in the
	 * `<part-list>` (a sibling cross-reference, joined by this part's id).
	 */
	get label(): string | null {
		return scorePartOf(this)?.child('part-name')?.text ?? null;
	}

	/**
	 * MIDI program the part plays on, 1 to 128 as MusicXML numbers it (General
	 * MIDI's 0-based program plus one), resolved like {@link label} from this
	 * part's `<score-part><midi-instrument><midi-program>`. The first
	 * `<midi-instrument>` wins when the part declares several. Null when there is
	 * no `<score-part>`, `<midi-instrument>`, or `<midi-program>`, or its text is
	 * not an integer from 1 to 128.
	 */
	get program(): number | null {
		const text = scorePartOf(this)
			?.child('midi-instrument')
			?.child('midi-program')
			?.text?.trim();
		if (text == null || !/^\d+$/.test(text)) {
			return null;
		}
		const program = Number(text);
		return program >= 1 && program <= 128 ? program : null;
	}

	/** Append a `<measure>`, numbered after the last one when `number` is omitted. */
	addMeasure(opts?: { number?: string }): Measure {
		const measure = new Measure();
		measure.setAttribute(
			'number',
			opts?.number ?? String(measuresOf(this).length + 1),
		);
		this.append(measure);
		return measure;
	}

	/**
	 * Insert a new `<measure>` at `index` (appending when `index` is the measure
	 * count). Numbering is the caller's to set — a non-musical spacer measure
	 * legitimately wants none, so unlike {@link addMeasure} this assigns one only
	 * when asked. Pair it with {@link Measure.copySignaturesFrom} when the new
	 * measure lands before the declarations it needs.
	 */
	insertMeasureAt(index: number, opts?: { number?: string }): Measure {
		const measure = new Measure();
		if (opts?.number != null) {
			measure.setAttribute('number', opts.number);
		}
		this.insertBefore(measure, measuresOf(this)[index] ?? null);
		return measure;
	}

	/**
	 * The `<staff-tuning>` declarations for `staff` (default '1'): the first
	 * `<staff-details>` anywhere in the part that carries them. Tuning is
	 * effectively a per-part constant, like {@link partSymbol} — use
	 * {@link Measure.getStaffTunings} when a mid-score retuning matters.
	 */
	getStaffTunings(staff = '1'): StaffTuning[] {
		for (const measure of measuresOf(this)) {
			const tunings = measure.getStaffTunings(staff);
			if (tunings.length > 0) {
				return tunings;
			}
		}
		return [];
	}

	/**
	 * `<staves>` count (first declaration in any measure's attributes); 1 (single
	 * staff) when never declared.
	 */
	get staveCount(): number {
		for (const measure of measuresOf(this)) {
			for (const attrs of measure.childrenNamed('attributes')) {
				const staves = attrs.child('staves')?.text;
				if (staves != null) {
					return Number(staves);
				}
			}
		}
		return 1;
	}

	/**
	 * The `<part-symbol>` connector joining a multi-staff part's staves (first
	 * declaration in any measure's attributes); null when never declared. It is
	 * effectively a per-part constant, so it lives here rather than per-measure.
	 */
	get partSymbol(): 'none' | 'line' | 'bracket' | 'brace' | 'square' | null {
		for (const measure of measuresOf(this)) {
			for (const attrs of measure.childrenNamed('attributes')) {
				const symbol = attrs.child('part-symbol')?.text;
				if (symbol != null) {
					return symbol as 'none' | 'line' | 'bracket' | 'brace' | 'square';
				}
			}
		}
		return null;
	}
}

/** The part's measures, cached until the next document change. Never mutate it. */
export function measuresOf(part: Part): readonly Measure[] {
	return memo(part, 'measures', () =>
		Object.freeze(part.childrenOfType(Measure)),
	);
}

/** `measure`'s position among `part`'s measures; -1 when it isn't one of them. */
export function measureIndexIn(part: Part, measure: Measure): number {
	const indexes = memo(
		part,
		'measure-indexes',
		() =>
			new Map(measuresOf(part).map((each, index) => [each, index] as const)),
	);
	return indexes.get(measure) ?? -1;
}

/** `part`'s `<score-part>` in the `<part-list>`, joined by id; null when absent. */
function scorePartOf(part: Part): MElement | null {
	return (
		part
			.closest(Score)
			?.child('part-list')
			?.childrenNamed('score-part')
			.find((entry) => entry.getAttribute('id') === part.id) ?? null
	);
}
