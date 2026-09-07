import { describe, expect, it } from 'bun:test';
import JSZip from 'jszip';
import { GuitarProParser } from './guitar-pro-parser';
import { GuitarProSerializer } from './guitar-pro-serializer';
import { MDocument } from './m-document';
import { MDOMParser } from './m-dom-parser';
import { MElement } from './m-node';
import { schemaErrors } from './music-xml-schema';

// Hand-authored GPIF: noncontiguous IDs, tables out of order, and reversed
// track table order. The MasterTrack and MasterBar references define the music.
const gpif = `<GPIF><GPVersion>7</GPVersion>
<Notes>
 <Note id="n9"><Properties><Property name="ConcertPitch"><Pitch><Step>E</Step><Accidental>b</Accidental><Octave>5</Octave></Pitch></Property></Properties></Note>
 <Note id="n2"><Properties><Property name="Midi"><Number>48</Number></Property></Properties></Note>
</Notes>
<Score><Title><![CDATA[Rock & <roll>]]></Title><Music><![CDATA[A & B]]></Music></Score>
<MasterTrack><Tracks>lead bass</Tracks><Automations><Automation><Type>Tempo</Type><Bar>0</Bar><Position>0</Position><Value>90 3</Value></Automation></Automations></MasterTrack>
<Tracks><Track id="bass"><Name>Bass</Name><Staves><Staff/></Staves></Track><Track id="lead"><Name><![CDATA[Lead & solo]]></Name><Staves><Staff/></Staves></Track></Tracks>
<MasterBars><MasterBar><Key><AccidentalCount>-3</AccidentalCount><Mode>Major</Mode></Key><Time>4/4</Time><Bars>b7 b3</Bars></MasterBar></MasterBars>
<Bars><Bar id="b3"><Clef>F4</Clef><Voices>v5</Voices></Bar><Bar id="b7"><Clef>G2</Clef><Voices>-1 v8 -1 -1</Voices></Bar></Bars>
<Voices><Voice id="v8"><Beats>beat4</Beats></Voice><Voice id="v5"><Beats>beat6</Beats></Voice></Voices>
<Beats><Beat id="beat6"><Rhythm ref="r2"/><Notes>n2</Notes></Beat><Beat id="beat4"><Rhythm ref="r2"/><Notes>n9</Notes></Beat></Beats>
<Rhythms><Rhythm id="r2"><NoteValue>Whole</NoteValue></Rhythm></Rhythms></GPIF>`;

async function archive(
	xml: string,
	configuration?: Uint8Array,
): Promise<Uint8Array> {
	const zip = new JSZip();
	zip.file('Content/score.gpif', xml);
	if (configuration) {
		zip.file('Content/PartConfiguration', configuration);
	}
	return zip.generateAsync({ type: 'uint8array' });
}

