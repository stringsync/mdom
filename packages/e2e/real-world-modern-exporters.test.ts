import { describe, expect, it } from "bun:test";
import { EXAMPLES, loadScore } from "./examples";

describe("modern exporter dialects", () => {
	it("reads GP8 tab tuning while leaving GP processing-instruction content opaque", () => {
		const score = loadScore(EXAMPLES.ALOOF_GP8);
		expect(score.parts).toHaveLength(1);
		const part = score.parts[0]!;
		expect(part.measures).toHaveLength(16);
		const notes = part.measures.flatMap((measure) => measure.notes);
		expect(notes).toHaveLength(272);
		expect(notes.filter((note) => note.hammerOns.length > 0)).toHaveLength(32);
		// GP8 puts staff 1's tuning inside a <?GP ... ?> instruction;
		// only staff 2 has actual MusicXML staff-tuning elements.
		expect(part.getStaffTunings("1")).toEqual([]);
		expect(part.getStaffTunings("2").map((tuning) => tuning.midi)).toEqual([
			40, 45, 50, 55, 59, 64,
		]);
	});

	it("reads the user-supplied Guitar Pro notation and tab across sixteen bars", () => {
		const score = loadScore(EXAMPLES.ALOOF_GP7);
		expect(score.parts).toHaveLength(1);
		const part = score.parts[0]!;
		expect(part.measures).toHaveLength(16);
		const notes = part.measures.flatMap((measure) => measure.notes);
		expect(notes).toHaveLength(272);
		expect(notes.filter((note) => note.hammerOns.length > 0)).toHaveLength(32);
	});

	it("reads the Sibelius drop-D tab string and fret independently of the notation part", () => {
		const score = loadScore(EXAMPLES.SIBELIUS_2023_TAB);
		expect(score.parts).toHaveLength(2);
		const tab = score.parts[1]!;
		expect(tab.getStaffTunings().map((tuning) => tuning.midi)).toEqual([
			38, 45, 50, 55, 59, 64,
		]);
		const note = tab.measures[0]!.notes[0]!;
		expect(note.string).toBe(6);
		expect(note.fret).toBe(3);
	});

	it("reads the Sibelius default fonts as family lists without sizes", () => {
		const score = loadScore(EXAMPLES.SIBELIUS_2023_TAB);
		expect(score.musicFont!.family).toBe("Helsinki Std,engraved");
		expect(score.wordFont).toEqual({
			family: "Palatino,serif",
			size: null,
			style: null,
			weight: null,
		});
	});

	it("reads a Sibelius lyric font and language", () => {
		const score = loadScore(EXAMPLES.COMPOSER_ONE_LINE);
		expect(score.musicFont).toMatchObject({
			family: "Opus Std",
			size: 19.8425,
		});
		expect(score.getLyricFont()!.font).toMatchObject({
			family: "Times New Roman",
			size: 11.4715,
		});
		expect(score.getLyricLanguage()!.language).toBe("en");
	});

	it("reads both Dorico notations blocks on the tied bass note", () => {
		const score = loadScore(EXAMPLES.DORICO_4_NOTATIONS);
		expect(score.parts).toHaveLength(4);
		const note = score.parts[3]!.measures[3]!.notes[1]!;
		expect(note.childrenNamed("notations")).toHaveLength(2);
		expect(note.ties).toHaveLength(1);
		expect(note.slurs).toHaveLength(1);
		expect(note.ties[0]!.partner).not.toBeNull();
		expect(note.slurs[0]!.partner).not.toBeNull();
	});

	it("reads MuseScore 4 tempo marks on directions it limits to the top system", () => {
		const score = loadScore(EXAMPLES.MUSESCORE_4_TEMPO_CHANGE);
		const directions = score.parts[0]!.measures.flatMap(
			(measure) => measure.directions,
		);
		expect(directions.map((direction) => direction.soundTempo)).toEqual([
			120, 60,
		]);
		expect(
			directions.map((direction) => direction.metronome?.perMinute),
		).toEqual(["120", "60"]);
		// MusicXML 4.0's system attribute, which MuseScore 4 writes on tempo marks.
		expect(
			directions.map((direction) => direction.getAttribute("system")),
		).toEqual(["only-top", "only-top"]);
	});

	it("reads Flat ukulele and bass tab, flute lyrics, and its separate tempo sound", () => {
		const score = loadScore(EXAMPLES.FLAT_LA_CUCARACHA);
		expect(score.parts).toHaveLength(3);
		const [ukulele, flute, bass] = score.parts;
		// Re-entrant ukulele tuning: string 4 is G4, above the C4 of string 3.
		expect(ukulele!.getStaffTunings().map((tuning) => tuning.midi)).toEqual([
			67, 60, 64, 69,
		]);
		expect(bass!.getStaffTunings().map((tuning) => tuning.midi)).toEqual([
			28, 33, 38, 43,
		]);
		const fretted = ukulele!.measures
			.flatMap((measure) => measure.notes)
			.find((note) => note.fret !== null)!;
		expect(fretted.string).toBe(3);
		expect(fretted.fret).toBe(0);
		expect(
			flute!.measures
				.flatMap((measure) => measure.notes)
				.filter((note) => note.lyrics.length > 0),
		).toHaveLength(35);
		// Flat writes the metronome (half = 80) with no <sound>, then an empty
		// <sound/> and the playback tempo in quarters as measure-level <sound>s.
		const first = ukulele!.measures[0]!;
		expect(first.directions[0]!.metronome?.perMinute).toBe("80");
		expect(first.directions[0]!.sound).toBeNull();
		expect(first.sounds.map((sound) => sound.tempo)).toEqual([null, 160]);
	});
});
