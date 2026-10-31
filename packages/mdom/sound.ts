import {
	checkRange,
	decimals,
	type InstrumentChange,
	type InstrumentChangeSpec,
	type MidiDevice,
	type MidiDeviceSpec,
	type MidiInstrument,
	type MidiInstrumentSpec,
	numberIn,
	type Play,
	type PlaySpec,
	readInstrumentChange,
	readMidiDevice,
	readMidiInstrument,
	readPlay,
	writeInstrumentChange,
	writeMidiDevice,
	writeMidiInstrument,
	writePlay,
} from "./instrument";
import { MElement } from "./m-element";
import { Measure } from "./measure";
import { type Offset, offsetOf } from "./offset";
import type { Part } from "./part";
import { setYesNo, yesNoOf } from "./print-style";
import { childIndexIn, divisionsBackFrom } from "./signature";
import { onsetOf } from "./timeline";

/**
 * A `<sound>`: playback instructions with no printed form. It appears both inside
 * a `<direction>` and as a direct `<measure>` child, with the same meaning, see
 * {@link Measure.sounds}, which merges the two so a consumer looks in one place.
 */
export class Sound extends MElement {
	constructor() {
		super("sound");
	}

	/** The `tempo` attribute in quarter notes per minute; null when unset. */
	get tempo(): number | null {
		const tempo = this.getAttribute("tempo");
		return tempo == null ? null : Number(tempo);
	}

	/** The `dynamics` attribute (percent of a forte velocity); null when unset. */
	get dynamics(): number | null {
		const dynamics = this.getAttribute("dynamics");
		return dynamics == null ? null : Number(dynamics);
	}

	/**
	 * `segno`: this is the segno a D.S. jumps back to, named by the value so a
	 * `dalsegno` can pick it out among several; null when it is not one.
	 */
	get segno(): string | null {
		return this.getAttribute("segno");
	}

	/** `dalsegno`: jump back to the segno this names; null when it is not a D.S. */
	get dalSegno(): string | null {
		return this.getAttribute("dalsegno");
	}

	/** `coda`: this is the coda a to-coda jumps to, named by the value; null when it is not one. */
	get coda(): string | null {
		return this.getAttribute("coda");
	}

	/** `tocoda`: jump ahead to the coda this names; null when it is not a to-coda. */
	get toCoda(): string | null {
		return this.getAttribute("tocoda");
	}

	/** `dacapo`: jump back to the start of the movement. */
	get daCapo(): boolean {
		return this.getAttribute("dacapo") === "yes";
	}

	/**
	 * `fine`: the movement ends here once a D.C. or D.S. has been taken. `'yes'`,
	 * or the final note's sounding duration in divisions; null when it is not one.
	 */
	get fine(): string | null {
		return this.getAttribute("fine");
	}

	/** `forward-repeat`: a forward repeat is implied here though none is printed. */
	get forwardRepeat(): boolean {
		return this.getAttribute("forward-repeat") === "yes";
	}

	/**
	 * `time-only`: the passes through a repeat this applies on (`"1,3"`), raw;
	 * null when it applies every time, though a D.S. or D.C. defaults to the
	 * first pass and a to-coda to the second.
	 */
	get timeOnly(): string | null {
		return this.getAttribute("time-only");
	}

	/**
	 * {@link timeOnly} parsed into pass numbers (`[1, 3]`); null when it applies
	 * every time.
	 */
	get passes(): number[] | null {
		const timeOnly = this.timeOnly;
		return timeOnly == null
			? null
			: timeOnly.split(",").map((pass) => Number(pass.trim()));
	}

	/**
	 * `pizzicato`: true from here on plays pizzicato, false returns to arco; null
	 * when this sound says neither.
	 */
	get pizzicato(): boolean | null {
		return this.getAttribute("pizzicato") == null
			? null
			: yesNoOf(this, "pizzicato", false);
	}

	/**
	 * `pan`: stereo direction in degrees, -180 to 180 (0 straight ahead, -90 hard
	 * left, 90 hard right); null when unset or out of range. Deprecated in
	 * MusicXML: a {@link midiInstruments} entry's pan takes priority.
	 */
	get pan(): number | null {
		return numberIn(this.getAttribute("pan"), rotationRange);
	}

