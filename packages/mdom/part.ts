import {
	type MidiDevice,
	type MidiDeviceSpec,
	type MidiInstrument,
	type MidiInstrumentSpec,
	readMidiDevice,
	readMidiInstrument,
	readScoreInstrument,
	type ScoreInstrument,
	type ScoreInstrumentSpec,
	writeMidiDevice,
	writeMidiInstrument,
	writeScoreInstrument,
} from './instrument';
import { MElement, required } from './m-node';
import { Measure } from './measure';
import { memo } from './read-cache';
import { Score } from './score';
import {
	ensureMetadata,
	insertMetadata,
	makeFormattedText,
	type NameDisplay,
	type NameDisplaySpec,
	nameDisplay,
	partMetadataOrder,
	setMetadataText,
} from './score-metadata';
import type { StaffTuning } from './staff-tuning';

/** A `<part>`: a sequence of measures, keyed to a `<score-part>` by id. */
export class Part extends MElement {
	constructor() {
		super('part');
	}

	/**
	 * The part's id (IDREF to its `<score-part>`). Always present in valid
	 * MusicXML, and addPart sets one; absence is a malformed document.
	 */
	get id(): string {
		return required(this.getAttribute('id'), 'id on <part>');
	}

	/** The score this part belongs to. An attached part always has one. */
	get score(): Score {
		return required(this.closest(Score), '<score-partwise> ancestor of <part>');
	}

	/**
	 * The part's measures, frozen and shared until the next document change, so
	 * indexing it per measure is O(1). Copy it before sorting or splicing.
	 */
	get measures(): readonly Measure[] {
		return measuresOf(this);
	}

	/** The measure with this `number`, or null. */
	getMeasure(number: string): Measure | null {
		return (
			measuresOf(this).find((measure) => measure.number === number) ?? null
		);
	}

	/**
	 * Display name, resolved from this part's `<score-part><part-name>` in the
	 * `<part-list>` (a sibling cross-reference, joined by this part's id).
	 */
	get label(): string | null {
		return scorePartOf(this)?.child('part-name')?.text ?? null;
	}

	get abbreviation(): string | null {
		return scorePartOf(this)?.child('part-abbreviation')?.text ?? null;
	}
	get nameDisplay(): NameDisplay | null {
		return nameDisplay(scorePartOf(this)?.child('part-name-display') ?? null);
	}
	get abbreviationDisplay(): NameDisplay | null {
		return nameDisplay(
			scorePartOf(this)?.child('part-abbreviation-display') ?? null,
		);
	}
	/** Set the plain name without changing a separately specified display name. */
	setLabel(value: string): void {
		setMetadataText(
			required(scorePartOf(this), '<score-part> for part'),
			'part-name',
			value,
			partMetadataOrder,
		);
	}
	setAbbreviation(value: string | null): void {
		setMetadataText(
			required(scorePartOf(this), '<score-part> for part'),
			'part-abbreviation',
			value,
			partMetadataOrder,
		);
	}
	setNameDisplay(spec: NameDisplaySpec | null): void {
		this.setDisplay('part-name-display', spec);
	}
	setAbbreviationDisplay(spec: NameDisplaySpec | null): void {
		this.setDisplay('part-abbreviation-display', spec);
	}
	private setDisplay(tag: string, spec: NameDisplaySpec | null): void {
		const parent = required(scorePartOf(this), '<score-part> for part');
		if (spec === null) {
			parent.child(tag)?.remove();
			return;
		}
		const node = ensureMetadata(parent, tag, partMetadataOrder);
		for (const child of [...node.children]) {
			child.remove();
		}
		if (spec.printObject === undefined) {
			node.removeAttribute('print-object');
		} else {
			node.setAttribute('print-object', spec.printObject);
		}
		for (const run of spec.runs) {
			node.append(makeFormattedText(run.kind, run));
		}
	}

