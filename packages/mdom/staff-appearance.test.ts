import { describe, expect, it } from 'bun:test';
import {
	Appearance,
	LineDetail,
	MDOMParser,
	MDocument,
	MusicXMLSerializer,
	StaffLayout,
} from './index';
import { MElement } from './m-node';
import { schemaErrors } from './music-xml-schema';
import type { Score } from './score';

const serialize = (doc: MDocument) =>
	new MusicXMLSerializer().serializeToString(doc);
const parse = (xml: string) => new MDOMParser().parseFromString(xml);

function tags(element: MElement): string[] {
	return element.childrenOfType(MElement).map((child) => child.tag);
}

function scoreWithNote(): { doc: MDocument; score: Score } {
	const doc = MDocument.empty();
	const voice = doc.score
		.addPart({ id: 'P1', name: 'Piano' })
		.addMeasure()
		.getOrCreateVoice('1');
	voice.addNote({ step: 'C', octave: 4, type: 'whole' });
	return { doc, score: doc.score };
}

describe('staff layout and appearance — reads', () => {
	const doc = parse(`
		<score-partwise>
			<defaults>
				<staff-layout><staff-distance>80</staff-distance></staff-layout>
				<staff-layout number="2"><staff-distance>65</staff-distance></staff-layout>
				<appearance>
					<line-width type="light barline">1.25</line-width>
					<line-width type="stem">0.8</line-width>
					<note-size type="grace-cue">50</note-size>
					<distance type="hyphen">60</distance>
					<glyph type="quarter-rest">restQuarterZ</glyph>
				</appearance>
			</defaults>
			<part id="P1">
				<measure number="1"/>
				<measure number="2">
					<print new-system="yes">
						<staff-layout number="2"><staff-distance>90</staff-distance></staff-layout>
					</print>
				</measure>
				<measure number="3"><print new-system="no"/></measure>
				<measure number="4"><print new-system="yes"/></measure>
			</part>
		</score-partwise>`);
	const score = doc.score;
	const measures = score.parts[0]!.measures;

	it('reads score-wide staff layouts by staff number, numberless as staff 1', () => {
		expect(score.staffLayouts.map((each) => each.staff)).toEqual(['1', '2']);
		expect(score.getStaffLayout()).toBeInstanceOf(StaffLayout);
		expect(score.getStaffLayout()!.distance).toBe(80);
		expect(score.getStaffLayout('2')!.distance).toBe(65);
		expect(score.getStaffLayout('3')).toBeNull();
	});

	it('resolves a print override for its system only, then the defaults', () => {
		expect(measures.map((measure) => measure.getStaffDistance('2'))).toEqual([
			65, 90, 90, 65,
		]);
		expect(measures[2]!.getStaffDistance()).toBe(80);
		expect(measures[1]!.print!.getStaffLayout('1')).toBeNull();
	});

	it('reads appearance values by type and keeps unread children', () => {
		const appearance = score.appearance!;
		expect(appearance).toBeInstanceOf(Appearance);
		expect(appearance.lineWidths).toEqual([
			{ type: 'light barline', value: 1.25 },
			{ type: 'stem', value: 0.8 },
		]);
		expect(appearance.getLineWidth('stem')).toBe(0.8);
		expect(appearance.getLineWidth('beam')).toBeNull();
		expect(appearance.getNoteSize('grace-cue')).toBe(50);
		expect(appearance.getNoteSize('cue')).toBeNull();
		expect(appearance.distances).toEqual([{ type: 'hyphen', value: 60 }]);
		expect(serialize(parse(serialize(doc)))).toContain(
			'<glyph type="quarter-rest">restQuarterZ</glyph>',
		);
	});

	it('leaves everything null on a score without defaults', () => {
		const bare = scoreWithNote().score;
		expect(bare.appearance).toBeNull();
		expect(bare.staffLayouts).toEqual([]);
		expect(bare.parts[0]!.measures[0]!.getStaffDistance()).toBeNull();
	});
});

