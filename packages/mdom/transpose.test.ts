import { describe, expect, it } from 'bun:test';
import {
	ForPart,
	MDOMParser,
	MDocument,
	MusicXMLSerializer,
	PartClef,
	PartTranspose,
	Transpose,
	transposePitch,
} from './index';
import { schemaErrors } from './music-xml-schema';

const parse = (xml: string) => new MDOMParser().parseFromString(xml);
const serialize = (doc: MDocument) =>
	new MusicXMLSerializer().serializeToString(doc);

// A two-staff part: staff 1 a B♭ clarinet, staff 2 doubled an octave above;
// measure 2 changes staff 1 to A clarinet mid-measure and puts the whole part
// back to concert pitch from measure 3.
const TRANSPOSED = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
	<part-list><score-part id="P1"><part-name>Clarinets</part-name></score-part></part-list>
	<part id="P1">
		<measure number="1">
			<attributes>
				<divisions>1</divisions>
				<staves>2</staves>
				<clef number="1"><sign>G</sign><line>2</line></clef>
				<clef number="2"><sign>G</sign><line>2</line><clef-octave-change>-1</clef-octave-change></clef>
				<transpose number="1"><diatonic>-1</diatonic><chromatic>-2</chromatic></transpose>
				<transpose number="2"><chromatic>0</chromatic><octave-change>-1</octave-change><double above="yes"/></transpose>
			</attributes>
			<note><pitch><step>D</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice><staff>1</staff></note>
		</measure>
		<measure number="2">
			<note><pitch><step>D</step><octave>4</octave></pitch><duration>2</duration><voice>1</voice><staff>1</staff></note>
			<attributes>
				<transpose number="1"><diatonic>-2</diatonic><chromatic>-3</chromatic></transpose>
			</attributes>
			<note><pitch><step>E</step><octave>4</octave></pitch><duration>2</duration><voice>1</voice><staff>1</staff></note>
			<backup><duration>4</duration></backup>
			<note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration><voice>2</voice><staff>2</staff></note>
		</measure>
		<measure number="3">
			<attributes><transpose><chromatic>0</chromatic></transpose></attributes>
			<note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice><staff>1</staff></note>
		</measure>
	</part>
</score-partwise>`;

const CONCERT = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
	<defaults><concert-score/></defaults>
	<part-list><score-part id="P1"><part-name>Bass Clarinet</part-name></score-part></part-list>
	<part id="P1">
		<measure number="1">
			<attributes>
				<divisions>1</divisions>
				<clef><sign>F</sign><line>4</line></clef>
				<for-part>
					<part-clef><sign>G</sign><line>2</line></part-clef>
					<part-transpose><diatonic>-1</diatonic><chromatic>-2</chromatic><octave-change>-1</octave-change></part-transpose>
				</for-part>
			</attributes>
			<note><pitch><step>C</step><octave>3</octave></pitch><duration>4</duration><voice>1</voice></note>
		</measure>
		<measure number="2">
			<note><pitch><step>C</step><octave>3</octave></pitch><duration>4</duration><voice>1</voice></note>
		</measure>
	</part>
</score-partwise>`;