	/**
	 * MIDI program the part plays on, 1 to 128 as MusicXML numbers it (General
	 * MIDI's 0-based program plus one), resolved like {@link label} from this
	 * part's `<score-part><midi-instrument><midi-program>`. The first
	 * `<midi-instrument>` wins when the part declares several; read
	 * {@link getMidiInstrument} for a particular instrument's. Null when there is
	 * no `<score-part>`, `<midi-instrument>`, or `<midi-program>`, or its text is
	 * not an integer from 1 to 128.
	 */
	get program(): number | null {
		const text = scorePartOf(this)
			?.child('midi-instrument')
			?.child('midi-program')
			?.text?.trim();
		if (text == null || !/^\d+$/.test(text)) {
			return null;
		}
		const program = Number(text);
		return program >= 1 && program <= 128 ? program : null;
	}

	/**
	 * Every `<score-instrument>` the part declares, in document order. A part
	 * may declare several (divisi, percussion kits, doublings); a note picks
	 * among them with {@link Note.instrumentIds}.
	 */
	get instruments(): ScoreInstrument[] {
		return (scorePartOf(this)?.childrenNamed('score-instrument') ?? []).map(
			readScoreInstrument,
		);
	}

	/** The `<score-instrument>` with this id, or null. */
	getInstrument(id: string): ScoreInstrument | null {
		const node = instrumentNode(this, id);
		return node ? readScoreInstrument(node) : null;
	}

	/**
	 * Every `<midi-instrument>` in the part's `<score-part>`, in document order,
	 * including any whose id names no declared instrument.
	 */
	get midiInstruments(): MidiInstrument[] {
		return (scorePartOf(this)?.childrenNamed('midi-instrument') ?? []).map(
			readMidiInstrument,
		);
	}

	/** The `<midi-instrument>` assigned to the instrument with this id, or null. */
	getMidiInstrument(instrumentId: string): MidiInstrument | null {
		const node = midiNode(this, 'midi-instrument', instrumentId);
		return node ? readMidiInstrument(node) : null;
	}

	/** Every `<midi-device>` in the part's `<score-part>`, in document order. */
	get midiDevices(): MidiDevice[] {
		return (scorePartOf(this)?.childrenNamed('midi-device') ?? []).map(
			readMidiDevice,
		);
	}

	/**
	 * The `<midi-device>` the instrument with this id plays through: one naming
	 * it, else one with no id (which applies to the whole part), else null.
	 */
	getMidiDevice(instrumentId: string): MidiDevice | null {
		const node =
			midiNode(this, 'midi-device', instrumentId) ??
			midiNode(this, 'midi-device', null);
		return node ? readMidiDevice(node) : null;
	}

	/**
	 * Declare a `<score-instrument>`, after any the part already declares. The
	 * id defaults to the first free `<part id>-I<n>`; an id already used in the
	 * document throws.
	 */
	addInstrument(spec: ScoreInstrumentSpec): ScoreInstrument {
		const scorePart = required(scorePartOf(this), '<score-part> for part');
		const id = spec.id ?? freeInstrumentId(this);
		if (documentIds(this).has(id)) {
			throw new Error(`id "${id}" is already used in the document`);
		}
		const node = new MElement('score-instrument');
		node.setAttribute('id', id);
		writeScoreInstrument(node, spec);
		insertMetadata(scorePart, node, partMetadataOrder);
		return readScoreInstrument(node);
	}

	/** Replace the identity of the instrument with this id; its MIDI fields stay. */
	setInstrument(id: string, spec: Omit<ScoreInstrumentSpec, 'id'>): void {
		writeScoreInstrument(requiredInstrument(this, id), spec);
	}

	/**
	 * Remove the instrument with this id, with the `<midi-instrument>` and
	 * `<midi-device>` assigned to it. Throws while a note still names it, since
	 * that note's `<instrument>` would dangle; reassign those notes first.
	 */
	removeInstrument(id: string): void {
		const node = requiredInstrument(this, id);
		if (
			this.measures.some((measure) =>
				measure.notes.some((note) => note.instrumentIds.includes(id)),
			)
		) {
			throw new Error(`notes still play instrument "${id}"`);
		}
		midiNode(this, 'midi-instrument', id)?.remove();
		midiNode(this, 'midi-device', id)?.remove();
		node.remove();
	}

