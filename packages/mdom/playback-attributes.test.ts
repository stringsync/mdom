import { describe, expect, it } from 'bun:test';
import { MDOMParser, MDocument, MusicXMLSerializer } from './index';
import { schemaErrors } from './music-xml-schema';

const parse = (xml: string) => new MDOMParser().parseFromString(xml);
const serialize = (doc: MDocument) =>
	new MusicXMLSerializer().serializeToString(doc);

// Measure 1: a directive tempo heading, an f printed a beat late but played
// where it sits, and a mezzo piano whose offset moves playback too; then a
// note with its performance attributes, tied (printed and played) to the next.
// Measure 2: a standalone <sound> with its own offset, and pass-limited D.S.
const PLAYBACK = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <part-list><score-part id="P1"><part-name>Violin</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes><divisions>4</divisions></attributes>
      <direction directive="yes" placement="above">
        <direction-type><words>Allegro</words></direction-type>
        <sound tempo="132"/>
      </direction>
      <direction placement="below">
        <direction-type><dynamics><f/></dynamics></direction-type>
        <offset>4</offset>
      </direction>
      <direction placement="below">
        <direction-type><dynamics><mp/></dynamics></direction-type>
        <offset sound="yes">2</offset>
        <sound dynamics="54"/>
      </direction>
      <note dynamics="80" end-dynamics="60" attack="-1" release="2" pizzicato="yes">
        <pitch><step>C</step><octave>4</octave></pitch><duration>8</duration>
        <tie type="start"/><voice>1</voice><type>half</type>
        <notations><tied type="start"/></notations>
      </note>
      <note>
        <pitch><step>C</step><octave>4</octave></pitch><duration>8</duration>
        <tie type="stop"/><voice>1</voice><type>half</type>
        <notations><tied type="stop"/></notations>
      </note>
    </measure>
    <measure number="2">
      <note><pitch><step>D</step><octave>4</octave></pitch><duration>8</duration>
        <tie type="start"/><voice>1</voice><type>half</type></note>
      <sound dalsegno="segno" time-only="1, 3" pizzicato="no"><offset>4</offset></sound>
      <note><pitch><step>D</step><octave>4</octave></pitch><duration>8</duration>
        <tie type="stop"/><voice>1</voice><type>half</type></note>
    </measure>
  </part>