	/**
	 * `elevation`: height in degrees, -180 to 180 (0 level, 90 straight up); null
	 * when unset or out of range. Deprecated as {@link pan} is.
	 */
	get elevation(): number | null {
		return numberIn(this.getAttribute("elevation"), rotationRange);
	}

	/**
	 * `damper-pedal`: how far the damper (sustain) pedal is down from here, as a
	 * percent, `yes` reads 100, `no` 0, a number is half pedalling; null when
	 * this sound leaves the pedal as it was.
	 */
	get damperPedal(): number | null {
		return pedalOf(this, "damper-pedal");
	}

	/** `soft-pedal` (una corda), as {@link damperPedal}. */
	get softPedal(): number | null {
		return pedalOf(this, "soft-pedal");
	}

	/** `sostenuto-pedal`, as {@link damperPedal}. */
	get sostenutoPedal(): number | null {
		return pedalOf(this, "sostenuto-pedal");
	}

	/**
	 * `divisions`: divisions per quarter note that a segno or coda sound may
	 * state for sound generators; null when unset. Durations elsewhere use the
	 * measure's `<divisions>` regardless.
	 */
	get divisions(): number | null {
		const divisions = Number(this.getAttribute("divisions"));
		return divisions > 0 ? divisions : null;
	}

	/**
	 * The `<midi-instrument>`s this sound switches to, in document order: a
	 * mid-score program or volume change for the score-instrument each `id`
	 * names. They override the part's own {@link Part.midiInstruments} from here.
	 */
	get midiInstruments(): MidiInstrument[] {
		return this.childrenNamed("midi-instrument").map(readMidiInstrument);
	}

	/**
	 * The `<instrument-change>`s this sound makes, in document order: the
	 * score-instrument each `id` names switches sound, ensemble or virtual
	 * instrument from here.
	 */
	get instrumentChanges(): InstrumentChange[] {
		return this.childrenNamed("instrument-change").map(readInstrumentChange);
	}

	/** The `<play>`s this sound carries, in document order, each for the instrument its `id` names. */
	get plays(): Play[] {
		return this.childrenNamed("play").map(readPlay);
	}

	/** The `<midi-device>`s this sound switches to, in document order. */
	get midiDevices(): MidiDevice[] {
		return this.childrenNamed("midi-device").map(readMidiDevice);
	}

	/**
	 * The `<sound>`'s own `<offset>`: how far from where it sits playback takes
	 * it. Its `sound` is true unless stated, since a sound has no printed
	 * position for the offset to move instead.
	 */
	get offset(): Offset | null {
		return offsetOf(this, true);
	}

	/**
	 * Where in the measure playback takes this sound, in quarter-note beats: its
	 * cursor position, moved by the offset of the direction holding it when that
	 * offset says `sound="yes"`, and by its own {@link offset}. Null outside a
	 * measure or with no `<divisions>` in effect.
	 */
	get playbackBeat(): number | null {
		const measure = this.closest(Measure);
		const parent = this.parent;
		if (!measure || !parent) {
			return null;
		}
		const host = parent === measure ? this : parent;
		const divisions = divisionsBackFrom(measure, childIndexIn(measure, host));
		const onset = onsetOf(measure, host);
		if (divisions == null || onset == null) {
			return null;
		}
		const hostOffset = host === this ? null : offsetOf(host, false);
		const ownOffset = this.offset;
		return (
			onset / divisions +
			(hostOffset?.sound ? (hostOffset.beats ?? 0) : 0) +
			(ownOffset?.sound ? (ownOffset.beats ?? 0) : 0)
		);
	}

	/**
	 * `<swing>`: the on-beat:off-beat ratio and the note value it divides.
	 * `<straight/>` reads as an even 1:1 so it cancels a carried swing rather than
	 * reading as "no instruction". `unit` is in quarter-note beats, eighth = 0.5,
	 * 16th = 0.25. Null when this sound states no swing at all.
	 */
	get swing(): { first: number; second: number; unit: number } | null {
		const swing = this.child("swing");
		if (!swing) {
			return null;
		}
		const unit =
			SWING_UNITS[swing.child("swing-type")?.text ?? "eighth"] ?? 0.5;
		if (swing.child("straight")) {
			return { first: 1, second: 1, unit };
		}
		const first = swing.child("first")?.text;
		const second = swing.child("second")?.text;
		if (first == null || second == null) {
			return null;
		}
		return { first: Number(first), second: Number(second), unit };
	}
}

