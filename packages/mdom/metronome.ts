import type { BeamValue } from './beam';
import { MElement } from './m-node';
import { appendValue } from './measure';
import type { NoteType } from './note';
import {
	type Position,
	type PositionSpec,
	positionOf,
	setPositionOf,
} from './print-style';
import {
	buildTimeModification,
	readTimeModification,
	type TimeModificationSpec,
	validateDots,
} from './time-modification';

/**
 * A `<metronome-note>`: one note of the note-group form of a metronome mark —
 * the "two beamed eighths = a triplet quarter-eighth" swing marking, where each
 * side of the equation is drawn as real notation rather than a `<beat-unit>`.
 */
export class MetronomeNote extends MElement {
	constructor() {
		super('metronome-note');
	}

	/** `<metronome-type>`; 'quarter' when absent. */
	get type(): NoteType {
		return (this.child('metronome-type')?.text ?? 'quarter') as NoteType;
	}

	/** `<metronome-dot/>` count. */
	get dots(): number {
		return this.childrenNamed('metronome-dot').length;
	}

	/** `<metronome-beam>` values, document order — how this note beams to its neighbors. */
	get beams(): BeamValue[] {
		return this.childrenNamed('metronome-beam').map(
			(beam) => (beam.text ?? 'begin') as BeamValue,
		);
	}

	/** `<metronome-tuplet>`: the ratio this note is compressed by, or null. */
	get tuplet() {
		const node = this.child('metronome-tuplet');
		const ratio = readTimeModification(node);
		if (!node || !ratio) {
			return null;
		}
		return {
			...ratio,
			type: node.getAttribute('type') as 'start' | 'stop',
			bracket:
				node.getAttribute('bracket') == null
					? null
					: node.getAttribute('bracket') === 'yes',
			showNumber: node.getAttribute('show-number') as
				| 'actual'
				| 'both'
				| 'none'
				| null,
		};
	}

	get tied(): 'start' | 'stop' | null {
		return (
			(this.child('metronome-tied')?.getAttribute('type') as
				| 'start'
				| 'stop'
				| null) ?? null
		);
	}

	/** Beam levels, retaining an omitted number rather than synthesizing the schema default. */
	get beamDetails(): { value: BeamValue; number: number | null }[] {
		return this.childrenNamed('metronome-beam').map((node) => ({
			value: node.text as BeamValue,
			number:
				node.getAttribute('number') == null
					? null
					: Number(node.getAttribute('number')),
		}));
	}
}

/**
 * A `<metronome>` under `<direction-type>`: the tempo mark. It comes in two
 * forms, and this class reads both. The `<beat-unit>` form states a rate
 * ("quarter = 120") or, with two units, a metric modulation ("dotted quarter =
 * half"). The `<metronome-note>` form draws both sides as notation, split by
 * `<metronome-relation>` — how a swing marking is written.
 */
export class Metronome extends MElement {
	constructor() {
		super('metronome');
	}

	/** Where this mark is drawn, in tenths. Layout only: it never moves the onset. */
	get position(): Position {
		return positionOf(this);
	}

	/** Replace the position attributes; null removes them all. */
	setPosition(spec: PositionSpec | null): void {
		setPositionOf(this, spec);
	}

	/**
	 * `<beat-unit>` values in document order, each with the `<beat-unit-dot/>`
	 * count that trails it. Two entries = a metric modulation. MusicXML puts the
	 * dots AFTER the unit they modify, so only this positional walk tells
	 * "dotted quarter = half" from "quarter = dotted half".
	 */
	get beatUnits(): Array<{ type: NoteType; dots: number }> {
		const units: Array<{ type: NoteType; dots: number }> = [];
		for (const child of this.children) {
			if (!(child instanceof MElement)) {
				continue;
			}
			if (child.tag === 'beat-unit') {
				units.push({ type: (child.text ?? 'quarter') as NoteType, dots: 0 });
			} else if (child.tag === 'beat-unit-dot') {
				const last = units[units.length - 1];
				if (last) {
					last.dots++;
				}
			}
		}
		return units;
	}

	/** Each root beat unit with any following tied units, preserving the two sides. */
	get beatUnitGroups(): Array<{
		type: NoteType;
		dots: number;
		tied: { type: NoteType; dots: number }[];
	}> {
		const groups: Array<{
			type: NoteType;
			dots: number;
			tied: { type: NoteType; dots: number }[];
		}> = [];
		for (const child of this.children) {
			if (!(child instanceof MElement)) {
				continue;
			}
			if (child.tag === 'beat-unit') {
				groups.push({ type: child.text as NoteType, dots: 0, tied: [] });
			}
			const last = groups.at(-1);
			if (!last) {
				continue;
			}
			if (child.tag === 'beat-unit-dot') {
				last.dots++;
			}
			if (child.tag === 'beat-unit-tied') {
				last.tied.push({
					type: child.child('beat-unit')?.text as NoteType,
					dots: child.childrenNamed('beat-unit-dot').length,
				});
			}
		}
		return groups;
	}

