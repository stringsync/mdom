import { describe, expect, it } from 'bun:test';
import { MDocument } from './m-document';
import { MDOMParser } from './m-dom-parser';
import { schemaErrors } from './music-xml-schema';
import { MusicXMLSerializer } from './music-xml-serializer';
import type { Note } from './note';

/** A one-part document with a voice ready for notes. */
const build = () => {
	const doc = MDocument.empty();
	const measure = doc.score.addPart({ id: 'P1', name: 'Guitar' }).addMeasure();
	measure.setDivisions(4);
	measure.setClef({ sign: 'G', line: 2 });
	measure.setTime({ beats: 4, beatType: 4 });
	const voice = measure.getOrCreateVoice('1');
	return { doc, measure, voice };
};

/** Serialize and parse back. */
const roundTrip = (doc: MDocument): MDocument =>
	new MDOMParser().parseFromString(
		new MusicXMLSerializer().serializeToString(doc),
	);

/** The first measure's notes of a one-measure part parsed from `body`. */
const parseMeasure = (body: string) =>
	new MDOMParser()
		.parseFromString(
			`<score-partwise version="4.0"><part-list><score-part id="P1"><part-name>P</part-name></score-part></part-list>
			<part id="P1"><measure number="1"><attributes><divisions>1</divisions></attributes>${body}</measure></part></score-partwise>`,
		)
		.score.getPart('P1')!
		.getMeasure('1')!;

const firstNote = (doc: MDocument): Note =>
	doc.score.getPart('P1')!.getMeasure('1')!.notes[0]!;

describe('nested technique reads', () => {
	const measure = parseMeasure(`
		<note><pitch><step>E</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type>
			<notations><technical>
				<harmonic><artificial/><touching-pitch/></harmonic>
				<bend shape="curved" first-beat="25" last-beat="75"><bend-alter>2</bend-alter><pre-bend/><with-bar>scoop</with-bar></bend>
				<bend><bend-alter>-2</bend-alter><release offset="2"/></bend>
				<other-technical smufl="guitarGolpe">tap tap</other-technical>
				<fingering>3</fingering>
			</technical></notations>
		</note>`);
	const note = measure.notes[0]!;

	it('reads each <harmonic> and <bend> payload off its Technical', () => {
		const [harmonic, bend, release, other, fingering] = note.technicals;
		expect(harmonic!.harmonic).toEqual({
			kind: 'artificial',
			pitch: 'touching',
		});
		expect(bend!.bend).toEqual({
			alter: 2,
			preBend: true,
			release: null,
			withBar: 'scoop',
			shape: 'curved',
			firstBeat: 25,
			lastBeat: 75,
		});
		expect(release!.bend).toMatchObject({
			alter: -2,
			release: { offset: 2 },
			withBar: null,
			shape: null,
		});
		expect(other!.text).toBe('tap tap');
		expect(other!.smufl).toBe('guitarGolpe');
		// Payload reads stay null on other tags.
		expect(fingering!.bend).toBeNull();
		expect(fingering!.harmonic).toBeNull();
	});

	it('summarizes with-bar and shape on Note.bend', () => {
		expect(note.bend).toEqual({
			semitones: 2,
			preBend: true,
			release: true,
			withBar: 'scoop',
			shape: 'curved',
		});
	});
});

describe('nested notation reads', () => {
	const measure = parseMeasure(`
		<note><cue/><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type>
			<notations>
				<fermata type="inverted">square</fermata>
				<arpeggiate number="2" direction="up"/>
				<non-arpeggiate type="bottom" number="3"/>
				<articulations><accent placement="below"/><other-articulation smufl="articSoftAccentAbove">soft</other-articulation></articulations>
				<ornaments><other-ornament smufl="ornamentHaydn">haydn-ish</other-ornament></ornaments>
				<other-notation type="start" number="2" placement="above" smufl="pictBeaterBox">box</other-notation>
				<other-notation>dot</other-notation>
			</notations>
		</note>
		<note><pitch><step>D</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type>
			<notations><fermata/></notations>
		</note>
		<note><rest/><duration>2</duration><type>half</type></note>`);
	const [marked, plainFermata, rest] = measure.notes;

	it('reads fermata shape, defaulting an empty fermata to normal', () => {
		expect(marked!.fermata).toBe('inverted');
		expect(marked!.fermataShape).toBe('square');
		expect(plainFermata!.fermataShape).toBe('normal');
		expect(rest!.fermataShape).toBeNull();
	});

	it('reads arpeggiate and non-arpeggiate numbers', () => {
		expect(marked!.arpeggiate).toEqual({ direction: 'up', number: 2 });
		expect(marked!.nonArpeggiate).toBe('bottom');
		expect(marked!.nonArpeggiateNumber).toBe(3);
		expect(rest!.nonArpeggiateNumber).toBeNull();
	});

	it('reads the cue marker', () => {
		expect(marked!.isCue).toBe(true);
		expect(plainFermata!.isCue).toBe(false);
	});

	it('reads articulation placement and other-* text apart from smufl', () => {
		const [accent, other] = marked!.articulationMarks;
		expect(accent!.placement).toBe('below');
		expect(other!.articulationType).toBe('other-articulation');
		expect(other!.text).toBe('soft');
		expect(other!.smufl).toBe('articSoftAccentAbove');
		const [ornament] = marked!.ornaments;
		expect(ornament!.text).toBe('haydn-ish');
		expect(ornament!.smufl).toBe('ornamentHaydn');
	});

	it('reads other-notation payloads with their defaults', () => {
		expect(marked!.otherNotations).toEqual([
			{
				type: 'start',
				number: 2,
				text: 'box',
				smufl: 'pictBeaterBox',
				placement: 'above',
			},
			{ type: 'single', number: 1, text: 'dot', smufl: null, placement: null },
		]);
		expect(rest!.otherNotations).toEqual([]);
	});
});