/** A yes-no-number pedal attribute as percent depressed; null when absent or invalid. */
function pedalOf(sound: Sound, name: string): number | null {
	const value = sound.getAttribute(name);
	if (value === "yes" || value === "no") {
		return value === "yes" ? 100 : 0;
	}
	return numberIn(value, pedalRange);
}

function pedalText(name: string, pedal: boolean | number): string {
	if (typeof pedal === "boolean") {
		return pedal ? "yes" : "no";
	}
	return checkRange(name, pedal, pedalRange);
}

/** Write a {@link SoundSpec} onto a `<sound>`'s attributes and MIDI children. */
export function writeSound(sound: Sound, spec: SoundSpec): void {
	const attributes: Array<[string, string | undefined]> = [
		["segno", spec.segno],
		["dalsegno", spec.dalSegno],
		["coda", spec.coda],
		["tocoda", spec.toCoda],
		["dacapo", spec.daCapo ? "yes" : undefined],
		["fine", spec.fine ? "yes" : undefined],
		["forward-repeat", spec.forwardRepeat ? "yes" : undefined],
		["time-only", spec.timeOnly?.join(",")],
		["dynamics", spec.dynamics?.toString()],
		[
			"pan",
			spec.pan == null ? undefined : checkRange("pan", spec.pan, rotationRange),
		],
		[
			"elevation",
			spec.elevation == null
				? undefined
				: checkRange("elevation", spec.elevation, rotationRange),
		],
	];
	for (const [name, pedal] of [
		["damper-pedal", spec.damperPedal],
		["soft-pedal", spec.softPedal],
		["sostenuto-pedal", spec.sostenutoPedal],
	] as const) {
		if (pedal != null) {
			attributes.push([name, pedalText(name, pedal)]);
		}
	}
	for (const [name, value] of attributes) {
		if (value != null) {
			sound.setAttribute(name, value);
		}
	}
	if (spec.pizzicato != null) {
		setYesNo(sound, "pizzicato", spec.pizzicato);
	}
	// Ahead of any <swing> or <offset>, each device just before its instrument
	// so the pairs stay grouped by id as MusicXML asks.
	const before =
		sound.children.find(
			(child) =>
				child instanceof MElement &&
				(child.tag === "swing" || child.tag === "offset"),
		) ?? null;
	const instruments = spec.midiInstruments ?? [];
	const devices = spec.midiDevices ?? [];
	const changes = spec.instrumentChanges ?? [];
	const plays = spec.plays ?? [];
	// A part-wide device (no id) leads, as on the <score-part>.
	const ids = [
		...new Set([
			...devices.filter((device) => device.id == null).map(() => null),
			...devices.map((device) => device.id ?? null),
			...changes.map((change) => change.id),
			...instruments.map((instrument) => instrument.id),
			...plays.map((play) => play.id),
		]),
	];
	for (const id of ids) {
		for (const { id: changeId, ...change } of changes) {
			if (changeId === id) {
				const node = new MElement("instrument-change");
				node.setAttribute("id", changeId);
				writeInstrumentChange(node, change);
				sound.insertBefore(node, before);
			}
		}
		for (const { id: deviceId, ...device } of devices) {
			if ((deviceId ?? null) === id) {
				const node = new MElement("midi-device");
				if (deviceId != null) {
					node.setAttribute("id", deviceId);
				}
				writeMidiDevice(node, device);
				sound.insertBefore(node, before);
			}
		}
		for (const { id: instrumentId, ...instrument } of instruments) {
			if (instrumentId === id) {
				const node = new MElement("midi-instrument");
				node.setAttribute("id", instrumentId);
				writeMidiInstrument(node, instrument);
				sound.insertBefore(node, before);
			}
		}
		for (const { id: playId, ...play } of plays) {
			if (playId === id) {
				const node = new MElement("play");
				node.setAttribute("id", playId);
				writePlay(node, play);
				sound.insertBefore(node, before);
			}
		}
	}
	if (spec.swing) {
		sound.insertBefore(buildSwing(spec.swing), sound.child("offset"));
	}
}