describe('native GPIF conversion', () => {
	it('resolves references independently of table order and preserves voice slots', async () => {
		const doc = await new GuitarProParser().parseFromBytes(await archive(gpif));
		expect(doc.score.title).toBe('Rock & <roll>');
		expect(doc.score.parts.map((p) => p.label)).toEqual([
			'Lead & solo',
			'Bass',
		]);
		expect(
			doc.score.parts[0]!.measures[0]!.notes.map((n) => [
				n.voice,
				n.isRest,
				n.pitch?.step,
				n.pitch?.alter,
				n.pitch?.octave,
			]),
		).toEqual([
			['1', true, undefined, undefined, undefined],
			['2', false, 'E', -1, 4],
		]);
		expect(doc.score.parts[1]!.measures[0]!.notes[0]!.pitch).toMatchObject({
			step: 'C',
			octave: 3,
		});
		expect(doc.score.parts[0]!.measures[0]!.sounds[0]!.tempo).toBe(135);
		expect(schemaErrors(doc)).toEqual([]);
	});

	it('escapes metadata on export without losing its text on import', async () => {
		const parser = new GuitarProParser();
		const doc = await parser.parseFromBytes(await archive(gpif));
		const result = await parser.parseFromBytes(
			await new GuitarProSerializer().serializeToBytes(doc),
		);
		expect(result.score.title).toBe('Rock & <roll>');
		expect(result.score.child('identification')!.child('creator')!.text).toBe(
			'A & B',
		);
		expect(result.score.parts[0]!.label).toBe('Lead & solo');
	});

	it.each([
		[
			'missing bar',
			gpif.replace('b7 b3', 'missing b3'),
			'Bars reference missing',
		],
		[
			'missing voice',
			gpif.replace('-1 v8 -1 -1', '-1 absent -1 -1'),
			'Voices reference absent',
		],
		[
			'missing beat',
			gpif.replace('<Beats>beat4</Beats>', '<Beats>absent</Beats>'),
			'Beats reference absent',
		],
		[
			'missing note',
			gpif.replace('<Notes>n9</Notes>', '<Notes>absent</Notes>'),
			'Notes reference absent',
		],
		[
			'missing rhythm',
			gpif.replaceAll('ref="r2"', 'ref="absent"'),
			'Rhythms reference absent',
		],
		[
			'duplicate ID',
			gpif.replace('<Note id="n2">', '<Note id="n9">'),
			'Duplicate GPIF Note id',
		],
		[
			'invalid duration',
			gpif.replace('Whole', 'Bogus'),
			'Unsupported Guitar Pro duration',
		],
		[
			'invalid MIDI',
			gpif.replace('<Number>48</Number>', '<Number>128</Number>'),
			'Invalid MIDI pitch',
		],
		[
			'missing pitch',
			gpif.replace('<Property name="Midi"><Number>48</Number></Property>', ''),
			'no usable pitch',
		],
		['invalid meter', gpif.replace('4/4', '4/3'), 'power of two'],
		['missing staff bar', gpif.replace('b7 b3', 'b7'), 'bar count'],
		[
			'invalid tuplet',
			gpif.replace('</Rhythm>', '<PrimaryTuplet num="0" den="2"/></Rhythm>'),
			'tuplet numerator',
		],
		[
			'dangling destination',
			gpif.replace('<Note id="n2">', '<Note id="n2"><Tie destination="true"/>'),
			'ties must connect',
		],
	])('rejects %s even when unsupported annotations may be omitted', async (_name, xml, error) => {
		await expect(
			new GuitarProParser().parseFromBytes(await archive(xml!), {
				unsupported: 'omit',
			}),
		).rejects.toThrow(error!);
	});

	it('rejects truncated binary staff configuration', async () => {
		await expect(
			new GuitarProParser().parseFromBytes(
				await archive(gpif, new Uint8Array([0, 0, 0, 1, 0, 0, 0])),
			),
		).rejects.toThrow('Truncated');
	});

	it('retains the written grace-note length from an independent file', async () => {
		const parser = new GuitarProParser();
		const doc = await parser.parseFromBlob(
			Bun.file(new URL('./fixtures/guitar-pro/grace.gp', import.meta.url)),
			{ unsupported: 'omit' },
		);
		const bytes = await new GuitarProSerializer().serializeToBytes(doc);
		const restored = await parser.parseFromBytes(bytes);
		expect(
			restored.score.parts[0]!.measures[0]!.notes.filter((n) => n.isGrace).map(
				(n) => [n.type, n.duration],
			),
		).toEqual([
			['32nd', null],
			['32nd', null],
		]);
	});

	it('preserves tied playback strings through three chords without changing source notes', async () => {
		const document = MDocument.empty();
		const part = document.score.addPart({ name: 'Piano' });
		const first = part
			.addMeasure()
			.getOrCreateVoice('1')
			.addNote({ step: 'C', octave: 5, type: 'whole' });
		const second = part
			.addMeasure()
			.getOrCreateVoice('1')
			.addChord(
				[
					{ step: 'G', octave: 4 },
					{ step: 'C', octave: 5 },
				],
				{ type: 'whole' },
			);
		const third = part
			.addMeasure()
			.getOrCreateVoice('1')
			.addChord(
				[
					{ step: 'E', octave: 4 },
					{ step: 'C', octave: 5 },
				],
				{ type: 'whole' },
			);
		first.addTie(second.notes[1]!);
		second.notes[1]!.addTie(third.notes[1]!);
		const bytes = await new GuitarProSerializer().serializeToBytes(document);
		const restored = await new GuitarProParser().parseFromBytes(bytes);
		const notes = restored.score.parts.flatMap((p) =>
			p.measures.flatMap((m) => m.notes),
		);
		expect(
			notes
				.filter((n) => n.pitch?.step === 'C')
				.map((n) => n.ties.map((t) => t.tieType)),
		).toEqual([['start'], ['stop', 'start'], ['stop']]);
		expect(first.string).toBeNull();
		expect(schemaErrors(restored)).toEqual([]);
	});

	it('writes two-track binary view flags and a valid empty stylesheet', async () => {
		const source = await new GuitarProParser().parseFromBytes(
			await archive(gpif),
		);
		const bytes = await new GuitarProSerializer().serializeToBytes(source);
		const zip = await JSZip.loadAsync(bytes);
		expect([
			...(await zip.file('Content/PartConfiguration')!.async('uint8array')),
		]).toEqual([
			0, 0, 0, 3, 0, 0, 0, 0, 2, 1, 1, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 1, 1, 0, 0,
			0, 1,
		]);
		expect([
			...(await zip.file('Content/BinaryStylesheet')!.async('uint8array')),
		]).toEqual([0, 0, 0, 0]);
		expect(
			new MDOMParser().parseFromString(
				await zip.file('Content/score.gpif')!.async('string'),
			).root,
		).toBeInstanceOf(MElement);
	});
});