	get relationOperator(): string | null {
		return (
			this.child('metronome-relation')?.text ??
			(this.child('metronome-relation') ? '' : null)
		);
	}
	get arrows(): boolean {
		return this.child('metronome-arrows') !== null;
	}

	/** `<per-minute>`, kept as a string (MusicXML allows "ca. 120"); null when absent. */
	get perMinute(): string | null {
		return this.child('per-minute')?.text ?? null;
	}

	/** The `parentheses="yes"` attribute — the mark is printed in brackets. */
	get parentheses(): boolean {
		return this.getAttribute('parentheses') === 'yes';
	}

	/**
	 * The `<metronome-note>` form, split at `<metronome-relation>`: the notes drawn
	 * left of the equals sign and the notes drawn right of it. Null when this
	 * metronome is written in the `<beat-unit>` form instead.
	 */
	get relation(): { left: MetronomeNote[]; right: MetronomeNote[] } | null {
		const left: MetronomeNote[] = [];
		const right: MetronomeNote[] = [];
		let side = left;
		for (const child of this.children) {
			if (!(child instanceof MElement)) {
				continue;
			}
			if (child.tag === 'metronome-relation') {
				side = right;
			} else if (child instanceof MetronomeNote) {
				side.push(child);
			}
		}
		return left.length === 0 && right.length === 0 ? null : { left, right };
	}
}

export interface BeatUnitSpec {
	type: NoteType;
	dots?: number;
	tied?: { type: NoteType; dots?: number }[];
}
export interface MetronomeNoteSpec {
	type: NoteType;
	dots?: number;
	beams?: (BeamValue | { value: BeamValue; number?: number })[];
	tied?: 'start' | 'stop';
	tuplet?: TimeModificationSpec & {
		type: 'start' | 'stop';
		bracket?: boolean;
		showNumber?: 'actual' | 'both' | 'none';
	};
}

/** Rate, beat-unit modulation, or a notated metric relationship. */
export type MetronomeSpec = (
	| ({
			beatUnit: NoteType;
			dots?: number;
			tied?: BeatUnitSpec['tied'];
	  } & (
			| { perMinute: string | number; equivalent?: never }
			| { equivalent: BeatUnitSpec; perMinute?: never }
	  ))
	| {
			left: MetronomeNoteSpec[];
			relation?: { operator: string; right: MetronomeNoteSpec[] };
			arrows?: boolean;
	  }
) & { parentheses?: boolean };

function writeUnit(node: MElement, spec: BeatUnitSpec): void {
	validateDots(spec.dots);
	appendValue(node, 'beat-unit', spec.type);
	for (let i = 0; i < (spec.dots ?? 0); i++) {
		node.append(new MElement('beat-unit-dot'));
	}
	for (const tied of spec.tied ?? []) {
		const block = new MElement('beat-unit-tied');
		writeUnit(block, tied);
		node.append(block);
	}
}
function writeNotes(node: MElement, specs: MetronomeNoteSpec[]): void {
	if (specs.length === 0) {
		throw new Error('metronome relationship needs notes on each stated side');
	}
	for (const spec of specs) {
		validateDots(spec.dots);
		const note = new MetronomeNote();
		appendValue(note, 'metronome-type', spec.type);
		for (let i = 0; i < (spec.dots ?? 0); i++) {
			note.append(new MElement('metronome-dot'));
		}
		for (const beamSpec of spec.beams ?? []) {
			const beam = appendValue(
				note,
				'metronome-beam',
				typeof beamSpec === 'string' ? beamSpec : beamSpec.value,
			);
			if (typeof beamSpec !== 'string' && beamSpec.number != null) {
				beam.setAttribute('number', String(beamSpec.number));
			}
		}
		if (spec.tied) {
			const tied = new MElement('metronome-tied');
			tied.setAttribute('type', spec.tied);
			note.append(tied);
		}
		if (spec.tuplet) {
			const tuplet = buildTimeModification(spec.tuplet, 'metronome-tuplet');
			tuplet.setAttribute('type', spec.tuplet.type);
			if (spec.tuplet.bracket != null) {
				tuplet.setAttribute('bracket', spec.tuplet.bracket ? 'yes' : 'no');
			}
			if (spec.tuplet.showNumber != null) {
				tuplet.setAttribute('show-number', spec.tuplet.showNumber);
			}
			note.append(tuplet);
		}
		node.append(note);
	}
}
export function buildMetronome(spec: MetronomeSpec): Metronome {
	const node = new Metronome();
	if (spec.parentheses != null) {
		node.setAttribute('parentheses', spec.parentheses ? 'yes' : 'no');
	}
	if ('beatUnit' in spec) {
		writeUnit(node, { type: spec.beatUnit, dots: spec.dots, tied: spec.tied });
		if (spec.equivalent) {
			writeUnit(node, spec.equivalent);
		} else {
			appendValue(node, 'per-minute', String(spec.perMinute));
		}
	} else {
		if (spec.arrows) {
			node.append(new MElement('metronome-arrows'));
		}
		writeNotes(node, spec.left);
		if (spec.relation) {
			appendValue(node, 'metronome-relation', spec.relation.operator);
			writeNotes(node, spec.relation.right);
		}
	}
	return node;
}
