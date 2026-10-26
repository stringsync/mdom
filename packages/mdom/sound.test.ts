import { describe, expect, it } from 'bun:test';
import { MDocument } from './m-document';
import { MDOMParser } from './m-dom-parser';
import { MElement } from './m-node';

// <sound> appears inside a <direction> AND as a direct <measure> child, with the
// same meaning — here both spellings, plus a swing instruction and the
// <straight/> that cancels it.
const SAMPLE = `<score-partwise><part id="P1">
  <measure number="1">
    <attributes><divisions>4</divisions></attributes>
    <direction><direction-type><words>Swing</words></direction-type>
      <sound tempo="132" dynamics="80">
        <swing><first>2</first><second>1</second><swing-type>eighth</swing-type></swing>
      </sound>
    </direction>
    <note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration></note>
    <sound tempo="90"/>
  </measure>
  <measure number="2">
    <direction><direction-type><words>Straight</words></direction-type>
      <sound><swing><straight/><swing-type>16th</swing-type></swing></sound>
    </direction>
    <note><pitch><step>D</step><octave>4</octave></pitch><duration>4</duration></note>
  </measure>
</part></score-partwise>`;

describe('sound — merged from the direction and the measure', () => {
	const part = new MDOMParser().parseFromString(SAMPLE).score.getPart('P1')!;
	const [first, second] = part.measures;

	it('merges the directions sounds, then the measure own standalone child', () => {
		expect(first!.sounds.map((sound) => sound.tempo)).toEqual([132, 90]);
		expect(first!.directions[0]!.sound?.tempo).toBe(132);
		expect(first!.directions[0]!.soundTempo).toBe(132); // the old accessor still works
	});

	it('reads the playback dynamics, null when unset', () => {
		expect(first!.sounds[0]!.dynamics).toBe(80);
		expect(first!.sounds[1]!.dynamics).toBeNull();
	});

	it('reads the swing ratio and the note value it divides', () => {
		expect(first!.sounds[0]!.swing).toEqual({ first: 2, second: 1, unit: 0.5 });
		expect(first!.sounds[1]!.swing).toBeNull(); // no <swing> at all
	});

	it('reads <straight/> as an even 1:1, so it cancels a carried swing', () => {
		expect(second!.sounds[0]!.swing).toEqual({
			first: 1,
			second: 1,
			unit: 0.25,
		});
	});
});

describe('sound — writing swing', () => {
	it('writes a ratio and its unit, read back alike', () => {
		const measure = MDocument.empty().score.addPart({ name: 'P' }).addMeasure();
		const swung = measure.addSound({
			swing: { first: 3, second: 1, unit: 0.25 },
		});
		const plain = measure.addSound({ swing: { first: 2, second: 1 } });

		expect(
			swung
				.child('swing')!
				.childrenOfType(MElement)
				.map((child) => [child.tag, child.text]),
		).toEqual([
			['first', '3'],
			['second', '1'],
			['swing-type', '16th'],
		]);
		expect(plain.child('swing')!.child('swing-type')).toBeNull();
		expect(swung.swing).toEqual({ first: 3, second: 1, unit: 0.25 });
		expect(plain.swing).toEqual({ first: 2, second: 1, unit: 0.5 });
	});

	it('writes an even ratio as <straight/>, after any MIDI change', () => {
		const sound = MDocument.empty()
			.score.addPart({ name: 'P' })
			.addMeasure()
			.addSound({
				swing: { first: 2, second: 2, unit: 0.25 },
				midiInstruments: [{ id: 'P1-I1', program: 25 }],
			});

		expect(sound.childrenOfType(MElement).map((child) => child.tag)).toEqual([
			'midi-instrument',
			'swing',
		]);
		expect(
			sound
				.child('swing')!
				.childrenOfType(MElement)
				.map((child) => child.tag),
		).toEqual(['straight']);
	});

	it('rejects ratios and units MusicXML cannot write', () => {
		const measure = MDocument.empty().score.addPart({ name: 'P' }).addMeasure();

		expect(() =>
			measure.addSound({ swing: { first: 1.5, second: 1 } }),
		).toThrow('positive integers');
		expect(() =>
			measure.addSound({ swing: { first: 2, second: 1, unit: 1 } }),
		).toThrow('swing unit');
	});
});
