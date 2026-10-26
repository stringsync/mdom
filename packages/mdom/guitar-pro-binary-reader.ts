// SPDX-License-Identifier: MPL-2.0
// Guitar Pro 3-5 record layout adapted from alphaTab's Gp3To5Importer. See THIRD_PARTY.md.
// Copyright © 2025 Daniel Kuschny and Contributors.
import { GuitarProBinaryCursor } from './guitar-pro-binary-cursor';
import type { GuitarProOptions } from './guitar-pro-options';
import { GuitarProValues } from './guitar-pro-values';

const VERSION_PREFIX = 'FICHIER GUITAR PRO ';
const MAX_BARS = 1000;
const MAX_TRACKS = 100;
const MAX_BEATS_PER_VOICE = 1024;
const MAX_NOTICE_LINES = 1000;
const MAX_POINTS = 240;
const STRING_SLOTS = 7;
const BASS_CLEF_TUNING = 35;
const NOTE_TECHNIQUES = 'note techniques';
const BEAT_EFFECTS = 'beat effects or annotations';
/** Guitar Pro's jump and target markers, in the order the header stores their bar numbers. */
const DIRECTIONS = [
	'Coda',
	'DoubleCoda',
	'Segno',
	'SegnoSegno',
	'Fine',
	'DaCapo',
	'DaCapoAlCoda',
	'DaCapoAlDoubleCoda',
	'DaCapoAlFine',
	'DaSegno',
	'DaSegnoAlCoda',
	'DaSegnoAlDoubleCoda',
	'DaSegnoAlFine',
	'DaSegnoSegno',
	'DaSegnoSegnoAlCoda',
	'DaSegnoSegnoAlDoubleCoda',
	'DaSegnoSegnoAlFine',
	'DaCoda',
	'DaDoubleCoda',
];
/** The first of {@link DIRECTIONS} that are targets, which mark a bar's start; the rest are jumps. */
const TARGET_COUNT = 5;
const LYRIC_LINES = 5;
const SLAPS: Record<number, string> = {
	1: 'Tapped',
	2: 'Slapped',
	3: 'Popped',
};
const HARMONICS: Record<number, string> = {
	1: 'Natural',
	2: 'Artificial',
	3: 'Tap',
	4: 'Pinch',
	5: 'Semi',
};
/** Guitar Pro 4 names an artificial harmonic by the frets above the played note it sounds. */
const GP4_ARTIFICIAL_HARMONICS = [15, 17, 22];
/** Guitar Pro 4 slide types as GPIF slide flags; GP5 stores the flags themselves. */
const GP4_SLIDES: Record<number, number> = {
	1: 1,
	2: 2,
	3: 4,
	4: 8,
	[-1]: 16,
	[-2]: 32,
};
const TREMOLO_PICKING: Record<number, string> = {
	1: '1/2',
	2: '1/4',
	3: '1/8',
};
const FINGERS = ['Thumb', 'Index', 'Middle', 'Ring', 'Pinky'];
const OTTAVAS: [number, string][] = [
	[0x10, '8va'],
	[0x20, '8vb'],
	[0x40, '15ma'],
	[0x100, '15mb'],
];

const DURATIONS = [
	'whole',
	'half',
	'quarter',
	'eighth',
	'16th',
	'32nd',
	'64th',
];
const PADDING: [string, number][] = DURATIONS.flatMap((type) => [
	[type, 1],
	[type, 0],
]);
const DYNAMICS = ['PPP', 'PP', 'P', 'MP', 'MF', 'F', 'FF', 'FFF'];
const TUPLET_NORMAL: Record<number, number> = {
	1: 1,
	3: 2,
	5: 4,
	6: 4,
	7: 4,
	9: 8,
	10: 8,
	11: 8,
	12: 8,
	13: 8,
};

/** The GPIF XML and per-track tablature flags that a Guitar Pro 3-5 file is equivalent to. */
export interface GuitarProBinaryScore {
	gpif: string;
	tablature: boolean[];
}

interface MasterBar {
	numerator: number;
	denominator: number;
	fifths: number;
	minor: boolean;
	repeatStart: boolean;
	repeatCount: number;
	doubleBar: boolean;
	/** The GPIF `TripletFeel` the bar plays with; null when straight. */
	tripletFeel: string | null;
	/** The passes an alternate ending's volta plays on; empty outside one. */
	endings: number[];
	/** Landmarks (segno, coda, fine) at the bar's start, and jumps taken at its end. */
	targets: string[];
	jumps: string[];
}

/** The GP5 bar triplet-feel byte as the GPIF `TripletFeel` it means. */
const TRIPLET_FEELS: Record<number, string> = {
	1: 'Triplet8th',
	2: 'Triplet16th',
};
interface Track {
	name: string;
	tuning: number[];
	capo: number;
	percussion: boolean;
	tablature: boolean;
	program: number;
	channel: number;
	bassClef: boolean;
	/** Chord diagram items of the GPIF `DiagramCollection`, and the ids of those written. */
	diagrams: string[];
	diagramIds: Map<string, number>;
	lyrics: LyricLine[];
}
interface LyricLine {
	startBar: number;
	text: string;
}
/** The GPIF a beat's effects add: child tags, and `Property` nodes for its `Properties`. */
interface BeatEffects {
	tags: string;
	properties: string;
	/** Effects Guitar Pro 3 and 4 keep on the beat but GPIF keeps on each of its notes. */
	noteTags: string;
	noteProperties: string;
}
/** The GPIF a note's effects add. */
interface NoteEffects {
	staccato: boolean;
	/** The GPIF tremolo picking speed, which GPIF keeps on the beat. */
	tremolo: string | null;
	tags: string;
	properties: string;
}
interface TempoChange {
	bar: number;
	position: number;
	tempo: number;
}
interface PlaybackInfo {
	program: number;
}
interface ChordDiagram {
	name: string;
	firstFret: number;
	frets: number[];
	fingers: number[];
}

