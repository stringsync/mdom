import { describe, expect, it } from 'bun:test';
import { MDOMParser, MDocument, MElement, MusicXMLSerializer } from './index';
import { schemaErrors } from './music-xml-schema';

const parse = (xml: string) => new MDOMParser().parseFromString(xml);
const serialize = (doc: MDocument) =>
	new MusicXMLSerializer().serializeToString(doc);

// Measure 1: a C7(♭9,♯9,no 5) with two altered ninths and a subtraction, then
// a first-inversion F/A with a styled bass, both on staff 2; measure 2: a
// Roman-numeral V7 in G minor, a pre-4.0 <function>, and a vertical polychord
// placed a beat late by <offset>.
const CHORDS = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes><divisions>2</divisions><staves>2</staves></attributes>
      <harmony type="explicit" print-frame="no">
        <root><root-step text="Do">C</root-step><root-alter>0</root-alter></root>
        <kind use-symbols="no" text="7" parentheses-degrees="yes" halign="left" valign="bottom">dominant</kind>
        <degree><degree-value>9</degree-value><degree-alter>-1</degree-alter><degree-type>alter</degree-type></degree>
        <degree print-object="no"><degree-value symbol="major" text="9">9</degree-value><degree-alter plus-minus="yes">1</degree-alter><degree-type>add</degree-type></degree>
        <degree><degree-value>5</degree-value><degree-alter>0</degree-alter><degree-type text="no">subtract</degree-type></degree>
        <staff>2</staff>
      </harmony>
      <note><pitch><step>C</step><octave>3</octave></pitch><duration>4</duration><voice>1</voice><type>half</type><staff>2</staff></note>
      <harmony>
        <root><root-step>F</root-step></root>
        <kind>major</kind>
        <inversion text="6">1</inversion>
        <bass arrangement="horizontal"><bass-separator>over</bass-separator><bass-step>A</bass-step><bass-alter>0</bass-alter></bass>
        <staff>2</staff>
      </harmony>
      <forward><duration>2</duration></forward>
      <note><pitch><step>A</step><octave>2</octave></pitch><duration>2</duration><voice>1</voice><type>quarter</type><staff>2</staff></note>
    </measure>
    <measure number="2">
      <harmony>
        <numeral><numeral-root text="V">5</numeral-root><numeral-alter>0</numeral-alter><numeral-key print-object="no"><numeral-fifths>-2</numeral-fifths><numeral-mode>harmonic minor</numeral-mode></numeral-key></numeral>
        <kind text="7">dominant</kind>
      </harmony>
      <harmony><function>ii</function><kind>minor</kind></harmony>
      <harmony arrangement="vertical">
        <root><root-step>D</root-step></root><kind>major</kind>
        <root><root-step>C</root-step></root><kind>major</kind>
        <offset sound="yes">2</offset>
      </harmony>
      <note><pitch><step>G</step><octave>3</octave></pitch><duration>8</duration><voice>1</voice><type>whole</type></note>
    </measure>
  </part>
