import { Clef } from './clef';
import { Key } from './key';
import { MElement } from './m-node';
import {
	appendValue,
	type Measure,
	placeInAttributes,
	transposeChoiceBlock,
} from './measure';
import type { Note } from './note';
import type { Part } from './part';
import { diatonicSteps, type PitchInterval, transposePitch } from './pitch';
import { appliesToStaff, attributeBackFrom } from './signature';
import {
	buildForPart,
	buildTranspose,
	ForPart,
	shiftsPitchClass,
	Transpose,
	type TransposeGroup,
	type TransposeSpec,
} from './transpose';

/** The printed glyph for each whole-tone-free alter, for rewriting `<accidental>`. */
const ACCIDENTALS: Record<number, string> = {
	[-2]: 'flat-flat',
	[-1]: 'flat',
	0: 'natural',
	1: 'sharp',
	2: 'double-sharp',
};

/** The glyphs {@link ACCIDENTALS} knows, so a rewrite leaves others (microtones, Sori) alone. */
const PLAIN_ACCIDENTALS = new Set([
	...Object.values(ACCIDENTALS),
	'sharp-sharp',
]);

/** An edit planned from the document as it was, run once every read is done. */
type Edit = () => void;

/**
 * Rewrite a transposed score's parts at concert pitch: every note retuned by
 * the pitch-class part of the transposition in effect, every key signature
 * moved with it, and each such `<transpose>` handed to a `<for-part>` so the
 * transposed parts can be recreated. Octave transpositions and doublings stay
 * on `<transpose>`, as a concert score allows. Does not set the flag itself.
 */
export function convertPartsToConcertPitch(parts: readonly Part[]): void {
	const edits: Edit[] = [];
	for (const part of parts) {
		for (const measure of part.measures) {
			for (const note of measure.notes) {
				const transpose = note.transpose;
				if (note.pitch && transpose && shiftsPitchClass(transpose)) {
					edits.push(retune(note, pitchClassOf(transpose)));
				}
			}
			for (const attrs of measure.childrenNamed('attributes')) {
				for (const key of attrs.childrenOfType(Key)) {
					const transpose = transposeAtPoint(measure, attrs, keyStaff(key));
					if (transpose && shiftsPitchClass(transpose)) {
						edits.push(moveKey(key, pitchClassOf(transpose)));
					}
				}
				for (const transpose of attrs.childrenOfType(Transpose)) {
					edits.push(...toForPart(measure, attrs, transpose));
				}
			}
		}
	}
	for (const edit of edits) {
		edit();
	}
}

/**
 * Undo {@link convertPartsToConcertPitch}: rewrite a concert score's parts as
 * the transposed parts its `<for-part>`s declare: notes retuned back, keys
 * moved back, each `<for-part>` folded into a `<transpose>` with any octave
 * transposition in effect there, and its `<part-clef>`, when it has one, set
 * as the staff's clef from that point. Does not clear the flag itself.
 */
export function convertPartsToTransposedPitch(parts: readonly Part[]): void {
	const edits: Edit[] = [];
	for (const part of parts) {
		for (const measure of part.measures) {
			for (const note of measure.notes) {
				const forPart = attributeBackFrom(
					measure,
					measure.children.indexOf(note),
					`for-part:${note.staff}`,
					forPartPick(note.staff),
				);
				if (note.pitch && forPart) {
					edits.push(retune(note, inverse(intervalOf(forPart.partTranspose))));
				}
			}
			for (const attrs of measure.childrenNamed('attributes')) {
				for (const key of attrs.childrenOfType(Key)) {
					const forPart = forPartAtPoint(measure, attrs, keyStaff(key));
					if (forPart) {
						edits.push(
							moveKey(key, inverse(pitchClassOf(forPart.partTranspose))),
						);
					}
				}
				for (const forPart of attrs.childrenOfType(ForPart)) {
					edits.push(...toTranspose(measure, attrs, forPart));
				}
				for (const transpose of attrs.childrenOfType(Transpose)) {
					edits.push(...foldForPartInto(measure, attrs, transpose));
				}
			}
		}
	}
	for (const edit of edits) {
		edit();
	}
}

/**
 * The `<for-part>` a concert score keeps in place of `transpose`, and what is
 * left of `transpose` itself: its octaves and doubling, or nothing. One is
 * written also where an octave-only `transpose` ends an earlier pitch-class
 * one, so the earlier `<for-part>` does not carry on past it.
 */
