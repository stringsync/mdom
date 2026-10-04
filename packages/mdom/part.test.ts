import { describe, expect, it } from 'bun:test';
import { GuitarProParser } from './guitar-pro-parser';
import { GuitarProSerializer } from './guitar-pro-serializer';
import { MDocument } from './m-document';
import { MDOMParser } from './m-dom-parser';
import { MElement } from './m-node';
import { Measure } from './measure';
import { Part } from './part';

describe('Part', () => {
	const part = new Part();
	part.setAttribute('id', 'P1');
	for (const number of ['1', '2', '3']) {
		const measure = new Measure();
		measure.setAttribute('number', number);
		part.append(measure);
	}

	it('exposes its id', () => {
		expect(part.id).toBe('P1');
	});

	it('throws when id is unset', () => {
		expect(() => new Part().id).toThrow('id on <part>');
	});

	it('lists its measures', () => {
		expect(part.measures.length).toBe(3);
	});

	it('finds a measure by number', () => {
		expect(part.getMeasure('2')?.number).toBe('2');
	});

	it('returns null for an unknown measure number', () => {
		expect(part.getMeasure('9')).toBeNull();
	});

	it('reads the part-symbol from the first measure that declares one, null when never declared', () => {
		const withSymbol = new MDOMParser()
			.parseFromString(
				`<score-partwise><part id="P1">
        <measure number="1"><attributes><divisions>256</divisions><staves>2</staves><part-symbol>bracket</part-symbol></attributes></measure>
        <measure number="2"><attributes><part-symbol>brace</part-symbol></attributes></measure>
      </part></score-partwise>`,
			)
			.score.getPart('P1')!;
		expect(withSymbol.partSymbol).toBe('bracket'); // first declaration wins

		const without = new MDOMParser()
			.parseFromString(
				`<score-partwise><part id="P1"><measure number="1"><attributes><divisions>256</divisions></attributes></measure></part></score-partwise>`,
			)
			.score.getPart('P1')!;
		expect(without.partSymbol).toBeNull();
	});

	it('points back at its score, and throws when detached', () => {
		const score = new MDOMParser().parseFromString(
			`<score-partwise><part id="P1"/></score-partwise>`,
		).score;
		expect(score.getPart('P1')!.score).toBe(score);
		expect(() => new Part().score).toThrow(
			'<score-partwise> ancestor of <part>',
		);
	});

	describe('program', () => {
		function programOf(scorePart: string): number | null {
			return new MDOMParser()
				.parseFromString(
					`<score-partwise><part-list>${scorePart}</part-list><part id="P1"/></score-partwise>`,
				)
				.score.getPart('P1')!.program;
		}

		function withProgram(text: string): string {
			return `<score-part id="P1"><part-name>Melody</part-name><midi-instrument id="P1-I1"><midi-program>${text}</midi-program></midi-instrument></score-part>`;
		}

		it('reads the midi-program as written', () => {
			expect(programOf(withProgram('74'))).toBe(74);
		});

		it('accepts both ends of the 1 to 128 range', () => {
			expect(programOf(withProgram('1'))).toBe(1);
			expect(programOf(withProgram('128'))).toBe(128);
		});

		it('reads the score-part matching its id', () => {
			expect(
				programOf(
					`<score-part id="P0"><midi-instrument id="P0-I1"><midi-program>1</midi-program></midi-instrument></score-part>${withProgram('41')}`,
				),
			).toBe(41);
		});

		it('is null without a part-list or a matching score-part', () => {
			expect(
				new MDOMParser()
					.parseFromString(`<score-partwise><part id="P1"/></score-partwise>`)
					.score.getPart('P1')!.program,
			).toBeNull();
			expect(
				programOf(
					`<score-part id="P2"><midi-instrument id="P2-I1"><midi-program>74</midi-program></midi-instrument></score-part>`,
				),
			).toBeNull();
		});

		it('is null without a midi-instrument', () => {
			expect(
				programOf(
					`<score-part id="P1"><part-name>Flute</part-name></score-part>`,
				),
			).toBeNull();
		});

		it('is null without a midi-program', () => {
			expect(
				programOf(
					`<score-part id="P1"><midi-instrument id="P1-I1"><midi-channel>1</midi-channel></midi-instrument></score-part>`,
				),
			).toBeNull();
		});

		it('is null when the program is out of range', () => {
			expect(programOf(withProgram('0'))).toBeNull();
			expect(programOf(withProgram('129'))).toBeNull();
			expect(programOf(withProgram('-5'))).toBeNull();
		});

		it('is null when the program is not an integer', () => {
			expect(programOf(withProgram('flute'))).toBeNull();
			expect(programOf(withProgram('7.5'))).toBeNull();
			expect(programOf(withProgram(''))).toBeNull();
		});

		it('uses the first midi-instrument when there are several', () => {
			expect(
				programOf(
					`<score-part id="P1"><score-instrument id="P1-I1"><instrument-name>Flute</instrument-name></score-instrument><score-instrument id="P1-I2"><instrument-name>Oboe</instrument-name></score-instrument><midi-instrument id="P1-I1"><midi-program>74</midi-program></midi-instrument><midi-instrument id="P1-I2"><midi-program>69</midi-program></midi-instrument></score-part>`,
				),
			).toBe(74);
		});

		it('reads back the program a Guitar Pro import writes', async () => {
			const document = MDocument.empty();
			const part = document.score.addPart({ name: 'Lead' });
			part
				.addMeasure()
				.getOrCreateVoice('1')
				.addNote({ step: 'C', octave: 4, type: 'whole' });
			const instrument = new MElement('midi-instrument');
			instrument.setAttribute('id', 'P1-I1');
			const midiProgram = new MElement('midi-program');
			midiProgram.setText('74');
			instrument.append(midiProgram);
			document.score
				.child('part-list')!
				.child('score-part')!
				.append(instrument);
			expect(part.program).toBe(74);

			const imported = await new GuitarProParser().parseFromBytes(
				await new GuitarProSerializer().serializeToBytes(document),
			);
			expect(imported.score.parts[0]!.program).toBe(74);
		});
	});
});