/** Reads a Guitar Pro 3, 4 or 5 file into the GPIF tables that `GuitarProDocumentReader` consumes. */
export class GuitarProBinaryReader {
	private readonly values: GuitarProValues;
	private cursor!: GuitarProBinaryCursor;
	private version = 0;
	private readonly rhythms = new Map<string, number>();
	private readonly rhythmXml: string[] = [];
	private readonly noteXml: string[] = [];
	private readonly beatXml: string[] = [];
	private readonly voiceXml: string[] = [];
	private readonly barXml: string[] = [];
	private readonly tiedFrets = new Map<string, number>();
	/** Tempo changes by bar and position; the header tempo is the first. */
	private readonly tempos = new Map<string, TempoChange>();
	private barIndex = 0;

	constructor(opts: GuitarProOptions = {}) {
		this.values = new GuitarProValues(opts);
	}

	/** Whether the bytes start with a Guitar Pro 3-5 version header. */
	static isGuitarPro(bytes: Uint8Array): boolean {
		return (
			bytes.length > VERSION_PREFIX.length &&
			bytes[0]! <= 30 &&
			new TextDecoder('windows-1252')
				.decode(bytes.subarray(1, 1 + VERSION_PREFIX.length))
				.startsWith(VERSION_PREFIX)
		);
	}

	read(bytes: Uint8Array): GuitarProBinaryScore {
		this.cursor = new GuitarProBinaryCursor(bytes);
		this.readVersion();
		const info = this.readScoreInformation();
		const tripletFeel =
			this.version < 500 && this.cursor.byte() !== 0 ? 'Triplet8th' : null;
		const lyrics =
			this.version >= 400 ? this.readLyrics() : { track: -1, lines: [] };
		if (this.version >= 510) {
			this.cursor.skip(19);
		}
		if (this.version >= 500) {
			this.cursor.skip(28);
			this.cursor.int16();
			for (let field = 0; field < 10; field++) {
				this.cursor.intByteString();
			}
			this.cursor.intByteString();
		}
		const tempo = this.cursor.int32();
		if (tempo > 0) {
			this.addTempo({ bar: 0, position: 0, tempo });
		}
		if (this.version >= 510) {
			this.cursor.byte();
		}
		this.cursor.int32();
		if (this.version >= 400) {
			this.cursor.byte();
		}
		const playback = this.readPlayback();
		const directions = this.version >= 500 ? this.readDirections() : [];
		const barCount = this.cursor.count(
			this.cursor.int32(),
			MAX_BARS,
			'bar count',
		);
		const trackCount = this.cursor.count(
			this.cursor.int32(),
			MAX_TRACKS,
			'track count',
		);
		const masters = this.readMasterBars(barCount, tripletFeel);
		for (const [bar, direction] of directions) {
			const master = masters[bar];
			if (!master) {
				this.values.unsupported('jumps outside the score');
			} else if (DIRECTIONS.indexOf(direction) < TARGET_COUNT) {
				master.targets.push(direction);
			} else {
				master.jumps.push(direction);
			}
		}
		const tracks: Track[] = [];
		for (let index = 0; index < trackCount; index++) {
			tracks.push(this.readTrack(playback));
		}
		for (let bar = 0; bar < barCount; bar++) {
			this.barIndex = bar;
			for (const [trackIndex, track] of tracks.entries()) {
				this.readBar(trackIndex, track, masters[bar]!);
			}
		}
		if (lyrics.track >= 0 && lyrics.track < tracks.length) {
			tracks[lyrics.track]!.lyrics = lyrics.lines;
		}
		return {
			gpif: this.gpif(info, masters, tracks),
			tablature: tracks.map((track) => track.tablature),
		};
	}

	private readVersion(): void {
		const header = this.cursor.fixedString(30);
		if (!header.startsWith(VERSION_PREFIX)) {
			throw new Error('Not a Guitar Pro 3-5 file');
		}
		// `v4.06`, or `L4.06` in some Guitar Pro 4 files.
		const match = /^[vL](\d+)\.(\d+)/.exec(header.slice(VERSION_PREFIX.length));
		if (!match) {
			throw new Error(`Invalid Guitar Pro version: ${header}`);
		}
		const major = Number(match[1]);
		const minor = Number(match[2]);
		this.version = major * 100 + minor;
		if (major < 3 || major > 5) {
			throw new Error(
				`Guitar Pro ${major}.${String(minor).padStart(2, '0')} files are not supported; only Guitar Pro 3, 4 and 5 .gp3, .gp4 and .gp5 files import`,
			);
		}
	}

	private readScoreInformation(): Record<string, string> {
		const read = () => this.cursor.unusedIntString();
		const title = read();
		read();
		const artist = read();
		read();
		// Guitar Pro 3 and 4 have one author field, which their GP7 re-saves keep as the music.
		let words = read();
		let music = words;
		if (this.version >= 500) {
			music = read();
		} else {
			words = '';
		}
		const copyright = read();
		read();
		read();
		const notices = this.cursor.count(
			this.cursor.int32(),
			MAX_NOTICE_LINES,
			'notice line count',
		);
		for (let line = 0; line < notices; line++) {
			this.cursor.unusedIntString();
		}
		return { title, artist, words, music, copyright };
	}