function toForPart(
	measure: Measure,
	attrs: MElement,
	transpose: Transpose,
): Edit[] {
	const staff = transpose.staff ?? '1';
	const before = transposeBefore(measure, attrs, staff);
	if (!shiftsPitchClass(transpose) && !(before && shiftsPitchClass(before))) {
		return [];
	}
	const partTranspose: TransposeSpec = {
		chromatic: transpose.chromatic,
		...(transpose.diatonic != null && { diatonic: transpose.diatonic }),
	};
	const keepsOctaves =
		shiftsOctaves(transpose) || (before != null && shiftsOctaves(before));
	return [
		() => {
			placeInAttributes(
				transposeChoiceBlock(attrs, 'for-part'),
				buildForPart(
					{ transpose: partTranspose },
					transpose.staff ?? undefined,
				),
			);
			if (keepsOctaves) {
				transpose.setTransposition({
					chromatic: 0,
					...(transpose.diatonic != null && { diatonic: 0 }),
					...(transpose.octaveChange != null && {
						octaveChange: transpose.octaveChange,
					}),
					...(transpose.double != null && { double: transpose.double }),
				});
				return;
			}
			removeFrom(attrs, transpose);
		},
	];
}

/**
 * The `<transpose>` a transposed part keeps in place of `forPart`: its part
 * transposition with the concert score's octaves at that point added on,
 * written over the `<transpose>` beside it or as a new one.
 */
function toTranspose(
	measure: Measure,
	attrs: MElement,
	forPart: ForPart,
): Edit[] {
	const staff = forPart.staff ?? '1';
	const beside = pointBlocks(attrs)
		.flatMap((block) => block.childrenOfType(Transpose))
		.find((transpose) => transpose.staff === forPart.staff);
	const octaves = beside ?? transposeBefore(measure, attrs, staff);
	const spec = combine(forPart.partTranspose, octaves);
	const clef = forPart.partClef;
	const clefSpec = clef && {
		sign: clef.sign,
		line: clef.line,
		octaveChange: clef.octaveChange,
	};
	return [
		() => {
			if (beside) {
				beside.setTransposition(spec);
			} else {
				placeInAttributes(
					transposeChoiceBlock(attrs, 'transpose'),
					buildTranspose(spec, forPart.staff ?? undefined),
				);
			}
			if (clefSpec) {
				setPartClef(attrs, forPart.staff, clefSpec);
			}
			removeFrom(attrs, forPart);
		},
	];
}

/**
 * An octave-only `<transpose>` of a concert score with no `<for-part>` beside
 * it, rewritten to add the part transposition in effect there, which it would
 * otherwise reset.
 */
function foldForPartInto(
	measure: Measure,
	attrs: MElement,
	transpose: Transpose,
): Edit[] {
	const besideForPart = pointBlocks(attrs)
		.flatMap((block) => block.childrenOfType(ForPart))
		.some((forPart) => forPart.staff === transpose.staff);
	if (besideForPart) {
		return [];
	}
	const forPart = attributeBackFrom(
		measure,
		measure.children.indexOf(pointBlocks(attrs)[0]!),
		`for-part:${transpose.staff ?? '1'}`,
		forPartPick(transpose.staff ?? '1'),
	);
	if (!forPart) {
		return [];
	}
	const spec = combine(forPart.partTranspose, transpose);
	return [() => transpose.setTransposition(spec)];
}

/** A part transposition with a concert score's octave transposition added on. */
function combine(
	partTranspose: TransposeGroup,
	octaves: TransposeGroup | null,
): TransposeSpec {
	const octaveChange =
		(partTranspose.octaveChange ?? 0) + (octaves?.octaveChange ?? 0);
	const double = octaves?.double ?? null;
	return {
		chromatic: partTranspose.chromatic + (octaves?.chromatic ?? 0),
		...(partTranspose.diatonic != null && {
			diatonic: partTranspose.diatonic + (octaves?.diatonic ?? 0),
		}),
		...((octaveChange !== 0 ||
			partTranspose.octaveChange != null ||
			octaves?.octaveChange != null) && { octaveChange }),
		...(double != null && { double }),
	};
}

/** Retune `note` by `interval`, its printed accidental with it. */
function retune(note: Note, interval: PitchInterval): Edit {
	const pitch = note.pitch!;
	const to = transposePitch(
		{ step: pitch.step, octave: pitch.octave, alter: pitch.alter },
		interval,
	);
	const accidental = note.accidental;
	return () => {
		note.setPitch({
			step: to.step,
			octave: to.octave,
			...(to.alter !== 0 && { alter: to.alter }),
		});
		const glyph = ACCIDENTALS[to.alter];
		if (accidental && glyph && PLAIN_ACCIDENTALS.has(accidental.value)) {
			accidental.setText(glyph);
		}
	};
}

/**
 * Move `key` by `interval`: a traditional key along the circle of fifths, by
 * the interval's fifths (7 per semitone, less 12 per step: a major second
 * down is two flats more); a non-traditional one alteration by alteration.
 */