	/**
	 * Set the MIDI playback of the instrument with this id, replacing every
	 * field of any existing assignment; null removes it.
	 */
	setMidiInstrument(
		instrumentId: string,
		spec: MidiInstrumentSpec | null,
	): void {
		requiredInstrument(this, instrumentId);
		const existing = midiNode(this, 'midi-instrument', instrumentId);
		if (spec === null) {
			existing?.remove();
			return;
		}
		const node = existing ?? new MElement('midi-instrument');
		writeMidiInstrument(node, spec);
		if (!existing) {
			node.setAttribute('id', instrumentId);
			// Right after its own device, so each device/instrument pair stays together.
			const device = midiNode(this, 'midi-device', instrumentId);
			const scorePart = required(scorePartOf(this), '<score-part> for part');
			scorePart.insertBefore(node, device ? nextSibling(device) : null);
		}
	}

	/**
	 * Set the MIDI device the instrument with this id plays through, or with a
	 * null id the device for the whole part; a null spec removes it.
	 */
	setMidiDevice(
		instrumentId: string | null,
		spec: MidiDeviceSpec | null,
	): void {
		if (instrumentId !== null) {
			requiredInstrument(this, instrumentId);
		}
		const existing = midiNode(this, 'midi-device', instrumentId);
		if (spec === null) {
			existing?.remove();
			return;
		}
		if (existing) {
			writeMidiDevice(existing, spec);
			return;
		}
		const node = new MElement('midi-device');
		if (instrumentId !== null) {
			node.setAttribute('id', instrumentId);
		}
		writeMidiDevice(node, spec);
		const scorePart = required(scorePartOf(this), '<score-part> for part');
		// A part-wide device leads the MIDI sequence; an instrument's own device
		// sits just before its <midi-instrument>, or last until one is added.
		const before =
			instrumentId === null
				? (scorePart.children.find(
						(child) =>
							child instanceof MElement &&
							(child.tag === 'midi-device' || child.tag === 'midi-instrument'),
					) ?? null)
				: midiNode(this, 'midi-instrument', instrumentId);
		scorePart.insertBefore(node, before);
	}

	/** Append a `<measure>`, numbered after the last one when `number` is omitted. */
	addMeasure(opts?: { number?: string }): Measure {
		const measure = new Measure();
		measure.setAttribute(
			'number',
			opts?.number ?? String(measuresOf(this).length + 1),
		);
		this.append(measure);
		return measure;
	}

	/**
	 * Insert a new `<measure>` at `index` (appending when `index` is the measure
	 * count). Numbering is the caller's to set — a non-musical spacer measure
	 * legitimately wants none, so unlike {@link addMeasure} this assigns one only
	 * when asked. Pair it with {@link Measure.copySignaturesFrom} when the new
	 * measure lands before the declarations it needs.
	 */
	insertMeasureAt(index: number, opts?: { number?: string }): Measure {
		const measure = new Measure();
		if (opts?.number != null) {
			measure.setAttribute('number', opts.number);
		}
		this.insertBefore(measure, measuresOf(this)[index] ?? null);
		return measure;
	}

	/**
	 * The `<staff-tuning>` declarations for `staff` (default '1'): the first
	 * `<staff-details>` anywhere in the part that carries them. Tuning is
	 * effectively a per-part constant, like {@link partSymbol} — use
	 * {@link Measure.getStaffTunings} when a mid-score retuning matters.
	 */
	getStaffTunings(staff = '1'): StaffTuning[] {
		for (const measure of measuresOf(this)) {
			const tunings = measure.getStaffTunings(staff);
			if (tunings.length > 0) {
				return tunings;
			}
		}
		return [];
	}

