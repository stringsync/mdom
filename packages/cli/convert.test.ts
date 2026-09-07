import { beforeEach, describe, expect, it } from 'bun:test';
import { GuitarProParser, MDOMParser, MXLSerializer } from '@stringsync/mdom';
import { MemoryLogger } from 'webappwiz/log';
import { type ConvertOptions, convert } from './convert';
import { FakeScoreFiles } from './fake-score-files';

describe('convert', () => {
	let files: FakeScoreFiles;
	let log: MemoryLogger;
	let opts: ConvertOptions;
	let xml: string;

	beforeEach(() => {
		files = new FakeScoreFiles();
		log = new MemoryLogger();
		opts = {
			input: 'song.musicxml',
			output: 'song.gp',
			cwd: '/scores',
			files,
			log,
		};
		xml = `<?xml version="1.0" encoding="UTF-8"?><score-partwise version="4.0">
			<movement-title>Étude &amp; variations</movement-title>
			<part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list>
			<part id="P1"><measure number="1"><attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time></attributes>
			<note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration><type>whole</type></note>
			</measure></part></score-partwise>`;
		files.contents.set('/scores/song.musicxml', new TextEncoder().encode(xml));
	});

	it('converts MusicXML to Guitar Pro with the score intact', async () => {
		await convert(opts);
		const doc = await new GuitarProParser().parseFromBytes(
			await files.read('/scores/song.gp'),
		);

		expect(doc.score.title).toBe('Étude & variations');
		expect(doc.score.parts[0]!.measures[0]!.notes[0]).toMatchObject({
			beats: 4,
			pitch: { step: 'C', octave: 4 },
		});
		expect(log.entries).toContainEqual(
			expect.objectContaining({
				level: 'info',
				message: 'wrote /scores/song.gp',
			}),
		);
	});

	it('converts MusicXML to a compressed MusicXML archive', async () => {
		await convert({ ...opts, output: 'song.mxl' });
		const doc = await new MDOMParser().parseFromBlob(
			new Blob([await files.read('/scores/song.mxl')]),
		);

		expect(doc.score.title).toBe('Étude & variations');
		expect(doc.score.parts[0]!.measures[0]!.notes[0]!.pitch?.step).toBe('C');
	});

	it('converts compressed MusicXML to plain MusicXML', async () => {
		const blob = await new MXLSerializer().serializeToBlob(
			new MDOMParser().parseFromString(xml),
		);
		files.contents.set(
			'/scores/source.mxl',
			new Uint8Array(await blob.arrayBuffer()),
		);
		await convert({ ...opts, input: 'source.mxl', output: 'result.xml' });
		const doc = new MDOMParser().parseFromString(
			new TextDecoder().decode(await files.read('/scores/result.xml')),
		);

		expect(doc.score.title).toBe('Étude & variations');
		expect(doc.score.parts[0]!.measures[0]!.notes[0]!.beats).toBe(4);
	});

	it('converts compressed MusicXML to Guitar Pro', async () => {
		const blob = await new MXLSerializer().serializeToBlob(
			new MDOMParser().parseFromString(xml),
		);
		files.contents.set(
			'/scores/source.mxl',
			new Uint8Array(await blob.arrayBuffer()),
		);
		await convert({ ...opts, input: 'source.mxl' });
		const doc = await new GuitarProParser().parseFromBytes(
			await files.read('/scores/song.gp'),
		);

		expect(doc.score.title).toBe('Étude & variations');
		expect(doc.score.parts[0]!.measures[0]!.notes[0]!.beats).toBe(4);
	});

	it('converts an independent Guitar Pro fixture to MusicXML', async () => {
		const bytes = new Uint8Array(
			await Bun.file(
				new URL('../mdom/fixtures/guitar-pro/strings.gp', import.meta.url),
			).arrayBuffer(),
		);
		files.contents.set('/scores/source.gp', bytes);
		await convert({ ...opts, input: 'source.gp', output: 'result.musicxml' });
		const doc = new MDOMParser().parseFromString(
			new TextDecoder().decode(await files.read('/scores/result.musicxml')),
		);

		expect(
			doc.score.parts[0]!.measures[0]!.notes.slice(0, 6).map((note) => [
				note.string,
				note.fret,
			]),
		).toEqual([
			[1, 1],
			[2, 2],
			[3, 3],
			[4, 4],
			[5, 5],
			[6, 6],
		]);
	});

	it('converts an independent Guitar Pro fixture to compressed MusicXML', async () => {
		const bytes = new Uint8Array(
			await Bun.file(
				new URL('../mdom/fixtures/guitar-pro/strings.gp', import.meta.url),
			).arrayBuffer(),
		);
		files.contents.set('/scores/source.gp', bytes);
		await convert({ ...opts, input: 'source.gp', output: 'result.mxl' });
		const doc = await new MDOMParser().parseFromBlob(
			new Blob([await files.read('/scores/result.mxl')]),
		);

		expect(doc.score.parts[0]!.measures[0]!.notes[0]).toMatchObject({
			string: 1,
			fret: 1,
			beats: 1,
		});
	});

	it('recognizes uppercase extensions and the xml alias', async () => {
		files.contents.set('/scores/INPUT.XML', new TextEncoder().encode(xml));
		await convert({ ...opts, input: 'INPUT.XML', output: 'OUTPUT.MXL' });
		const doc = await new MDOMParser().parseFromBlob(
			new Blob([await files.read('/scores/OUTPUT.MXL')]),
		);

		expect(doc.score.title).toBe('Étude & variations');
	});

	it('resolves both paths against the invocation directory', async () => {
		await convert({ ...opts, output: '../exports/song.gp' });

		expect([...files.contents.keys()]).toEqual([
			'/scores/song.musicxml',
			'/exports/song.gp',
		]);
	});

	it('keeps absolute paths absolute', async () => {
		await convert({
			...opts,
			input: '/scores/song.musicxml',
			output: '/exports/song.xml',
			cwd: '/elsewhere',
		});

		expect(files.contents.has('/exports/song.xml')).toBe(true);
	});

	it('rejects an unsupported input extension before reading', async () => {
		await expect(convert({ ...opts, input: 'legacy.gp5' })).rejects.toThrow(
			'Unsupported score extension: .gp5',
		);
		expect(files.contents.has('/scores/song.gp')).toBe(false);
	});

	it('rejects an output without a format extension', async () => {
		await expect(convert({ ...opts, output: 'result' })).rejects.toThrow(
			'Unsupported score extension: (none)',
		);
		expect(files.contents.has('/scores/result')).toBe(false);
	});

	it('rejects identical paths even when force is requested', async () => {
		await expect(
			convert({ ...opts, output: './song.musicxml', force: true }),
		).rejects.toThrow('different paths');
		expect(
			new TextDecoder().decode(await files.read('/scores/song.musicxml')),
		).toBe(xml);
	});

	it('keeps an existing output unless force is requested', async () => {
		files.contents.set('/scores/song.gp', new Uint8Array([1, 2, 3]));

		await expect(convert(opts)).rejects.toThrow('Output already exists');
		expect(await files.read('/scores/song.gp')).toEqual(
			new Uint8Array([1, 2, 3]),
		);
		expect(log.entries).toEqual([]);
	});

	it('replaces an existing output when force is requested', async () => {
		files.contents.set('/scores/song.gp', new Uint8Array([1, 2, 3]));
		await convert({ ...opts, force: true });
		const doc = await new GuitarProParser().parseFromBytes(
			await files.read('/scores/song.gp'),
		);

		expect(doc.score.title).toBe('Étude & variations');
	});

	it('leaves an output intact when conversion fails even with force', async () => {
		files.contents.set(
			'/scores/song.musicxml',
			new TextEncoder().encode('<broken'),
		);
		files.contents.set('/scores/song.gp', new Uint8Array([1, 2, 3]));

		await expect(convert({ ...opts, force: true })).rejects.toThrow();
		expect(await files.read('/scores/song.gp')).toEqual(
			new Uint8Array([1, 2, 3]),
		);
	});

	it('reports a missing input without writing an output', async () => {
		files.contents.delete('/scores/song.musicxml');

		await expect(convert(opts)).rejects.toThrow('Input does not exist');
		expect(files.contents.size).toBe(0);
	});

	it('rejects XML that is not a partwise score', async () => {
		files.contents.set(
			'/scores/song.musicxml',
			new TextEncoder().encode('<html/>'),
		);

		await expect(convert({ ...opts, output: 'result.mxl' })).rejects.toThrow(
			'Expected a score-partwise document',
		);
		expect(files.contents.has('/scores/result.mxl')).toBe(false);
	});

	it('rejects unsupported Guitar Pro annotations by default', async () => {
		files.contents.set(
			'/scores/song.musicxml',
			new TextEncoder().encode(
				xml.replace('</note>', '<lyric><text>la</text></lyric></note>'),
			),
		);

		await expect(convert(opts)).rejects.toThrow('<lyric>');
		expect(files.contents.has('/scores/song.gp')).toBe(false);
	});

	it('omits unsupported annotations when explicitly requested', async () => {
		files.contents.set(
			'/scores/song.musicxml',
			new TextEncoder().encode(
				xml.replace('</note>', '<lyric><text>la</text></lyric></note>'),
			),
		);
		await convert({ ...opts, omitUnsupported: true });
		const doc = await new GuitarProParser().parseFromBytes(
			await files.read('/scores/song.gp'),
		);

		expect(doc.score.parts[0]!.measures[0]!.notes[0]!.pitch?.step).toBe('C');
		expect(doc.score.parts[0]!.measures[0]!.notes[0]!.lyrics).toEqual([]);
	});
});