</score-partwise>`;

describe('harmony — reading degrees, inversion and numerals', () => {
	const doc = parse(CHORDS);
	const [first, second] = doc.score.getPart('P1')!.measures;
	const [dominant, inversion] = first!.harmonies;
	const [numeral, functional, polychord] = second!.harmonies;

	it('reads ordered, repeated degrees with explicit zero alters', () => {
		expect(dominant!.degrees).toEqual([
			{
				value: 9,
				alter: -1,
				type: 'alter',
				symbol: null,
				text: null,
				typeText: null,
				plusMinus: false,
				printObject: true,
			},
			{
				value: 9,
				alter: 1,
				type: 'add',
				symbol: 'major',
				text: '9',
				typeText: null,
				plusMinus: true,
				printObject: false,
			},
			{
				value: 5,
				alter: 0,
				type: 'subtract',
				symbol: null,
				text: null,
				typeText: 'no',
				plusMinus: false,
				printObject: true,
			},
		]);
		expect(inversion!.degrees).toEqual([]);
	});

	it('reads root text, kind formatting and harmony attributes', () => {
		expect(dominant!.root).toEqual({ step: 'C', alter: 0, text: 'Do' });
		expect(dominant!.kind).toEqual({
			value: 'dominant',
			text: '7',
			useSymbols: false,
			stackDegrees: null,
			parenthesesDegrees: true,
			bracketDegrees: null,
			halign: 'left',
			valign: 'bottom',
		});
		expect(dominant!.type).toBe('explicit');
		expect(dominant!.printFrame).toBe(false);
		expect(inversion!.type).toBeNull();
		expect(inversion!.printFrame).toBeNull();
	});

	it('reads the inversion and a styled bass', () => {
		expect(inversion!.inversion).toEqual({ value: 1, text: '6' });
		expect(inversion!.bass).toEqual({
			step: 'A',
			alter: 0,
			text: null,
			separator: 'over',
			arrangement: 'horizontal',
		});
		expect(dominant!.inversion).toBeNull();
	});

	it('reads a numeral root with its key, and a deprecated function', () => {
		expect(numeral!.root).toBeNull();
		expect(numeral!.numeral).toEqual({
			root: 5,
			text: 'V',
			alter: 0,
			key: { fifths: -2, mode: 'harmonic minor', printObject: false },
		});
		expect(functional!.function).toBe('ii');
		expect(functional!.numeral).toBeNull();
		expect(functional!.kind!.value).toBe('minor');
	});

	it('reads each chord of a polychord', () => {
		expect(polychord!.arrangement).toBe('vertical');
		expect(
			polychord!.chords.map((chord) => [chord.root!.step, chord.kind!.value]),
		).toEqual([
			['D', 'major'],
			['C', 'major'],
		]);
		expect(numeral!.chords).toHaveLength(1);
	});

	it('reads staff, with a default of 1', () => {
		expect(dominant!.staff).toBe('2');
		expect(numeral!.staff).toBe('1');
	});

	it('places the symbol in musical time apart from the note it sits over', () => {
		// The F/A change lands at beat 2 over a rest-gap; its next note starts at beat 3.
		expect(inversion!.measureBeat).toBe(2);
		expect(inversion!.nextNote!.measureBeat).toBe(3);
		expect(dominant!.measureBeat).toBe(0);
	});

	it('reads the offset in divisions and beats', () => {
		expect(polychord!.offset).toEqual({ divisions: 2, beats: 1, sound: true });
		expect(polychord!.measureBeat).toBe(0);
		expect(numeral!.offset).toBeNull();
	});

	it('validates and round-trips unchanged', () => {
		expect(schemaErrors(doc)).toEqual([]);
		const once = serialize(parse(CHORDS));
		expect(serialize(parse(once))).toBe(once);
	});
});

describe('harmony — writing', () => {
	it('writes degrees, inversion, bass and kind formatting in schema order', () => {
		const doc = MDocument.empty();
		const measure = doc.score
			.addPart({ id: 'P1', name: 'Guitar' })
			.addMeasure();
		measure
			.getOrCreateVoice('1')
			.addNote({ step: 'C', octave: 4, type: 'whole' });
		const harmony = measure.addHarmony({
			root: { step: 'C', alter: 0 },
			kind: { value: 'dominant', text: '7', stackDegrees: true },
			inversion: { value: 1, text: '6' },
			bass: { step: 'E', separator: '/', arrangement: 'diagonal' },
			degrees: [
				{ value: 9, alter: -1, type: 'alter' },
				{ value: 9, alter: 1, type: 'add', plusMinus: true },
				{ value: 5, type: 'subtract', typeText: 'no' },
			],
			frame: { notes: [{ string: 5, fret: 3 }] },
			type: 'implied',
			printFrame: true,
			staff: '1',
			onset: 2,
			offset: { beats: 0.5, sound: true },
		});
		expect(harmony.root).toEqual({ step: 'C', alter: 0, text: null });
		expect(harmony.kind!.stackDegrees).toBe(true);
		expect(harmony.inversion).toEqual({ value: 1, text: '6' });
		expect(harmony.bass!.separator).toBe('/');
		expect(
			harmony.degrees.map((degree) => [
				degree.value,
				degree.alter,
				degree.type,
			]),
		).toEqual([
			[9, -1, 'alter'],
			[9, 1, 'add'],
			[5, 0, 'subtract'],
		]);
		expect(harmony.type).toBe('implied');
		expect(harmony.measureBeat).toBe(2);
		expect(harmony.nextNote).toBeNull();
		expect(harmony.offset!.beats).toBe(0.5);
		expect(harmony.offset!.sound).toBe(true);
		expect(serialize(doc)).toMatch(
			/<degree-value>5<\/degree-value>\s*<degree-alter>0<\/degree-alter>/,
		);
		expect(schemaErrors(doc)).toEqual([]);
	});

	it('writes a numeral root, a function and a polychord', () => {
		const doc = MDocument.empty();
		const measure = doc.score.addPart({ id: 'P1', name: 'Piano' }).addMeasure();
		measure.addHarmony({
			numeral: {
				root: 4,
				text: 'IV',
				alter: 0,
				key: { fifths: 1, mode: 'major', printObject: false },
			},
			kind: 'major',
		});
		measure.addHarmony({ function: 'V', kind: 'dominant' });
		measure.addHarmony({
			root: { step: 'D' },
			kind: 'major',
			polychord: [{ root: { step: 'C' }, kind: 'major' }],
			arrangement: 'vertical',
		});
		measure
			.getOrCreateVoice('1')
			.addNote({ step: 'C', octave: 4, type: 'whole' });
		const [numeral, functional, polychord] = measure.harmonies;
		expect(numeral!.numeral).toEqual({
			root: 4,
			text: 'IV',
			alter: 0,
			key: { fifths: 1, mode: 'major', printObject: false },
		});
		expect(functional!.function).toBe('V');
		expect(polychord!.chords.map((chord) => chord.root!.step)).toEqual([
			'D',
			'C',
		]);
		expect(polychord!.arrangement).toBe('vertical');
		expect(schemaErrors(doc)).toEqual([]);
	});

	it('upserts and removes staff and offset around the frame', () => {
		const doc = MDocument.empty();
		const measure = doc.score.addPart({ id: 'P1', name: 'Piano' }).addMeasure();
		measure
			.getOrCreateVoice('1')
			.addNote({ step: 'C', octave: 4, type: 'whole' });
		const harmony = measure.addHarmony({ root: { step: 'G' }, kind: 'major' });
		harmony.setStaff('1');
		harmony.setOffset({ beats: 1 });
		harmony.setFrame({ notes: [{ string: 6, fret: 3 }] });
		expect(harmony.childrenOfType(MElement).map((child) => child.tag)).toEqual([
			'root',
			'kind',
			'frame',
			'offset',
			'staff',
		]);
		expect(harmony.offset).toEqual({
			divisions: harmony.offset!.divisions,
			beats: 1,
			sound: false,
		});
		expect(schemaErrors(doc)).toEqual([]);
		harmony.setOffset(null);
		harmony.setStaff(null);
		expect(harmony.offset).toBeNull();
		expect(harmony.staff).toBe('1');
	});
});
