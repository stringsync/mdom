import { GuitarProParser, MDOMParser } from "@stringsync/mdom";
import type { Fs } from "core/system";
import { ScoreBuilder } from "./scaling-score-builder";

interface ScoreFactoryOptions {
	seed: string;
	"gp-seed": string;
	axis: string;
	measures: number;
	parts: number;
	voices: number;
	notes: number;
	synthetic: boolean;
}

/** Builds the MusicXML a benchmark operation runs on, at the given size. */
export class ScoreFactory {
	constructor(private readonly files: Pick<Fs, "read" | "readBytes">) {}

	async build(
		operation: string,
		size: number,
		opts: ScoreFactoryOptions,
	): Promise<string> {
		// GP operations use a real GP import, repeated in MusicXML then
		// re-exported untimed. Other operations share the real XML seed.
		const seed =
			operation === "gp-parse" ||
			operation === "gpif-parse" ||
			operation === "serialize-gp"
				? await new GuitarProParser().parseFromBytes(
						await this.files.readBytes(opts["gp-seed"]),
					)
				: new MDOMParser().parseFromString(await this.files.read(opts.seed));
		const builder = new ScoreBuilder(seed);
		const shape = {
			measures: opts.measures,
			parts: opts.parts,
			voices: opts.voices,
			notes: opts.notes,
			[opts.axis]: size,
		};
		return opts.synthetic || opts.axis !== "measures"
			? builder.synthetic(shape)
			: builder.repeat(size);
	}
}