	/** The lyric lines of the one track that sings them; the track and start bars are 1-based. */
	private readLyrics(): { track: number; lines: LyricLine[] } {
		const track = this.cursor.int32() - 1;
		const lines: LyricLine[] = [];
		for (let line = 0; line < LYRIC_LINES; line++) {
			const startBar = Math.max(0, this.cursor.int32() - 1);
			lines.push({ startBar, text: this.cursor.intString() });
		}
		return { track, lines };
	}

	private readPlayback(): PlaybackInfo[] {
		const infos: PlaybackInfo[] = [];
		for (let slot = 0; slot < 64; slot++) {
			infos.push({ program: this.cursor.int32() });
			this.cursor.skip(8);
		}
		return infos;
	}

	/** The bar index (0-based) each jump or target marker sits on, in {@link DIRECTIONS} names. */
	private readDirections(): [number, string][] {
		const found: [number, string][] = [];
		for (const name of DIRECTIONS) {
			const bar = this.cursor.int16();
			if (bar !== -1) {
				found.push([bar - 1, name]);
			}
		}
		this.cursor.skip(4);
		return found;
	}

	private readMasterBars(
		count: number,
		tripletFeel: string | null,
	): MasterBar[] {
		const masters: MasterBar[] = [];
		let previous: MasterBar = {
			numerator: 4,
			denominator: 4,
			fifths: 0,
			minor: false,
			repeatStart: false,
			repeatCount: 0,
			doubleBar: false,
			tripletFeel,
			endings: [],
			targets: [],
			jumps: [],
		};
		for (let index = 0; index < count; index++) {
			const flags = this.cursor.byte();
			const master: MasterBar = {
				...previous,
				repeatStart: (flags & 0x04) !== 0,
				repeatCount: 0,
				doubleBar: (flags & 0x80) !== 0,
				endings: [],
				targets: [],
				jumps: [],
			};
			if (flags & 0x01) {
				master.numerator = this.cursor.byte();
			}
			if (flags & 0x02) {
				master.denominator = this.cursor.byte();
			}
			if (flags & 0x08) {
				// Guitar Pro 3 and 4 count the repeats after the first pass.
				const count = this.cursor.byte() + (this.version >= 500 ? 0 : 1);
				master.repeatCount = Math.max(2, count);
			}
			if (flags & 0x10 && this.version < 500) {
				master.endings = this.legacyEnding(masters, this.cursor.byte());
			}
			if (flags & 0x20) {
				this.cursor.intByteString();
				this.cursor.skip(4);
			}
			if (flags & 0x40) {
				master.fifths = this.cursor.signedByte();
				master.minor = this.cursor.byte() === 1;
			}
			if (this.version >= 500) {
				if (flags & 0x03) {
					this.cursor.skip(4);
				}
				const endings = this.cursor.byte();
				const feel = this.cursor.byte();
				this.cursor.byte();
				master.tripletFeel = TRIPLET_FEELS[feel] ?? null;
				for (let pass = 0; pass < 8; pass++) {
					if (endings & (1 << pass)) {
						master.endings.push(pass + 1);
					}
				}
				if (feel && !master.tripletFeel) {
					this.values.unsupported('triplet feel');
				}
			}
			masters.push(master);
			previous = master;
		}
		return masters;
	}

	/**
	 * Guitar Pro 3 and 4 store an alternate ending as its last pass: the ending plays
	 * every pass up to it that no earlier ending of the same repeat already plays.
	 */
	private legacyEnding(masters: MasterBar[], last: number): number[] {
		const taken = new Set<number>();
		for (let index = masters.length - 1; index >= 0; index--) {
			const earlier = masters[index]!;
			// A repeat close outside an ending ends an earlier repeat.
			if (
				earlier.repeatStart ||
				(earlier.repeatCount && !earlier.endings.length)
			) {
				break;
			}
			for (const pass of earlier.endings) {
				taken.add(pass);
			}
		}
		const endings: number[] = [];
		for (let pass = 1; pass <= Math.min(last, 8); pass++) {
			if (!taken.has(pass)) {
				endings.push(pass);
			}
		}
		return endings;
	}

	private readTrack(playback: PlaybackInfo[]): Track {
		const flags = this.cursor.byte();
		const name = this.cursor.fixedString(40);
		const stringCount = this.cursor.count(
			this.cursor.int32(),
			STRING_SLOTS,
			'string count',
		);
		const tuning: number[] = [];
		for (let slot = 0; slot < STRING_SLOTS; slot++) {
			const pitch = this.cursor.int32();
			if (slot < stringCount) {
				tuning.push(pitch);
			}
		}
		this.cursor.int32();
		const channelIndex = this.cursor.int32() - 1;
		this.cursor.int32();
		this.cursor.int32();
		const capo = this.cursor.int32();
		this.cursor.skip(4);
		// Guitar Pro 3 and 4 always show tablature beside the staff.
		let tablature = true;
		let clefMode = 0;
		if (this.version >= 500) {
			tablature = (this.cursor.byte() & 0x01) !== 0;
			this.cursor.skip(2);
			this.cursor.byte();
			this.cursor.byte();
			clefMode = this.cursor.int32();
			this.cursor.skip(4 + 4 + 10 + 2 + 16);
		}
		if (this.version >= 510) {
			this.cursor.skip(4);
			this.cursor.intByteString();
			this.cursor.intByteString();
		}
		const validChannel = channelIndex >= 0 && channelIndex < playback.length;
		return {
			name,
			tuning,
			capo,
			percussion: (flags & 0x01) !== 0,
			tablature,
			program: validChannel ? playback[channelIndex]!.program : 0,
			// The 64 channels are four MIDI ports of 16.
			channel: validChannel ? channelIndex % 16 : 0,
			bassClef:
				clefMode === 12 ||
				(tuning.length > 0 && tuning[tuning.length - 1]! < BASS_CLEF_TUNING),
			diagrams: [],
			diagramIds: new Map(),
			lyrics: [],
		};
	}

