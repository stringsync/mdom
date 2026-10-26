import { describe, expect, it } from 'bun:test';
import { MDOMParser } from './index';
import { schemaErrors } from './music-xml-schema';

const XML = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
	<part-list><score-part id="P1"><part-name>Violin</part-name></score-part></part-list>
	<part id="P1"><measure number="1">
		<attributes><divisions>1</divisions></attributes>
		<direction><direction-type><metronome default-x="3" default-y="30"><beat-unit>quarter</beat-unit><per-minute>96</per-minute></metronome></direction-type></direction>
		<direction><direction-type><octave-shift type="up" size="8" default-y="20" dash-length="4" space-length="2"/></direction-type></direction>
		<direction><direction-type><pedal type="start" line="yes" relative-x="-2"/></direction-type></direction>
		<direction><direction-type><bracket type="start" line-end="up" line-type="solid"/></direction-type></direction>
		<direction><direction-type><dashes type="start" dash-length="6"/></direction-type></direction>
		<note>
			<pitch><step>C</step><octave>5</octave></pitch><duration>1</duration><voice>1</voice><type>quarter</type>
			<time-modification><actual-notes>3</actual-notes><normal-notes>2</normal-notes></time-modification>
			<notations>
				<tuplet type="start" default-y="15"/>
				<articulations><accent default-x="1" default-y="25" placement="above"/><staccato/></articulations>
				<technical><down-bow default-y="30"/></technical>
				<ornaments><tremolo default-x="2">3</tremolo><wavy-line type="start" default-y="9"/></ornaments>
			</notations>
			<lyric number="1" default-y="-80" relative-x="1"><syllabic>single</syllabic><text>la</text></lyric>
		</note>
	</measure></part>
</score-partwise>`;

const UNSET = {
	defaultX: null,
	defaultY: null,
	relativeX: null,
	relativeY: null,
};

function fixture() {
	const doc = new MDOMParser().parseFromString(XML);
	const measure = doc.score.parts[0]!.measures[0]!;
	return { doc, measure, note: measure.notes[0]! };
}

describe('mark positions', () => {
	it('reads positions on marks, lyrics and tuplets', () => {
		const { note, measure } = fixture();
		const [accent, staccato] = note.articulationMarks;
		expect(accent!.articulationType).toBe('accent');
		expect(accent!.placement).toBe('above');
		expect(accent!.position).toEqual({ ...UNSET, defaultX: 1, defaultY: 25 });
		expect(staccato!.position).toEqual(UNSET);
		expect(note.articulations).toEqual(['accent', 'staccato']);
		expect(note.technicals[0]!.position.defaultY).toBe(30);
		expect(note.ornaments[0]!.position.defaultX).toBe(2);
		expect(note.wavyLines[0]!.position.defaultY).toBe(9);
		expect(note.lyrics[0]!.position).toEqual({
			...UNSET,
			defaultY: -80,
			relativeX: 1,
		});
		expect(note.tuplets[0]!.position.defaultY).toBe(15);
		const directions = measure.directions;
		expect(directions[0]!.metronomes[0]!.position).toMatchObject({
			defaultX: 3,
			defaultY: 30,
		});
		expect(directions[1]!.octaveShifts[0]!.position.defaultY).toBe(20);
	});

	it('reads line styles on line spanners', () => {
		const { measure } = fixture();
		const [, shift, pedal, bracket, dashes] = measure.directions;
		expect(shift!.octaveShifts[0]!.dashStyle).toEqual({
			dashLength: 4,
			spaceLength: 2,
		});
		expect(pedal!.pedals[0]!.position.relativeX).toBe(-2);
		expect(bracket!.brackets[0]!.lineStyle.type).toBe('solid');
		expect(dashes!.dashes[0]!.dashStyle).toEqual({
			dashLength: 6,
			spaceLength: null,
		});
	});

	it('writes positions and line styles schema-valid', () => {
		const { doc, measure, note } = fixture();
		note.articulationMarks[1]!.setPosition({ defaultY: -10 });
		note.articulationMarks[0]!.setPosition(null);
		note.technicals[0]!.setPosition({ relativeY: 3 });
		note.ornaments[0]!.setPosition({ defaultX: 5 });
		note.wavyLines[0]!.setPosition({ defaultY: 12 });
		note.lyrics[0]!.setPosition({ defaultY: -60 });
		note.tuplets[0]!.setPosition(null);
		const directions = measure.directions;
		directions[0]!.metronomes[0]!.setPosition({ defaultX: 8 });
		directions[1]!.octaveShifts[0]!.setDashStyle({ dashLength: 5 });
		directions[3]!.brackets[0]!.setLineStyle({ type: 'dashed', dashLength: 3 });
		directions[4]!.dashes[0]!.setDashStyle({ spaceLength: 2 });
		expect(note.articulationMarks[1]!.position.defaultY).toBe(-10);
		expect(note.articulationMarks[0]!.position).toEqual(UNSET);
		expect(note.tuplets[0]!.position).toEqual(UNSET);
		expect(directions[1]!.octaveShifts[0]!.dashStyle).toEqual({
			dashLength: 5,
			spaceLength: null,
		});
		expect(directions[3]!.brackets[0]!.lineStyle.dashLength).toBe(3);
		expect(schemaErrors(doc)).toEqual([]);
	});
});