describe('transpose — reading', () => {
	const part = parse(TRANSPOSED).score.getPart('P1')!;
	const [first, second, third] = part.measures;

	it('reads every field as declared, absence kept as null', () => {
		const clarinet = first!.getTranspose('1')!;
		expect(clarinet).toBeInstanceOf(Transpose);
		expect(clarinet.staff).toBe('1');
		expect(clarinet.diatonic).toBe(-1);
		expect(clarinet.chromatic).toBe(-2);
		expect(clarinet.octaveChange).toBeNull();
		expect(clarinet.double).toBeNull();
		expect(clarinet.semitones).toBe(-2);

		const doubled = first!.getTranspose('2')!;
		expect(doubled.diatonic).toBeNull();
		expect(doubled.octaveChange).toBe(-1);
		expect(doubled.double).toBe('above');
		expect(doubled.semitones).toBe(-12);
	});

	it('keeps transposition apart from the clef octave change', () => {
		expect(first!.getClef('2')!.octaveChange).toBe(-1);
		expect(first!.getClef('1')!.octaveChange).toBe(0);
		expect(first!.getTranspose('1')!.octaveChange).toBeNull();
	});

	it('carries forward per staff, with mid-measure changes seen by notes only', () => {
		expect(second!.getTranspose('1')!.chromatic).toBe(-2);
		const [before, after, lower] = second!.notes;
		expect(before!.transpose!.chromatic).toBe(-2);
		expect(after!.transpose!.chromatic).toBe(-3);
		expect(lower!.transpose!.double).toBe('above');
		expect(part.measures[1]!.notes[1]!.transpose!.staff).toBe('1');
	});

	it('lets a numberless declaration close out every staff', () => {
		for (const staff of ['1', '2']) {
			const concert = third!.getTranspose(staff)!;
			expect(concert.staff).toBeNull();
			expect(concert.chromatic).toBe(0);
			expect(concert.double).toBeNull();
		}
	});

	it('is null where nothing was declared', () => {
		const plain = parse(
			`<score-partwise><part id="P1"><measure number="1"><note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration></note></measure></part></score-partwise>`,
		).score.getPart('P1')!.measures[0]!;
		expect(plain.getTranspose()).toBeNull();
		expect(plain.notes[0]!.transpose).toBeNull();
		expect(plain.getForPart()).toBeNull();
	});

	it('materializes the transpositions in effect into a later measure', () => {
		const doc = parse(TRANSPOSED);
		const target = doc.score.getPart('P1')!.measures[1]!;
		target.materializeSignatures();
		const attrs = target.childrenNamed('attributes')[0]!;
		expect(
			attrs.childrenOfType(Transpose).map((each) => each.chromatic),
		).toEqual([-2, 0]);
		expect(schemaErrors(doc)).toEqual([]);
	});

	it('round-trips unchanged', () => {
		const once = serialize(parse(TRANSPOSED));
		expect(serialize(parse(once))).toBe(once);
	});
});

describe('sounding pitch', () => {
	const spell = (
		pitch: { step: string; octave: number; alter: number } | null,
	) => pitch && `${pitch.step}${pitch.alter}/${pitch.octave}`;

	it('moves each written pitch by the transposition in effect for its staff', () => {
		const part = parse(TRANSPOSED).score.getPart('P1')!;
		const sounding = part.measures.flatMap((measure) =>
			measure.notes.map((note) => spell(note.soundingPitch)),
		);
		// B♭ clarinet D4 → C4; A clarinet E4 → C♯4 from mid-measure 2; the
		// doubled staff an octave down; concert pitch again in measure 3.
		expect(sounding).toEqual(['C0/4', 'C0/4', 'C1/4', 'C0/3', 'C0/4']);
	});

	it('is the written pitch where nothing transposes, and null for a rest', () => {
		const doc = MDocument.empty();
		const measure = doc.score.addPart({ id: 'P1', name: 'Flute' }).addMeasure();
		const voice = measure.getOrCreateVoice('1');
		const note = voice.addNote({
			step: 'F',
			alter: 1,
			octave: 5,
			type: 'quarter',
		});
		const rest = voice.addRest({ type: 'quarter' });
		expect(note.soundingPitch).toEqual({ step: 'F', alter: 1, octave: 5 });
		expect(rest.soundingPitch).toBeNull();
	});

	it('leaves the clef octave change out of it', () => {
		const note = parse(TRANSPOSED).score.getPart('P1')!.measures[1]!.notes[2]!;
		expect(note.clef!.octaveChange).toBe(-1);
		expect(note.soundingPitch!.octave).toBe(3);
	});
});

describe('transposePitch', () => {
	it('spells by the diatonic steps, not the semitone count', () => {
		const majorSecondDown = { diatonic: -1, chromatic: -2 };
		expect(
			transposePitch({ step: 'F', alter: 1, octave: 4 }, majorSecondDown),
		).toEqual({
			step: 'E',
			alter: 0,
			octave: 4,
		});
		expect(transposePitch({ step: 'C', octave: 5 }, majorSecondDown)).toEqual({
			step: 'B',
			alter: -1,
			octave: 4,
		});
		// An augmented unison: same step, one sharper.
		expect(
			transposePitch(
				{ step: 'B', alter: 1, octave: 3 },
				{ diatonic: 0, chromatic: 1 },
			),
		).toEqual({
			step: 'B',
			alter: 2,
			octave: 3,
		});
	});

	it('adds whole octaves and infers an unstated diatonic', () => {
		expect(
			transposePitch(
				{ step: 'D', octave: 4 },
				{ chromatic: -2, octaveChange: -1 },
			),
		).toEqual({ step: 'C', alter: 0, octave: 3 });
		expect(transposePitch({ step: 'G', octave: 4 }, { chromatic: -7 })).toEqual(
			{
				step: 'C',
				alter: 0,
				octave: 4,
			},
		);
	});

	it('carries a microtonal alter through', () => {
		expect(
			transposePitch(
				{ step: 'E', alter: -0.5, octave: 4 },
				{ diatonic: -1, chromatic: -2 },
			),
		).toEqual({ step: 'D', alter: -0.5, octave: 4 });
	});
});

