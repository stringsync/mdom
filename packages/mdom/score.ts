import { MElement } from './m-node';
import { appendValue } from './measure';
import { Part } from './part';
import { type PartGroupSpan, partGroupsOf } from './part-group';
import { Scaling } from './scaling';
import {
	addTypedText,
	type CreditInfo,
	type CreditSpec,
	type EncodingInfo,
	type EncodingSpec,
	ensureMetadata,
	formattedText,
	headerOrder,
	identificationOrder,
	insertMetadata,
	type MiscellaneousField,
	makeFormattedText,
	setMetadataText,
	type TypedText,
	type TypedTextSpec,
	typedTexts,
} from './score-metadata';
import { SystemLayout } from './system-layout';

/** The `<score-partwise>` root. Holds the parts and the part-list metadata. */
export class Score extends MElement {
	constructor() {
		super('score-partwise');
	}

	/** Explicit source version, including unfamiliar versions; null when absent. */
	get version(): string | null {
		return this.getAttribute('version');
	}

	/** Writers target the vendored MusicXML 4.0 schema. This does not convert older scores. */
	setVersion(version: '4.0' | null): void {
		if (version === null) {
			this.removeAttribute('version');
		} else {
			if (version !== '4.0') {
				throw new Error('Only MusicXML 4.0 writing is supported');
			}
			this.setAttribute('version', version);
		}
	}