	private readBar(trackIndex: number, track: Track, master: MasterBar): void {
		// Guitar Pro 3 and 4 bars have one voice.
		let voiceCount = 1;
		if (this.version >= 500) {
			this.cursor.byte();
			voiceCount = 2;
		}
		const voiceIds: string[] = [];
		for (let voiceIndex = 0; voiceIndex < voiceCount; voiceIndex++) {
			const beatCount = this.cursor.count(
				this.cursor.int32(),
				MAX_BEATS_PER_VOICE,
				'beat count',
			);
			const beatIds: number[] = [];
			let length: Fraction = [0, 1];
			for (let beat = 0; beat < beatCount; beat++) {
				const read = this.readBeat(
					trackIndex,
					voiceIndex,
					track,
					master,
					length,
				);
				beatIds.push(...read.ids);
				length = add(length, read.length);
			}
			if (voiceIndex === 0 && beatIds.length) {
				beatIds.push(
					...this.padWithRests([master.numerator, master.denominator], length),
				);
			}
			if (!beatIds.length) {
				voiceIds.push('-1');
				continue;
			}
			voiceIds.push(String(this.voiceXml.length));
			this.voiceXml.push(
				`<Voice id="${this.voiceXml.length}"><Beats>${beatIds.join(' ')}</Beats></Voice>`,
			);
		}
		this.barXml.push(
			`<Bar id="${this.barXml.length}"><Clef>${track.bassClef ? 'F4' : 'G2'}</Clef><Voices>${voiceIds.join(' ')}</Voices></Bar>`,
		);
	}

	/** Returns the ids of the beat and of any grace beats that precede it. */
	private readBeat(
		trackIndex: number,
		voiceIndex: number,
		track: Track,
		master: MasterBar,
		onset: Fraction,
	): { ids: number[]; length: Fraction } {
		const flags = this.cursor.byte();
		// Status 0 is a placeholder that GP shows as an empty bar, not a rest.
		const placeholder =
			flags & 0x40 ? (this.cursor.byte() & 0x02) === 0 : false;
		const duration = this.cursor.signedByte();
		const durationName = DURATIONS[duration + 2] ?? 'quarter';
		const dots = flags & 0x01 ? 1 : 0;
		let tuplet = [1, 1];
		if (flags & 0x20) {
			const actual = this.cursor.int32();
			const normal = TUPLET_NORMAL[actual];
			if (normal == null) {
				this.values.unsupported(`tuplet of ${actual}`);
			} else {
				tuplet = [actual, normal];
			}
		}
		const chord = flags & 0x02 ? this.readChord(track) : null;
		const text = flags & 0x04 ? this.cursor.unusedIntString() : '';
		const effects = flags & 0x08 ? this.readBeatEffects() : emptyBeatEffects();
		if (flags & 0x10) {
			const tempo = this.readMixTableChange();
			if (tempo != null) {
				this.addTempo({
					bar: this.barIndex,
					position:
						toNumber(onset) / toNumber([master.numerator, master.denominator]),
					tempo,
				});
			}
		}
		const stringFlags = this.cursor.byte();
		const notes: string[] = [];
		const graceBeats: number[] = [];
		let dynamic = 'F';
		let tremolo: string | null = null;
		for (let bit = 6; bit >= 0; bit--) {
			const stringIndex = 6 - bit;
			if (!(stringFlags & (1 << bit)) || stringIndex >= track.tuning.length) {
				continue;
			}
			const note = this.readNote(
				trackIndex,
				voiceIndex,
				track,
				stringIndex,
				graceBeats,
				effects,
			);
			notes.push(note.id);
			dynamic = note.dynamic ?? dynamic;
			tremolo = note.tremolo ?? tremolo;
		}
		const ottava = this.version >= 500 ? this.readBeatFlags() : '';
		if (placeholder && !notes.length) {
			return { ids: [], length: [0, 1] };
		}
		const rhythm = this.rhythm(durationName, dots, tuplet);
		const id = this.beatXml.length;
		this.beatXml.push(
			`<Beat id="${id}"><Rhythm ref="${rhythm}"/><Dynamic>${dynamic}</Dynamic>${
				text ? `<FreeText>${escapeXml(text)}</FreeText>` : ''
			}${chord == null ? '' : `<Chord>${chord}</Chord>`}${ottava}${tremolo ? `<Tremolo>${tremolo}</Tremolo>` : ''}${effects.tags}${
				effects.properties
					? `<Properties>${effects.properties}</Properties>`
					: ''
			}${notes.length ? `<Notes>${notes.join(' ')}</Notes>` : ''}</Beat>`,
		);
		return {
			ids: [...graceBeats, id],
			length: beatLength(durationName, dots, tuplet),
		};
	}

	/** Guitar Pro stores a short bar as written; its own editor fills the gap with rests. */
	private padWithRests(measure: Fraction, filled: Fraction): number[] {
		const ids: number[] = [];
		let gap = subtract(measure, filled);
		for (const [type, dots] of PADDING) {
			const size = beatLength(type, dots, [1, 1]);
			while (compare(size, gap) <= 0) {
				const rhythm = this.rhythm(type, dots, [1, 1]);
				ids.push(this.beatXml.length);
				this.beatXml.push(
					`<Beat id="${this.beatXml.length}"><Rhythm ref="${rhythm}"/><Dynamic>F</Dynamic></Beat>`,
				);
				gap = subtract(gap, size);
			}
		}
		return ids;
	}

