import { MElement } from './m-node';
import { appendValue } from './measure';

/** A `<virtual-instrument>`: the sample library and patch a part plays on. */
export interface VirtualInstrument {
	library: string | null;
	name: string | null;
}
export interface VirtualInstrumentSpec {
	library?: string;
	name?: string;
}

/**
 * A `<score-instrument>`: one instrument a part's notes can be assigned to.
 * `ensemble` is null unless the instrument is an ensemble; its size is null
 * when MusicXML leaves it unspecified. `solo` and `ensemble` exclude each other.
 */
export interface ScoreInstrument {
	id: string | null;
	name: string | null;
	abbreviation: string | null;
	sound: string | null;
	solo: boolean;
	ensemble: { size: number | null } | null;
	virtualInstrument: VirtualInstrument | null;
}
export interface ScoreInstrumentSpec {
	/** Defaults to the first free `<part id>-I<n>`. */
	id?: string;
	name: string;
	abbreviation?: string;
	/** Standard sound id, as `wind.flutes.flute`. */
	sound?: string;
	solo?: boolean;
	ensemble?: { size?: number };
	virtualInstrument?: VirtualInstrumentSpec;
}

/**
 * An `<instrument-change>` in a `<sound>`: the score-instrument `id` names
 * switches to this sound, ensemble or virtual instrument from here. The name
 * and abbreviation stay the score-instrument's own.
 */
export type InstrumentChange = Omit<ScoreInstrument, 'name' | 'abbreviation'>;
export type InstrumentChangeSpec = Omit<
	ScoreInstrumentSpec,
	'id' | 'name' | 'abbreviation'
>;

export type PlayMute =
	| 'on'
	| 'off'
	| 'straight'
	| 'cup'
	| 'harmon-no-stem'
	| 'harmon-stem'
	| 'bucket'
	| 'plunger'
	| 'hat'
	| 'solotone'
	| 'practice'
	| 'stop-mute'
	| 'stop-hand'
	| 'echo'
	| 'palm';
export type PlaySemiPitched =
	| 'high'
	| 'medium-high'
	| 'medium'
	| 'medium-low'
	| 'low'
	| 'very-low';

/**
 * A `<play>`: how an instrument sounds a note or from a point on. `id` names
 * the score-instrument in a `<sound>`, and is null on a note. Each field is null
 * when unstated; `other` lists the `<other-play>` entries, by type.
 */
export interface Play {
	id: string | null;
	ipa: string | null;
	mute: PlayMute | null;
	semiPitched: PlaySemiPitched | null;
	other: Array<{ type: string; text: string }>;
}
export interface PlaySpec {
	/** Pronunciation in the International Phonetic Alphabet. */
	ipa?: string;
	mute?: PlayMute;
	semiPitched?: PlaySemiPitched;
	other?: Array<{ type: string; text: string }>;
}

/** Whom and which passes a `<listen>` action applies to; null when unrestricted. */
interface ListenScope {
	player: string | null;
	timeOnly: number[] | null;
}
/**
 * A `<listen>`: what a listening player does at a note, in document order.
 * `assess` says whether the performance is scored (true) or not (false).
 */
export interface Listen {
	actions: Array<
		| ({ kind: 'assess'; assess: boolean } & ListenScope)
		| ({ kind: 'wait' } & ListenScope)
		| ({ kind: 'other'; type: string; text: string } & ListenScope)
	>;
}
export interface ListenSpec {
	actions: Array<
		| { kind: 'assess'; assess: boolean; player?: string; timeOnly?: number[] }
		| { kind: 'wait'; player?: string; timeOnly?: number[] }
		| {
				kind: 'other';
				type: string;
				text: string;
				player?: string;
				timeOnly?: number[];
		  }
	>;
}

/**
 * A `<midi-instrument>`: MIDI 1.0 playback for the score-instrument `id` names.
 * Numbers are as MusicXML writes them: channel 1-16, bank 1-16384, program and
 * unpitched 1-128, volume 0-100 (percent), pan and elevation -180 to 180
 * degrees. A value that is absent or out of range reads as null.
 */
