// SPDX-License-Identifier: MPL-2.0
// Guitar Pro 5 record layout adapted from alphaTab's Gp3To5Importer. See THIRD_PARTY.md.
// Copyright © 2025 Daniel Kuschny and Contributors.
import { GuitarProBinaryCursor } from './guitar-pro-binary-cursor';
import type { GuitarProOptions } from './guitar-pro-options';
import { GuitarProValues } from './guitar-pro-values';

const VERSION_PREFIX = 'FICHIER GUITAR PRO v';
const MAX_BARS = 1000;
const MAX_TRACKS = 100;
const MAX_BEATS_PER_VOICE = 1024;
const MAX_NOTICE_LINES = 1000;
const MAX_POINTS = 240;
const STRING_SLOTS = 7;
const BASS_CLEF_TUNING = 35;
const NOTE_TECHNIQUES = 'note techniques';
const BEAT_EFFECTS = 'beat effects or annotations';

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

/** The GPIF XML and per-track tablature flags that a Guitar Pro 5 file is equivalent to. */
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
}
interface PlaybackInfo {
	program: number;
}

/** Reads a Guitar Pro 5 file into the GPIF tables that `GuitarProDocumentReader` consumes. */
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
		const lyricsText = this.readLyrics();
		if (this.version >= 510) {
			this.cursor.skip(19);
		}
		this.cursor.skip(28);
		this.cursor.int16();
		for (let field = 0; field < 10; field++) {
			this.cursor.intByteString();
		}
		this.cursor.intByteString();
		const tempo = this.cursor.int32();
		if (this.version >= 510) {
			this.cursor.byte();
		}
		this.cursor.int32();
		this.cursor.byte();
		const playback = this.readPlayback();
		this.readDirections();
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
		const masters = this.readMasterBars(barCount);
		const tracks: Track[] = [];
		for (let index = 0; index < trackCount; index++) {
			tracks.push(this.readTrack(playback));
		}
		for (let bar = 0; bar < barCount; bar++) {
			for (const [trackIndex, track] of tracks.entries()) {
				this.readBar(trackIndex, track, masters[bar]!);
			}
		}
		if (lyricsText.trim()) {
			this.values.unsupported('lyrics');
		}
		return {
			gpif: this.gpif(info, tempo, masters, tracks),
			tablature: tracks.map((track) => track.tablature),
		};
	}

	private readVersion(): void {
		const header = this.cursor.fixedString(30);
		if (!header.startsWith(VERSION_PREFIX)) {
			throw new Error('Not a Guitar Pro 3-5 file');
		}
		const [major, minor] = header
			.slice(VERSION_PREFIX.length)
			.split('.')
			.map(Number);
		if (!Number.isInteger(major) || !Number.isInteger(minor)) {
			throw new Error(`Invalid Guitar Pro version: ${header}`);
		}
		this.version = major! * 100 + minor!;
		if (this.version < 500 || major! > 5) {
			throw new Error(
				`Guitar Pro ${major}.${String(minor).padStart(2, '0')} files are not supported; only Guitar Pro 5 .gp5 files import`,
			);
		}
	}

	private readScoreInformation(): Record<string, string> {
		const [title, , artist, , words, music, copyright] = Array.from(
			{ length: 9 },
			() => this.cursor.unusedIntString(),
		) as [string, string, string, string, string, string, string];
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

	private readLyrics(): string {
		this.cursor.int32();
		let text = '';
		for (let line = 0; line < 5; line++) {
			this.cursor.int32();
			text += this.cursor.intString();
		}
		return text;
	}

	private readPlayback(): PlaybackInfo[] {
		const infos: PlaybackInfo[] = [];
		for (let slot = 0; slot < 64; slot++) {
			infos.push({ program: this.cursor.int32() });
			this.cursor.skip(8);
		}
		return infos;
	}

	/** Jump and target markers; reading them waits on the GP5 effects work. */
	private readDirections(): void {
		let found = false;
		for (let direction = 0; direction < 19; direction++) {
			found = this.cursor.int16() !== -1 || found;
		}
		this.cursor.skip(4);
		if (found) {
			this.values.unsupported('jumps');
		}
	}

	private readMasterBars(count: number): MasterBar[] {
		const masters: MasterBar[] = [];
		let previous: MasterBar = {
			numerator: 4,
			denominator: 4,
			fifths: 0,
			minor: false,
			repeatStart: false,
			repeatCount: 0,
			doubleBar: false,
			tripletFeel: null,
		};
		for (let index = 0; index < count; index++) {
			const flags = this.cursor.byte();
			const master: MasterBar = {
				...previous,
				repeatStart: (flags & 0x04) !== 0,
				repeatCount: 0,
				doubleBar: (flags & 0x80) !== 0,
			};
			if (flags & 0x01) {
				master.numerator = this.cursor.byte();
			}
			if (flags & 0x02) {
				master.denominator = this.cursor.byte();
			}
			if (flags & 0x08) {
				master.repeatCount = Math.max(2, this.cursor.byte());
			}
			if (flags & 0x20) {
				this.cursor.intByteString();
				this.cursor.skip(4);
			}
			if (flags & 0x40) {
				master.fifths = this.cursor.signedByte();
				master.minor = this.cursor.byte() === 1;
			}
			if (flags & 0x03) {
				this.cursor.skip(4);
			}
			const endings = this.cursor.byte();
			const tripletFeel = this.cursor.byte();
			this.cursor.byte();
			master.tripletFeel = TRIPLET_FEELS[tripletFeel] ?? null;
			if (endings) {
				this.values.unsupported('alternate endings');
			}
			if (tripletFeel && !master.tripletFeel) {
				this.values.unsupported('triplet feel');
			}
			masters.push(master);
			previous = master;
		}
		return masters;
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
		const staffFlags = this.cursor.byte();
		this.cursor.skip(2);
		this.cursor.byte();
		this.cursor.byte();
		const clefMode = this.cursor.int32();
		this.cursor.skip(4 + 4 + 10 + 2 + 16);
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
			tablature: (staffFlags & 0x01) !== 0,
			program: validChannel ? playback[channelIndex]!.program : 0,
			channel: validChannel ? channelIndex * 2 : 0,
			bassClef:
				clefMode === 12 ||
				(tuning.length > 0 && tuning[tuning.length - 1]! < BASS_CLEF_TUNING),
		};
	}

	private readBar(trackIndex: number, track: Track, master: MasterBar): void {
		this.cursor.byte();
		const voiceIds: string[] = [];
		for (let voiceIndex = 0; voiceIndex < 2; voiceIndex++) {
			const beatCount = this.cursor.count(
				this.cursor.int32(),
				MAX_BEATS_PER_VOICE,
				'beat count',
			);
			const beatIds: number[] = [];
			let length: Fraction = [0, 1];
			for (let beat = 0; beat < beatCount; beat++) {
				const read = this.readBeat(trackIndex, voiceIndex, track);
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
		if (flags & 0x02) {
			this.readChord();
		}
		const text = flags & 0x04 ? this.cursor.unusedIntString() : '';
		if (flags & 0x08) {
			this.readBeatEffects();
		}
		if (flags & 0x10) {
			this.readMixTableChange();
		}
		const stringFlags = this.cursor.byte();
		const notes: string[] = [];
		const graceBeats: number[] = [];
		let dynamic = 'F';
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
			);
			notes.push(note.id);
			dynamic = note.dynamic ?? dynamic;
		}
		this.readBeatFlags();
		if (placeholder && !notes.length) {
			return { ids: [], length: [0, 1] };
		}
		const rhythm = this.rhythm(durationName, dots, tuplet);
		const id = this.beatXml.length;
		this.beatXml.push(
			`<Beat id="${id}"><Rhythm ref="${rhythm}"/><Dynamic>${dynamic}</Dynamic>${
				text ? `<FreeText>${escapeXml(text)}</FreeText>` : ''
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

	/** The trailing beat flags only carry layout (beaming, ottava), which is regenerated. */
	private readBeatFlags(): void {
		const flags = this.cursor.int16();
		if (flags & (0x10 | 0x20 | 0x40 | 0x100)) {
			this.values.unsupported('octave markings');
		}
		if (flags & 0x800) {
			this.cursor.byte();
		}
	}

	private readChord(): void {
		this.cursor.skip(17);
		const name = this.cursor.fixedString(21);
		this.cursor.skip(4);
		this.cursor.int32();
		for (let slot = 0; slot < STRING_SLOTS; slot++) {
			this.cursor.int32();
		}
		this.cursor.byte();
		this.cursor.skip(5);
		this.cursor.skip(26);
		if (name) {
			this.values.unsupported(BEAT_EFFECTS);
		}
	}

	private readBeatEffects(): void {
		const flags = this.cursor.byte();
		const flags2 = this.cursor.byte();
		let found = (flags & (0x02 | 0x10)) !== 0 || (flags2 & 0x01) !== 0;
		if (flags & 0x20) {
			this.cursor.signedByte();
			found = true;
		}
		if (flags2 & 0x04) {
			this.readBend();
			found = true;
		}
		if (flags & 0x40) {
			this.cursor.skip(2);
			found = true;
		}
		if (flags2 & 0x02) {
			this.cursor.signedByte();
			found = true;
		}
		if (found) {
			this.values.unsupported(BEAT_EFFECTS);
		}
	}

	/** Reads a bend or tremolo bar curve; both share one layout. */
	private readBend(): void {
		this.cursor.byte();
		this.cursor.int32();
		const points = this.cursor.count(
			this.cursor.int32(),
			MAX_POINTS,
			'bend point count',
		);
		for (let point = 0; point < points; point++) {
			this.cursor.skip(9);
		}
	}

	private readMixTableChange(): void {
		const instrument = this.cursor.signedByte();
		this.cursor.skip(16);
		const volume = this.cursor.signedByte();
		const balance = this.cursor.signedByte();
		const chorus = this.cursor.signedByte();
		const reverb = this.cursor.signedByte();
		const phaser = this.cursor.signedByte();
		const tremolo = this.cursor.signedByte();
		this.cursor.intByteString();
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
		this.cursor.byte();
		const wah = this.cursor.signedByte();
		if (this.version >= 510) {
			this.cursor.intByteString();
			this.cursor.intByteString();
		}
		if (instrument >= 0 || volume >= 0 || balance >= 0 || tempo >= 0) {
			this.values.unsupported('instrument changes or track automation');
		}
		if (wah >= 0) {
			this.values.unsupported(BEAT_EFFECTS);
		}
	}

	private readNote(
		trackIndex: number,
		voiceIndex: number,
		track: Track,
		stringIndex: number,
		graceBeats: number[],
	): { id: string; dynamic?: string } {
		const flags = this.cursor.byte();
		let noteType = 0;
		if (flags & 0x20) {
			noteType = this.cursor.byte();
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
		if (flags & 0x01) {
			this.cursor.skip(8);
		}
		this.cursor.byte();
		let accent = (flags & 0x02 ? 4 : 0) | (flags & 0x40 ? 8 : 0);
		let effects: NoteEffects = {};
		if (flags & 0x08) {
			effects = this.readNoteEffects(track, graceBeats, stringIndex);
		}
		if (effects.staccato) {
			accent |= 1;
		}
		if (flags & 0x04 || noteType === 3) {
			this.values.unsupported(NOTE_TECHNIQUES);
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
			}<Properties><Property name="String"><String>${string}</String></Property><Property name="Fret"><Fret>${fret}</Fret></Property></Properties></Note>`,
		);
		return { id: String(id), dynamic };
	}

	private readNoteEffects(
		track: Track,
		graceBeats: number[],
		stringIndex: number,
	): NoteEffects {
		const flags = this.cursor.byte();
		const flags2 = this.cursor.byte();
		let technique = (flags & (0x02 | 0x08)) !== 0;
		if (flags & 0x01) {
			this.readBend();
			technique = true;
		}
		if (flags & 0x10) {
			this.readGrace(track, graceBeats, stringIndex);
		}
		if (flags2 & 0x04) {
			this.cursor.byte();
			this.values.unsupported(BEAT_EFFECTS);
		}
		if (flags2 & 0x08) {
			this.cursor.byte();
			technique = true;
		}
		if (flags2 & 0x10) {
			this.readHarmonic();
			technique = true;
		}
		if (flags2 & 0x20) {
			this.cursor.skip(2);
			technique = true;
		}
		if (flags2 & (0x02 | 0x40)) {
			technique = true;
		}
		if (technique) {
			this.values.unsupported(NOTE_TECHNIQUES);
		}
		return { staccato: (flags2 & 0x01) !== 0 };
	}

	private readHarmonic(): void {
		const type = this.cursor.byte();
		if (type === 2) {
			this.cursor.skip(3);
		} else if (type === 3) {
			this.cursor.byte();
		}
	}

	private readGrace(
		track: Track,
		graceBeats: number[],
		stringIndex: number,
	): void {
		const fret = this.cursor.signedByte();
		this.cursor.signedByte();
		const transition = this.cursor.signedByte();
		this.cursor.byte();
		const flags = this.cursor.byte();
		if (transition !== 0 || flags & 0x01) {
			this.values.unsupported(NOTE_TECHNIQUES);
		}
		const noteId = this.noteXml.length;
		this.noteXml.push(
			`<Note id="${noteId}"><Properties><Property name="String"><String>${track.tuning.length - 1 - stringIndex}</String></Property><Property name="Fret"><Fret>${fret}</Fret></Property></Properties></Note>`,
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
		tempo: number,
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
					)}</Pitches></Property><Property name="CapoFret"><Fret>${track.capo}</Fret></Property></Properties></Staff></Staves></Track>`,
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
			}${master.doubleBar ? '<DoubleBar/>' : ''}${
				master.tripletFeel
					? `<TripletFeel>${master.tripletFeel}</TripletFeel>`
					: ''
			}<Bars>${bars}</Bars></MasterBar>`;
		});
		const tempoXml =
			tempo > 0
				? `<Automations><Automation><Type>Tempo</Type><Linear>false</Linear><Bar>0</Bar><Position>0</Position><Value>${tempo} 2</Value></Automation></Automations>`
				: '';
		return `<GPIF><Score>${tag('Title', info.title!)}${tag('Artist', info.artist!)}${tag('Words', info.words!)}${tag('Music', info.music!)}${tag('Copyright', info.copyright!)}</Score><MasterTrack><Tracks>${tracks.map((_, index) => index).join(' ')}</Tracks>${tempoXml}</MasterTrack><Tracks>${trackXml.join('')}</Tracks><MasterBars>${masterXml.join('')}</MasterBars><Bars>${this.barXml.join('')}</Bars><Voices>${this.voiceXml.join('')}</Voices><Beats>${this.beatXml.join('')}</Beats><Notes>${this.noteXml.join('')}</Notes><Rhythms>${this.rhythmXml.join('')}</Rhythms></GPIF>`;
	}
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

interface NoteEffects {
	staccato?: boolean;
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