describe('transpose — writing', () => {
	it('declares a transposition per staff without touching the pitches', () => {
		const doc = MDocument.empty();
		const part = doc.score.addPart({ id: 'P1', name: 'Clarinet' });
		const measure = part.addMeasure();
		measure.setStaveCount(2);
		measure
			.getOrCreateVoice('1')
			.addNote({ step: 'D', octave: 4, type: 'whole' });
		measure.setTranspose({ diatonic: -1, chromatic: -2, staff: '1' });
		measure.setTranspose({
			chromatic: 0,
			octaveChange: -1,
			double: 'below',
			staff: '2',
		});
		const note = measure.notes[0]!;
		expect(note.pitch!.step).toBe('D');
		expect(note.pitch!.octave).toBe(4);
		expect(note.transpose!.semitones).toBe(-2);
		expect(measure.getTranspose('2')!.double).toBe('below');
		expect(serialize(doc)).toMatch(
			/<transpose number="2">\s*<chromatic>0<\/chromatic>\s*<octave-change>-1<\/octave-change>\s*<double\/>\s*<\/transpose>/,
		);
		expect(schemaErrors(doc)).toEqual([]);
	});

	it('replaces the declaration for the same staff and keeps schema order', () => {
		const doc = MDocument.empty();
		const measure = doc.score.addPart({ id: 'P1', name: 'Horn' }).addMeasure();
		measure.setKey({ fifths: 0 });
		measure.setTranspose({ diatonic: -1, chromatic: -2 });
		measure.setClef({ sign: 'G', line: 2 });
		const horn = measure.setTranspose({ diatonic: -4, chromatic: -7 });
		const attrs = measure.childrenNamed('attributes')[0]!;
		expect(attrs.childrenOfType(Transpose)).toEqual([horn]);
		expect(attrs.childrenOfType(Transpose)[0]!.chromatic).toBe(-7);
		horn.setDiatonic(null);
		horn.setOctaveChange(1);
		horn.setDouble('above');
		horn.setDouble(null);
		expect(horn.diatonic).toBeNull();
		expect(horn.octaveChange).toBe(1);
		expect(horn.double).toBeNull();
		expect(schemaErrors(doc)).toEqual([]);
	});

	it('writes a mid-measure change at an onset', () => {
		const doc = MDocument.empty();
		const measure = doc.score
			.addPart({ id: 'P1', name: 'Clarinet' })
			.addMeasure();
		const voice = measure.getOrCreateVoice('1');
		voice.addNote({ step: 'C', octave: 4, type: 'half' });
		measure.setTranspose({ diatonic: -1, chromatic: -2 });
		measure.setTranspose({ diatonic: -2, chromatic: -3, onset: 2 });
		voice.addNote({ step: 'D', octave: 4, type: 'half' });
		const [first, second] = measure.notes;
		expect(first!.transpose!.chromatic).toBe(-2);
		expect(second!.transpose!.chromatic).toBe(-3);
		expect(measure.getTranspose()!.chromatic).toBe(-2);
		expect(schemaErrors(doc)).toEqual([]);
	});
});

