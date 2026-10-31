// Generated explicit cases for the pinned corpus in examples/lilypond/README.md.
// Keep each invariant separate: known schema failures must not hide round-trip failures.
import { describe, expect, it } from "bun:test";
import { MDOMParser, MusicXMLSerializer } from "@stringsync/mdom";
import { schemaErrors } from "../mdom/music-xml-schema";

describe("LilyPond MusicXML suite", () => {
	it("contains a non-empty score for 01a-Pitches-Pitches.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/01a-Pitches-Pitches.xml", import.meta.url),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 01a-Pitches-Pitches.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/01a-Pitches-Pitches.xml", import.meta.url),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 01a-Pitches-Pitches.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/01a-Pitches-Pitches.xml", import.meta.url),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 01b-Pitches-Intervals.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/01b-Pitches-Intervals.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 01b-Pitches-Intervals.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/01b-Pitches-Intervals.xml",
					import.meta.url,
				),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 01b-Pitches-Intervals.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/01b-Pitches-Intervals.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 01c-Pitches-NoVoiceElement.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/01c-Pitches-NoVoiceElement.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 01c-Pitches-NoVoiceElement.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/01c-Pitches-NoVoiceElement.xml",
					import.meta.url,
				),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 01c-Pitches-NoVoiceElement.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/01c-Pitches-NoVoiceElement.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 01d-Pitches-Microtones.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/01d-Pitches-Microtones.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 01d-Pitches-Microtones.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/01d-Pitches-Microtones.xml",
					import.meta.url,
				),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 01d-Pitches-Microtones.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/01d-Pitches-Microtones.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 01e-Pitches-ParenthesizedAccidentals.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/01e-Pitches-ParenthesizedAccidentals.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 01e-Pitches-ParenthesizedAccidentals.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/01e-Pitches-ParenthesizedAccidentals.xml",
					import.meta.url,
				),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 01e-Pitches-ParenthesizedAccidentals.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/01e-Pitches-ParenthesizedAccidentals.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 01f-Pitches-ParenthesizedMicrotoneAccidentals.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/01f-Pitches-ParenthesizedMicrotoneAccidentals.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 01f-Pitches-ParenthesizedMicrotoneAccidentals.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/01f-Pitches-ParenthesizedMicrotoneAccidentals.xml",
					import.meta.url,
				),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 01f-Pitches-ParenthesizedMicrotoneAccidentals.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/01f-Pitches-ParenthesizedMicrotoneAccidentals.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 02a-Rests-Durations.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/02a-Rests-Durations.xml", import.meta.url),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 02a-Rests-Durations.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/02a-Rests-Durations.xml", import.meta.url),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 02a-Rests-Durations.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/02a-Rests-Durations.xml", import.meta.url),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 02b-Rests-PitchedRests.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/02b-Rests-PitchedRests.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 02b-Rests-PitchedRests.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/02b-Rests-PitchedRests.xml",
					import.meta.url,
				),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 02b-Rests-PitchedRests.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/02b-Rests-PitchedRests.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 02c-Rests-MultiMeasureRests.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/02c-Rests-MultiMeasureRests.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 02c-Rests-MultiMeasureRests.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/02c-Rests-MultiMeasureRests.xml",
					import.meta.url,
				),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 02c-Rests-MultiMeasureRests.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/02c-Rests-MultiMeasureRests.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 02d-Rests-Multimeasure-TimeSignatures.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/02d-Rests-Multimeasure-TimeSignatures.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 02d-Rests-Multimeasure-TimeSignatures.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/02d-Rests-Multimeasure-TimeSignatures.xml",
					import.meta.url,
				),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 02d-Rests-Multimeasure-TimeSignatures.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/02d-Rests-Multimeasure-TimeSignatures.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 02e-Rests-NoType.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/02e-Rests-NoType.xml", import.meta.url),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 02e-Rests-NoType.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/02e-Rests-NoType.xml", import.meta.url),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 02e-Rests-NoType.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/02e-Rests-NoType.xml", import.meta.url),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 03a-Rhythm-Durations.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/03a-Rhythm-Durations.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 03a-Rhythm-Durations.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/03a-Rhythm-Durations.xml",
					import.meta.url,
				),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 03a-Rhythm-Durations.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/03a-Rhythm-Durations.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 03b-Rhythm-Backup.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/03b-Rhythm-Backup.xml", import.meta.url),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 03b-Rhythm-Backup.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/03b-Rhythm-Backup.xml", import.meta.url),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 03b-Rhythm-Backup.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/03b-Rhythm-Backup.xml", import.meta.url),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 03c-Rhythm-DivisionChange.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/03c-Rhythm-DivisionChange.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 03c-Rhythm-DivisionChange.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/03c-Rhythm-DivisionChange.xml",
					import.meta.url,
				),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 03c-Rhythm-DivisionChange.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/03c-Rhythm-DivisionChange.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 03d-Rhythm-DottedDurations-Factors.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/03d-Rhythm-DottedDurations-Factors.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 03d-Rhythm-DottedDurations-Factors.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/03d-Rhythm-DottedDurations-Factors.xml",
					import.meta.url,
				),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 03d-Rhythm-DottedDurations-Factors.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/03d-Rhythm-DottedDurations-Factors.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 03e-Rhythm-No-Divisions.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/03e-Rhythm-No-Divisions.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 03e-Rhythm-No-Divisions.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/03e-Rhythm-No-Divisions.xml",
					import.meta.url,
				),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 03e-Rhythm-No-Divisions.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/03e-Rhythm-No-Divisions.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 03f-Rhythm-Forward.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/03f-Rhythm-Forward.xml", import.meta.url),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 03f-Rhythm-Forward.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/03f-Rhythm-Forward.xml", import.meta.url),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 03f-Rhythm-Forward.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/03f-Rhythm-Forward.xml", import.meta.url),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 11a-TimeSignatures.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/11a-TimeSignatures.xml", import.meta.url),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 11a-TimeSignatures.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/11a-TimeSignatures.xml", import.meta.url),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 11a-TimeSignatures.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/11a-TimeSignatures.xml", import.meta.url),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 11b-TimeSignatures-NoTime.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/11b-TimeSignatures-NoTime.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 11b-TimeSignatures-NoTime.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/11b-TimeSignatures-NoTime.xml",
					import.meta.url,
				),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 11b-TimeSignatures-NoTime.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/11b-TimeSignatures-NoTime.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 11c-TimeSignatures-Complex.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/11c-TimeSignatures-Complex.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 11c-TimeSignatures-Complex.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/11c-TimeSignatures-Complex.xml",
					import.meta.url,
				),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 11c-TimeSignatures-Complex.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/11c-TimeSignatures-Complex.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 11d-TimeSignatures-ComplexMultiple.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/11d-TimeSignatures-ComplexMultiple.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 11d-TimeSignatures-ComplexMultiple.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/11d-TimeSignatures-ComplexMultiple.xml",
					import.meta.url,
				),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 11d-TimeSignatures-ComplexMultiple.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/11d-TimeSignatures-ComplexMultiple.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 11e-TimeSignatures-ComplexMixed.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/11e-TimeSignatures-ComplexMixed.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 11e-TimeSignatures-ComplexMixed.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/11e-TimeSignatures-ComplexMixed.xml",
					import.meta.url,
				),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 11e-TimeSignatures-ComplexMixed.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/11e-TimeSignatures-ComplexMixed.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 11f-TimeSignatures-SymbolMeaning.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/11f-TimeSignatures-SymbolMeaning.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 11f-TimeSignatures-SymbolMeaning.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/11f-TimeSignatures-SymbolMeaning.xml",
					import.meta.url,
				),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 11f-TimeSignatures-SymbolMeaning.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/11f-TimeSignatures-SymbolMeaning.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 11g-TimeSignatures-SingleNumber.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/11g-TimeSignatures-SingleNumber.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 11g-TimeSignatures-SingleNumber.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/11g-TimeSignatures-SingleNumber.xml",
					import.meta.url,
				),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 11g-TimeSignatures-SingleNumber.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/11g-TimeSignatures-SingleNumber.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 11h-TimeSignatures-SenzaMisura.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/11h-TimeSignatures-SenzaMisura.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 11h-TimeSignatures-SenzaMisura.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/11h-TimeSignatures-SenzaMisura.xml",
					import.meta.url,
				),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 11h-TimeSignatures-SenzaMisura.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/11h-TimeSignatures-SenzaMisura.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 11i-TimeSignatures-Alternate.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/11i-TimeSignatures-Alternate.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 11i-TimeSignatures-Alternate.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/11i-TimeSignatures-Alternate.xml",
					import.meta.url,
				),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 11i-TimeSignatures-Alternate.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/11i-TimeSignatures-Alternate.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 12a-Clefs.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/12a-Clefs.xml", import.meta.url),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 12a-Clefs.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/12a-Clefs.xml", import.meta.url),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 12a-Clefs.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/12a-Clefs.xml", import.meta.url),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 12b-Clefs-NoKeyOrClef.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/12b-Clefs-NoKeyOrClef.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 12b-Clefs-NoKeyOrClef.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/12b-Clefs-NoKeyOrClef.xml",
					import.meta.url,
				),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 12b-Clefs-NoKeyOrClef.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/12b-Clefs-NoKeyOrClef.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 13a-KeySignatures.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/13a-KeySignatures.xml", import.meta.url),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 13a-KeySignatures.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/13a-KeySignatures.xml", import.meta.url),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 13a-KeySignatures.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/13a-KeySignatures.xml", import.meta.url),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 13b-KeySignatures-ChurchModes.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/13b-KeySignatures-ChurchModes.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 13b-KeySignatures-ChurchModes.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/13b-KeySignatures-ChurchModes.xml",
					import.meta.url,
				),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 13b-KeySignatures-ChurchModes.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/13b-KeySignatures-ChurchModes.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 13c-KeySignatures-NonTraditional.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/13c-KeySignatures-NonTraditional.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 13c-KeySignatures-NonTraditional.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/13c-KeySignatures-NonTraditional.xml",
					import.meta.url,
				),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 13c-KeySignatures-NonTraditional.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/13c-KeySignatures-NonTraditional.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 13d-KeySignatures-Microtones.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/13d-KeySignatures-Microtones.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 13d-KeySignatures-Microtones.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/13d-KeySignatures-Microtones.xml",
					import.meta.url,
				),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 13d-KeySignatures-Microtones.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/13d-KeySignatures-Microtones.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 13e-KeySignatures-Cancel.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/13e-KeySignatures-Cancel.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 13e-KeySignatures-Cancel.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/13e-KeySignatures-Cancel.xml",
					import.meta.url,
				),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 13e-KeySignatures-Cancel.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/13e-KeySignatures-Cancel.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 13f-KeySignatures-Visible.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/13f-KeySignatures-Visible.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 13f-KeySignatures-Visible.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/13f-KeySignatures-Visible.xml",
					import.meta.url,
				),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 13f-KeySignatures-Visible.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/13f-KeySignatures-Visible.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 14a-StaffDetails-LineChanges.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/14a-StaffDetails-LineChanges.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 14a-StaffDetails-LineChanges.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/14a-StaffDetails-LineChanges.xml",
					import.meta.url,
				),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 14a-StaffDetails-LineChanges.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/14a-StaffDetails-LineChanges.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 21a-Chord-Basic.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/21a-Chord-Basic.xml", import.meta.url),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 21a-Chord-Basic.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/21a-Chord-Basic.xml", import.meta.url),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 21a-Chord-Basic.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/21a-Chord-Basic.xml", import.meta.url),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 21b-Chords-TwoNotes.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/21b-Chords-TwoNotes.xml", import.meta.url),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 21b-Chords-TwoNotes.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/21b-Chords-TwoNotes.xml", import.meta.url),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 21b-Chords-TwoNotes.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/21b-Chords-TwoNotes.xml", import.meta.url),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 21c-Chords-ThreeNotesDuration.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/21c-Chords-ThreeNotesDuration.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 21c-Chords-ThreeNotesDuration.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/21c-Chords-ThreeNotesDuration.xml",
					import.meta.url,
				),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 21c-Chords-ThreeNotesDuration.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/21c-Chords-ThreeNotesDuration.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 21d-Chords-SchubertStabatMater.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/21d-Chords-SchubertStabatMater.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 21d-Chords-SchubertStabatMater.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/21d-Chords-SchubertStabatMater.xml",
					import.meta.url,
				),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 21d-Chords-SchubertStabatMater.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/21d-Chords-SchubertStabatMater.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 21e-Chords-PickupMeasures.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/21e-Chords-PickupMeasures.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 21e-Chords-PickupMeasures.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/21e-Chords-PickupMeasures.xml",
					import.meta.url,
				),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 21e-Chords-PickupMeasures.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/21e-Chords-PickupMeasures.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 21f-Chord-ElementInBetween.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/21f-Chord-ElementInBetween.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 21f-Chord-ElementInBetween.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/21f-Chord-ElementInBetween.xml",
					import.meta.url,
				),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 21f-Chord-ElementInBetween.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/21f-Chord-ElementInBetween.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 21g-Chords-Tremolos.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/21g-Chords-Tremolos.xml", import.meta.url),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 21g-Chords-Tremolos.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/21g-Chords-Tremolos.xml", import.meta.url),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 21g-Chords-Tremolos.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/21g-Chords-Tremolos.xml", import.meta.url),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 21h-Chord-Accidentals.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/21h-Chord-Accidentals.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 21h-Chord-Accidentals.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/21h-Chord-Accidentals.xml",
					import.meta.url,
				),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 21h-Chord-Accidentals.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/21h-Chord-Accidentals.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 21i-Chord-DifferentVoices.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/21i-Chord-DifferentVoices.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 21i-Chord-DifferentVoices.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/21i-Chord-DifferentVoices.xml",
					import.meta.url,
				),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 21i-Chord-DifferentVoices.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/21i-Chord-DifferentVoices.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 22a-Noteheads.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/22a-Noteheads.xml", import.meta.url),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 22a-Noteheads.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/22a-Noteheads.xml", import.meta.url),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 22a-Noteheads.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/22a-Noteheads.xml", import.meta.url),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 22b-Staff-Notestyles.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/22b-Staff-Notestyles.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 22b-Staff-Notestyles.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/22b-Staff-Notestyles.xml",
					import.meta.url,
				),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 22b-Staff-Notestyles.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/22b-Staff-Notestyles.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 22c-Noteheads-Chords.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/22c-Noteheads-Chords.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 22c-Noteheads-Chords.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/22c-Noteheads-Chords.xml",
					import.meta.url,
				),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 22c-Noteheads-Chords.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/22c-Noteheads-Chords.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 22d-Parenthesized-Noteheads.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/22d-Parenthesized-Noteheads.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 22d-Parenthesized-Noteheads.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/22d-Parenthesized-Noteheads.xml",
					import.meta.url,
				),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 22d-Parenthesized-Noteheads.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/22d-Parenthesized-Noteheads.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 23a-Tuplets.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/23a-Tuplets.xml", import.meta.url),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 23a-Tuplets.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/23a-Tuplets.xml", import.meta.url),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 23a-Tuplets.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/23a-Tuplets.xml", import.meta.url),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 23b-Tuplets-Styles.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/23b-Tuplets-Styles.xml", import.meta.url),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 23b-Tuplets-Styles.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/23b-Tuplets-Styles.xml", import.meta.url),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 23b-Tuplets-Styles.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/23b-Tuplets-Styles.xml", import.meta.url),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 23c-Tuplet-Display-NonStandard.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/23c-Tuplet-Display-NonStandard.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 23c-Tuplet-Display-NonStandard.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/23c-Tuplet-Display-NonStandard.xml",
					import.meta.url,
				),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 23c-Tuplet-Display-NonStandard.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/23c-Tuplet-Display-NonStandard.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 23d-Tuplets-Nested.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/23d-Tuplets-Nested.xml", import.meta.url),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 23d-Tuplets-Nested.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/23d-Tuplets-Nested.xml", import.meta.url),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 23d-Tuplets-Nested.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/23d-Tuplets-Nested.xml", import.meta.url),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 23e-Tuplets-Tremolo.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/23e-Tuplets-Tremolo.xml", import.meta.url),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 23e-Tuplets-Tremolo.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/23e-Tuplets-Tremolo.xml", import.meta.url),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 23e-Tuplets-Tremolo.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/23e-Tuplets-Tremolo.xml", import.meta.url),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 23f-Tuplets-DurationButNoBracket.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/23f-Tuplets-DurationButNoBracket.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 23f-Tuplets-DurationButNoBracket.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/23f-Tuplets-DurationButNoBracket.xml",
					import.meta.url,
				),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 23f-Tuplets-DurationButNoBracket.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/23f-Tuplets-DurationButNoBracket.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 24a-GraceNotes.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/24a-GraceNotes.xml", import.meta.url),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 24a-GraceNotes.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/24a-GraceNotes.xml", import.meta.url),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 24a-GraceNotes.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/24a-GraceNotes.xml", import.meta.url),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 24b-ChordAsGraceNote.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/24b-ChordAsGraceNote.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 24b-ChordAsGraceNote.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/24b-ChordAsGraceNote.xml",
					import.meta.url,
				),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 24b-ChordAsGraceNote.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/24b-ChordAsGraceNote.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 24c-GraceNote-MeasureEnd.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/24c-GraceNote-MeasureEnd.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 24c-GraceNote-MeasureEnd.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/24c-GraceNote-MeasureEnd.xml",
					import.meta.url,
				),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 24c-GraceNote-MeasureEnd.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/24c-GraceNote-MeasureEnd.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 24d-AfterGrace.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/24d-AfterGrace.xml", import.meta.url),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 24d-AfterGrace.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/24d-AfterGrace.xml", import.meta.url),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 24d-AfterGrace.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/24d-AfterGrace.xml", import.meta.url),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 24e-GraceNote-StaffChange.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/24e-GraceNote-StaffChange.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 24e-GraceNote-StaffChange.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/24e-GraceNote-StaffChange.xml",
					import.meta.url,
				),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 24e-GraceNote-StaffChange.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/24e-GraceNote-StaffChange.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 24f-GraceNote-Slur.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/24f-GraceNote-Slur.xml", import.meta.url),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 24f-GraceNote-Slur.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/24f-GraceNote-Slur.xml", import.meta.url),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 24f-GraceNote-Slur.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/24f-GraceNote-Slur.xml", import.meta.url),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 24g-GraceNote-Dynamics.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/24g-GraceNote-Dynamics.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 24g-GraceNote-Dynamics.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/24g-GraceNote-Dynamics.xml",
					import.meta.url,
				),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 24g-GraceNote-Dynamics.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/24g-GraceNote-Dynamics.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 24h-GraceNote-Simultaneous.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/24h-GraceNote-Simultaneous.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 24h-GraceNote-Simultaneous.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/24h-GraceNote-Simultaneous.xml",
					import.meta.url,
				),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 24h-GraceNote-Simultaneous.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/24h-GraceNote-Simultaneous.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 31a-Directions.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/31a-Directions.xml", import.meta.url),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 31a-Directions.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/31a-Directions.xml", import.meta.url),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 31a-Directions.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/31a-Directions.xml", import.meta.url),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 31b-Directions-Order.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/31b-Directions-Order.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 31b-Directions-Order.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/31b-Directions-Order.xml",
					import.meta.url,
				),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 31b-Directions-Order.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/31b-Directions-Order.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 31c-MetronomeMarks.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/31c-MetronomeMarks.xml", import.meta.url),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 31c-MetronomeMarks.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/31c-MetronomeMarks.xml", import.meta.url),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 31c-MetronomeMarks.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/31c-MetronomeMarks.xml", import.meta.url),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 31d-Directions-Compounds.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/31d-Directions-Compounds.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 31d-Directions-Compounds.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/31d-Directions-Compounds.xml",
					import.meta.url,
				),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 31d-Directions-Compounds.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/31d-Directions-Compounds.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 31f-Direction-Multiline-Compounds.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/31f-Direction-Multiline-Compounds.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 31f-Direction-Multiline-Compounds.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/31f-Direction-Multiline-Compounds.xml",
					import.meta.url,
				),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 31f-Direction-Multiline-Compounds.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/31f-Direction-Multiline-Compounds.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 32a-Notations.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/32a-Notations.xml", import.meta.url),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 32a-Notations.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/32a-Notations.xml", import.meta.url),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 32a-Notations.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/32a-Notations.xml", import.meta.url),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 32b-Articulations-Texts.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/32b-Articulations-Texts.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 32b-Articulations-Texts.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/32b-Articulations-Texts.xml",
					import.meta.url,
				),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 32b-Articulations-Texts.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/32b-Articulations-Texts.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 32c-MultipleNotationChildren.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/32c-MultipleNotationChildren.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 32c-MultipleNotationChildren.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/32c-MultipleNotationChildren.xml",
					import.meta.url,
				),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 32c-MultipleNotationChildren.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/32c-MultipleNotationChildren.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 32d-Arpeggio.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/32d-Arpeggio.xml", import.meta.url),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 32d-Arpeggio.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/32d-Arpeggio.xml", import.meta.url),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 32d-Arpeggio.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/32d-Arpeggio.xml", import.meta.url),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 32e-Arpeggios-Cross.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/32e-Arpeggios-Cross.xml", import.meta.url),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 32e-Arpeggios-Cross.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/32e-Arpeggios-Cross.xml", import.meta.url),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 32e-Arpeggios-Cross.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/32e-Arpeggios-Cross.xml", import.meta.url),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 33a-Spanners.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/33a-Spanners.xml", import.meta.url),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 33a-Spanners.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/33a-Spanners.xml", import.meta.url),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 33a-Spanners.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/33a-Spanners.xml", import.meta.url),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 33b-Spanners-Tie.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/33b-Spanners-Tie.xml", import.meta.url),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 33b-Spanners-Tie.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/33b-Spanners-Tie.xml", import.meta.url),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 33b-Spanners-Tie.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/33b-Spanners-Tie.xml", import.meta.url),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 33c-Spanners-Slurs.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/33c-Spanners-Slurs.xml", import.meta.url),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 33c-Spanners-Slurs.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/33c-Spanners-Slurs.xml", import.meta.url),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 33c-Spanners-Slurs.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/33c-Spanners-Slurs.xml", import.meta.url),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 33da-Spanners-OctaveShifts-before.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/33da-Spanners-OctaveShifts-before.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 33da-Spanners-OctaveShifts-before.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/33da-Spanners-OctaveShifts-before.xml",
					import.meta.url,
				),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 33da-Spanners-OctaveShifts-before.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/33da-Spanners-OctaveShifts-before.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 33db-Spanners-OctaveShifts-after.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/33db-Spanners-OctaveShifts-after.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 33db-Spanners-OctaveShifts-after.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/33db-Spanners-OctaveShifts-after.xml",
					import.meta.url,
				),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 33db-Spanners-OctaveShifts-after.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/33db-Spanners-OctaveShifts-after.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 33e-Spanners-OctaveShifts-InvalidSize.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/33e-Spanners-OctaveShifts-InvalidSize.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 33e-Spanners-OctaveShifts-InvalidSize.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/33e-Spanners-OctaveShifts-InvalidSize.xml",
					import.meta.url,
				),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 33e-Spanners-OctaveShifts-InvalidSize.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/33e-Spanners-OctaveShifts-InvalidSize.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 33f-Trill-EndingOnGraceNote.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/33f-Trill-EndingOnGraceNote.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 33f-Trill-EndingOnGraceNote.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/33f-Trill-EndingOnGraceNote.xml",
					import.meta.url,
				),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 33f-Trill-EndingOnGraceNote.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/33f-Trill-EndingOnGraceNote.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 33g-Slur-ChordedNotes.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/33g-Slur-ChordedNotes.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 33g-Slur-ChordedNotes.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/33g-Slur-ChordedNotes.xml",
					import.meta.url,
				),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 33g-Slur-ChordedNotes.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/33g-Slur-ChordedNotes.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 33h-Spanners-Glissando.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/33h-Spanners-Glissando.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 33h-Spanners-Glissando.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/33h-Spanners-Glissando.xml",
					import.meta.url,
				),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 33h-Spanners-Glissando.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/33h-Spanners-Glissando.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 33i-Ties-NotEnded.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/33i-Ties-NotEnded.xml", import.meta.url),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 33i-Ties-NotEnded.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/33i-Ties-NotEnded.xml", import.meta.url),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 33i-Ties-NotEnded.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/33i-Ties-NotEnded.xml", import.meta.url),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 33j-Beams-Tremolos.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/33j-Beams-Tremolos.xml", import.meta.url),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 33j-Beams-Tremolos.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/33j-Beams-Tremolos.xml", import.meta.url),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 33j-Beams-Tremolos.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/33j-Beams-Tremolos.xml", import.meta.url),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 33k-Tie-Types.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/33k-Tie-Types.xml", import.meta.url),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 33k-Tie-Types.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/33k-Tie-Types.xml", import.meta.url),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 33k-Tie-Types.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/33k-Tie-Types.xml", import.meta.url),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 34a-Print-Object-Spanners.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/34a-Print-Object-Spanners.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 34a-Print-Object-Spanners.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/34a-Print-Object-Spanners.xml",
					import.meta.url,
				),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 34a-Print-Object-Spanners.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/34a-Print-Object-Spanners.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 34b-Colors.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/34b-Colors.xml", import.meta.url),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 34b-Colors.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/34b-Colors.xml", import.meta.url),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 34b-Colors.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/34b-Colors.xml", import.meta.url),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 34c-Font-Size.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/34c-Font-Size.xml", import.meta.url),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 34c-Font-Size.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/34c-Font-Size.xml", import.meta.url),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 34c-Font-Size.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/34c-Font-Size.xml", import.meta.url),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 34d-Note-Attributes.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/34d-Note-Attributes.xml", import.meta.url),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 34d-Note-Attributes.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/34d-Note-Attributes.xml", import.meta.url),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 34d-Note-Attributes.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/34d-Note-Attributes.xml", import.meta.url),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 41a-MultiParts-Partorder.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/41a-MultiParts-Partorder.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 41a-MultiParts-Partorder.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/41a-MultiParts-Partorder.xml",
					import.meta.url,
				),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 41a-MultiParts-Partorder.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/41a-MultiParts-Partorder.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 41b-MultiParts-MoreThan10.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/41b-MultiParts-MoreThan10.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 41b-MultiParts-MoreThan10.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/41b-MultiParts-MoreThan10.xml",
					import.meta.url,
				),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 41b-MultiParts-MoreThan10.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/41b-MultiParts-MoreThan10.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 41c-StaffGroups.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/41c-StaffGroups.xml", import.meta.url),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 41c-StaffGroups.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/41c-StaffGroups.xml", import.meta.url),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 41c-StaffGroups.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/41c-StaffGroups.xml", import.meta.url),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 41d-StaffGroups-Nested.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/41d-StaffGroups-Nested.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 41d-StaffGroups-Nested.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/41d-StaffGroups-Nested.xml",
					import.meta.url,
				),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 41d-StaffGroups-Nested.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/41d-StaffGroups-Nested.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 41e-StaffGroups-InstrumentNames-Linebroken.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/41e-StaffGroups-InstrumentNames-Linebroken.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 41e-StaffGroups-InstrumentNames-Linebroken.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/41e-StaffGroups-InstrumentNames-Linebroken.xml",
					import.meta.url,
				),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 41e-StaffGroups-InstrumentNames-Linebroken.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/41e-StaffGroups-InstrumentNames-Linebroken.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 41f-StaffGroups-Overlapping.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/41f-StaffGroups-Overlapping.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 41f-StaffGroups-Overlapping.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/41f-StaffGroups-Overlapping.xml",
					import.meta.url,
				),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 41f-StaffGroups-Overlapping.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/41f-StaffGroups-Overlapping.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 41g-StaffGroups-NestingOrder.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/41g-StaffGroups-NestingOrder.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 41g-StaffGroups-NestingOrder.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/41g-StaffGroups-NestingOrder.xml",
					import.meta.url,
				),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 41g-StaffGroups-NestingOrder.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/41g-StaffGroups-NestingOrder.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 41h-TooManyParts.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/41h-TooManyParts.xml", import.meta.url),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 41h-TooManyParts.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/41h-TooManyParts.xml", import.meta.url),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 41h-TooManyParts.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/41h-TooManyParts.xml", import.meta.url),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 41i-PartNameDisplay-Override.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/41i-PartNameDisplay-Override.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 41i-PartNameDisplay-Override.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/41i-PartNameDisplay-Override.xml",
					import.meta.url,
				),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 41i-PartNameDisplay-Override.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/41i-PartNameDisplay-Override.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 41j-PartNameDisplay-Multiple-DisplayText-Children.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/41j-PartNameDisplay-Multiple-DisplayText-Children.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 41j-PartNameDisplay-Multiple-DisplayText-Children.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/41j-PartNameDisplay-Multiple-DisplayText-Children.xml",
					import.meta.url,
				),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 41j-PartNameDisplay-Multiple-DisplayText-Children.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/41j-PartNameDisplay-Multiple-DisplayText-Children.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 41k-PartName-Print.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/41k-PartName-Print.xml", import.meta.url),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 41k-PartName-Print.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/41k-PartName-Print.xml", import.meta.url),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 41k-PartName-Print.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/41k-PartName-Print.xml", import.meta.url),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 41l-GroupNameDisplay-Override.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/41l-GroupNameDisplay-Override.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 41l-GroupNameDisplay-Override.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/41l-GroupNameDisplay-Override.xml",
					import.meta.url,
				),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 41l-GroupNameDisplay-Override.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/41l-GroupNameDisplay-Override.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 42a-MultiVoice-TwoVoicesOnStaff-Lyrics.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/42a-MultiVoice-TwoVoicesOnStaff-Lyrics.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 42a-MultiVoice-TwoVoicesOnStaff-Lyrics.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/42a-MultiVoice-TwoVoicesOnStaff-Lyrics.xml",
					import.meta.url,
				),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 42a-MultiVoice-TwoVoicesOnStaff-Lyrics.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/42a-MultiVoice-TwoVoicesOnStaff-Lyrics.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 42b-MultiVoice-MidMeasureClefChange.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/42b-MultiVoice-MidMeasureClefChange.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 42b-MultiVoice-MidMeasureClefChange.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/42b-MultiVoice-MidMeasureClefChange.xml",
					import.meta.url,
				),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 42b-MultiVoice-MidMeasureClefChange.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/42b-MultiVoice-MidMeasureClefChange.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 43a-PianoStaff.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/43a-PianoStaff.xml", import.meta.url),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 43a-PianoStaff.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/43a-PianoStaff.xml", import.meta.url),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 43a-PianoStaff.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/43a-PianoStaff.xml", import.meta.url),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 43b-MultiStaff-DifferentKeys.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/43b-MultiStaff-DifferentKeys.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 43b-MultiStaff-DifferentKeys.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/43b-MultiStaff-DifferentKeys.xml",
					import.meta.url,
				),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 43b-MultiStaff-DifferentKeys.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/43b-MultiStaff-DifferentKeys.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 43c-MultiStaff-DifferentKeysAfterBackup.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/43c-MultiStaff-DifferentKeysAfterBackup.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 43c-MultiStaff-DifferentKeysAfterBackup.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/43c-MultiStaff-DifferentKeysAfterBackup.xml",
					import.meta.url,
				),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 43c-MultiStaff-DifferentKeysAfterBackup.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/43c-MultiStaff-DifferentKeysAfterBackup.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 43d-MultiStaff-StaffChange.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/43d-MultiStaff-StaffChange.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 43d-MultiStaff-StaffChange.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/43d-MultiStaff-StaffChange.xml",
					import.meta.url,
				),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 43d-MultiStaff-StaffChange.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/43d-MultiStaff-StaffChange.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 43e-Multistaff-ClefDynamics.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/43e-Multistaff-ClefDynamics.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 43e-Multistaff-ClefDynamics.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/43e-Multistaff-ClefDynamics.xml",
					import.meta.url,
				),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 43e-Multistaff-ClefDynamics.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/43e-Multistaff-ClefDynamics.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 43f-MultiStaff-Lyrics.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/43f-MultiStaff-Lyrics.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 43f-MultiStaff-Lyrics.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/43f-MultiStaff-Lyrics.xml",
					import.meta.url,
				),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 43f-MultiStaff-Lyrics.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/43f-MultiStaff-Lyrics.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 43g-MultiStaff-PartSymbol.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/43g-MultiStaff-PartSymbol.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 43g-MultiStaff-PartSymbol.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/43g-MultiStaff-PartSymbol.xml",
					import.meta.url,
				),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 43g-MultiStaff-PartSymbol.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/43g-MultiStaff-PartSymbol.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 43h-MultiStaff-Chords.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/43h-MultiStaff-Chords.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 43h-MultiStaff-Chords.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/43h-MultiStaff-Chords.xml",
					import.meta.url,
				),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 43h-MultiStaff-Chords.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/43h-MultiStaff-Chords.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 43i-MultiStaff-StaffChange-SingleVoice.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/43i-MultiStaff-StaffChange-SingleVoice.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 43i-MultiStaff-StaffChange-SingleVoice.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/43i-MultiStaff-StaffChange-SingleVoice.xml",
					import.meta.url,
				),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 43i-MultiStaff-StaffChange-SingleVoice.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/43i-MultiStaff-StaffChange-SingleVoice.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 43j-MultiStaff-TimeSignatureAfterBackup.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/43j-MultiStaff-TimeSignatureAfterBackup.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 43j-MultiStaff-TimeSignatureAfterBackup.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/43j-MultiStaff-TimeSignatureAfterBackup.xml",
					import.meta.url,
				),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 43j-MultiStaff-TimeSignatureAfterBackup.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/43j-MultiStaff-TimeSignatureAfterBackup.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 45a-SimpleRepeat.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/45a-SimpleRepeat.xml", import.meta.url),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 45a-SimpleRepeat.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/45a-SimpleRepeat.xml", import.meta.url),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 45a-SimpleRepeat.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/45a-SimpleRepeat.xml", import.meta.url),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 45b-RepeatWithAlternatives.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/45b-RepeatWithAlternatives.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 45b-RepeatWithAlternatives.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/45b-RepeatWithAlternatives.xml",
					import.meta.url,
				),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 45b-RepeatWithAlternatives.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/45b-RepeatWithAlternatives.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 45c-SimpleRepeat-Nested.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/45c-SimpleRepeat-Nested.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 45c-SimpleRepeat-Nested.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/45c-SimpleRepeat-Nested.xml",
					import.meta.url,
				),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 45c-SimpleRepeat-Nested.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/45c-SimpleRepeat-Nested.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 45d-Repeats-MultipleEndings.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/45d-Repeats-MultipleEndings.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 45d-Repeats-MultipleEndings.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/45d-Repeats-MultipleEndings.xml",
					import.meta.url,
				),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 45d-Repeats-MultipleEndings.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/45d-Repeats-MultipleEndings.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 45e-Repeats-Combination.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/45e-Repeats-Combination.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 45e-Repeats-Combination.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/45e-Repeats-Combination.xml",
					import.meta.url,
				),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 45e-Repeats-Combination.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/45e-Repeats-Combination.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 45f-Repeats-InvalidEndings.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/45f-Repeats-InvalidEndings.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 45f-Repeats-InvalidEndings.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/45f-Repeats-InvalidEndings.xml",
					import.meta.url,
				),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 45f-Repeats-InvalidEndings.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/45f-Repeats-InvalidEndings.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 45g-Repeats-NotEnded.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/45g-Repeats-NotEnded.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 45g-Repeats-NotEnded.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/45g-Repeats-NotEnded.xml",
					import.meta.url,
				),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 45g-Repeats-NotEnded.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/45g-Repeats-NotEnded.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 45h-Repeats-Partial.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/45h-Repeats-Partial.xml", import.meta.url),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 45h-Repeats-Partial.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/45h-Repeats-Partial.xml", import.meta.url),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 45h-Repeats-Partial.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/45h-Repeats-Partial.xml", import.meta.url),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 45i-Repeats-Nested.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/45i-Repeats-Nested.xml", import.meta.url),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 45i-Repeats-Nested.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/45i-Repeats-Nested.xml", import.meta.url),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 45i-Repeats-Nested.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/45i-Repeats-Nested.xml", import.meta.url),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 45j-SimpleRepeat-Start.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/45j-SimpleRepeat-Start.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 45j-SimpleRepeat-Start.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/45j-SimpleRepeat-Start.xml",
					import.meta.url,
				),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 45j-SimpleRepeat-Start.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/45j-SimpleRepeat-Start.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 45k-Repeats-Chords-FiguredBass.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/45k-Repeats-Chords-FiguredBass.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 45k-Repeats-Chords-FiguredBass.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/45k-Repeats-Chords-FiguredBass.xml",
					import.meta.url,
				),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 45k-Repeats-Chords-FiguredBass.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/45k-Repeats-Chords-FiguredBass.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 46a-Barlines.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/46a-Barlines.xml", import.meta.url),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 46a-Barlines.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/46a-Barlines.xml", import.meta.url),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 46a-Barlines.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/46a-Barlines.xml", import.meta.url),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 46b-MidmeasureBarline.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/46b-MidmeasureBarline.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 46b-MidmeasureBarline.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/46b-MidmeasureBarline.xml",
					import.meta.url,
				),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 46b-MidmeasureBarline.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/46b-MidmeasureBarline.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 46c-Midmeasure-Clef.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/46c-Midmeasure-Clef.xml", import.meta.url),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 46c-Midmeasure-Clef.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/46c-Midmeasure-Clef.xml", import.meta.url),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 46c-Midmeasure-Clef.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/46c-Midmeasure-Clef.xml", import.meta.url),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 46d-PickupMeasure-ImplicitMeasures.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/46d-PickupMeasure-ImplicitMeasures.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 46d-PickupMeasure-ImplicitMeasures.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/46d-PickupMeasure-ImplicitMeasures.xml",
					import.meta.url,
				),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 46d-PickupMeasure-ImplicitMeasures.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/46d-PickupMeasure-ImplicitMeasures.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 46e-PickupMeasure-SecondVoiceStartsLater.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/46e-PickupMeasure-SecondVoiceStartsLater.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 46e-PickupMeasure-SecondVoiceStartsLater.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/46e-PickupMeasure-SecondVoiceStartsLater.xml",
					import.meta.url,
				),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 46e-PickupMeasure-SecondVoiceStartsLater.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/46e-PickupMeasure-SecondVoiceStartsLater.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 46f-IncompleteMeasures.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/46f-IncompleteMeasures.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 46f-IncompleteMeasures.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/46f-IncompleteMeasures.xml",
					import.meta.url,
				),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 46f-IncompleteMeasures.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/46f-IncompleteMeasures.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 46g-PickupMeasure-Chordnames-FiguredBass.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/46g-PickupMeasure-Chordnames-FiguredBass.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 46g-PickupMeasure-Chordnames-FiguredBass.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/46g-PickupMeasure-Chordnames-FiguredBass.xml",
					import.meta.url,
				),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 46g-PickupMeasure-Chordnames-FiguredBass.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/46g-PickupMeasure-Chordnames-FiguredBass.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 46h-Barline-Fermata.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/46h-Barline-Fermata.xml", import.meta.url),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 46h-Barline-Fermata.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/46h-Barline-Fermata.xml", import.meta.url),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 46h-Barline-Fermata.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/46h-Barline-Fermata.xml", import.meta.url),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 46i-OverfullMeasures.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/46i-OverfullMeasures.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 46i-OverfullMeasures.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/46i-OverfullMeasures.xml",
					import.meta.url,
				),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 46i-OverfullMeasures.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/46i-OverfullMeasures.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 46j-EmptyMeasure.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/46j-EmptyMeasure.xml", import.meta.url),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 46j-EmptyMeasure.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/46j-EmptyMeasure.xml", import.meta.url),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 46j-EmptyMeasure.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/46j-EmptyMeasure.xml", import.meta.url),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 51a-Header-Credits.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/51a-Header-Credits.xml", import.meta.url),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 51a-Header-Credits.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/51a-Header-Credits.xml", import.meta.url),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 51a-Header-Credits.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/51a-Header-Credits.xml", import.meta.url),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 51b-Header-Quotes.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/51b-Header-Quotes.xml", import.meta.url),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 51b-Header-Quotes.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/51b-Header-Quotes.xml", import.meta.url),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 51b-Header-Quotes.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/51b-Header-Quotes.xml", import.meta.url),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 51c-MultipleMetadata.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/51c-MultipleMetadata.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 51c-MultipleMetadata.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/51c-MultipleMetadata.xml",
					import.meta.url,
				),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 51c-MultipleMetadata.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/51c-MultipleMetadata.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 51d-EmptyTitle.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/51d-EmptyTitle.xml", import.meta.url),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 51d-EmptyTitle.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/51d-EmptyTitle.xml", import.meta.url),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 51d-EmptyTitle.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/51d-EmptyTitle.xml", import.meta.url),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 52a-PageLayout.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/52a-PageLayout.xml", import.meta.url),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 52a-PageLayout.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/52a-PageLayout.xml", import.meta.url),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 52a-PageLayout.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/52a-PageLayout.xml", import.meta.url),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 52b-Breaks.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/52b-Breaks.xml", import.meta.url),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 52b-Breaks.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/52b-Breaks.xml", import.meta.url),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 52b-Breaks.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/52b-Breaks.xml", import.meta.url),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 61a-Lyrics.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/61a-Lyrics.xml", import.meta.url),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 61a-Lyrics.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/61a-Lyrics.xml", import.meta.url),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 61a-Lyrics.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/61a-Lyrics.xml", import.meta.url),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 61b-MultipleLyrics.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/61b-MultipleLyrics.xml", import.meta.url),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 61b-MultipleLyrics.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/61b-MultipleLyrics.xml", import.meta.url),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 61b-MultipleLyrics.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/61b-MultipleLyrics.xml", import.meta.url),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 61c-Lyrics-Pianostaff.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/61c-Lyrics-Pianostaff.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 61c-Lyrics-Pianostaff.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/61c-Lyrics-Pianostaff.xml",
					import.meta.url,
				),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 61c-Lyrics-Pianostaff.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/61c-Lyrics-Pianostaff.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 61d-Lyrics-Melisma.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/61d-Lyrics-Melisma.xml", import.meta.url),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 61d-Lyrics-Melisma.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/61d-Lyrics-Melisma.xml", import.meta.url),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 61d-Lyrics-Melisma.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/61d-Lyrics-Melisma.xml", import.meta.url),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 61e-Lyrics-Chords.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/61e-Lyrics-Chords.xml", import.meta.url),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 61e-Lyrics-Chords.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/61e-Lyrics-Chords.xml", import.meta.url),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 61e-Lyrics-Chords.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/61e-Lyrics-Chords.xml", import.meta.url),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 61f-Lyrics-GracedNotes.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/61f-Lyrics-GracedNotes.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 61f-Lyrics-GracedNotes.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/61f-Lyrics-GracedNotes.xml",
					import.meta.url,
				),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 61f-Lyrics-GracedNotes.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/61f-Lyrics-GracedNotes.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 61g-Lyrics-NameNumber.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/61g-Lyrics-NameNumber.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 61g-Lyrics-NameNumber.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/61g-Lyrics-NameNumber.xml",
					import.meta.url,
				),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 61g-Lyrics-NameNumber.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/61g-Lyrics-NameNumber.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 61h-Lyrics-BeamsMelismata.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/61h-Lyrics-BeamsMelismata.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 61h-Lyrics-BeamsMelismata.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/61h-Lyrics-BeamsMelismata.xml",
					import.meta.url,
				),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 61h-Lyrics-BeamsMelismata.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/61h-Lyrics-BeamsMelismata.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 61i-Lyrics-Chords.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/61i-Lyrics-Chords.xml", import.meta.url),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 61i-Lyrics-Chords.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/61i-Lyrics-Chords.xml", import.meta.url),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 61i-Lyrics-Chords.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/61i-Lyrics-Chords.xml", import.meta.url),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 61j-Lyrics-Elisions.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/61j-Lyrics-Elisions.xml", import.meta.url),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 61j-Lyrics-Elisions.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/61j-Lyrics-Elisions.xml", import.meta.url),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 61j-Lyrics-Elisions.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/61j-Lyrics-Elisions.xml", import.meta.url),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 61k-Lyrics-SpannersExtenders.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/61k-Lyrics-SpannersExtenders.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 61k-Lyrics-SpannersExtenders.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/61k-Lyrics-SpannersExtenders.xml",
					import.meta.url,
				),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 61k-Lyrics-SpannersExtenders.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/61k-Lyrics-SpannersExtenders.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 71a-Chordnames.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/71a-Chordnames.xml", import.meta.url),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 71a-Chordnames.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/71a-Chordnames.xml", import.meta.url),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 71a-Chordnames.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/71a-Chordnames.xml", import.meta.url),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 71b-Chordnames-Kinds.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/71b-Chordnames-Kinds.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 71b-Chordnames-Kinds.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/71b-Chordnames-Kinds.xml",
					import.meta.url,
				),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 71b-Chordnames-Kinds.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/71b-Chordnames-Kinds.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 71c-ChordsFrets.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/71c-ChordsFrets.xml", import.meta.url),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 71c-ChordsFrets.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/71c-ChordsFrets.xml", import.meta.url),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 71c-ChordsFrets.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/71c-ChordsFrets.xml", import.meta.url),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 71d-ChordsFrets-Multistaff.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/71d-ChordsFrets-Multistaff.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 71d-ChordsFrets-Multistaff.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/71d-ChordsFrets-Multistaff.xml",
					import.meta.url,
				),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 71d-ChordsFrets-Multistaff.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/71d-ChordsFrets-Multistaff.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 71e-TabStaves.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/71e-TabStaves.xml", import.meta.url),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 71e-TabStaves.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/71e-TabStaves.xml", import.meta.url),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 71e-TabStaves.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/71e-TabStaves.xml", import.meta.url),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 71f-AllChordTypes.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/71f-AllChordTypes.xml", import.meta.url),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 71f-AllChordTypes.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/71f-AllChordTypes.xml", import.meta.url),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 71f-AllChordTypes.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/71f-AllChordTypes.xml", import.meta.url),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 71g-MultipleChordnames.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/71g-MultipleChordnames.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 71g-MultipleChordnames.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/71g-MultipleChordnames.xml",
					import.meta.url,
				),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 71g-MultipleChordnames.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/71g-MultipleChordnames.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 72a-TransposingInstruments.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/72a-TransposingInstruments.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 72a-TransposingInstruments.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/72a-TransposingInstruments.xml",
					import.meta.url,
				),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 72a-TransposingInstruments.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/72a-TransposingInstruments.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 72b-TransposingInstruments-Full.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/72b-TransposingInstruments-Full.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 72b-TransposingInstruments-Full.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/72b-TransposingInstruments-Full.xml",
					import.meta.url,
				),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 72b-TransposingInstruments-Full.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/72b-TransposingInstruments-Full.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 72c-TransposingInstruments-Change.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/72c-TransposingInstruments-Change.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 72c-TransposingInstruments-Change.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/72c-TransposingInstruments-Change.xml",
					import.meta.url,
				),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 72c-TransposingInstruments-Change.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/72c-TransposingInstruments-Change.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 73a-Percussion.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/73a-Percussion.xml", import.meta.url),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 73a-Percussion.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/73a-Percussion.xml", import.meta.url),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 73a-Percussion.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/73a-Percussion.xml", import.meta.url),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 74a-FiguredBass.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/74a-FiguredBass.xml", import.meta.url),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 74a-FiguredBass.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/74a-FiguredBass.xml", import.meta.url),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 74a-FiguredBass.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL("./examples/lilypond/74a-FiguredBass.xml", import.meta.url),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 75a-AccordionRegistrations.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/75a-AccordionRegistrations.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 75a-AccordionRegistrations.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/75a-AccordionRegistrations.xml",
					import.meta.url,
				),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 75a-AccordionRegistrations.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/75a-AccordionRegistrations.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 90a-Compressed-MusicXML.mxl", async () => {
		const doc = await new MDOMParser().parseFromBlob(
			Bun.file(
				new URL(
					"./examples/lilypond/90a-Compressed-MusicXML.mxl",
					import.meta.url,
				),
			),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 90a-Compressed-MusicXML.mxl", async () => {
		const doc = await new MDOMParser().parseFromBlob(
			Bun.file(
				new URL(
					"./examples/lilypond/90a-Compressed-MusicXML.mxl",
					import.meta.url,
				),
			),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 90a-Compressed-MusicXML.mxl", async () => {
		const doc = await new MDOMParser().parseFromBlob(
			Bun.file(
				new URL(
					"./examples/lilypond/90a-Compressed-MusicXML.mxl",
					import.meta.url,
				),
			),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 99a-Sibelius5-IgnoreBeaming.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/99a-Sibelius5-IgnoreBeaming.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 99a-Sibelius5-IgnoreBeaming.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/99a-Sibelius5-IgnoreBeaming.xml",
					import.meta.url,
				),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 99a-Sibelius5-IgnoreBeaming.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/99a-Sibelius5-IgnoreBeaming.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
	it("contains a non-empty score for 99b-Lyrics-BeamsMelismata-IgnoreBeams.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/99b-Lyrics-BeamsMelismata-IgnoreBeams.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(doc.score.parts.some((part) => part.measures.length > 0)).toBe(true);
	});
	it("reaches a round-trip fixpoint for 99b-Lyrics-BeamsMelismata-IgnoreBeams.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/99b-Lyrics-BeamsMelismata-IgnoreBeams.xml",
					import.meta.url,
				),
			).text(),
		);
		const once = new MusicXMLSerializer().serializeToString(doc);
		const twice = new MusicXMLSerializer().serializeToString(
			new MDOMParser().parseFromString(once),
		);
		expect(twice).toBe(once);
	});
	it("satisfies the output XSD for 99b-Lyrics-BeamsMelismata-IgnoreBeams.xml", async () => {
		const doc = new MDOMParser().parseFromString(
			await Bun.file(
				new URL(
					"./examples/lilypond/99b-Lyrics-BeamsMelismata-IgnoreBeams.xml",
					import.meta.url,
				),
			).text(),
		);
		expect(schemaErrors(doc)).toEqual([]);
	});
});