export interface MidiInstrument {
	id: string | null;
	channel: number | null;
	name: string | null;
	bank: number | null;
	program: number | null;
	unpitched: number | null;
	volume: number | null;
	pan: number | null;
	elevation: number | null;
}
export type MidiInstrumentSpec = {
	[Key in Exclude<keyof MidiInstrument, 'id'>]?: NonNullable<
		MidiInstrument[Key]
	>;
};

/**
 * A `<midi-device>`: the MIDI port and device name an instrument plays through.
 * A null `id` applies the device to every instrument in the part.
 */
export interface MidiDevice {
	id: string | null;
	port: number | null;
	name: string | null;
}
export interface MidiDeviceSpec {
	port?: number;
	name?: string;
}

export interface Range {
	min: number;
	max: number;
	integer: boolean;
}
const midiFields: readonly {
	key: keyof MidiInstrumentSpec;
	tag: string;
	range: Range | null;
}[] = [
	{ key: 'channel', tag: 'midi-channel', range: integers(1, 16) },
	{ key: 'name', tag: 'midi-name', range: null },
	{ key: 'bank', tag: 'midi-bank', range: integers(1, 16384) },
	{ key: 'program', tag: 'midi-program', range: integers(1, 128) },
	{ key: 'unpitched', tag: 'midi-unpitched', range: integers(1, 128) },
	{ key: 'volume', tag: 'volume', range: decimals(0, 100) },
	{ key: 'pan', tag: 'pan', range: decimals(-180, 180) },
	{ key: 'elevation', tag: 'elevation', range: decimals(-180, 180) },
];
const portRange = integers(1, 16);

function integers(min: number, max: number): Range {
	return { min, max, integer: true };
}
export function decimals(min: number, max: number): Range {
	return { min, max, integer: false };
}

/** `text` as a number within `range`, or null when absent or out of range. */
export function numberIn(
	text: string | null | undefined,
	range: Range,
): number | null {
	const trimmed = text?.trim();
	const pattern = range.integer ? /^[+-]?\d+$/ : /^[+-]?(\d+\.?\d*|\.\d+)$/;
	if (trimmed == null || !pattern.test(trimmed)) {
		return null;
	}
	const value = Number(trimmed);
	return value >= range.min && value <= range.max ? value : null;
}

export function checkRange(label: string, value: number, range: Range): string {
	if (
		!Number.isFinite(value) ||
		(range.integer && !Number.isInteger(value)) ||
		value < range.min ||
		value > range.max
	) {
		throw new Error(
			`${label} must be ${range.integer ? 'an integer' : 'a number'} from ${range.min} to ${range.max}, got ${value}`,
		);
	}
	return String(value);
}

export function readScoreInstrument(node: MElement): ScoreInstrument {
	const ensemble = node.child('ensemble');
	const virtual = node.child('virtual-instrument');
	return {
		id: node.getAttribute('id'),
		name: node.child('instrument-name')?.text ?? null,
		abbreviation: node.child('instrument-abbreviation')?.text ?? null,
		sound: node.child('instrument-sound')?.text ?? null,
		solo: node.child('solo') !== null,
		ensemble: ensemble
			? {
					size: numberIn(ensemble.text, {
						min: 1,
						max: Number.MAX_SAFE_INTEGER,
						integer: true,
					}),
				}
			: null,
		virtualInstrument: virtual
			? {
					library: virtual.child('virtual-library')?.text ?? null,
					name: virtual.child('virtual-name')?.text ?? null,
				}
			: null,
	};
}

/** Replace `node`'s content with `spec`, in schema order. */
export function writeScoreInstrument(
	node: MElement,
	spec: ScoreInstrumentSpec,
): void {
	checkInstrumentSound(spec);
	for (const child of [...node.children]) {
		child.remove();
	}
	appendValue(node, 'instrument-name', spec.name);
	if (spec.abbreviation !== undefined) {
		appendValue(node, 'instrument-abbreviation', spec.abbreviation);
	}
	appendInstrumentSound(node, spec);
}