describe('concert score and for-part', () => {
	it('reads the concert flag and the created part declaration', () => {
		const score = parse(CONCERT).score;
		expect(score.isConcertScore).toBe(true);
		const [first, second] = score.getPart('P1')!.measures;
		const forPart = first!.getForPart()!;
		expect(forPart).toBeInstanceOf(ForPart);
		expect(forPart.staff).toBeNull();
		expect(forPart.partClef).toBeInstanceOf(PartClef);
		expect(forPart.partClef!.sign).toBe('G');
		expect(forPart.partClef!.line).toBe(2);
		expect(forPart.partClef!.octaveChange).toBeNull();
		expect(forPart.partTranspose).toBeInstanceOf(PartTranspose);
		expect(forPart.partTranspose.semitones).toBe(-14);
		expect(second!.getForPart('1')).toBe(forPart);

		const materialized = parse(CONCERT);
		const target = materialized.score.getPart('P1')!.measures[1]!;
		target.materializeSignatures();
		expect(target.getForPart()!.partTranspose.chromatic).toBe(-2);
		expect(schemaErrors(materialized)).toEqual([]);
		expect(first!.getTranspose()).toBeNull(); // the score itself is at concert pitch
		expect(first!.getClef()!.sign).toBe('F');
	});

	it('writes a concert score with a transposed part declaration', () => {
		const doc = MDocument.empty();
		const measure = doc.score
			.addPart({ id: 'P1', name: 'Bass Clarinet' })
			.addMeasure();
		measure
			.getOrCreateVoice('1')
			.addNote({ step: 'C', octave: 3, type: 'whole' });
		expect(() =>
			measure.setForPart({ transpose: { chromatic: -2 } }),
		).toThrow();
		doc.score.setConcertScore(true);
		measure.setClef({ sign: 'F', line: 4 });
		measure.setTranspose({ chromatic: 0, octaveChange: 1 });
		const forPart = measure.setForPart({
			clef: { sign: 'G', line: 2 },
			transpose: { diatonic: -1, chromatic: -2, octaveChange: -1 },
		});
		expect(measure.getForPart()).toBe(forPart);
		expect(measure.getTranspose()!.octaveChange).toBe(1);
		expect(
			measure
				.childrenNamed('attributes')
				.map((attrs) => attrs.childrenOfType(ForPart).length),
		).toEqual([0, 1]); // a schema choice: never in the block that transposes
		forPart.setPartClef(null);
		forPart.setPartTranspose({ diatonic: -1, chromatic: -2 });
		expect(forPart.partClef).toBeNull();
		expect(forPart.partTranspose.octaveChange).toBeNull();
		forPart.setPartClef({ sign: 'G', line: 2, octaveChange: -1 });
		expect(forPart.partClef!.octaveChange).toBe(-1);
		expect(measure.notes[0]!.pitch!.octave).toBe(3);
		const next = measure.part.addMeasure();
		next.materializeSignatures();
		expect(next.childrenNamed('attributes')).toHaveLength(2);
		expect(next.getTranspose()!.octaveChange).toBe(1);
		expect(next.getForPart()!.partClef!.octaveChange).toBe(-1);
		expect(schemaErrors(doc)).toEqual([]);
	});

	it('refuses declarations a concert score cannot hold, rather than retuning', () => {
		const transposed = parse(TRANSPOSED).score;
		expect(() => transposed.setConcertScore(true)).toThrow();
		expect(transposed.isConcertScore).toBe(false);

		const concert = parse(CONCERT).score;
		const measure = concert.getPart('P1')!.measures[0]!;
		expect(() =>
			measure.setTranspose({ diatonic: -1, chromatic: -2 }),
		).toThrow();
		expect(() => concert.setConcertScore(false)).toThrow();
		measure.getForPart()!.remove();
		concert.setConcertScore(false);
		expect(concert.isConcertScore).toBe(false);
	});
});