</score-partwise>`;

describe('playback attributes — reading', () => {
	const doc = parse(PLAYBACK);
	const [first, second] = doc.score.getPart('P1')!.measures;
	const [heading, forte, mezzo] = first!.directions;

	it('reads direction directives apart from playback', () => {
		expect(heading!.isDirective).toBe(true);
		expect(forte!.isDirective).toBe(false);
		expect(heading!.playbackBeat).toBe(0);
	});

	it('reads a direction offset, moving playback only when it says so', () => {
		expect(forte!.offset).toEqual({ divisions: 4, beats: 1, sound: false });
		expect(forte!.measureBeat).toBe(0);
		expect(forte!.playbackBeat).toBe(0);
		expect(mezzo!.offset).toEqual({ divisions: 2, beats: 0.5, sound: true });
		expect(mezzo!.playbackBeat).toBe(0.5);
		expect(mezzo!.sound!.playbackBeat).toBe(0.5);
		expect(heading!.offset).toBeNull();
	});

	it('reads note performance attributes, attack and release in beats', () => {
		const [played, plain] = first!.notes;
		expect(played!.performance).toEqual({
			dynamics: 80,
			endDynamics: 60,
			attack: -0.25,
			release: 0.5,
			pizzicato: true,
		});
		expect(plain!.performance).toEqual({
			dynamics: null,
			endDynamics: null,
			attack: null,
			release: null,
			pizzicato: null,
		});
	});

	it('reads playback ties apart from the notated ones', () => {
		expect(first!.notes.map((note) => note.playbackTies)).toEqual([
			['start'],
			['stop'],
		]);
		// Measure 2 plays a tie it never prints.
		expect(second!.notes.map((note) => note.playbackTies)).toEqual([
			['start'],
			['stop'],
		]);
		expect(second!.notes[0]!.ties).toEqual([]);
	});

	it('reads a standalone sound with its own offset, passes and pizzicato', () => {
		const sound = second!.sounds[0]!;
		expect(sound.offset).toEqual({ divisions: 4, beats: 1, sound: true });
		expect(sound.playbackBeat).toBe(3);
		expect(sound.dalSegno).toBe('segno');
		expect(sound.passes).toEqual([1, 3]);
		expect(sound.pizzicato).toBe(false);
		expect(first!.sounds[0]!.passes).toBeNull();
		expect(first!.sounds[0]!.pizzicato).toBeNull();
	});

	it('validates and round-trips unchanged', () => {
		expect(schemaErrors(doc)).toEqual([]);
		const once = serialize(parse(PLAYBACK));
		expect(serialize(parse(once))).toBe(once);
	});
});

describe('playback attributes — writing', () => {
	const build = () => {
		const doc = MDocument.empty();
		const measure = doc.score
			.addPart({ id: 'P1', name: 'Violin' })
			.addMeasure();
		const voice = measure.getOrCreateVoice('1');
		const first = voice.addNote({ step: 'C', octave: 4, type: 'half' });
		const second = voice.addNote({ step: 'C', octave: 4, type: 'half' });
		return { doc, measure, first, second };
	};

	it('ties for print and playback together, and unties both', () => {
		const { doc, first, second } = build();
		first.addTie(second);
		expect(first.playbackTies).toEqual(['start']);
		expect(second.playbackTies).toEqual(['stop']);
		expect(schemaErrors(doc)).toEqual([]);

		first.removeTie(second);
		expect(first.playbackTies).toEqual([]);
		expect(second.playbackTies).toEqual([]);
		expect(first.ties).toEqual([]);
	});

	it('keeps a middle note tied both ways, stop first, until each tie goes', () => {
		const { doc, measure, first, second } = build();
		const third = measure
			.getOrCreateVoice('1')
			.addNote({ step: 'C', octave: 4, type: 'half' });
		second.addTie(third);
		first.addTie(second);
		expect(second.playbackTies).toEqual(['stop', 'start']);
		expect(schemaErrors(doc)).toEqual([]);

		first.removeTie(second);
		expect(second.playbackTies).toEqual(['start']);
		expect(third.playbackTies).toEqual(['stop']);
	});

	it('writes a playback tie with no printed one', () => {
		const { doc, first } = build();
		first.setPlaybackTie('start', true);
		first.setPlaybackTie('start', true);
		expect(first.playbackTies).toEqual(['start']);
		expect(first.ties).toEqual([]);
		expect(schemaErrors(doc)).toEqual([]);
		first.setPlaybackTie('start', false);
		expect(first.playbackTies).toEqual([]);
	});

	it('writes and clears note performance', () => {
		const { doc, first } = build();
		first.setPerformance({
			dynamics: 70,
			endDynamics: 40,
			attack: 0.25,
			release: -0.5,
			pizzicato: false,
		});
		expect(first.performance).toEqual({
			dynamics: 70,
			endDynamics: 40,
			attack: 0.25,
			release: -0.5,
			pizzicato: false,
		});
		expect(schemaErrors(doc)).toEqual([]);
		first.setPerformance({ dynamics: 90 });
		expect(first.performance.dynamics).toBe(90);
		expect(first.performance.pizzicato).toBeNull();
		first.setPerformance(null);
		expect(first.getAttribute('dynamics')).toBeNull();
	});

	it('writes a directive and an offset direction in schema order', () => {
		const { doc, measure } = build();
		const direction = measure.addDirection({
			words: 'Allegro',
			directive: true,
			tempo: 132,
			staff: '1',
			offset: { beats: 1, sound: true },
			sound: { dynamics: 80, pizzicato: true },
		});
		expect(direction.isDirective).toBe(true);
		expect(direction.offset?.beats).toBe(1);
		expect(direction.offset?.sound).toBe(true);
		expect(direction.playbackBeat).toBe(5);
		expect(direction.sound!.dynamics).toBe(80);
		expect(direction.sound!.pizzicato).toBe(true);
		expect(
			direction.children.flatMap((child) =>
				'tag' in child ? [child.tag] : [],
			),
		).toEqual(['direction-type', 'offset', 'staff', 'sound']);
		expect(schemaErrors(doc)).toEqual([]);

		direction.setOffset(null);
		direction.setDirective(null);
		expect(direction.offset).toBeNull();
		expect(direction.isDirective).toBe(false);
	});
});