	get workNumber(): string | null {
		return this.child('work')?.child('work-number')?.text ?? null;
	}
	get workTitle(): string | null {
		return this.child('work')?.child('work-title')?.text ?? null;
	}
	get movementNumber(): string | null {
		return this.child('movement-number')?.text ?? null;
	}
	get movementTitle(): string | null {
		return this.child('movement-title')?.text ?? null;
	}
	setWorkNumber(value: string | null): void {
		this.setWorkText('work-number', value);
	}
	setWorkTitle(value: string | null): void {
		this.setWorkText('work-title', value);
	}
	setMovementNumber(value: string | null): void {
		setMetadataText(this, 'movement-number', value, headerOrder);
	}
	setMovementTitle(value: string | null): void {
		setMetadataText(this, 'movement-title', value, headerOrder);
	}
	private setWorkText(tag: string, value: string | null): void {
		const work =
			value === null
				? this.child('work')
				: ensureMetadata(this, 'work', headerOrder);
		if (work) {
			setMetadataText(work, tag, value, ['work-number', 'work-title', 'opus']);
		}
	}
	private identification(): MElement {
		return ensureMetadata(this, 'identification', headerOrder);
	}
	get creators(): TypedText[] {
		return typedTexts(this.child('identification'), 'creator');
	}
	get rights(): TypedText[] {
		return typedTexts(this.child('identification'), 'rights');
	}
	get relations(): TypedText[] {
		return typedTexts(this.child('identification'), 'relation');
	}
	addCreator(spec: TypedTextSpec): MElement {
		return addTypedText(
			this.identification(),
			'creator',
			spec,
			identificationOrder,
		);
	}
	addRights(spec: TypedTextSpec): MElement {
		return addTypedText(
			this.identification(),
			'rights',
			spec,
			identificationOrder,
		);
	}
	addRelation(spec: TypedTextSpec): MElement {
		return addTypedText(
			this.identification(),
			'relation',
			spec,
			identificationOrder,
		);
	}
	get source(): string | null {
		return this.child('identification')?.child('source')?.text ?? null;
	}
	setSource(value: string | null): void {
		const identification =
			value === null ? this.child('identification') : this.identification();
		if (identification) {
			setMetadataText(identification, 'source', value, identificationOrder);
		}
	}
	get miscellaneous(): MiscellaneousField[] {
		return (
			this.child('identification')
				?.child('miscellaneous')
				?.childrenNamed('miscellaneous-field') ?? []
		).map((node) => ({ name: node.getAttribute('name'), text: node.text }));
	}
	addMiscellaneousField(name: string, text: string): MElement {
		const parent = ensureMetadata(
			this.identification(),
			'miscellaneous',
			identificationOrder,
		);
		const node = new MElement('miscellaneous-field');
		node.setAttribute('name', name);
		node.setText(text);
		parent.append(node);
		return node;
	}
	/** Encoding metadata snapshot; absent encoding stays null. Repeated entries retain document order. */
	get encoding(): EncodingInfo | null {
		const node = this.child('identification')?.child('encoding');
		if (!node) {
			return null;
		}
		return {
			date: node.child('encoding-date')?.text ?? null,
			dates: node.childrenNamed('encoding-date').map((child) => child.text),
			encoders: typedTexts(node, 'encoder'),
			software: this.software,
			descriptions: node
				.childrenNamed('encoding-description')
				.map((child) => child.text),
			supports: node.childrenNamed('supports').map((child) => {
				const type = child.getAttribute('type');
				return {
					type: type === 'yes' || type === 'no' ? type : null,
					element: child.getAttribute('element'),
					attribute: child.getAttribute('attribute'),
					value: child.getAttribute('value'),
				};
			}),
		};
	}
	/** Patch supplied encoding fields only; arrays replace that field's repeated entries. Null removes encoding. */
	setEncoding(spec: EncodingSpec | null): void {
		if (spec === null) {
			this.child('identification')?.child('encoding')?.remove();
			return;
		}
		const node = ensureMetadata(
			this.identification(),
			'encoding',
			identificationOrder,
		);
		const replace = (tag: string, values: readonly MElement[] | undefined) => {
			if (values === undefined) {
				return;
			}
			for (const child of node.childrenNamed(tag)) {
				child.remove();
			}
			for (const value of values) {
				node.append(value);
			}
		};
		const textNode = (tag: string, text: string) => {
			const child = new MElement(tag);
			child.setText(text);
			return child;
		};
		replace(
			'encoding-date',
			spec.date === undefined
				? undefined
				: [textNode('encoding-date', spec.date)],
		);
		replace(
			'encoder',
			spec.encoders?.map((value) => {
				const child = textNode('encoder', value.text);
				if (value.type !== undefined) {
					child.setAttribute('type', value.type);
				}
				return child;
			}),
		);
		replace(
			'software',
			spec.software?.map((value) => textNode('software', value)),
		);
		replace(
			'encoding-description',
			spec.descriptions?.map((value) =>
				textNode('encoding-description', value),
			),
		);
		replace(
			'supports',
			spec.supports?.map((value) => {
				const child = new MElement('supports');
				for (const [key, attr] of Object.entries(value)) {
					child.setAttribute(key, attr);
				}
				return child;
			}),
		);
	}
	get credits(): CreditInfo[] {
		return this.childrenNamed('credit').map((node) => {
			const page = node.getAttribute('page');
			return {
				page: page === null ? null : Number(page),
				types: node.childrenNamed('credit-type').map((child) => child.text),
				words: node.childrenNamed('credit-words').map(formattedText),
			};
		});
	}
	/** Append a text credit, keeping header and run order. Returns the editable generic node. */
	addCredit(spec: CreditSpec): MElement {
		if (spec.words.length === 0) {
			throw new Error('A text credit requires at least one words run');
		}
		if (
			spec.page !== undefined &&
			(!Number.isSafeInteger(spec.page) || spec.page < 1)
		) {
			throw new Error('Credit page must be a positive integer');
		}
		const node = new MElement('credit');
		if (spec.page !== undefined) {
			node.setAttribute('page', String(spec.page));
		}
		for (const type of spec.types ?? []) {
			const child = new MElement('credit-type');
			child.setText(type);
			node.append(child);
		}
		for (const words of spec.words) {
			node.append(makeFormattedText('credit-words', words));
		}
		insertMetadata(this, node, headerOrder);
		return node;
	}

	/** The score's parts. */
	get parts(): Part[] {
		return this.childrenOfType(Part);
	}

	/** The part with this id, or null. */
	getPart(id: string): Part | null {
		return this.parts.find((part) => part.id === id) ?? null;
	}