describe('converting between concert and transposed pitch', () => {
	const spell = (pitch: { step: string; octave: number; alter?: number }) =>
		`${pitch.step}${pitch.alter ?? 0}/${pitch.octave}`;
	const written = (score: MDocument['score']) =>
		score.parts.flatMap((part) =>
			part.measures.flatMap((measure) =>
				measure.notes.map((note) => spell(note.pitch!)),
			),
		);
	const sounding = (score: MDocument['score']) =>
		score.parts.flatMap((part) =>
			part.measures.flatMap((measure) =>
				measure.notes.map((note) => spell(note.soundingPitch!)),
			),
		);

	it('retunes a transposed score to concert pitch, keeping how it sounds', () => {
		const doc = parse(TRANSPOSED);
		const before = sounding(doc.score);
		doc.score.convertToConcertScore();
		expect(doc.score.isConcertScore).toBe(true);
		expect(sounding(doc.score)).toEqual(before);
		// The doubled staff keeps its octave transposition, so its written C4 stays.
		expect(written(doc.score)).toEqual([
			'C0/4',
			'C0/4',
			'C1/4',
			'C0/4',
			'C0/4',
		]);
		const [first, , third] = doc.score.getPart('P1')!.measures;
		expect(first!.getTranspose('1')).toBeNull();
		expect(first!.getForPart('1')!.partTranspose.chromatic).toBe(-2);
		expect(first!.getTranspose('2')!.octaveChange).toBe(-1);
		expect(first!.getForPart('2')).toBeNull();
		expect(third!.getForPart('1')!.partTranspose.chromatic).toBe(0);
		expect(schemaErrors(doc)).toEqual([]);
	});

	it('round-trips back to the transposed score', () => {
		const doc = parse(TRANSPOSED);
		const original = parse(TRANSPOSED);
		doc.score.convertToConcertScore();
		doc.score.convertToTransposedScore();
		expect(doc.score.isConcertScore).toBe(false);
		expect(written(doc.score)).toEqual(written(original.score));
		expect(sounding(doc.score)).toEqual(sounding(original.score));
		const transposes = (score: MDocument['score']) =>
			score.getPart('P1')!.measures.map((measure) =>
				['1', '2'].map((staff) => {
					const transpose = measure.getTranspose(staff);
					return (
						transpose && [
							transpose.diatonic,
							transpose.chromatic,
							transpose.octaveChange,
							transpose.double,
						]
					);
				}),
			);
		expect(transposes(doc.score)).toEqual(transposes(original.score));
		expect(schemaErrors(doc)).toEqual([]);
	});

	it('moves key signatures and printed accidentals with the notes', () => {
		const doc = parse(`<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
	<part-list><score-part id="P1"><part-name>Clarinet in B♭</part-name></score-part></part-list>
	<part id="P1">
		<measure number="1">
			<attributes>
				<divisions>1</divisions>
				<key><fifths>2</fifths></key>
				<clef><sign>G</sign><line>2</line></clef>
				<transpose><diatonic>-1</diatonic><chromatic>-2</chromatic></transpose>
			</attributes>
			<note><pitch><step>F</step><alter>1</alter><octave>4</octave></pitch><duration>2</duration><voice>1</voice><type>half</type></note>
			<note><pitch><step>C</step><octave>5</octave></pitch><duration>2</duration><voice>1</voice><type>half</type><accidental>natural</accidental></note>
		</measure>
	</part>
</score-partwise>`);
		doc.score.convertToConcertScore();
		const measure = doc.score.getPart('P1')!.measures[0]!;
		expect(measure.getKey()!.fifths).toBe(0);
		const [fSharp, cNatural] = measure.notes;
		expect(spell(fSharp!.pitch!)).toBe('E0/4');
		expect(fSharp!.accidental).toBeNull();
		expect(spell(cNatural!.pitch!)).toBe('B-1/4');
		expect(cNatural!.accidental!.value).toBe('flat');
		expect(schemaErrors(doc)).toEqual([]);
		doc.score.convertToTransposedScore();
		expect(measure.getKey()!.fifths).toBe(2);
		expect(cNatural!.accidental!.value).toBe('natural');
	});

	it('writes a concert score out as the transposed part its for-part declares', () => {
		const doc = parse(CONCERT);
		doc.score.convertToTransposedScore();
		const [first, second] = doc.score.getPart('P1')!.measures;
		expect(doc.score.isConcertScore).toBe(false);
		expect(written(doc.score)).toEqual(['D0/4', 'D0/4']);
		expect(sounding(doc.score)).toEqual(['C0/3', 'C0/3']);
		const transpose = first!.getTranspose()!;
		expect([
			transpose.diatonic,
			transpose.chromatic,
			transpose.octaveChange,
		]).toEqual([-1, -2, -1]);
		expect(first!.getForPart()).toBeNull();
		expect(second!.getClef()!.sign).toBe('G');
		expect(schemaErrors(doc)).toEqual([]);
	});

	it('does nothing when the score already is what was asked', () => {
		const transposed = parse(TRANSPOSED);
		transposed.score.convertToTransposedScore();
		expect(serialize(transposed)).toBe(serialize(parse(TRANSPOSED)));
		const concert = parse(CONCERT);
		concert.score.convertToConcertScore();
		expect(serialize(concert)).toBe(serialize(parse(CONCERT)));
	});
});