function moveKey(key: Key, interval: PitchInterval): Edit {
	const fifths = key.fifths;
	if (fifths != null) {
		const by = 7 * interval.chromatic - 12 * diatonicSteps(interval);
		return () => key.child('fifths')!.setText(String(fifths + by));
	}
	const elements = key.childrenOfType(MElement);
	const moved = key.alterations.map(({ step, alter }) =>
		transposePitch({ step, alter, octave: 4 }, interval),
	);
	return () => {
		elements
			.filter((element) => element.tag === 'key-step')
			.forEach((step, index) => {
				const to = moved[index]!;
				step.setText(to.step);
				const alter = elements[elements.indexOf(step) + 1];
				if (alter?.tag === 'key-alter') {
					alter.setText(String(to.alter));
				}
			});
	};
}

/** Set the `<clef>` for `staff` at the point `attrs` opens, replacing one there. */
function setPartClef(
	attrs: MElement,
	staff: string | null,
	spec: { sign: string; line: number | null; octaveChange: number | null },
): void {
	for (const block of pointBlocks(attrs)) {
		block
			.childrenOfType(Clef)
			.find((clef) => clef.getAttribute('number') === staff)
			?.remove();
	}
	const clef = new Clef();
	if (staff != null) {
		clef.setAttribute('number', staff);
	}
	appendValue(clef, 'sign', spec.sign);
	if (spec.line != null) {
		appendValue(clef, 'line', String(spec.line));
	}
	if (spec.octaveChange != null) {
		appendValue(clef, 'clef-octave-change', String(spec.octaveChange));
	}
	placeInAttributes(attrs, clef);
}

/** Remove `element` from `attrs`, and `attrs` too when that empties it. */
function removeFrom(attrs: MElement, element: MElement): void {
	element.remove();
	if (attrs.children.length === 0) {
		attrs.remove();
	}
}

/**
 * The `<attributes>` blocks standing together at `attrs`'s point: a
 * `<transpose>` and a `<for-part>` cannot share one, so a point can hold two.
 */
function pointBlocks(attrs: MElement): MElement[] {
	const siblings = attrs.parent!.children;
	const isBlock = (index: number) => {
		const node = siblings[index];
		return node instanceof MElement && node.tag === 'attributes';
	};
	let first = siblings.indexOf(attrs);
	while (isBlock(first - 1)) {
		first--;
	}
	let last = siblings.indexOf(attrs);
	while (isBlock(last + 1)) {
		last++;
	}
	return siblings.slice(first, last + 1) as MElement[];
}

/** The `<transpose>` in effect for `staff` just before `attrs`'s point. */
function transposeBefore(
	measure: Measure,
	attrs: MElement,
	staff: string,
): Transpose | null {
	return attributeBackFrom(
		measure,
		measure.children.indexOf(pointBlocks(attrs)[0]!),
		`transpose:${staff}`,
		transposePick(staff),
	);
}

/** The `<transpose>` in effect for `staff` once `attrs`'s point is read. */
function transposeAtPoint(
	measure: Measure,
	attrs: MElement,
	staff: string,
): Transpose | null {
	return attributeBackFrom(
		measure,
		measure.children.indexOf(pointBlocks(attrs).at(-1)!) + 1,
		`transpose:${staff}`,
		transposePick(staff),
	);
}

/** The `<for-part>` in effect for `staff` once `attrs`'s point is read. */
function forPartAtPoint(
	measure: Measure,
	attrs: MElement,
	staff: string,
): ForPart | null {
	return attributeBackFrom(
		measure,
		measure.children.indexOf(pointBlocks(attrs).at(-1)!) + 1,
		`for-part:${staff}`,
		forPartPick(staff),
	);
}

/** Same pick as {@link Note.transpose}, so the carried-forward cache is shared. */
function transposePick(staff: string) {
	return (attrs: MElement) =>
		attrs
			.childrenOfType(Transpose)
			.find((transpose) => appliesToStaff(transpose, staff));
}

/** Same pick as {@link Measure.getForPart}, so the carried-forward cache is shared. */
function forPartPick(staff: string) {
	return (attrs: MElement) =>
		attrs
			.childrenOfType(ForPart)
			.find((forPart) => appliesToStaff(forPart, staff));
}

function keyStaff(key: Key): string {
	return key.getAttribute('number') ?? '1';
}

function shiftsOctaves(transpose: TransposeGroup): boolean {
	return (transpose.octaveChange ?? 0) !== 0 || transpose.double != null;
}

function intervalOf(group: TransposeGroup): PitchInterval {
	return {
		diatonic: group.diatonic,
		chromatic: group.chromatic,
		octaveChange: group.octaveChange,
	};
}

/** The part of `group` that changes pitch class: its octaves left out. */
function pitchClassOf(group: TransposeGroup): PitchInterval {
	return { diatonic: group.diatonic, chromatic: group.chromatic };
}

function inverse(interval: PitchInterval): PitchInterval {
	return {
		diatonic: -diatonicSteps(interval),
		chromatic: -interval.chromatic,
		octaveChange: -(interval.octaveChange ?? 0),
	};
}