function checkInstrumentSound(spec: InstrumentChangeSpec): void {
	if (spec.solo && spec.ensemble) {
		throw new Error('An instrument is either solo or an ensemble, not both');
	}
	const size = spec.ensemble?.size;
	if (size !== undefined && (!Number.isInteger(size) || size < 1)) {
		throw new Error(`Ensemble size must be a positive integer, got ${size}`);
	}
}

/** Append the sound, solo/ensemble and virtual-instrument children, in schema order. */
function appendInstrumentSound(
	node: MElement,
	spec: InstrumentChangeSpec,
): void {
	if (spec.sound !== undefined) {
		appendValue(node, 'instrument-sound', spec.sound);
	}
	if (spec.solo) {
		node.append(new MElement('solo'));
	}
	if (spec.ensemble) {
		const ensemble = new MElement('ensemble');
		if (spec.ensemble.size !== undefined) {
			ensemble.setText(String(spec.ensemble.size));
		}
		node.append(ensemble);
	}
	if (spec.virtualInstrument) {
		const virtual = new MElement('virtual-instrument');
		if (spec.virtualInstrument.library !== undefined) {
			appendValue(virtual, 'virtual-library', spec.virtualInstrument.library);
		}
		if (spec.virtualInstrument.name !== undefined) {
			appendValue(virtual, 'virtual-name', spec.virtualInstrument.name);
		}
		node.append(virtual);
	}
}

export function readInstrumentChange(node: MElement): InstrumentChange {
	const { name, abbreviation, ...change } = readScoreInstrument(node);
	return change;
}

/** Replace `node`'s content with `spec`, in schema order. */
export function writeInstrumentChange(
	node: MElement,
	spec: InstrumentChangeSpec,
): void {
	checkInstrumentSound(spec);
	for (const child of [...node.children]) {
		child.remove();
	}
	appendInstrumentSound(node, spec);
}

const mutes: readonly PlayMute[] = [
	'on',
	'off',
	'straight',
	'cup',
	'harmon-no-stem',
	'harmon-stem',
	'bucket',
	'plunger',
	'hat',
	'solotone',
	'practice',
	'stop-mute',
	'stop-hand',
	'echo',
	'palm',
];
const semiPitches: readonly PlaySemiPitched[] = [
	'high',
	'medium-high',
	'medium',
	'medium-low',
	'low',
	'very-low',
];

/** `text` when it is one of `allowed`, else null. */
function oneOf<Value extends string>(
	text: string | null | undefined,
	allowed: readonly Value[],
): Value | null {
	const trimmed = text?.trim();
	return allowed.find((value) => value === trimmed) ?? null;
}

export function readPlay(node: MElement): Play {
	return {
		id: node.getAttribute('id'),
		ipa: node.child('ipa')?.text ?? null,
		mute: oneOf(node.child('mute')?.text, mutes),
		semiPitched: oneOf(node.child('semi-pitched')?.text, semiPitches),
		other: node.childrenNamed('other-play').map((other) => ({
			type: other.getAttribute('type') ?? '',
			text: other.text ?? '',
		})),
	};
}

/** Replace `node`'s content with `spec`, in schema order, checking the enumerations. */
export function writePlay(node: MElement, spec: PlaySpec): void {
	if (spec.mute != null && !mutes.includes(spec.mute)) {
		throw new Error(
			`mute must be one of ${mutes.join(', ')}, got ${spec.mute}`,
		);
	}
	if (spec.semiPitched != null && !semiPitches.includes(spec.semiPitched)) {
		throw new Error(
			`semiPitched must be one of ${semiPitches.join(', ')}, got ${spec.semiPitched}`,
		);
	}
	for (const child of [...node.children]) {
		child.remove();
	}
	if (spec.ipa != null) {
		appendValue(node, 'ipa', spec.ipa);
	}
	if (spec.mute != null) {
		appendValue(node, 'mute', spec.mute);
	}
	if (spec.semiPitched != null) {
		appendValue(node, 'semi-pitched', spec.semiPitched);
	}
	for (const other of spec.other ?? []) {
		appendValue(node, 'other-play', other.text).setAttribute(
			'type',
			other.type,
		);
	}
}

