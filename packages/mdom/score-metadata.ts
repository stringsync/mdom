import { MElement } from './m-node';

/** Dublin Core text and its optional, open-ended role (composer, lyricist, etc.). */
export interface TypedText {
	text: string | null;
	type: string | null;
}
export interface TypedTextSpec {
	text: string;
	type?: string;
}

/** Raw MusicXML formatting attributes; unspecified formatting is inherited. */
export interface TextFormatting {
	'font-family'?: string;
	'font-style'?: 'normal' | 'italic';
	'font-size'?: string;
	'font-weight'?: 'normal' | 'bold';
	color?: string;
	'default-x'?: string;
	'default-y'?: string;
	'relative-x'?: string;
	'relative-y'?: string;
	justify?: 'left' | 'center' | 'right';
	halign?: 'left' | 'center' | 'right';
	valign?: 'top' | 'middle' | 'bottom' | 'baseline';
	'xml:lang'?: string;
	'xml:space'?: 'default' | 'preserve';
	underline?: string;
	overline?: string;
	'line-through'?: string;
	rotation?: string;
	'letter-spacing'?: string;
	'line-height'?: string;
	dir?: 'ltr' | 'rtl' | 'lro' | 'rlo';
	enclosure?: string;
	id?: string;
}
export interface FormattedText {
	text: string | null;
	format: TextFormatting;
}
export interface FormattedTextSpec {
	text: string;
	format?: TextFormatting;
}
export interface EncodingSupport {
	type: 'yes' | 'no' | null;
	element: string | null;
	attribute: string | null;
	value: string | null;
}
export interface EncodingSupportSpec {
	type: 'yes' | 'no';
	element: string;
	attribute?: string;
	value?: string;
}
/** `date` is the first declared date; `dates` retains all repeated declarations. */
export interface EncodingInfo {
	dates: (string | null)[];
	date: string | null;
	encoders: TypedText[];
	software: string[];
	descriptions: (string | null)[];
	supports: EncodingSupport[];
}
export interface EncodingSpec {
	date?: string;
	encoders?: readonly TypedTextSpec[];
	software?: readonly string[];
	descriptions?: readonly string[];
	supports?: readonly EncodingSupportSpec[];
}
export interface MiscellaneousField {
	name: string | null;
	text: string | null;
}
export interface CreditInfo {
	page: number | null;
	types: (string | null)[];
	words: FormattedText[];
}
/** Text credits; images, symbols, links and bookmarks remain available through the tree API. */
export interface CreditSpec {
	page?: number;
	types?: readonly string[];
	words: readonly [FormattedTextSpec, ...FormattedTextSpec[]];
}
export interface NameDisplay {
	printObject: 'yes' | 'no' | null;
	runs: (FormattedText & { kind: 'display-text' | 'accidental-text' })[];
}
export interface NameDisplaySpec {
	printObject?: 'yes' | 'no';
	runs: readonly (FormattedTextSpec & {
		kind: 'display-text' | 'accidental-text';
	})[];
}

export const headerOrder = [
	'work',
	'movement-number',
	'movement-title',
	'identification',
	'defaults',
	'credit',
	'part-list',
	'part',
];
export const identificationOrder = [
	'creator',
	'rights',
	'encoding',
	'source',
	'relation',
	'miscellaneous',
];
export const partMetadataOrder = [
	'identification',
	'part-link',
	'part-name',
	'part-name-display',
	'part-abbreviation',
	'part-abbreviation-display',
	'group',
	'score-instrument',
	'player',
	'midi-device',
	'midi-instrument',
];

/** Insert after peers, before later members of a schema sequence. */
export function insertMetadata(
	parent: MElement,
	node: MElement,
	order: readonly string[],
): void {
	const rank = order.indexOf(node.tag);
	parent.insertBefore(
		node,
		parent.children.find(
			(child) => child instanceof MElement && order.indexOf(child.tag) > rank,
		) ?? null,
	);
}
export function ensureMetadata(
	parent: MElement,
	tag: string,
	order: readonly string[],
): MElement {
	const existing = parent.child(tag);
	if (existing) {
		return existing;
	}
	const node = new MElement(tag);
	insertMetadata(parent, node, order);
	return node;
}
export function setMetadataText(
	parent: MElement,
	tag: string,
	value: string | null,
	order: readonly string[],
): void {
	if (value === null) {
		parent.child(tag)?.remove();
	} else {
		ensureMetadata(parent, tag, order).setText(value);
	}
}
export function typedTexts(
	parent: MElement | null | undefined,
	tag: string,
): TypedText[] {
	return (parent?.childrenNamed(tag) ?? []).map((node) => ({
		text: node.text,
		type: node.getAttribute('type'),
	}));
}
export function addTypedText(
	parent: MElement,
	tag: string,
	spec: TypedTextSpec,
	order: readonly string[],
): MElement {
	const node = new MElement(tag);
	node.setText(spec.text);
	if (spec.type !== undefined) {
		node.setAttribute('type', spec.type);
	}
	insertMetadata(parent, node, order);
	return node;
}
export function formattedText(node: MElement): FormattedText {
	return { text: node.text, format: node.attributes as TextFormatting };
}
export function makeFormattedText(
	tag: string,
	spec: FormattedTextSpec,
): MElement {
	const node = new MElement(tag);
	node.setText(spec.text);
	for (const [key, value] of Object.entries(spec.format ?? {})) {
		node.setAttribute(key, value);
	}
	return node;
}
export function nameDisplay(node: MElement | null): NameDisplay | null {
	if (!node) {
		return null;
	}
	const print = node.getAttribute('print-object');
	return {
		printObject: print === 'yes' || print === 'no' ? print : null,
		runs: node
			.childrenOfType(MElement)
			.flatMap((child) =>
				child.tag === 'display-text' || child.tag === 'accidental-text'
					? [{ ...formattedText(child), kind: child.tag }]
					: [],
			),
	};
}
