import { describe, expect, it } from "bun:test";
import { MDocument } from "./m-document";
import { MDOMParser } from "./m-dom-parser";
import { schemaErrors } from "./music-xml-schema";
import { MusicXMLSerializer } from "./music-xml-serializer";
import type { Note } from "./note";

/** A one-part guitar document with a voice ready for notes. */
const build = () => {
	const doc = MDocument.empty();
	const measure = doc.score.addPart({ id: "P1", name: "Guitar" }).addMeasure();
	measure.setDivisions(4);
	measure.setClef({ sign: "G", line: 2 });
	measure.setTime({ beats: 4, beatType: 4 });
	const voice = measure.getOrCreateVoice("1");
	return { doc, measure, voice };
};

/** Serialize and parse back, returning the first measure's notes. */
const roundTrip = (doc: MDocument): Note[] =>
	new MDOMParser()
		.parseFromString(new MusicXMLSerializer().serializeToString(doc))
		.score.getPart("P1")!
		.getMeasure("1")!.notes;

describe("note technique writers", () => {
	it("writes bends, pre-bends and releases as schema-valid <bend>s", () => {
		const { doc, voice } = build();
		const plain = voice.addNote({ step: "G", octave: 3, type: "quarter" });
		const released = voice.addNote({ step: "G", octave: 3, type: "quarter" });
		const preBent = voice.addNote({ step: "A", octave: 3, type: "quarter" });
		const cleared = voice.addNote({ step: "A", octave: 3, type: "quarter" });
		[plain, released, preBent, cleared].forEach((note) => {
			note.setStringFret({ string: 3, fret: 7 });
		});
		plain.setBend({ semitones: 2 });
		released.setBend({ semitones: 1, release: true });
		preBent.setBend({ semitones: 2, preBend: true, release: true });
		cleared.setBend({ semitones: 2 });
		cleared.setBend(null);

		expect(plain.bend).toEqual({
			semitones: 2,
			preBend: false,
			release: false,
			withBar: null,
			shape: null,
		});
		expect(released.bend).toEqual({
			semitones: 1,
			preBend: false,
			release: true,
			withBar: null,
			shape: null,
		});
		expect(preBent.bend).toEqual({
			semitones: 2,
			preBend: true,
			release: true,
			withBar: null,
			shape: null,
		});
		expect(cleared.bend).toBeNull();
		expect(
			released.technicals
				.filter((mark) => mark.technicalType === "bend")
				.map((bend) => bend.child("bend-alter")?.text),
		).toEqual(["1", "-1"]); // a release carries the negative alter
		expect(schemaErrors(doc)).toEqual([]);

		const [plainBack, releasedBack, preBentBack, clearedBack] = roundTrip(doc);
		expect(plainBack!.bend).toEqual(plain.bend);
		expect(releasedBack!.bend).toEqual(released.bend);
		expect(preBentBack!.bend).toEqual(preBent.bend);
		expect(clearedBack!.bend).toBeNull();
		expect(clearedBack!.fret).toBe(7); // clearing the bend left the fret alone
	});

	it("replaces a bend rather than stacking a second one", () => {
		const { voice } = build();
		const note = voice.addNote({ step: "G", octave: 3, type: "whole" });
		note.setBend({ semitones: 1, release: true });
		note.setBend({ semitones: 2 });
		expect(note.technicals.map((mark) => mark.technicalType)).toEqual(["bend"]);
		expect(note.bend).toEqual({
			semitones: 2,
			preBend: false,
			release: false,
			withBar: null,
			shape: null,
		});
	});

	it("rejects a bend of no distance", () => {
		const { voice } = build();
		const note = voice.addNote({ step: "G", octave: 3, type: "whole" });
		expect(() => note.setBend({ semitones: 0 })).toThrow(/nonzero/);
		expect(() => note.setBend({ semitones: Number.NaN })).toThrow(/nonzero/);
	});

	it("writes natural and artificial harmonics", () => {
		const { doc, voice } = build();
		const natural = voice.addNote({ step: "E", octave: 5, type: "quarter" });
		const artificial = voice.addNote({ step: "E", octave: 5, type: "quarter" });
		const bare = voice.addNote({ step: "E", octave: 5, type: "quarter" });
		const cleared = voice.addNote({ step: "E", octave: 5, type: "quarter" });
		natural.setHarmonic({ kind: "natural" });
		artificial.setHarmonic({ kind: "artificial", pitch: "touching" });
		bare.setHarmonic({});
		cleared.setHarmonic({ kind: "natural" });
		cleared.setHarmonic(null);

		expect(natural.harmonic).toEqual({ kind: "natural", pitch: null });
		expect(artificial.harmonic).toEqual({
			kind: "artificial",
			pitch: "touching",
		});
		expect(bare.isHarmonic).toBe(true);
		expect(bare.harmonic).toEqual({ kind: null, pitch: null });
		expect(cleared.isHarmonic).toBe(false);
		expect(schemaErrors(doc)).toEqual([]);

		const back = roundTrip(doc);
		expect(back.map((note) => note.harmonic)).toEqual([
			{ kind: "natural", pitch: null },
			{ kind: "artificial", pitch: "touching" },
			{ kind: null, pitch: null },
			null,
		]);
	});

	it("writes dead and ghost noteheads in schema order, keeping a colour", () => {
		const { doc, voice } = build();
		const dead = voice.addNote({ step: "D", octave: 4, type: "eighth" });
		const ghost = voice.addNote({ step: "D", octave: 4, type: "eighth" });
		const both = voice.addNote({ step: "D", octave: 4, type: "eighth" });
		const cleared = voice.addNote({ step: "D", octave: 4, type: "eighth" });
		// notations for the head to precede
		[dead, ghost, both, cleared].forEach((note) => {
			note.setStringFret({ string: 4, fret: 0 });
		});
		dead.setNotehead({ value: "x" });
		ghost.setNotehead({ parentheses: true });
		both.setNotehead({ value: "x" });
		both.child("notehead")!.setAttribute("color", "#FF0000");
		both.setNotehead({ value: "x", parentheses: true, filled: false });
		cleared.setNotehead({ value: "diamond" });
		cleared.setNotehead(null);

		expect(dead.notehead).toEqual({
			value: "x",
			parentheses: false,
			filled: null,
			color: null,
		});
		expect(ghost.notehead).toMatchObject({
			value: "normal",
			parentheses: true,
		});
		expect(both.notehead).toEqual({
			value: "x",
			parentheses: true,
			filled: false,
			color: "#FF0000",
		});
		expect(cleared.notehead).toBeNull();
		expect(schemaErrors(doc)).toEqual([]);

		const back = roundTrip(doc);
		expect(back.map((note) => note.notehead)).toEqual([
			dead.notehead,
			ghost.notehead,
			both.notehead,
			null,
		]);
	});

	it("writes let ring as a let-ring tie and clears it again", () => {
		const { doc, voice } = build();
		const ringing = voice.addNote({ step: "E", octave: 4, type: "half" });
		const damped = voice.addNote({ step: "E", octave: 4, type: "half" });
		ringing.setLetRing(true);
		ringing.setLetRing(true); // idempotent
		damped.setLetRing(true);
		damped.setLetRing(false);

		expect(ringing.isLetRing).toBe(true);
		expect(ringing.ties.map((tie) => tie.tieType)).toEqual(["let-ring"]);
		expect(damped.isLetRing).toBe(false);
		expect(damped.ties).toEqual([]);
		expect(schemaErrors(doc)).toEqual([]);

		const [ringingBack, dampedBack] = roundTrip(doc);
		expect(ringingBack!.isLetRing).toBe(true);
		expect(dampedBack!.isLetRing).toBe(false);
	});

	it("writes palm mute as P.M. text and clears every spelling of it", () => {
		const { doc, voice } = build();
		const muted = voice.addNote({ step: "E", octave: 2, type: "half" });
		const lifted = voice.addNote({ step: "E", octave: 2, type: "half" });
		muted.setPalmMuted(true);
		muted.setPalmMuted(true); // idempotent
		lifted.setPalmMuted(true);
		lifted.setPalmMuted(false);

		expect(muted.isPalmMuted).toBe(true);
		expect(muted.otherTechnical).toEqual(["P.M."]);
		expect(lifted.isPalmMuted).toBe(false);
		expect(lifted.otherTechnical).toEqual([]);
		expect(schemaErrors(doc)).toEqual([]);

		const [mutedBack, liftedBack] = roundTrip(doc);
		expect(mutedBack!.isPalmMuted).toBe(true);
		expect(liftedBack!.isPalmMuted).toBe(false);
	});

	it("reads palm mute and let ring text other exporters write, and clears it", () => {
		const [note] = new MDOMParser()
			.parseFromString(
				`<score-partwise><part id="P1"><measure number="1"><note>
				<pitch><step>E</step><octave>2</octave></pitch><duration>4</duration><type>quarter</type>
				<notations><technical>
					<other-technical>palm mute</other-technical>
					<other-technical>let ring</other-technical>
					<other-technical>golpe-ish</other-technical>
				</technical></notations>
			</note></measure></part></score-partwise>`,
			)
			.score.getPart("P1")!
			.getMeasure("1")!.notes;
		expect(note!.isPalmMuted).toBe(true);
		expect(note!.isLetRing).toBe(true);

		note!.setPalmMuted(false);
		note!.setLetRing(false);
		expect(note!.isPalmMuted).toBe(false);
		expect(note!.isLetRing).toBe(false);
		expect(note!.otherTechnical).toEqual(["golpe-ish"]); // unrelated text stays
	});

	it("stacks every technique on one note, schema-valid", () => {
		const { doc, voice } = build();
		const note = voice.addNote({ step: "B", octave: 3, type: "whole" });
		note.setStringFret({ string: 2, fret: 12 });
		note.setNotehead({ value: "x", parentheses: true });
		note.setBend({ semitones: 0.5, release: true });
		note.setHarmonic({ kind: "natural", pitch: "base" });
		note.setPalmMuted(true);
		note.setLetRing(true);
		expect(schemaErrors(doc)).toEqual([]);

		const [back] = roundTrip(doc);
		expect(back!.notehead).toMatchObject({ value: "x", parentheses: true });
		expect(back!.bend).toEqual({
			semitones: 0.5,
			preBend: false,
			release: true,
			withBar: null,
			shape: null,
		});
		expect(back!.harmonic).toEqual({ kind: "natural", pitch: "base" });
		expect(back!.isPalmMuted).toBe(true);
		expect(back!.isLetRing).toBe(true);
		expect(back!.string).toBe(2);
		expect(back!.fret).toBe(12);
	});
});
