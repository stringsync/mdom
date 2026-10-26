import { describe, expect, it } from 'bun:test';
import { EXAMPLES, loadScore } from './examples';

// compatibility.test.ts proves the corpus round-trips; this proves it can be
// READ: the query accessors pointed at the real exporter output that motivated
// them. A synthetic fragment can't show that Finale really does write 792
// `new-system="no"` measures.

describe('Finale + Dolet — a 22-part orchestral score', () => {
	const score = loadScore(EXAMPLES.ACTOR_PRELUDE_SAMPLE);
	const measures = score.parts.flatMap((part) => part.measures);
	const notes = measures.flatMap((measure) => measure.notes);

	it('reads odd/even page margins, per-page overrides and measure numbering', () => {
		const defaults = score.pageLayout!;
		expect([defaults.height, defaults.width]).toEqual([3560, 2797]);
		expect(defaults.margins.map((each) => each.type)).toEqual(['even', 'odd']);
		expect(defaults.getMargins('even')).toMatchObject({
			left: 141,
			right: 115,
		});

		const prints = score.parts[0]!.measures.flatMap((measure) =>
			measure.print ? [measure.print] : [],
		);
		const pages = prints.filter((print) => print.pageNumber !== null);
		expect(pages.map((print) => print.pageNumber)).toEqual(
			pages.map((_, index) => String(index + 1)),
		);
		expect(pages[1]!.newPage).toBe(true);
		expect(pages[1]!.pageLayout!.getMargins('even')).toMatchObject({
			type: null,
			left: 141,
			top: 104,
		});
		expect(prints[0]!.measureNumbering?.value).toBe('system');
	});

	it('reads engraving defaults and resolves staff distance overrides per system', () => {
		const appearance = score.appearance!;
		expect(appearance.lineWidths).toHaveLength(10);
		expect(appearance.getLineWidth('heavy barline')).toBe(5.0391);
		expect(appearance.getLineWidth('tuplet bracket')).toBe(0.957);
		expect(appearance.noteSizes).toEqual([
			{ type: 'grace', value: 60 },
			{ type: 'cue', value: 60 },
		]);
		expect(score.getStaffLayout()!.distance).toBe(93);

		const oboe = score.getPart('P2')!;
		expect(oboe.measures[0]!.print!.getStaffLayout('1')!.distance).toBe(95);
		// Measure 2 opens no system, so the override from measure 1 still holds.
		expect(oboe.measures[1]!.getStaffDistance()).toBe(95);
		expect(score.parts[0]!.measures[1]!.getStaffDistance()).toBe(93);
	});

	it('reads default fonts and the explicit words formatting that overrides them', () => {
		expect(score.musicFont).toMatchObject({
			family: 'Maestro,music',
			size: 11.3,
		});
		expect(score.wordFont).toMatchObject({
			family: 'Times New Roman',
			size: 5.7,
		});
		const words = measures.flatMap((measure) =>
			measure.directions.flatMap((direction) => direction.wordsElements),
		);
		const moderato = words.find((each) => each.text === 'Moderato')!;
		expect(moderato.font).toMatchObject({ size: 7.1, weight: 'bold' });
		expect(moderato.resolvedFont).toMatchObject({
			family: 'Times New Roman',
			size: 7.1,
		});
		expect(
			words.filter((each) => each.halign === 'right').length,
		).toBeGreaterThan(0);
	});

	it('reads per-note instrument assignments and the percussion MIDI keys', () => {
		const cymbal = score.getPart('P15')!;
		expect(cymbal.instruments.map((each) => each.name)).toEqual([
			'Splash Cymbal',
		]);
		expect(cymbal.getMidiInstrument('P15-X8')).toMatchObject({
			channel: 10,
			unpitched: 56,
			volume: 80,
			pan: 0,
		});
		const assigned = cymbal.measures
			.flatMap((measure) => measure.notes)
			.filter((note) => note.instrumentIds.length > 0);
		expect(assigned).toHaveLength(66);
		expect(new Set(assigned.flatMap((note) => note.instrumentIds))).toEqual(
			new Set(['P15-X8']),
		);
	});

	it('resolves the part-list brackets and braces, outermost first', () => {
		const groups = score.partGroups;
		expect(score.parts).toHaveLength(22);
		expect(groups[0]).toEqual({
			fromPartIndex: 0,
			toPartIndex: 6,
			symbol: 'bracket',
			name: null,
			abbreviation: null,
			barline: 'yes',
			depth: 0,
		});
		// An enclosing group always opens before the one it encloses, so start order
		// never puts a child ahead of its parent.
		expect(
			groups.every(
				(group, index) =>
					index === 0 || groups[index - 1]!.depth <= group.depth + 1,
			),
		).toBe(true);
		expect(
			groups.some(
				(group) => group.symbol === 'brace' && group.name === 'Horns in F',
			),
		).toBe(true);
		expect(groups.some((group) => group.barline === 'no')).toBe(true); // absence is not the only non-'yes'
	});

	it('keeps new-system="no" distinct from an absent attribute', () => {
		// The whole reason the tri-state exists: this exporter states "stays on its
		// line" 792 times, which a boolean reads as identical to silence.
		const prints = measures.flatMap((measure) =>
			measure.print ? [measure.print] : [],
		);
		expect(prints.filter((print) => print.systemBreak === 'no')).toHaveLength(
			792,
		);
		expect(prints.filter((print) => print.systemBreak === 'yes')).toHaveLength(
			22,
		);
		expect(prints.filter((print) => print.systemBreak === null)).toHaveLength(
			88,
		);
		expect(prints.filter((print) => print.newSystem)).toHaveLength(22); // the boolean still agrees
	});

	it('finds the spacer notes that hold a tick but draw nothing', () => {
		expect(notes).toHaveLength(2945);
		expect(notes.filter((note) => !note.printObject)).toHaveLength(303);
	});

	it('reads percussion staff positions and open noteheads', () => {
		expect(notes.filter((note) => note.unpitched)).toHaveLength(237);
		expect(notes.find((note) => note.unpitched)?.unpitched).toEqual({
			step: 'E',
			octave: 5,
		});
		expect(
			notes.filter((note) => note.notehead?.filled === false),
		).toHaveLength(13);
	});

	it('reads dynamics by tag and playback velocities off <sound>', () => {
		const marks = measures
			.flatMap((measure) => measure.directions)
			.flatMap((direction) => direction.dynamics)
			.flatMap((dynamics) => dynamics.marks);
		expect(marks.slice(0, 3)).toEqual(['p', 'f', 'ff']);
		expect(
			measures
				.flatMap((measure) => measure.sounds)
				.filter((sound) => sound.dynamics != null),
		).toHaveLength(228);
	});

	it('reads the tempo mark in its beat-unit form', () => {
		const metronome = measures
			.flatMap((measure) => measure.directions)
			.flatMap((direction) => direction.metronomes)[0]!;
		expect(metronome.beatUnits).toEqual([{ type: 'quarter', dots: 0 }]);
		expect(metronome.perMinute).toBe('85');
		expect(metronome.relation).toBeNull();
	});
});