function buildSwing(spec: NonNullable<SoundSpec["swing"]>): MElement {
	const swing = new MElement("swing");
	for (const value of [spec.first, spec.second]) {
		if (!Number.isInteger(value) || value < 1) {
			throw new Error(
				`mdom: swing ratio parts must be positive integers, got ${value}`,
			);
		}
	}
	const unit = spec.unit ?? 0.5;
	const type = Object.keys(SWING_UNITS).find(
		(name) => SWING_UNITS[name] === unit,
	);
	if (type == null) {
		throw new Error(
			`mdom: swing unit must be 0.5, 0.25 or 0.125 beats, got ${unit}`,
		);
	}
	// <straight/> takes no swing-type: an even swing is even at any value.
	if (spec.first === spec.second) {
		swing.append(new MElement("straight"));
		return swing;
	}
	const parts: Array<[string, string]> = [
		["first", String(spec.first)],
		["second", String(spec.second)],
	];
	if (type !== "eighth") {
		parts.push(["swing-type", type]);
	}
	for (const [tag, value] of parts) {
		const element = new MElement(tag);
		element.setText(value);
		swing.append(element);
	}
	return swing;
}

const rotationRange = decimals(-180, 180);
const pedalRange = decimals(0, 100);

/** Quarter-note beats per swing unit; MusicXML's default swing type is the eighth. */
const SWING_UNITS: Record<string, number> = {
	eighth: 0.5,
	"16th": 0.25,
	"32nd": 0.125,
};

/**
 * The repeat-structure playback a `<sound>` carries: the landmarks a jump lands
 * on, and the jumps. Landmarks and jumps pair by name, a `dalSegno: 'A'` goes
 * back to the `segno: 'A'`, so a score with one of each can name both alike.
 */
export interface SoundSpec {
	/** Name this point as the segno a D.S. returns to. */
	segno?: string;
	/** Jump back to the named segno (by default the first time through). */
	dalSegno?: string;
	/** Name this point as the coda a to-coda goes to. */
	coda?: string;
	/** Jump ahead to the named coda (by default the second time through). */
	toCoda?: string;
	/** Jump back to the start of the movement (by default the first time through). */
	daCapo?: boolean;
	/** End the movement here once a D.C. or D.S. has been taken. */
	fine?: boolean;
	/** Imply a forward repeat here without printing one. */
	forwardRepeat?: boolean;
	/** The passes through a repeat this applies on, overriding the defaults above. */
	timeOnly?: number[];
	/** Playback loudness as a percent of a forte velocity (90 MIDI). */
	dynamics?: number;
	/** Play pizzicato (true) or arco again (false). */
	pizzicato?: boolean;
	/** Stereo direction in degrees, -180 to 180 (0 straight ahead, 90 hard right). Deprecated in MusicXML in favour of a midi-instrument's pan. */
	pan?: number;
	/** Height in degrees, -180 to 180 (0 level, 90 straight up). Deprecated in MusicXML in favour of a midi-instrument's elevation. */
	elevation?: number;
	/** Damper (sustain) pedal: true down, false up, or the percent depressed (0-100) for half pedalling. */
	damperPedal?: boolean | number;
	/** Soft (una corda) pedal, as {@link damperPedal}. */
	softPedal?: boolean | number;
	/** Sostenuto pedal, as {@link damperPedal}. */
	sostenutoPedal?: boolean | number;
	/**
	 * Swing from here: the on-beat:off-beat ratio (`first`:`second`) and the
	 * note value it divides, in quarter-note beats (eighth = 0.5, the default;
	 * 16th = 0.25; 32nd = 0.125), as {@link Sound.swing} reads it. An even ratio
	 * writes `<straight/>`, cancelling a swing carried from earlier.
	 */
	swing?: { first: number; second: number; unit?: number };
	/** MIDI devices to switch to from here; an entry with no `id` applies to the whole part. */
	midiDevices?: Array<MidiDeviceSpec & { id?: string }>;
	/** MIDI playback to switch to from here, each for the score-instrument its `id` names. */
	midiInstruments?: Array<MidiInstrumentSpec & { id: string }>;
	/** Sounds, ensembles or virtual instruments to switch to from here, each for the score-instrument its `id` names. */
	instrumentChanges?: Array<InstrumentChangeSpec & { id: string }>;
	/** How each named score-instrument sounds from here (mute, IPA, semi-pitched range). */
	plays?: Array<PlaySpec & { id: string }>;
}