	/** The trailing beat flags carry layout (beaming), which is regenerated, and the ottava. */
	private readBeatFlags(): string {
		const flags = this.cursor.int16();
		if (flags & 0x800) {
			this.cursor.byte();
		}
		const ottava = OTTAVAS.find(([bit]) => flags & bit)?.[1];
		return ottava ? `<Ottavia>${ottava}</Ottavia>` : '';
	}

	/** Reads a chord diagram into the track's diagram collection; returns its id. */
	private readChord(track: Track): number {
		const { name, firstFret, frets, fingers } = this.readChordDiagram();
		const strings = track.tuning.length;
		const played = frets.slice(0, strings);
		const key = `${name}|${firstFret}|${played.join(',')}|${fingers.slice(0, strings).join(',')}`;
		let id = track.diagramIds.get(key);
		if (id == null) {
			id = track.diagrams.length;
			track.diagramIds.set(key, id);
			track.diagrams.push(
				this.diagram(id, name, firstFret, played, fingers, strings),
			);
		}
		return id;
	}

	/**
	 * Guitar Pro 4 and 5 diagrams share a layout, which GP4 marks with a leading
	 * nonzero byte; GP3 has its own, and both have an older one with no fingering.
	 */
	private readChordDiagram(): ChordDiagram {
		const modern = this.cursor.byte() !== 0 || this.version >= 500;
		if (modern && this.version >= 400) {
			this.cursor.skip(16);
			const name = this.cursor.fixedString(21);
			this.cursor.skip(4);
			const firstFret = this.cursor.int32();
			const frets = this.int32s(STRING_SLOTS);
			this.cursor.skip(24);
			const fingers: number[] = [];
			for (let slot = 0; slot < STRING_SLOTS; slot++) {
				fingers.push(this.cursor.signedByte());
			}
			this.cursor.byte();
			return { name, firstFret, frets, fingers };
		}
		if (modern) {
			this.cursor.skip(25);
			const name = this.cursor.fixedString(34);
			const firstFret = this.cursor.int32();
			const frets = this.int32s(6);
			this.cursor.skip(36);
			return { name, firstFret, frets, fingers: [] };
		}
		const name = this.cursor.intByteString();
		const firstFret = this.cursor.int32();
		const frets =
			firstFret > 0 ? this.int32s(this.version >= 406 ? STRING_SLOTS : 6) : [];
		return { name, firstFret, frets, fingers: [] };
	}

	private int32s(count: number): number[] {
		return Array.from({ length: count }, () => this.cursor.int32());
	}

	/** One `DiagramCollection` item; Guitar Pro lists strings from the highest, GPIF from the lowest. */
	private diagram(
		id: number,
		name: string,
		firstFret: number,
		frets: number[],
		fingers: number[],
		strings: number,
	): string {
		const baseFret = Math.max(firstFret - 1, 0);
		const dots: string[] = [];
		const positions: string[] = [];
		for (const [slot, fret] of frets.entries()) {
			if (fret < 0) {
				continue;
			}
			const string = strings - 1 - slot;
			const relative = fret > 0 ? Math.max(fret - baseFret, 1) : 0;
			dots.push(`<Fret string="${string}" fret="${relative}"/>`);
			const finger = FINGERS[fingers[slot]!];
			if (finger && relative) {
				positions.push(
					`<Position finger="${finger}" fret="${relative}" string="${string}"/>`,
				);
			}
		}
		const shown = dots.length > 0;
		return `<Item id="${id}" name="${escapeXml(name)}"><Diagram stringCount="${strings}" fretCount="5" baseFret="${baseFret}" barsStates="1 1 1 1 1">${dots.join('')}${
			positions.length ? `<Fingering>${positions.join('')}</Fingering>` : ''
		}<Property name="ShowDiagram" type="bool" value="${shown}"/><Property name="ShowName" type="bool" value="true"/><Property name="ShowFingering" type="bool" value="true"/></Diagram></Item>`;
	}

	private readBeatEffects(): BeatEffects {
		const effects = emptyBeatEffects();
		const flags = this.cursor.byte();
		const flags2 = this.version >= 400 ? this.cursor.byte() : 0;
		if (flags & 0x10) {
			effects.tags += '<Fade>FadeIn</Fade>';
		}
		// Guitar Pro 3 has no note vibrato, so marks it on the beat.
		if (this.version < 400 && flags & 0x01) {
			effects.noteTags += '<Vibrato>Slight</Vibrato>';
		}
		if (flags & 0x02) {
			effects.properties +=
				'<Property name="VibratoWTremBar"><Strength>Slight</Strength></Property>';
		}
		if (flags & 0x20) {
			const type = this.cursor.signedByte();
			const slap = SLAPS[type];
			if (slap) {
				effects.properties += `<Property name="${slap}"><Enable/></Property>`;
			}
			if (this.version < 400) {
				// Type 0 is a tremolo bar dip, whose depth this value holds.
				this.cursor.int32();
				if (type === 0) {
					this.values.unsupported(BEAT_EFFECTS);
				}
			}
		}
		if (flags2 & 0x04) {
			const points = this.readBend();
			if (points.length) {
				const [origin, middle, destination] = bendValues(points);
				effects.tags += `<Whammy originValue="${origin}" originOffset="0" middleValue="${middle}" middleOffset1="0" middleOffset2="100" destinationValue="${destination}" destinationOffset="100"/>`;
			}
		}
		if (flags & 0x40) {
			const first = this.cursor.signedByte();
			const second = this.cursor.signedByte();
			// Guitar Pro 3 and 4 store the down stroke first.
			const [up, down] =
				this.version >= 500 ? [first, second] : [second, first];
			if (up > 0 || down > 0) {
				effects.properties += `<Property name="Brush"><Direction>${up > 0 ? 'Up' : 'Down'}</Direction></Property>`;
			}
		}
		if (flags2 & 0x02) {
			const stroke = this.cursor.signedByte();
			if (stroke === 1 || stroke === 2) {
				effects.properties += `<Property name="PickStroke"><Direction>${stroke === 1 ? 'Up' : 'Down'}</Direction></Property>`;
			}
		}
		// Guitar Pro 3 keeps harmonics on the beat, for every note it plays.
		if (this.version < 400 && flags & 0x0c) {
			const harmonic = flags & 0x04 ? 'Natural' : 'Artificial';
			effects.noteProperties += `<Property name="HarmonicType"><HType>${harmonic}</HType></Property>`;
		}
		return effects;
	}