describe('other directions, figure extends and frame details', () => {
	it('reads other-direction text apart from its smufl', () => {
		const measure = parseMeasure(`
			<direction><direction-type><other-direction smufl="pictLotusFlute">lotus</other-direction></direction-type>
				<direction-type><words>poco</words></direction-type></direction>`);
		const [direction] = measure.directions;
		expect(direction!.otherDirections).toEqual([
			{ text: 'lotus', smufl: 'pictLotusFlute' },
		]);
		expect(direction!.words).toEqual(['poco']);
	});

	it('reads figure extend type', () => {
		const measure = parseMeasure(`
			<figured-bass>
				<figure><figure-number>6</figure-number><extend type="start"/></figure>
				<figure><figure-number>4</figure-number><extend/></figure>
				<figure><figure-number>3</figure-number></figure>
			</figured-bass>
			<note><pitch><step>C</step><octave>3</octave></pitch><duration>4</duration><type>whole</type></note>`);
		const figures = measure.figuredBasses[0]!.figures;
		expect(figures.map((figure) => figure.extendType)).toEqual([
			'start',
			null,
			null,
		]);
		expect(figures.map((figure) => figure.extend)).toEqual([true, true, false]);
	});

	it('writes and reads frame-note fingering and first-fret text, schema-valid', () => {
		const { doc, measure, voice } = build();
		voice.addNote({ step: 'B', octave: 3, type: 'whole' });
		measure.addHarmony({
			root: { step: 'B' },
			kind: 'major',
			frame: {
				firstFret: 7,
				firstFretText: 'VII',
				firstFretLocation: 'right',
				notes: [
					{ string: 5, fret: 7, fingering: '1', barre: 'start' },
					{ string: 4, fret: 9, fingering: '3' },
					{ string: 1, fret: 7, barre: 'stop' },
				],
			},
		});
		expect(schemaErrors(doc)).toEqual([]);

		const frame = roundTrip(doc).score.getPart('P1')!.getMeasure('1')!
			.harmonies[0]!.frame!;
		expect(frame.firstFret).toBe(7);
		expect(frame.firstFretText).toBe('VII');
		expect(frame.firstFretLocation).toBe('right');
		expect(
			frame.frameNotes.map((note) => [note.fingering, note.barre]),
		).toEqual([
			['1', 'start'],
			['3', null],
			[null, 'stop'],
		]);
	});

	it('refuses first-fret text without a first fret', () => {
		const { measure } = build();
		expect(() =>
			measure.addHarmony({
				root: { step: 'C' },
				kind: 'major',
				frame: { firstFretText: 'III', notes: [] },
			}),
		).toThrow('needs firstFret');
	});
});

describe('nested mark writers', () => {
	it('writes fermata shape, arpeggiate number, bend with-bar/shape and articulation placement, schema-valid', () => {
		const { doc, voice } = build();
		const note = voice.addNote({ step: 'G', octave: 3, type: 'whole' });
		note.setStringFret({ string: 3, fret: 7 });
		note.setFermata('upright', 'angled');
		note.setArpeggiate({ direction: 'down', number: 4 });
		note.setBend({
			semitones: 1,
			release: true,
			withBar: 'dip',
			shape: 'angled',
		});
		note.addArticulation('accent', { placement: 'below' });
		expect(schemaErrors(doc)).toEqual([]);

		const back = firstNote(roundTrip(doc));
		expect(back.fermata).toBe('upright');
		expect(back.fermataShape).toBe('angled');
		expect(back.arpeggiate).toEqual({ direction: 'down', number: 4 });
		expect(back.bend).toEqual({
			semitones: 1,
			preBend: false,
			release: true,
			withBar: 'dip',
			shape: 'angled',
		});
		expect(back.articulationMarks[0]!.placement).toBe('below');
	});

	it('writes a normal fermata as an empty element', () => {
		const { doc, voice } = build();
		const note = voice.addNote({ step: 'G', octave: 4, type: 'whole' });
		note.setFermata('upright', 'normal');
		expect(new MusicXMLSerializer().serializeToString(doc)).toContain(
			'<fermata type="upright"/>',
		);
		expect(note.fermataShape).toBe('normal');
	});
});
