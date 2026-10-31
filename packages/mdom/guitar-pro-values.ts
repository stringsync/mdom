import type { GuitarProOptions } from "./guitar-pro-options";
import type { PitchSpec } from "./note";
import type { HarmonicKind, HarmonicPitch } from "./technical";

interface GuitarProRhythmOptions {
	dots?: number;
	actual?: number;
	normal?: number;
}

interface GuitarProPitchOptions {
	flats?: boolean;
}

export class GuitarProValues {
	constructor(private readonly opts: GuitarProOptions = {}) {}

	unsupported(feature: string): void {
		if (this.opts.unsupported !== "omit") {
			throw new Error(
				`Guitar Pro conversion does not support ${feature}. Use { unsupported: 'omit' } to omit it.`,
			);
		}
		this.opts.onUnsupported?.(feature);
	}

	static readonly durations: Record<string, number> = {
		whole: 1,
		half: 2,
		quarter: 4,
		eighth: 8,
		"16th": 16,
		"32nd": 32,
		"64th": 64,
		"128th": 128,
	};

	static noteType(duration: number): string {
		const type = Object.entries(GuitarProValues.durations).find(
			([, value]) => value === duration,
		)?.[0];
		if (!type) {
			throw new Error(`Unsupported Guitar Pro duration: ${duration}`);
		}
		return type;
	}

	static beats(duration: number, opts: GuitarProRhythmOptions = {}): number {
		return (
			((4 / duration) * (2 - 2 ** -(opts.dots ?? 0)) * (opts.normal ?? 1)) /
			(opts.actual ?? 1)
		);
	}

	static pitch(midi: number, opts: GuitarProPitchOptions = {}): PitchSpec {
		GuitarProValues.integer(midi, "MIDI pitch", 0, 127);
		const names = opts.flats
			? ["C", "D", "D", "E", "E", "F", "G", "G", "A", "A", "B", "B"]
			: ["C", "C", "D", "D", "E", "F", "F", "G", "G", "A", "A", "B"];
		const step = names[midi % 12]!;
		const natural = GuitarProValues.semitones[step]!;
		return {
			step,
			octave: Math.floor(midi / 12) - 1,
			alter: (midi % 12) - natural,
		};
	}

	static midi(pitch: PitchSpec): number {
		const semitone = GuitarProValues.semitones[pitch.step];
		if (semitone == null) {
			throw new Error(`Invalid pitch step: ${pitch.step}`);
		}
		return GuitarProValues.integer(
			(pitch.octave + 1) * 12 + semitone + (pitch.alter ?? 0),
			"MIDI pitch",
			0,
			127,
		);
	}

	static integer(
		value: number,
		name: string,
		min: number,
		max: number,
	): number {
		if (!Number.isInteger(value) || value < min || value > max) {
			throw new Error(
				`Invalid ${name}: ${value}; expected an integer from ${min} to ${max}`,
			);
		}
		return value;
	}

	/**
	 * GPIF `Slide` flags for a slide into or out of a note, by the MusicXML
	 * articulation that draws it: out downward (falloff), out upward (doit), in
	 * from below (scoop), in from above (plop). Flags 1 and 2, a shift or legato
	 * slide to the next note, are `<slide>` spanners instead.
	 */
	static readonly slideMarks: ReadonlyArray<readonly [number, string]> = [
		[4, "falloff"],
		[8, "doit"],
		[16, "scoop"],
		[32, "plop"],
	];

	/** The SMuFL glyph a wavy line names to mark a wide vibrato. */
	static readonly wideVibrato = "wiggleVibratoWide";

	/** GPIF bend values are 50 per semitone (100 is a whole step). */
	private static readonly bendUnit = 50;

	/**
	 * A GPIF harmonic type as MusicXML's kind and pitch. Artificial, pinch and
	 * tap are all artificial harmonics, told apart by the pitch they are
	 * written at (none, sounding, touching); null for types with no mapping.
	 */
	static harmonic(
		type: string,
	): { kind: HarmonicKind; pitch?: HarmonicPitch } | null {
		switch (type) {
			case "Natural":
				return { kind: "natural" };
			case "Artificial":
				return { kind: "artificial" };
			case "Pinch":
				return { kind: "artificial", pitch: "sounding" };
			case "Tap":
				return { kind: "artificial", pitch: "touching" };
			default:
				return null;
		}
	}

	/** The GPIF type of a MusicXML harmonic, the inverse of {@link harmonic}. */
	static harmonicType(harmonic: {
		kind: HarmonicKind | null;
		pitch: HarmonicPitch | null;
	}): string {
		if (harmonic.kind !== "artificial") {
			return "Natural";
		}
		if (harmonic.pitch === "sounding") {
			return "Pinch";
		}
		return harmonic.pitch === "touching" ? "Tap" : "Artificial";
	}

	/**
	 * A GPIF bend (origin, middle and destination values) as a note bend: a
	 * rise from nothing, optionally released back to nothing, or a pre-bend held
	 * at its peak or released. 'none' when it never leaves zero; null for a
	 * curve MusicXML's bend cannot state.
	 */
	static bend(
		origin: number,
		middles: number[],
		destination: number,
	): "none" | { semitones: number; preBend: boolean; release: boolean } | null {
		const peak = Math.max(origin, destination, ...middles);
		if (peak <= 0) {
			return "none";
		}
		if (origin !== 0 && origin !== peak) {
			return null;
		}
		if (destination !== 0 && destination !== peak) {
			return null;
		}
		const preBend = origin !== 0;
		const release = destination === 0;
		return {
			semitones: peak / GuitarProValues.bendUnit,
			preBend,
			release,
		};
	}

	/**
	 * A GPIF whammy bar curve as a bend with the bar: a dip (values at or below
	 * zero, negative semitones) or a rise (at or above zero), shaped as
	 * {@link bend} reads a string bend. 'none' when it never leaves zero; null
	 * for a curve that crosses zero or that a single bend cannot state.
	 */
	static whammy(
		origin: number,
		middles: number[],
		destination: number,
	):
		| "none"
		| { semitones: number; preBend: boolean; release: boolean; withBar: string }
		| null {
		const values = [origin, ...middles, destination];
		const dip = values.every((value) => value <= 0);
		if (!dip && values.some((value) => value < 0)) {
			return null;
		}
		const sign = dip ? -1 : 1;
		const bend = GuitarProValues.bend(
			origin * sign,
			middles.map((value) => value * sign),
			destination * sign,
		);
		if (bend == null || bend === "none") {
			return bend;
		}
		return {
			...bend,
			semitones: bend.semitones * sign,
			withBar: dip ? "dip" : "scoop",
		};
	}

	private static readonly semitones: Record<string, number> = {
		C: 0,
		D: 2,
		E: 4,
		F: 5,
		G: 7,
		A: 9,
		B: 11,
	};
}