	/** Reads a bend or tremolo bar curve, which share one layout, as its point values. */
	private readBend(): number[] {
		this.cursor.byte();
		this.cursor.int32();
		const count = this.cursor.count(
			this.cursor.int32(),
			MAX_POINTS,
			'bend point count',
		);
		const values: number[] = [];
		for (let point = 0; point < count; point++) {
			this.cursor.int32();
			values.push(this.cursor.int32());
			this.cursor.byte();
		}
		return values;
	}

	/** Reads a mix table change; returns the tempo it sets, if any. */
	private readMixTableChange(): number | null {
		const instrument = this.cursor.signedByte();
		if (this.version >= 500) {
			this.cursor.skip(16);
		}
		const volume = this.cursor.signedByte();
		const balance = this.cursor.signedByte();
		const chorus = this.cursor.signedByte();
		const reverb = this.cursor.signedByte();
		const phaser = this.cursor.signedByte();
		const tremolo = this.cursor.signedByte();
		if (this.version >= 500) {
			this.cursor.intByteString();
		}
		const tempo = this.cursor.int32();
		for (const level of [volume, balance, chorus, reverb, phaser, tremolo]) {
			if (level >= 0) {
				this.cursor.byte();
			}
		}
		if (tempo >= 0) {
			this.cursor.byte();
			if (this.version >= 510) {
				this.cursor.byte();
			}
		}
		if (this.version >= 400) {
			this.cursor.byte();
		}
		const wah = this.version >= 500 ? this.cursor.signedByte() : -1;
		if (this.version >= 510) {
			this.cursor.intByteString();
			this.cursor.intByteString();
		}
		if (instrument >= 0 || volume >= 0 || balance >= 0) {
			this.values.unsupported('instrument changes or track automation');
		}
		if (wah >= 0) {
			this.values.unsupported(BEAT_EFFECTS);
		}
		return tempo > 0 ? tempo : null;
	}

	private addTempo(change: TempoChange): void {
		this.tempos.set(`${change.bar}:${change.position}`, change);
	}

	private readNote(
		trackIndex: number,
		voiceIndex: number,
		track: Track,
		stringIndex: number,
		graceBeats: number[],
		beatEffects: BeatEffects,
	): { id: string; dynamic?: string; tremolo: string | null } {
		const flags = this.cursor.byte();
		let noteType = 0;
		if (flags & 0x20) {
			noteType = this.cursor.byte();
		}
		if (flags & 0x01 && this.version < 500) {
			// Guitar Pro 3 and 4 give the note its own duration and tuplet, which GP ignores.
			this.cursor.skip(2);
		}
		let dynamic: string | undefined;
		if (flags & 0x10) {
			dynamic = DYNAMICS[this.cursor.signedByte() - 1] ?? 'F';
		}
		let fret = 0;
		if (flags & 0x20) {
			fret = this.cursor.signedByte();
		}
		if (flags & 0x80) {
			this.cursor.skip(2);
			this.values.unsupported(NOTE_TECHNIQUES);
		}
		if (this.version >= 500) {
			if (flags & 0x01) {
				this.cursor.skip(8);
			}
			this.cursor.byte();
		}
		let accent = (flags & 0x02 ? 4 : 0) | (flags & 0x40 ? 8 : 0);
		let effects: NoteEffects = {
			staccato: false,
			tremolo: null,
			tags: '',
			properties: '',
		};
		if (flags & 0x08) {
			effects = this.readNoteEffects(track, graceBeats, stringIndex);
		}
		effects.tags += beatEffects.noteTags;
		effects.properties += beatEffects.noteProperties;
		if (effects.staccato) {
			accent |= 1;
		}
		if (flags & 0x04) {
			effects.tags += '<AntiAccent>Normal</AntiAccent>';
		}
		if (noteType === 3) {
			effects.properties += '<Property name="Muted"><Enable/></Property>';
			// Older files may store a dead note with no fret as -1.
			fret = Math.max(fret, 0);
		}
		const key = `${trackIndex}:${voiceIndex}:${stringIndex}`;
		if (noteType === 2) {
			fret = this.tiedFrets.get(key) ?? fret;
		}
		this.tiedFrets.set(key, fret);
		const string = track.tuning.length - 1 - stringIndex;
		const id = this.noteXml.length;
		this.noteXml.push(
			`<Note id="${id}">${noteType === 2 ? '<Tie origin="false" destination="true"/>' : ''}${
				accent ? `<Accent>${accent}</Accent>` : ''
			}${effects.tags}<Properties><Property name="String"><String>${string}</String></Property><Property name="Fret"><Fret>${fret}</Fret></Property>${effects.properties}</Properties></Note>`,
		);
		return { id: String(id), dynamic, tremolo: effects.tremolo };
	}

