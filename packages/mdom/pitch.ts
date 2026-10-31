import { MElement } from "./m-element";
import { required } from "./m-node";
import type { PitchSpec } from "./note";

/** A `<pitch>`: step, octave, and optional alteration. */
export class Pitch extends MElement {
	constructor() {
		super("pitch");
	}

	/**
	 * `<step>`. Required in a well-formed `<pitch>`: absence is a malformed
	 * document, not an expected state, so we throw rather than hand back a null the
	 * caller has to defend against (and won't).
	 */
	get step(): string {
		return required(this.child("step")?.text, "<step> in <pitch>");
	}

	/** `<octave>`. Required, like {@link step}. */
	get octave(): number {
		return Number(required(this.child("octave")?.text, "<octave> in <pitch>"));
	}

	/**
	 * `<alter>` in ± semitones (decimals for microtones). Genuinely optional; the
	 * spec default for absence is natural (0). Returning the default, not null -
	 * keeps null reserved for things that can actually be unknown.
	 */
	get alter(): number {
		return Number(this.child("alter")?.text ?? 0);
	}
}

/** Steps of the scale in order, C upward. */
const STEPS = ["C", "D", "E", "F", "G", "A", "B"];

/** Semitones above C of each natural step. */
const STEP_SEMITONES = [0, 2, 4, 5, 7, 9, 11];

/**
 * An interval as MusicXML's transpose group spells it: `diatonic` steps and
 * `chromatic` semitones within the octave, `octaveChange` octaves on top. A
 * null `diatonic` (it is optional) is inferred as the nearest step count to
 * `chromatic`: -2 is a second, -3 a third, -5 a fourth.
 */
export interface PitchInterval {
	diatonic?: number | null;
	chromatic: number;
	octaveChange?: number | null;
}

/** `interval`'s diatonic steps: as declared, or inferred from `chromatic`. */
export function diatonicSteps(interval: PitchInterval): number {
	return interval.diatonic ?? Math.round((interval.chromatic * 7) / 12);
}

/**
 * `pitch` moved by `interval`, spelled by its diatonic steps: D4 down a major
 * second (`{ diatonic: -1, chromatic: -2 }`) is C4, and F♯4 is E4, where a
 * semitone count alone could as well give D𝄪. The alter is whatever lands on
 * the chromatic distance, so a microtonal alter carries through.
 */
export function transposePitch(
	pitch: PitchSpec,
	interval: PitchInterval,
): Required<PitchSpec> {
	const fromStep = STEPS.indexOf(pitch.step);
	if (fromStep < 0) {
		throw new Error(`Invalid pitch step: ${pitch.step}`);
	}
	const diatonic = diatonicSteps(interval);
	const octaves = interval.octaveChange ?? 0;
	const fromAbsolute = pitch.octave * 7 + fromStep;
	const toAbsolute = fromAbsolute + diatonic + 7 * octaves;
	const toStep = ((toAbsolute % 7) + 7) % 7;
	const octave = Math.floor(toAbsolute / 7);
	const fromSemitones =
		pitch.octave * 12 + STEP_SEMITONES[fromStep]! + (pitch.alter ?? 0);
	const toSemitones = fromSemitones + interval.chromatic + 12 * octaves;
	return {
		step: STEPS[toStep]!,
		octave,
		alter: toSemitones - (octave * 12 + STEP_SEMITONES[toStep]!),
	};
}