describe('staff layout and appearance — writes', () => {
	it('writes defaults in schema order and validates', () => {
		const { doc, score } = scoreWithNote();
		const appearance = score.getOrCreateAppearance();
		appearance.setDistance('beam', 7.5);
		appearance.setNoteSize('cue', 70);
		appearance.setLineWidth('stem', 1);
		appearance.setLineWidth('stem', 0.9);
		score.getOrCreateStaffLayout('2').setDistance(70);
		score.getOrCreateStaffLayout().setDistance(60);
		score.getOrCreateSystemLayout().systemDistance = 120;

		const defaults = score.child('defaults')!;
		expect(tags(defaults)).toEqual([
			'system-layout',
			'staff-layout',
			'staff-layout',
			'appearance',
		]);
		expect(score.staffLayouts.map((each) => each.staff)).toEqual(['1', '2']);
		expect(tags(appearance)).toEqual(['line-width', 'note-size', 'distance']);
		expect(appearance.getLineWidth('stem')).toBe(0.9);
		expect(schemaErrors(doc)).toEqual([]);

		const reread = parse(serialize(doc)).score;
		expect(reread.getStaffLayout('2')!.distance).toBe(70);
		expect(reread.appearance!.getDistance('beam')).toBe(7.5);

		appearance.setNoteSize('cue', null);
		score.getStaffLayout('2')!.setDistance(null);
		expect(appearance.noteSizes).toEqual([]);
		expect(tags(score.getStaffLayout('2')!)).toEqual([]);
	});

	it('writes print staff layouts between system layout and measure numbering', () => {
		const { doc, score } = scoreWithNote();
		const print = score.parts[0]!.measures[0]!.getOrCreatePrint();
		print.setMeasureNumbering({ value: 'system' });
		print.getOrCreateStaffLayout('1').setDistance(50);
		print.getOrCreateSystemLayout().systemDistance = 100;
		expect(tags(print)).toEqual([
			'system-layout',
			'staff-layout',
			'measure-numbering',
		]);
		expect(print.staffLayouts.map((each) => each.distance)).toEqual([50]);
		expect(score.parts[0]!.measures[0]!.getStaffDistance()).toBe(50);
		expect(schemaErrors(doc)).toEqual([]);
	});
});

describe('staff details — writes', () => {
	it('builds a tab staff in schema order and validates', () => {
		const { doc, score } = scoreWithNote();
		const measure = score.parts[0]!.measures[0]!;
		const details = measure.getOrCreateStaffDetails();
		details.setStaffSize(80, 90);
		details.setCapo(2);
		details.setStaffTunings([
			{ step: 'E', octave: 2 },
			{ step: 'A', octave: 2 },
			{ step: 'D', octave: 3 },
			{ step: 'G', octave: 3 },
			{ step: 'B', octave: 3 },
			{ step: 'E', octave: 4, alter: 0 },
		]);
		details.setStaffLines(6);
		details.setLineDetail(6, { lineType: 'dashed', printObject: false });
		details.setLineDetail(1, { width: 1.5, color: '#FF0000' });
		details.setStaffType('alternate');
		details.setShowFrets('letters');
		details.setPrintSpacing(true);

		expect(tags(details)).toEqual([
			'staff-type',
			'staff-lines',
			'line-detail',
			'line-detail',
			'staff-tuning',
			'staff-tuning',
			'staff-tuning',
			'staff-tuning',
			'staff-tuning',
			'staff-tuning',
			'capo',
			'staff-size',
		]);
		expect(measure.getOrCreateStaffDetails()).toBe(details);
		expect(measure.getStaffDetails()).toBe(details);
		expect(schemaErrors(doc)).toEqual([]);

		const reread = parse(
			serialize(doc),
		).score.parts[0]!.measures[0]!.getStaffDetails()!;
		expect(reread.staffType).toBe('alternate');
		expect(reread.staffLines).toBe(6);
		expect(reread.staffTunings.map((tuning) => tuning.midi)).toEqual([
			40, 45, 50, 55, 59, 64,
		]);
		expect(reread.capo).toBe(2);
		expect([reread.staffSize, reread.staffScaling]).toEqual([80, 90]);
		expect(reread.showFrets).toBe('letters');
		expect(reread.printSpacing).toBe(true);
		const [bottom, top] = reread.lineDetails;
		expect(bottom).toBeInstanceOf(LineDetail);
		expect([bottom!.line, bottom!.width, bottom!.color]).toEqual([
			1,
			1.5,
			'#FF0000',
		]);
		expect([top!.line, top!.lineType, top!.printObject]).toEqual([
			6,
			'dashed',
			false,
		]);
	});

	it('keeps per-staff blocks apart and clears values with null', () => {
		const { doc, score } = scoreWithNote();
		const measure = score.parts[0]!.measures[0]!;
		measure.setStaveCount(2);
		const lower = measure.getOrCreateStaffDetails('2');
		const upper = measure.getOrCreateStaffDetails('1');
		upper.setPrintObject(false);
		lower.setStaffLines(1);
		lower.setLineDetail(1, { width: 2 });
		expect(measure.getStaffDetails('2')).toBe(lower);
		expect(measure.getStaffDetails('1')!.printObject).toBe(false);
		expect(schemaErrors(doc)).toEqual([]);

		expect(() => lower.setStaffLines(null)).toThrow();
		lower.setLineDetail(1, null);
		lower.setStaffLines(null);
		lower.setStaffSize(110);
		lower.setStaffSize(120);
		expect([lower.staffSize, lower.staffScaling]).toEqual([120, null]);
		lower.setStaffSize(null);
		lower.setShowFrets(null);
		lower.setStaffTunings([]);
		expect(tags(lower)).toEqual([]);
		expect(() => lower.setLineDetail(1, { width: 1 })).toThrow();
	});
});
