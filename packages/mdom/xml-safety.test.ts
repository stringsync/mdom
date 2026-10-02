import { describe, expect, it } from 'bun:test';
import { MDocument } from './m-document';
import { MDOMParser } from './m-dom-parser';
import { MCData, MElement, MText } from './m-node';
import { MusicXMLSerializer } from './music-xml-serializer';
import { Score } from './score';

describe('XML safety', () => {
	const parser = new MDOMParser();
	const serializer = new MusicXMLSerializer();
	const roundTrip = (doc: MDocument): MDocument =>
		parser.parseFromString(serializer.serializeToString(doc));

	it('keeps markup in an attribute value as a value', () => {
		const score = new Score();
		score.setAttribute('version', `"><script>alert(1)</script>&lt;'`);

		const xml = serializer.serializeToString(new MDocument(score));

		expect(xml).toBe(
			`<score-partwise version="&quot;&gt;&lt;script&gt;alert(1)&lt;/script&gt;&amp;lt;'"/>`,
		);
		expect(parser.parseFromString(xml).root.getAttribute('version')).toBe(
			`"><script>alert(1)</script>&lt;'`,
		);
	});

	it('keeps a literal entity in text as text', () => {
		const score = new Score();
		score.append(new MText('&amp; &lt;b&gt;'));

		expect(roundTrip(new MDocument(score)).root.text).toBe('&amp; &lt;b&gt;');
	});

	it('keeps every ]]> inside a CDATA value', () => {
		const score = new Score();
		score.append(new MCData('a]]>b]]><script>alert(1)</script>'));

		const children = roundTrip(new MDocument(score)).root.children;

		expect(children.map((child) => (child as MCData).value).join('')).toBe(
			'a]]>b]]><script>alert(1)</script>',
		);
		expect(children).not.toContainEqual(expect.any(MElement));
	});

	it('preserves tabs, newlines, and carriage returns in attributes and text', () => {
		const score = new Score();
		score.setAttribute('version', 'a\tb\nc\rd');
		score.append(new MText('e\r\nf'));

		const parsed = roundTrip(new MDocument(score)).root;

		expect([parsed.getAttribute('version'), parsed.text]).toEqual([
			'a\tb\nc\rd',
			'e\r\nf',
		]);
	});

	it('round-trips hostile strings through text, attributes, and CDATA unchanged', () => {
		const samples = hostileStrings(300);
		const score = new Score();
		samples.forEach((sample) => {
			const words = new MElement('words');
			words.setAttribute('id', sample);
			words.append(new MText(sample));
			const data = new MElement('data');
			data.append(new MCData(sample));
			words.append(data);
			score.append(words);
		});

		const words = roundTrip(new MDocument(score)).root.childrenNamed('words');

		expect(words.map((word) => word.getAttribute('id'))).toEqual(samples);
		expect(words.map((word) => word.text)).toEqual(samples);
		expect(
			words.map((word) =>
				word
					.child('data')
					?.children.map((child) => (child as MCData).value)
					.join(''),
			),
		).toEqual(samples);
	});

	it('rejects an element name that is not an XML name', () => {
		expect(() => new MElement('x><script')).toThrow('invalid XML element name');
	});

	it('rejects an attribute name that is not an XML name', () => {
		expect(() =>
			new Score().setAttribute('x><script>alert(1)</script><y', 'v'),
		).toThrow('invalid XML attribute name');
	});

	it('accepts namespaced and non-ASCII names', () => {
		const element = new MElement('été');
		element.setAttribute('xml:lang', 'fr');

		expect(serializer.serializeToString(new MDocument(element))).toBe(
			'<été xml:lang="fr"/>',
		);
	});

	it('refuses to serialize a character XML cannot represent', () => {
		const score = new Score();
		score.append(new MText('bell\u0007'));

		expect(() => serializer.serializeToString(new MDocument(score))).toThrow(
			'U+0007 cannot be represented in XML',
		);
	});

	it('rejects a doctype that would break out of its declaration', () => {
		expect(
			() => new MDocument(new Score(), null, 'html><script>alert(1)</script'),
		).toThrow('unsupported doctype');
	});

	it('rejects a doctype with an internal subset', () => {
		expect(
			() =>
				new MDocument(new Score(), null, 'score-partwise [<!ENTITY e "x">]'),
		).toThrow('unsupported doctype');
	});

	it('drops an internal subset when parsing', () => {
		const doc = parser.parseFromString(
			'<!DOCTYPE score-partwise [<!ELEMENT score-partwise ANY>]><score-partwise/>',
		);

		expect(doc.doctype).toBeNull();
	});

	it('rejects an XML declaration value that could hold markup', () => {
		expect(
			() => new MDocument(new Score(), { version: '1.0"?><script>' }),
		).toThrow('invalid XML declaration');
	});

	it('rejects an unknown XML declaration attribute', () => {
		expect(
			() => new MDocument(new Score(), { version: '1.0', onload: 'x' }),
		).toThrow('invalid XML declaration');
	});
});

/** Deterministic strings stitched from pieces that break naive escaping. */
function hostileStrings(count: number): string[] {
	const pieces = [
		'<',
		'>',
		'&',
		'"',
		"'",
		']]>',
		']]',
		'&amp;',
		'&lt;',
		'&#60;',
		'<script>alert(1)</script>',
		'<!--',
		'-->',
		'<![CDATA[',
		'\t',
		'\n',
		'\r\n',
		' ',
		'a',
		'é',
		'\u{1F3B5}',
		'\uFFFD',
	];
	let seed = 1;
	const next = (bound: number): number => {
		seed = (seed * 1103515245 + 12345) % 2147483648;
		return seed % bound;
	};
	return Array.from({ length: count }, () => {
		const parts = Array.from(
			{ length: 1 + next(8) },
			() => pieces[next(pieces.length)],
		);
		// A leading letter keeps the parser from dropping whitespace-only text.
		return `x${parts.join('')}`;
	});
}
