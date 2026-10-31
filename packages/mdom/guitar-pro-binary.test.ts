import { describe, expect, it } from "bun:test";
import { GuitarProBinaryReader } from "./guitar-pro-binary-reader";
import { GuitarProParser, MusicXMLSerializer } from "./index";

const fixture = (name: string) =>
	Bun.file(new URL(`./fixtures/guitar-pro/${name}`, import.meta.url))
		.arrayBuffer()
		.then((buffer) => new Uint8Array(buffer));

const musicXml = async (name: string, opts = {}) =>
	new MusicXMLSerializer().serializeToString(
		await new GuitarProParser().parseFromBytes(await fixture(name), opts),
	);

const omit = { unsupported: "omit" } as const;

const versionHeader = (version: string) => {
	const header = new Uint8Array(31);
	header[0] = version.length;
	header.set(new TextEncoder().encode(version), 1);
	return header;
};

describe("Guitar Pro 3, 4 and 5 binary import", () => {
	// alphaTab's guitarpro5 corpus holds the same scores as its guitarpro7 corpus.
	it("reads key-signatures.gp5 as the same score as key-signatures.gp", async () => {
		expect(await musicXml("key-signatures.gp5")).toBe(
			await musicXml("key-signatures.gp"),
		);
	});

	it("reads notes.gp5 as the same score as notes.gp", async () => {
		expect(await musicXml("notes.gp5")).toBe(await musicXml("notes.gp"));
	});

	it("reads repeat-close.gp5 as the same score as repeat-close.gp", async () => {
		expect(await musicXml("repeat-close.gp5")).toBe(
			await musicXml("repeat-close.gp"),
		);
	});

	it("reads strings.gp5 as the same score as strings.gp", async () => {
		expect(await musicXml("strings.gp5")).toBe(await musicXml("strings.gp"));
	});

	it("reads tuplets.gp5 as the same score as tuplets.gp", async () => {
		expect(await musicXml("tuplets.gp5")).toBe(await musicXml("tuplets.gp"));
	});

	it("reads the meters of time-signatures.gp5", async () => {
		const meters = (xml: string) =>
			xml.match(/<beats>\d+<\/beats>\s*<beat-type>\d+<\/beat-type>/g);

		expect(meters(await musicXml("time-signatures.gp5"))).toEqual(
			meters(await musicXml("time-signatures.gp")),
		);
	});

	it("reads the score information of score-info.gp5", async () => {
		const xml = await musicXml("score-info.gp5");
		const expected = await musicXml("score-info.gp");

		expect(xml).toContain("<movement-title>");
		expect(xml.match(/<creator[^>]*>[^<]*<\/creator>/g)).toEqual(
			expected.match(/<creator[^>]*>[^<]*<\/creator>/g),
		);
	});

	it("reads the lyric lines of score-info.gp5 with their start bars", async () => {
		const { gpif } = new GuitarProBinaryReader().read(
			await fixture("score-info.gp5"),
		);

		expect(
			[...gpif.matchAll(/<Text>([^<]*)<\/Text><Offset>(\d+)<\/Offset>/g)].map(
				([, text, offset]) => [text, offset],
			),
		).toEqual([
			["Line1", "0"],
			["Line2", "1"],
			["Line3", "2"],
			["Line4", "3"],
			["Line5", "4"],
		]);
	});

	it("reads grace notes with their effects as the GP7 score does", async () => {
		expect(await musicXml("grace.gp5")).toBe(await musicXml("grace.gp"));
	});

	// GP5 and its GP7 re-save differ only in a bar's trailing rest and its default dynamic.
	it("reads bends.gp5 as the same score as bends.gp", async () => {
		expect(await musicXml("bends.gp5", { unsupported: "omit" })).toBe(
			await musicXml("bends.gp", { unsupported: "omit" }),
		);
	});

	it("reads dead.gp5 as the same score as dead.gp", async () => {
		expect(await musicXml("dead.gp5", { unsupported: "omit" })).toBe(
			await musicXml("dead.gp", { unsupported: "omit" }),
		);
	});

	it("reads hammer.gp5 as the same score as hammer.gp", async () => {
		expect(await musicXml("hammer.gp5", { unsupported: "omit" })).toBe(
			await musicXml("hammer.gp", { unsupported: "omit" }),
		);
	});

	it("reads slides.gp5 as the same score as slides.gp", async () => {
		expect(await musicXml("slides.gp5", { unsupported: "omit" })).toBe(
			await musicXml("slides.gp", { unsupported: "omit" }),
		);
	});

	it("reads strokes.gp5 as the same score as strokes.gp", async () => {
		expect(await musicXml("strokes.gp5", { unsupported: "omit" })).toBe(
			await musicXml("strokes.gp", { unsupported: "omit" }),
		);
	});

	it("reads tremolo.gp5 as the same score as tremolo.gp", async () => {
		expect(await musicXml("tremolo.gp5", { unsupported: "omit" })).toBe(
			await musicXml("tremolo.gp", { unsupported: "omit" }),
		);
	});

	it("reads vibrato.gp5 as the same score as vibrato.gp", async () => {
		expect(await musicXml("vibrato.gp5", { unsupported: "omit" })).toBe(
			await musicXml("vibrato.gp", { unsupported: "omit" }),
		);
	});

	/** The `pattern` matches of both scores, in order. */
	const marks = async (name: string, pattern: RegExp) => {
		const found = async (file: string) =>
			(await musicXml(file, { unsupported: "omit" })).match(pattern) ?? [];

		return { gp5: await found(`${name}.gp5`), gp7: await found(`${name}.gp`) };
	};

	it("reads the harmonics of harmonics.gp5", async () => {
		const { gp5, gp7 } = await marks(
			"harmonics",
			/<harmonic>.*?<\/harmonic>/gs,
		);

		expect(gp5.length).toBeGreaterThan(0);
		expect(gp5).toEqual(gp7);
	});

	it("reads the chord diagrams of chords.gp5", async () => {
		const { gp5, gp7 } = await marks("chords", /<harmony.*?<\/harmony>/gs);

		expect(gp5.length).toBe(8);
		expect(gp5).toEqual(gp7);
	});

	it("reads the alternate endings and repeats of repeat-close-alternate-endings.gp5", async () => {
		const { gp5, gp7 } = await marks(
			"repeat-close-alternate-endings",
			/<barline.*?<\/barline>/gs,
		);

		expect(gp5.join()).toContain("<ending");
		expect(gp5).toEqual(gp7);
	});

	it("reads the jumps and landmarks of directions.gp5", async () => {
		const { gp5, gp7 } = await marks(
			"directions",
			/<(?:segno|coda|sound)[^>]*>|<words[^>]*>[^<]*<\/words>/g,
		);

		expect(gp5.length).toBeGreaterThan(10);
		expect(gp5.toSorted()).toEqual(gp7.toSorted());
	});

	it("reads the ottavas of ottavia.gp5", async () => {
		const { gp5, gp7 } = await marks("ottavia", /<octave-shift[^>]*>/g);

		expect(gp5.length).toBe(8);
		expect(gp7.slice(0, 8)).toEqual(gp5);
	});

	it("reads the beat effects of effects.gp5", async () => {
		const xml = await musicXml("effects.gp5", { unsupported: "omit" });

		expect(xml).toContain('<tremolo type="single">');
		expect(xml).toContain('<tap hand="right"/>');
		expect(xml).toContain("<arpeggiate");
		expect(xml).toContain("<wavy-line");
		expect(xml).toContain("<bend-alter>");
	});

	it("reads the tempo changes of effects.gp5 as the GP7 score does", async () => {
		const { gp5, gp7 } = await marks("effects", /<sound tempo="[^"]*"\/>/g);

		expect(gp5.length).toBeGreaterThan(0);
		expect(gp5).toEqual(gp7);
	});

	it("applies the unsupported option to effects with no MusicXML equivalent", async () => {
		expect(musicXml("harmonics.gp5")).rejects.toThrow("Semi harmonics");
		expect(await musicXml("harmonics.gp5", { unsupported: "omit" })).toContain(
			"<harmonic>",
		);
	});

	it("rejects Guitar Pro 2 files by version", async () => {
		expect(
			new GuitarProParser().parseFromBytes(
				versionHeader("FICHIER GUITAR PRO v2.21"),
			),
		).rejects.toThrow("2.21 files are not supported");
	});

	it("gives each track the MIDI channel score-info.gp gives it", async () => {
		const { gp5, gp7 } = await marks("score-info", /<midi-channel>\d+/g);

		expect(gp5).toEqual(["<midi-channel>1", "<midi-channel>3"]);
		expect(gp5).toEqual(gp7);
	});

	it("throws a clear error for a truncated file", async () => {
		const bytes = await fixture("notes.gp5");

		expect(
			new GuitarProParser().parseFromBytes(bytes.subarray(0, 400)),
		).rejects.toThrow("ends unexpectedly");
	});

	// alphaTab's guitarpro3 and guitarpro4 corpora hold the scores of its guitarpro7 one.
	it("reads notes.gp3 as the same score as notes.gp", async () => {
		expect(await musicXml("notes.gp3", omit)).toBe(
			await musicXml("notes.gp", omit),
		);
	});

	it("reads notes.gp4 as the same score as notes.gp", async () => {
		expect(await musicXml("notes.gp4", omit)).toBe(
			await musicXml("notes.gp", omit),
		);
	});

	it("reads strings.gp3 as the same score as strings.gp", async () => {
		expect(await musicXml("strings.gp3", omit)).toBe(
			await musicXml("strings.gp", omit),
		);
	});

	it("reads strings.gp4 as the same score as strings.gp", async () => {
		expect(await musicXml("strings.gp4", omit)).toBe(
			await musicXml("strings.gp", omit),
		);
	});

	it("reads dead.gp3 as the same score as dead.gp", async () => {
		expect(await musicXml("dead.gp3", omit)).toBe(
			await musicXml("dead.gp", omit),
		);
	});

	it("reads dead.gp4 as the same score as dead.gp", async () => {
		expect(await musicXml("dead.gp4", omit)).toBe(
			await musicXml("dead.gp", omit),
		);
	});

	it("reads grace.gp3 as the same score as grace.gp", async () => {
		expect(await musicXml("grace.gp3", omit)).toBe(
			await musicXml("grace.gp", omit),
		);
	});

	it("reads grace.gp4 as the same score as grace.gp", async () => {
		expect(await musicXml("grace.gp4", omit)).toBe(
			await musicXml("grace.gp", omit),
		);
	});

	it("reads tuplets.gp4 as the same score as tuplets.gp", async () => {
		expect(await musicXml("tuplets.gp4", omit)).toBe(
			await musicXml("tuplets.gp", omit),
		);
	});

	it("reads hammer.gp4 as the same score as hammer.gp", async () => {
		expect(await musicXml("hammer.gp4", omit)).toBe(
			await musicXml("hammer.gp", omit),
		);
	});

	it("reads slides.gp4 as the same score as slides.gp", async () => {
		expect(await musicXml("slides.gp4", omit)).toBe(
			await musicXml("slides.gp", omit),
		);
	});

	it("reads strokes.gp4 as the same score as strokes.gp", async () => {
		expect(await musicXml("strokes.gp4", omit)).toBe(
			await musicXml("strokes.gp", omit),
		);
	});

	it("reads bends.gp4 as the same score as bends.gp", async () => {
		expect(await musicXml("bends.gp4", omit)).toBe(
			await musicXml("bends.gp", omit),
		);
	});

	it("reads tremolo.gp4 as the same score as tremolo.gp", async () => {
		expect(await musicXml("tremolo.gp4", omit)).toBe(
			await musicXml("tremolo.gp", omit),
		);
	});

	// These GP7 re-saves differ from GP3-5 in a bar's trailing rest and its default dynamic.
	it("reads time-signatures.gp3 as the same score as time-signatures.gp5", async () => {
		expect(await musicXml("time-signatures.gp3", omit)).toBe(
			await musicXml("time-signatures.gp5", omit),
		);
	});

	it("reads time-signatures.gp4 as the same score as time-signatures.gp5", async () => {
		expect(await musicXml("time-signatures.gp4", omit)).toBe(
			await musicXml("time-signatures.gp5", omit),
		);
	});

	it("reads harmonics.gp4 as the same score as harmonics.gp5", async () => {
		expect(await musicXml("harmonics.gp4", omit)).toBe(
			await musicXml("harmonics.gp5", omit),
		);
	});

	it("reads vibrato.gp4 as the same score as vibrato.gp5", async () => {
		expect(await musicXml("vibrato.gp4", omit)).toBe(
			await musicXml("vibrato.gp5", omit),
		);
	});

	it("reads the beat vibrato of vibrato.gp3 as vibrato on its notes", async () => {
		const xml = await musicXml("vibrato.gp3");

		expect(xml.match(/<wavy-line type="start"/g)).toHaveLength(4);
	});

	it("reads the one author of score-info.gp3 as the composer", async () => {
		const creators = (await musicXml("score-info.gp3")).match(
			/<creator[^>]*>[^<]*<\/creator>/g,
		);

		expect(creators).toEqual([
			'<creator type="composer">Music</creator>',
			'<creator type="artist">Artist</creator>',
		]);
	});

	it("reads the one author of score-info.gp4 as the composer", async () => {
		const creators = (await musicXml("score-info.gp4")).match(
			/<creator[^>]*>[^<]*<\/creator>/g,
		);

		expect(creators).toEqual([
			'<creator type="composer">Music</creator>',
			'<creator type="artist">Artist</creator>',
		]);
	});

	it("reads the lyric lines of score-info.gp4", async () => {
		const { gpif } = new GuitarProBinaryReader().read(
			await fixture("score-info.gp4"),
		);

		expect(
			[...gpif.matchAll(/<Text>([^<]*)<\/Text>/g)].map(([, text]) => text),
		).toEqual(["Line1", "Line2", "Line3", "Line4", "Line5"]);
	});

	it("reads the chord diagrams and harmonics of effects.gp3", async () => {
		const xml = await musicXml("effects.gp3", omit);
		const gp5 = await musicXml("effects.gp5", omit);

		expect(xml.match(/<harmony.*?<\/harmony>/gs)).toEqual(
			gp5.match(/<harmony.*?<\/harmony>/gs),
		);
		expect(xml).toContain("<harmonic>");
		expect(xml).toContain('<tap hand="right"/>');
	});

	it("reads the chord diagrams and harmonics of effects.gp4", async () => {
		const xml = await musicXml("effects.gp4", omit);
		const gp5 = await musicXml("effects.gp5", omit);

		expect(xml.match(/<harmony.*?<\/harmony>/gs)).toEqual(
			gp5.match(/<harmony.*?<\/harmony>/gs),
		);
		expect(xml).toContain("<harmonic>");
		expect(xml).toContain('<tap hand="right"/>');
	});

	it("reads a Guitar Pro 4 file whose version starts with L", async () => {
		const { gpif } = new GuitarProBinaryReader().read(
			legacyFile({ version: "FICHIER GUITAR PRO L4.06", bars: [{}] }),
		);

		expect(gpif).toContain("<Fret>5</Fret>");
	});

	it("reads the repeats and alternate endings of a 3.00 file", async () => {
		const { gpif } = new GuitarProBinaryReader().read(
			legacyFile({
				version: "FICHIER GUITAR PRO v3.00",
				bars: [
					{ repeatStart: true },
					{ ending: 1, repeatClose: 1 },
					{ ending: 2, repeatClose: 1 },
					{ ending: 3 },
				],
			}),
		);

		expect(
			[...gpif.matchAll(/<MasterBar>(.*?)<Bars>/g)].map(([, master]) =>
				master!.replace(/<Time>.*?<\/Key>/, ""),
			),
		).toEqual([
			'<Repeat start="true" end="false" count="1"/>',
			'<Repeat start="false" end="true" count="2"/><AlternateEndings>1</AlternateEndings>',
			'<Repeat start="false" end="true" count="2"/><AlternateEndings>2</AlternateEndings>',
			"<AlternateEndings>3</AlternateEndings>",
		]);
	});

	it("reads the repeats and alternate endings of a 4.06 file", async () => {
		const { gpif } = new GuitarProBinaryReader().read(
			legacyFile({
				version: "FICHIER GUITAR PRO v4.06",
				bars: [
					{ repeatStart: true },
					{ ending: 1, repeatClose: 1 },
					{ ending: 2, repeatClose: 1 },
					{ ending: 3 },
				],
			}),
		);

		expect(
			[...gpif.matchAll(/<MasterBar>(.*?)<Bars>/g)].map(([, master]) =>
				master!.replace(/<Time>.*?<\/Key>/, ""),
			),
		).toEqual([
			'<Repeat start="true" end="false" count="1"/>',
			'<Repeat start="false" end="true" count="2"/><AlternateEndings>1</AlternateEndings>',
			'<Repeat start="false" end="true" count="2"/><AlternateEndings>2</AlternateEndings>',
			"<AlternateEndings>3</AlternateEndings>",
		]);
	});

	it("reads the triplet feel of a Guitar Pro 4 file on every bar", async () => {
		const { gpif } = new GuitarProBinaryReader().read(
			legacyFile({
				version: "FICHIER GUITAR PRO v4.06",
				tripletFeel: true,
				bars: [{}, {}],
			}),
		);

		expect(gpif.match(/<TripletFeel>Triplet8th<\/TripletFeel>/g)).toHaveLength(
			2,
		);
	});

	it("reads effects.gp3 tremolo bar dips as the whammy of effects.gp4", async () => {
		const dips = async (name: string) =>
			new GuitarProBinaryReader({ unsupported: "omit" }).read(
				await fixture(name),
			).gpif;

		expect(await dips("effects.gp3")).toContain(
			'<Whammy originValue="0" originOffset="0" middleValue="-100" middleOffset1="0" middleOffset2="100" destinationValue="0" destinationOffset="100"/>',
		);
	});
});