export function readListen(node: MElement): Listen {
	const read = (child: MElement) => {
		const timeOnly = child.getAttribute('time-only');
		return {
			player: child.getAttribute('player'),
			timeOnly:
				timeOnly == null || !/^\s*\d+(\s*,\s*\d+)*\s*$/.test(timeOnly)
					? null
					: timeOnly.split(',').map((pass) => Number(pass)),
		};
	};
	return {
		actions: node.children.flatMap((child): Listen['actions'] => {
			if (!(child instanceof MElement)) {
				return [];
			}
			if (child.tag === 'assess') {
				return [
					{
						kind: 'assess',
						...read(child),
						assess: child.getAttribute('type') !== 'no',
					},
				];
			}
			if (child.tag === 'wait') {
				return [{ kind: 'wait', ...read(child) }];
			}
			if (child.tag === 'other-listen') {
				return [
					{
						kind: 'other',
						...read(child),
						type: child.getAttribute('type') ?? '',
						text: child.text ?? '',
					},
				];
			}
			return [];
		}),
	};
}

/** Replace `node`'s content with `spec`, in order. */
export function writeListen(node: MElement, spec: ListenSpec): void {
	for (const child of [...node.children]) {
		child.remove();
	}
	for (const action of spec.actions) {
		const element = new MElement(
			{ wait: 'wait', assess: 'assess', other: 'other-listen' }[action.kind],
		);
		if (action.kind === 'assess') {
			element.setAttribute('type', action.assess ? 'yes' : 'no');
		} else if (action.kind === 'other') {
			element.setAttribute('type', action.type);
			element.setText(action.text);
		}
		if (action.player != null) {
			element.setAttribute('player', action.player);
		}
		if (action.timeOnly != null) {
			element.setAttribute('time-only', action.timeOnly.join(','));
		}
		node.append(element);
	}
}

export function readMidiInstrument(node: MElement): MidiInstrument {
	const midi: MidiInstrument = {
		id: node.getAttribute('id'),
		channel: null,
		name: null,
		bank: null,
		program: null,
		unpitched: null,
		volume: null,
		pan: null,
		elevation: null,
	};
	for (const field of midiFields) {
		const text = node.child(field.tag)?.text;
		Object.assign(midi, {
			[field.key]: field.range ? numberIn(text, field.range) : (text ?? null),
		});
	}
	return midi;
}

/** Replace `node`'s content with `spec`, in schema order, checking ranges. */
export function writeMidiInstrument(
	node: MElement,
	spec: MidiInstrumentSpec,
): void {
	const values = midiFields.flatMap((field) => {
		const value = spec[field.key];
		if (value === undefined) {
			return [];
		}
		return [
			{
				tag: field.tag,
				text: field.range
					? checkRange(field.tag, value as number, field.range)
					: String(value),
			},
		];
	});
	for (const child of [...node.children]) {
		child.remove();
	}
	for (const value of values) {
		appendValue(node, value.tag, value.text);
	}
}

export function readMidiDevice(node: MElement): MidiDevice {
	return {
		id: node.getAttribute('id'),
		port: numberIn(node.getAttribute('port'), portRange),
		name: node.text,
	};
}

export function writeMidiDevice(node: MElement, spec: MidiDeviceSpec): void {
	const port =
		spec.port === undefined
			? undefined
			: checkRange('midi-device port', spec.port, portRange);
	if (port === undefined) {
		node.removeAttribute('port');
	} else {
		node.setAttribute('port', port);
	}
	for (const child of [...node.children]) {
		child.remove();
	}
	if (spec.name !== undefined) {
		node.setText(spec.name);
	}
}