	/**
	 * The `<part-group>` spans — the braces and brackets drawn across parts —
	 * outermost first. The markers in `<part-list>` are flat, interleaved with the
	 * `<score-part>` entries and paired by `number`, so each span's members are
	 * resolved by counting parts between its start and stop. Groups that never
	 * close, or that cover no part, are dropped.
	 */
	get partGroups(): PartGroupSpan[] {
		return partGroupsOf(this);
	}

	/**
	 * The `<defaults><scaling>` for converting tenths to a physical size (mm or
	 * px) — e.g. `score.scaling.toMillimeters(measure.width)`. Falls back to
	 * {@link Scaling.default} when `<scaling>` is absent, so it always converts.
	 */
	get scaling(): Scaling {
		const scaling = this.child('defaults')?.child('scaling');
		const millimeters = scaling?.child('millimeters')?.text;
		const tenths = scaling?.child('tenths')?.text;
		return millimeters != null && tenths != null
			? new Scaling(Number(millimeters), Number(tenths))
			: Scaling.default;
	}

	/**
	 * The `<defaults><system-layout>`: the score-wide default system spacing and
	 * indents. Null when unset. Per-system overrides live on a measure's `<print>`.
	 */
	get systemLayout(): SystemLayout | null {
		return this.child('defaults')?.childrenOfType(SystemLayout)[0] ?? null;
	}

	/** Get or create the `<defaults><system-layout>` (both created if absent), keeping `<defaults>` order. */
	getOrCreateSystemLayout(): SystemLayout {
		const existing = this.systemLayout;
		if (existing) {
			return existing;
		}
		let defaults = this.child('defaults');
		if (!defaults) {
			defaults = new MElement('defaults');
			insertMetadata(this, defaults, headerOrder);
		}
		const layout = new SystemLayout();
		// <defaults> is a sequence; system-layout precedes these.
		const after = new Set([
			'staff-layout',
			'appearance',
			'music-font',
			'word-font',
			'lyric-font',
			'lyric-language',
		]);
		const ref =
			defaults.children.find(
				(node) => node instanceof MElement && after.has(node.tag),
			) ?? null;
		defaults.insertBefore(layout, ref);
		return layout;
	}

	/** `<movement-title>`, falling back to `<work><work-title>`. */
	get title(): string | null {
		return (
			this.child('movement-title')?.text ??
			this.child('work')?.child('work-title')?.text ??
			null
		);
	}

	/**
	 * The programs that wrote this file: every `<identification><encoding><software>`,
	 * in document order. Often several — an exporter plus its MusicXML plugin (e.g.
	 * `['Finale 2011 for Windows', 'Dolet 5.5 for Finale']`). Empty when unstated.
	 * The source key for handling exporter quirks; not all writers fill it in.
	 */
	get software(): string[] {
		const encoding = this.child('identification')?.child('encoding');
		return (encoding?.childrenNamed('software') ?? [])
			.map((node) => node.text)
			.filter((text): text is string => text != null);
	}

	/**
	 * Create a `<part>`, registering its `<score-part>`/`<part-name>` in the
	 * `<part-list>` (created if absent). The id is generated when omitted.
	 *
	 * `<part-name>` is written either way, because the schema requires one on every
	 * `<score-part>` — an unnamed part gets an EMPTY element, which prints nothing
	 * and still reads back as {@link Part.label} null, so "no name" stays
	 * distinguishable from a name that happens to be blank.
	 */
	addPart(opts?: { id?: string; name?: string }): Part {
		const id = opts?.id ?? `P${this.parts.length + 1}`;

		let partList = this.child('part-list');
		if (!partList) {
			partList = new MElement('part-list');
			insertMetadata(this, partList, headerOrder);
		}
		const scorePart = new MElement('score-part');
		scorePart.setAttribute('id', id);
		if (opts?.name == null) {
			scorePart.append(new MElement('part-name'));
		} else {
			appendValue(scorePart, 'part-name', opts.name);
		}
		partList.append(scorePart);

		const part = new Part();
		part.setAttribute('id', id);
		this.append(part);
		return part;
	}
}
