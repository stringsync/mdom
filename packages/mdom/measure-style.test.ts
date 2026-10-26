import { describe, expect, it } from 'bun:test';
import {
	MDOMParser,
	MDocument,
	MElement,
	MeasureStyle,
	MusicXMLSerializer,
} from './index';
import { schemaErrors } from './music-xml-schema';

const serialize = (doc: MDocument) =>
	new MusicXMLSerializer().serializeToString(doc);
const parse = (xml: string) => new MDOMParser().parseFromString(xml);
const score = () => {
	const doc = MDocument.empty();
	const part = doc.score.addPart({ id: 'P1', name: 'Rhythm' });
	return { doc, part, measure: part.addMeasure() };
};

describe('measure styles', () => {
	it('writes every family, explicit false options and ordered display children', () => {
		const { doc, measure } = score();
		const slash = measure.addMeasureStyle({
			kind: 'slash',
			staff: '2',
			type: 'start',
			useStems: false,
			useDots: true,
			slashType: 'quarter',
			dots: 2,
			exceptVoices: ['2', 'cue'],
		});
		const beat = measure.addMeasureStyle({
			kind: 'beat-repeat',
			type: 'start',
			slashes: 2,
			useDots: false,
			slashType: 'eighth',
			dots: 1,
			exceptVoices: ['3'],
		});
		const repeat = measure.addMeasureStyle({
			kind: 'measure-repeat',
			type: 'start',
			count: 2,
			slashes: 1,
		});
		const rest = measure.addMeasureStyle({
			kind: 'multiple-rest',
			count: 4,
			useSymbols: false,
		});
		measure.setStaveCount(2);
		measure.setDivisions(1);
		measure.setTime({ beats: 4, beatType: 4 });
		measure.getOrCreateVoice('1').addRest({ type: 'whole' });
		expect(slash).toBeInstanceOf(MeasureStyle);
		expect(slash.staff).toBe('2');
		expect(slash.type).toBe('start');
		expect(slash.useStems).toBe(false);
		expect(slash.useDots).toBe(true);
		expect(slash.slashType).toBe('quarter');
		expect(slash.dots).toBe(2);
		expect(slash.exceptVoices).toEqual(['2', 'cue']);
		expect(beat.slashes).toBe(2);
		expect(beat.useDots).toBe(false);
		expect(repeat.count).toBe(2);
		expect(rest.useSymbols).toBe(false);
		expect(measure.getMultiRestCount()).toBe(4);
		expect(
			slash.notation!.childrenOfType(MElement).map((child) => child.tag),
		).toEqual([
			'slash-type',
			'slash-dot',
			'slash-dot',
			'except-voice',
			'except-voice',
		]);
		expect(schemaErrors(doc)).toEqual([]);
		const xml = serialize(doc);
		const roundTrip = parse(xml);
		expect(
			roundTrip.score.parts[0]!.measures[0]!.measureStyles[0],
		).toBeInstanceOf(MeasureStyle);
		expect(serialize(roundTrip)).toBe(xml);
	});

	it('preserves absence, empty stops, formatting and generic extensions', () => {
		const { doc, measure } = score();
		measure.addMeasureStyle({ kind: 'slash', type: 'start' });
		const stop = measure.addMeasureStyle({
			kind: 'measure-repeat',
			type: 'stop',
		});
		const style = measure.measureStyles[0]!;
		style.setAttribute('color', '#123456');
		style.setAttribute('font-size', '12');
		expect(style.staff).toBeNull();
		expect(style.slashType).toBeNull();
		expect(style.useDots).toBeNull();
		expect(style.useStems).toBeNull();
		expect(style.useSymbols).toBeNull();
		expect(style.slashes).toBeNull();
		expect(style.dots).toBe(0);
		expect(stop.count).toBeNull();
		expect(schemaErrors(doc)).toEqual([]);
		style.notation!.setAttribute('custom', 'kept');
		const xml = serialize(doc);
		expect(serialize(parse(xml))).toBe(xml);
	});

	it('tracks independent start/stop families and staffs and invalidates cached reads', () => {
		const { doc, part, measure } = score();
		measure.setStaveCount(2);
		const slash = measure.addMeasureStyle({ kind: 'slash', type: 'start' });
		const repeat = measure.addMeasureStyle({
			kind: 'measure-repeat',
			type: 'start',
			staff: '2',
			count: 2,
		});
		measure.addMeasureStyle({ kind: 'multiple-rest', count: 3 });
		const second = part.addMeasure();
		const third = part.addMeasure();
		expect(third.getActiveMeasureStyle('slash', '2')).toBe(slash);
		expect(third.getActiveMeasureStyle('measure-repeat')).toBeNull();
		expect(third.getActiveMeasureStyle('measure-repeat', '2')).toBe(repeat);
		expect(second.getMultiRestCount()).toBeNull();
		const stop = second.addMeasureStyle({
			kind: 'slash',
			type: 'stop',
			staff: '2',
		});
		expect(third.getActiveMeasureStyle('slash', '2')).toBeNull();
		second.addMeasureStyle({
			kind: 'measure-repeat',
			type: 'stop',
			staff: '2',
		});
		expect(third.getActiveMeasureStyle('measure-repeat', '2')).toBeNull();
		expect(third.getActiveMeasureStyle('slash')).toBe(slash);
		stop.remove();
		expect(third.getActiveMeasureStyle('slash', '2')).toBe(slash);
		second.addMeasureStyle({ kind: 'slash', type: 'start' });
		second.addMeasureStyle({ kind: 'slash', type: 'stop' });
		expect(third.getActiveMeasureStyle('slash')).toBeNull();
		expect(schemaErrors(doc)).toEqual([]);
	});

	it('places partial-measure beat changes and carries the final stop forward', () => {
		const { doc, part, measure } = score();
		measure.setDivisions(2);
		const start = measure.addMeasureStyle({
			kind: 'beat-repeat',
			type: 'start',
		});
		measure.getOrCreateVoice('1').addRest({ type: 'half' });
		const stop = measure.addMeasureStyle({
			kind: 'beat-repeat',
			type: 'stop',
			onset: 2,
		});
		measure.getOrCreateVoice('1').addRest({ type: 'half', onset: 2 });
		expect(measure.measureStyles).toEqual([start, stop]);
		expect(measure.getActiveMeasureStyle('beat-repeat')).toBe(start);
		expect(part.addMeasure().getActiveMeasureStyle('beat-repeat')).toBeNull();
		expect(schemaErrors(doc)).toEqual([]);
	});

	it('rejects invalid counts and dots without changing the measure', () => {
		const { measure } = score();
		expect(() =>
			measure.addMeasureStyle({ kind: 'multiple-rest', count: 0 }),
		).toThrow();
		expect(() =>
			measure.addMeasureStyle({
				kind: 'measure-repeat',
				type: 'start',
				slashes: -1,
			}),
		).toThrow();
		expect(() =>
			measure.addMeasureStyle({ kind: 'slash', type: 'start', dots: 1 }),
		).toThrow();
		expect(() =>
			measure.addMeasureStyle({
				kind: 'beat-repeat',
				type: 'start',
				dots: 0.5,
			}),
		).toThrow();
		expect(measure.children).toEqual([]);
	});
});