	/**
	 * `<staves>` count (first declaration in any measure's attributes); 1 (single
	 * staff) when never declared.
	 */
	get staveCount(): number {
		for (const measure of measuresOf(this)) {
			for (const attrs of measure.childrenNamed('attributes')) {
				const staves = attrs.child('staves')?.text;
				if (staves != null) {
					return Number(staves);
				}
			}
		}
		return 1;
	}

	/**
	 * The `<part-symbol>` connector joining a multi-staff part's staves (first
	 * declaration in any measure's attributes); null when never declared. It is
	 * effectively a per-part constant, so it lives here rather than per-measure.
	 */
	get partSymbol(): 'none' | 'line' | 'bracket' | 'brace' | 'square' | null {
		for (const measure of measuresOf(this)) {
			for (const attrs of measure.childrenNamed('attributes')) {
				const symbol = attrs.child('part-symbol')?.text;
				if (symbol != null) {
					return symbol as 'none' | 'line' | 'bracket' | 'brace' | 'square';
				}
			}
		}
		return null;
	}
}

/** The part's measures, cached until the next document change. Never mutate it. */
export function measuresOf(part: Part): readonly Measure[] {
	return memo(part, 'measures', () =>
		Object.freeze(part.childrenOfType(Measure)),
	);
}

/** `measure`'s position among `part`'s measures; -1 when it isn't one of them. */
export function measureIndexIn(part: Part, measure: Measure): number {
	const indexes = memo(
		part,
		'measure-indexes',
		() =>
			new Map(measuresOf(part).map((each, index) => [each, index] as const)),
	);
	return indexes.get(measure) ?? -1;
}

/** `part`'s `<score-part>` in the `<part-list>`, joined by id; null when absent. */
function scorePartOf(part: Part): MElement | null {
	return (
		part
			.closest(Score)
			?.child('part-list')
			?.childrenNamed('score-part')
			.find((entry) => entry.getAttribute('id') === part.id) ?? null
	);
}

function instrumentNode(part: Part, id: string): MElement | null {
	return (
		scorePartOf(part)
			?.childrenNamed('score-instrument')
			.find((node) => node.getAttribute('id') === id) ?? null
	);
}

function requiredInstrument(part: Part, id: string): MElement {
	const node = instrumentNode(part, id);
	if (!node) {
		throw new Error(`part "${part.id}" declares no instrument "${id}"`);
	}
	return node;
}

/** The `<tag>` in `part`'s `<score-part>` whose id is `id` (null: has no id). */
function midiNode(
	part: Part,
	tag: 'midi-instrument' | 'midi-device',
	id: string | null,
): MElement | null {
	return (
		scorePartOf(part)
			?.childrenNamed(tag)
			.find((node) => node.getAttribute('id') === id) ?? null
	);
}

function nextSibling(node: MElement): MElement | null {
	const siblings = node.parent?.children ?? [];
	return (
		siblings
			.slice(siblings.indexOf(node) + 1)
			.find((sibling) => sibling instanceof MElement) ?? null
	);
}

/** Tags whose `id` is an IDREF to another element, not an ID of its own. */
const idReferenceTags = new Set([
	'part',
	'instrument',
	'midi-instrument',
	'midi-device',
]);

/** Every XML ID in the document, which score-instrument ids must not repeat. */
function documentIds(part: Part): Set<string> {
	const ids = new Set<string>();
	const visit = (node: MElement) => {
		const id = node.getAttribute('id');
		if (id !== null && !idReferenceTags.has(node.tag)) {
			ids.add(id);
		}
		for (const child of node.childrenOfType(MElement)) {
			visit(child);
		}
	};
	visit(part.score);
	return ids;
}

function freeInstrumentId(part: Part): string {
	const used = documentIds(part);
	let index = 1;
	while (used.has(`${part.id}-I${index}`)) {
		index++;
	}
	return `${part.id}-I${index}`;
}