	private readNoteEffects(
		track: Track,
		graceBeats: number[],
		stringIndex: number,
	): NoteEffects {
		const effects: NoteEffects = {
			staccato: false,
			tremolo: null,
			tags: '',
			properties: '',
		};
		const flags = this.cursor.byte();
		const flags2 = this.version >= 400 ? this.cursor.byte() : 0;
		if (flags & 0x01) {
			const points = this.readBend();
			if (points.length) {
				const [origin, middle, destination] = bendValues(points);
				effects.properties += `<Property name="Bended"><Enable/></Property><Property name="BendOriginValue"><Float>${origin}</Float></Property><Property name="BendMiddleValue"><Float>${middle}</Float></Property><Property name="BendDestinationValue"><Float>${destination}</Float></Property>`;
			}
		}
		if (flags & 0x02) {
			effects.properties += '<Property name="HopoOrigin"><Enable/></Property>';
		}
		if (flags & 0x08) {
			effects.tags += '<LetRing/>';
		}
		if (flags & 0x10) {
			this.readGrace(track, graceBeats, stringIndex);
		}
		if (flags2 & 0x04) {
			const tremolo = TREMOLO_PICKING[this.cursor.byte()];
			effects.tremolo = tremolo ?? null;
		}
		if (flags2 & 0x08) {
			const slide =
				this.version >= 500
					? this.cursor.byte()
					: GP4_SLIDES[this.cursor.signedByte()];
			if (slide) {
				effects.properties += `<Property name="Slide"><Flags>${slide}</Flags></Property>`;
			}
		} else if (this.version < 400 && flags & 0x04) {
			effects.properties +=
				'<Property name="Slide"><Flags>1</Flags></Property>';
		}
		if (flags2 & 0x10) {
			const type = HARMONICS[this.readHarmonic()];
			if (type) {
				effects.properties += `<Property name="HarmonicType"><HType>${type}</HType></Property>`;
			}
		}
		if (flags2 & 0x20) {
			effects.tags += `<Trill>${this.cursor.byte()}</Trill>`;
			this.cursor.byte();
		}
		if (flags2 & 0x02) {
			effects.properties += '<Property name="PalmMuted"><Enable/></Property>';
		}
		if (flags2 & 0x40) {
			effects.tags += '<Vibrato>Slight</Vibrato>';
		}
		effects.staccato = (flags2 & 0x01) !== 0;
		return effects;
	}

	/** Reads a harmonic's type, skipping the pitch an artificial or tapped one names. */
	private readHarmonic(): number {
		const type = this.cursor.byte();
		if (this.version < 500) {
			return GP4_ARTIFICIAL_HARMONICS.includes(type) ? 2 : type;
		}
		if (type === 2) {
			this.cursor.skip(3);
		} else if (type === 3) {
			this.cursor.byte();
		}
		return type;
	}

	private readGrace(
		track: Track,
		graceBeats: number[],
		stringIndex: number,
	): void {
		const stored = this.cursor.signedByte();
		this.cursor.signedByte();
		const transition = this.cursor.signedByte();
		this.cursor.byte();
		// Guitar Pro 3 and 4 graces are all before the beat, and a dead one has fret -1.
		const flags = this.version >= 500 ? this.cursor.byte() : 0;
		const fret = Math.max(stored, 0);
		let properties = '';
		if (flags & 0x01 || stored < 0) {
			properties += '<Property name="Muted"><Enable/></Property>';
		}
		if (transition === 1) {
			properties += '<Property name="Slide"><Flags>2</Flags></Property>';
		} else if (transition === 2) {
			properties += '<Property name="HopoOrigin"><Enable/></Property>';
		} else if (transition !== 0) {
			this.values.unsupported(NOTE_TECHNIQUES);
		}
		const noteId = this.noteXml.length;
		this.noteXml.push(
			`<Note id="${noteId}"><Properties><Property name="String"><String>${track.tuning.length - 1 - stringIndex}</String></Property><Property name="Fret"><Fret>${fret}</Fret></Property>${properties}</Properties></Note>`,
		);
		const beatId = this.beatXml.length;
		this.beatXml.push(
			`<Beat id="${beatId}"><GraceNotes>${flags & 0x02 ? 'OnBeat' : 'BeforeBeat'}</GraceNotes><Rhythm ref="${this.rhythm('32nd', 0, [1, 1])}"/><Dynamic>F</Dynamic><Notes>${noteId}</Notes></Beat>`,
		);
		graceBeats.push(beatId);
	}

	private rhythm(type: string, dots: number, tuplet: number[]): number {
		const key = `${type}:${dots}:${tuplet.join('/')}`;
		let id = this.rhythms.get(key);
		if (id == null) {
			id = this.rhythmXml.length;
			this.rhythms.set(key, id);
			this.rhythmXml.push(
				`<Rhythm id="${id}"><NoteValue>${type[0]!.toUpperCase()}${type.slice(1)}</NoteValue>${
					dots ? `<AugmentationDot count="${dots}"/>` : ''
				}${
					tuplet[0] === 1 && tuplet[1] === 1
						? ''
						: `<PrimaryTuplet num="${tuplet[0]}" den="${tuplet[1]}"/>`
				}</Rhythm>`,
			);
		}
		return id;
	}