interface LegacyBar {
	repeatStart?: boolean;
	repeatClose?: number;
	ending?: number;
}

interface LegacyFileOptions {
	version: string;
	tripletFeel?: boolean;
	bars: LegacyBar[];
}

/** A one-track Guitar Pro 3 or 4 file whose 4/4 bars each hold a whole note at fret 5. */
function legacyFile(opts: LegacyFileOptions): Uint8Array {
	const bytes: number[] = [];
	const byte = (value: number) => bytes.push(value & 0xff);
	const int32 = (value: number) => {
		for (let shift = 0; shift < 32; shift += 8) {
			byte(value >> shift);
		}
	};
	const text = (value: string) => [...new TextEncoder().encode(value)];
	const fixed = (value: string, width: number) => {
		byte(value.length);
		bytes.push(...text(value.padEnd(width, "\0")));
	};
	const gp4 = !opts.version.endsWith("3.00");
	fixed(opts.version, 30);
	for (let field = 0; field < 8; field++) {
		int32(1);
		byte(0);
	}
	int32(0);
	byte(opts.tripletFeel ? 1 : 0);
	if (gp4) {
		int32(0);
		for (let line = 0; line < 5; line++) {
			int32(1);
			int32(0);
		}
	}
	int32(120);
	int32(0);
	if (gp4) {
		byte(0);
	}
	for (let slot = 0; slot < 64; slot++) {
		int32(25);
		bytes.push(...new Array(8).fill(0));
	}
	int32(opts.bars.length);
	int32(1);
	for (const [index, bar] of opts.bars.entries()) {
		byte(
			(index === 0 ? 0x03 : 0) |
				(bar.repeatStart ? 0x04 : 0) |
				(bar.repeatClose ? 0x08 : 0) |
				(bar.ending ? 0x10 : 0),
		);
		if (index === 0) {
			byte(4);
			byte(4);
		}
		if (bar.repeatClose) {
			byte(bar.repeatClose);
		}
		if (bar.ending) {
			byte(bar.ending);
		}
	}
	byte(0);
	fixed("Guitar", 40);
	int32(6);
	for (const pitch of [64, 59, 55, 50, 45, 40, 0]) {
		int32(pitch);
	}
	int32(1);
	int32(1);
	int32(2);
	int32(24);
	int32(0);
	int32(0);
	for (const _ of opts.bars) {
		int32(1);
		byte(0);
		byte(-2);
		byte(0x40);
		byte(0x20);
		byte(1);
		byte(5);
	}
	return new Uint8Array(bytes);
}
