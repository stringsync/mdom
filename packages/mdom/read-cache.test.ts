import { beforeEach, describe, expect, it } from 'bun:test';
import type { MDocument } from './m-document';
import { MDOMParser } from './m-dom-parser';
import { required } from './m-node';
import type { Measure } from './measure';
import type { Note } from './note';
import type { Part } from './part';
import type { Slur } from './slur';

// Reads are cached until the next document change. Each test reads first, so a
// cache is warm, then edits and reads again: a stale cache shows up as the old
// answer.

const note = (slur = '') =>
	`<note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice><type>quarter</type>${slur ? `<notations>${slur}</notations>` : ''}</note>`;

const XML = `<score-partwise version="4.0"><part id="P1">
	<measure number="1">
		<attributes><divisions>4</divisions><clef><sign>G</sign><line>2</line></clef>
			<staff-details><line-detail line="1" color="#FF0000"/></staff-details></attributes>
		${note('<slur type="start" number="1"/>')}${note()}
	</measure>
	<measure number="2">${note('<slur type="stop" number="1"/>')}${note()}</measure>
	<measure number="3">${note('<slur type="start" number="1"/>')}${note()}</measure>
	<measure number="4">${note('<slur type="stop" number="1"/>')}${note()}</measure>
</part></score-partwise>`;

describe('read caches', () => {
	let doc: MDocument;
	let part: Part;
	let measures: readonly Measure[];
	let firstNotes: Note[];

	const slurOf = (target: Note): Slur => required(target.slurs[0], 'slur');

	beforeEach(() => {
		doc = new MDOMParser().parseFromString(XML);
		part = required(doc.score.parts[0], 'part');
		measures = part.measures;
		firstNotes = measures.map((measure) =>
			required(measure.notes[0], 'first note'),
		);
	});

	describe('spanner partners', () => {
		it('re-pairs after a slur number changes', () => {
			const opener = slurOf(firstNotes[0]!);
			expect(opener.partner).toBe(slurOf(firstNotes[1]!));
			slurOf(firstNotes[1]!).setAttribute('number', '2');
			expect(opener.partner).toBeNull();
		});

		it('re-pairs after a slur is removed', () => {
			const opener = slurOf(firstNotes[0]!);
			expect(opener.partner).toBe(slurOf(firstNotes[1]!));
			slurOf(firstNotes[1]!).remove();
			// The orphaned start now pairs with nothing; m3's start still claims m4's stop.
			expect(opener.partner).toBeNull();
			expect(slurOf(firstNotes[2]!).partner).toBe(slurOf(firstNotes[3]!));
		});

		it('pairs a slur added after a read', () => {
			expect(slurOf(firstNotes[0]!).partner).not.toBeNull();
			const from = required(measures[1]!.notes[1], 'note');
			const to = required(measures[2]!.notes[1], 'note');
			const added = from.addSlur(to);
			expect(added.partner?.note).toBe(to);
			expect(added.members).toHaveLength(2);
		});

		it('follows history undo and redo', () => {
			const opener = slurOf(firstNotes[0]!);
			const closer = slurOf(firstNotes[1]!);
			expect(opener.partner).toBe(closer);
			doc.history.edit('Remove slur stop', () => closer.remove());
			expect(opener.partner).toBeNull();
			doc.history.undo();
			expect(opener.partner).toBe(closer);
			doc.history.redo();
			expect(opener.partner).toBeNull();
		});
	});

	describe('attributes in effect', () => {
		it('sees a clef change inserted mid-part', () => {
			expect(measures[3]!.getClef()?.sign).toBe('G');
			measures[2]!.setClef({ sign: 'F', line: 4 });
			expect(measures[1]!.getClef()?.sign).toBe('G');
			expect(measures[2]!.getClef()?.sign).toBe('F');
			expect(measures[3]!.getClef()?.sign).toBe('F');
			expect(firstNotes[3]!.clef?.sign).toBe('F');
		});

		it('carries a mid-measure clef change into later measures only', () => {
			expect(measures[2]!.getClef()?.sign).toBe('G');
			expect(measures[1]!.clefAtEnd()?.sign).toBe('G');
			measures[1]!.setClef({ sign: 'C', line: 3, onset: 1 });
			expect(measures[1]!.getClef()?.sign).toBe('G');
			expect(measures[1]!.clefAtEnd()?.sign).toBe('C');
			expect(measures[2]!.getClef()?.sign).toBe('C');
			expect(firstNotes[2]!.clef?.sign).toBe('C');
		});

		it('sees a divisions change inserted mid-part, and its undo', () => {
			expect(firstNotes[3]!.divisions).toBe(4);
			expect(firstNotes[3]!.beats).toBe(1);
			doc.history.edit('Divisions', () => measures[2]!.setDivisions(8));
			expect(firstNotes[1]!.divisions).toBe(4);
			expect(firstNotes[2]!.divisions).toBe(8);
			expect(firstNotes[3]!.divisions).toBe(8);
			expect(firstNotes[3]!.beats).toBe(0.5);
			doc.history.undo();
			expect(firstNotes[3]!.divisions).toBe(4);
			doc.history.redo();
			expect(firstNotes[3]!.divisions).toBe(8);
		});

		it('hands out arrays a caller cannot corrupt the cache through', () => {
			const details = measures[3]!.getLineDetails();
			expect(details).toHaveLength(1);
			details.pop();
			expect(measures[3]!.getLineDetails()).toHaveLength(1);
		});
	});

	describe('measure list', () => {
		it('tracks an inserted measure', () => {
			expect(measures[2]!.index).toBe(2);
			expect(part.measures).toHaveLength(4);
			const inserted = part.insertMeasureAt(1, { number: '1a' });
			expect(part.measures).toHaveLength(5);
			expect(part.measures[1]).toBe(inserted);
			expect(inserted.index).toBe(1);
			expect(measures[2]!.index).toBe(3);
			expect(part.getMeasure('1a')).toBe(inserted);
		});

		it('tracks a removed measure, and its undo', () => {
			const removed = measures[1]!;
			expect(measures[3]!.index).toBe(3);
			doc.history.edit('Remove measure', () => removed.remove());
			expect(part.measures).toHaveLength(3);
			expect(removed.index).toBe(-1);
			expect(measures[3]!.index).toBe(2);
			// m3's carry-forward clef now comes straight from m1.
			expect(measures[2]!.getClef()?.sign).toBe('G');
			doc.history.undo();
			expect(part.measures).toHaveLength(4);
			expect(removed.index).toBe(1);
			expect(measures[3]!.index).toBe(3);
		});

		it('shares one frozen measure list until the next change', () => {
			const list = part.measures;
			expect(part.measures).toBe(list);
			expect(Object.isFrozen(list)).toBe(true);
			expect(() => (list as Measure[]).pop()).toThrow(TypeError);
			part.addMeasure();
			expect(part.measures).not.toBe(list);
			expect(part.measures).toHaveLength(5);
			expect(list).toHaveLength(4);
		});
	});
});