	private gpif(
		info: Record<string, string>,
		masters: MasterBar[],
		tracks: Track[],
	): string {
		const tag = (name: string, value: string) =>
			value ? `<${name}>${escapeXml(value)}</${name}>` : '';
		const trackXml = tracks.map(
			(track, index) =>
				`<Track id="${index}"><Name>${escapeXml(track.name)}</Name><GeneralMidi table="${
					track.percussion ? 'Percussion' : 'GM'
				}"><Program>${track.program}</Program><PrimaryChannel>${track.channel}</PrimaryChannel></GeneralMidi><Staves><Staff><Properties><Property name="Tuning"><Pitches>${[
					...track.tuning,
				]
					.reverse()
					.join(
						' ',
					)}</Pitches></Property><Property name="CapoFret"><Fret>${track.capo}</Fret></Property>${
					track.diagrams.length
						? `<Property name="DiagramCollection"><Items>${track.diagrams.join('')}</Items></Property>`
						: ''
				}</Properties></Staff></Staves>${lyricsXml(track.lyrics)}</Track>`,
		);
		const masterXml = masters.map((master, index) => {
			const first = index * tracks.length;
			const bars = tracks.map((_, offset) => first + offset).join(' ');
			return `<MasterBar><Time>${master.numerator}/${master.denominator}</Time><Key><AccidentalCount>${master.fifths}</AccidentalCount><Mode>${
				master.minor ? 'Minor' : 'Major'
			}</Mode></Key>${
				master.repeatStart || master.repeatCount
					? `<Repeat start="${master.repeatStart}" end="${master.repeatCount > 0}" count="${master.repeatCount || 1}"/>`
					: ''
			}${
				master.endings.length
					? `<AlternateEndings>${master.endings.join(' ')}</AlternateEndings>`
					: ''
			}${
				master.targets.length || master.jumps.length
					? `<Directions>${[
							...master.targets.map((name) => `<Target>${name}</Target>`),
							...master.jumps.map((name) => `<Jump>${name}</Jump>`),
						].join('')}</Directions>`
					: ''
			}${master.doubleBar ? '<DoubleBar/>' : ''}${
				master.tripletFeel
					? `<TripletFeel>${master.tripletFeel}</TripletFeel>`
					: ''
			}<Bars>${bars}</Bars></MasterBar>`;
		});
		const tempoXml = this.tempos.size
			? `<Automations>${[...this.tempos.values()]
					.map(
						(change) =>
							`<Automation><Type>Tempo</Type><Linear>false</Linear><Bar>${change.bar}</Bar><Position>${change.position}</Position><Value>${change.tempo} 2</Value></Automation>`,
					)
					.join('')}</Automations>`
			: '';
		return `<GPIF><Score>${tag('Title', info.title!)}${tag('Artist', info.artist!)}${tag('Words', info.words!)}${tag('Music', info.music!)}${tag('Copyright', info.copyright!)}</Score><MasterTrack><Tracks>${tracks.map((_, index) => index).join(' ')}</Tracks>${tempoXml}</MasterTrack><Tracks>${trackXml.join('')}</Tracks><MasterBars>${masterXml.join('')}</MasterBars><Bars>${this.barXml.join('')}</Bars><Voices>${this.voiceXml.join('')}</Voices><Beats>${this.beatXml.join('')}</Beats><Notes>${this.noteXml.join('')}</Notes><Rhythms>${this.rhythmXml.join('')}</Rhythms></GPIF>`;
	}
}

function emptyBeatEffects(): BeatEffects {
	return { tags: '', properties: '', noteTags: '', noteProperties: '' };
}

/** An exact length in whole notes, as numerator and denominator. */
type Fraction = [number, number];

function beatLength(type: string, dots: number, tuplet: number[]): Fraction {
	const value = 2 ** DURATIONS.indexOf(type);
	return reduce([
		(2 ** (dots + 1) - 1) * tuplet[1]!,
		2 ** dots * value * tuplet[0]!,
	]);
}

function reduce([numerator, denominator]: Fraction): Fraction {
	let a = Math.abs(numerator);
	let b = denominator;
	while (b) {
		[a, b] = [b, a % b];
	}
	return a ? [numerator / a, denominator / a] : [0, 1];
}

function add(left: Fraction, right: Fraction): Fraction {
	return reduce([left[0] * right[1] + right[0] * left[1], left[1] * right[1]]);
}

function subtract(left: Fraction, right: Fraction): Fraction {
	return add(left, [-right[0], right[1]]);
}

function compare(left: Fraction, right: Fraction): number {
	return left[0] * right[1] - right[0] * left[1];
}

function lyricsXml(lines: LyricLine[]): string {
	return lines.some((line) => line.text.trim())
		? `<Lyrics dispatched="true">${lines
				.map(
					(line) =>
						`<Line><Text>${escapeXml(line.text)}</Text><Offset>${line.startBar}</Offset></Line>`,
				)
				.join('')}</Lyrics>`
		: '';
}

/** A curve's first, middle (the point furthest from zero) and last values; GPIF counts them as Guitar Pro 5 does, 50 per semitone. */
function bendValues(points: number[]): [number, number, number] {
	const inner = points.slice(1, -1);
	const middle = inner.reduce(
		(extreme, value) => (Math.abs(value) > Math.abs(extreme) ? value : extreme),
		points[0]!,
	);
	return [points[0]!, middle, points.at(-1)!];
}

function toNumber([numerator, denominator]: Fraction): number {
	return numerator / denominator;
}

/** XML 1.0 forbids most control characters, which old Guitar Pro files may contain. */
const INVALID_XML = /[^\t\n\r\u0020-\uD7FF\uE000-\uFFFD]/g;

function escapeXml(text: string): string {
	return text
		.replace(INVALID_XML, '')
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;');
}
