import { describe, expect, it } from 'bun:test';
import { MDOMParser, MDocument, MusicXMLSerializer, Score } from './index';
import { schemaErrors } from './music-xml-schema';

const roundTrip = (doc: MDocument) =>
	new MDOMParser().parseFromString(
		new MusicXMLSerializer().serializeToString(doc),
	);

describe('score metadata', () => {
	it('preserves absent values and does not mutate on reads or removals', () => {
		const score = new Score();
		expect(score.version).toBeNull();
		expect(score.workNumber).toBeNull();
		expect(score.workTitle).toBeNull();
		expect(score.movementNumber).toBeNull();
		expect(score.movementTitle).toBeNull();
		expect(score.encoding).toBeNull();
		expect(score.creators).toEqual([]);
		expect(score.rights).toEqual([]);
		expect(score.relations).toEqual([]);
		expect(score.miscellaneous).toEqual([]);
		expect(score.credits).toEqual([]);
		score.setSource(null);
		score.setWorkNumber(null);
		score.setMovementTitle(null);
		score.setEncoding(null);
		expect(score.children).toEqual([]);
	});

	it('writes repeated metadata in schema order after parts already exist', () => {
		const doc = MDocument.empty();
		const score = doc.score;
		const part = score.addPart({ name: 'Guitar' });
		part.addMeasure();
		score.addMiscellaneousField('catalog', 'A&B');
		score.addMiscellaneousField('catalog', 'second');
		score.addRelation({ text: 'Original', type: 'arrangement' });
		score.setSource('Archive');
		score.setEncoding({
			date: '2026-10-26',
			encoders: [{ text: 'Jane', type: 'music' }, { text: 'Joe' }],
			software: ['Exporter', 'Plugin'],
			descriptions: ['Scanned', 'Corrected'],
			supports: [
				{
					type: 'yes',
					element: 'print',
					attribute: 'new-system',
					value: 'yes',
				},
				{ type: 'no', element: 'beam' },
			],
		});
		score.addRights({ text: 'Copyright', type: 'music' });
		score.addRights({ text: 'Words notice' });
		score.addCreator({ text: 'Composer', type: 'composer' });
		score.addCreator({ text: 'Poet', type: 'lyricist' });
		score.addCreator({ text: 'Editor', type: 'custom-role' });
		score.setMovementTitle('Allegro');
		score.setMovementNumber('II');
		score.setWorkTitle('Sonata');
		score.setWorkNumber('Op. 1');
		score.setVersion('4.0');
		score.addCredit({
			types: ['title', 'subtitle'],
			page: 2,
			words: [
				{
					text: 'Sonata & study',
					format: {
						dir: 'ltr',
						'font-size': '24',
						justify: 'center',
						'default-x': '100',
						'default-y': '900',
					},
				},
				{
					text: 'for guitar',
					format: { 'font-style': 'italic', 'xml:lang': 'en' },
				},
			],
		});
		score.addCredit({ words: [{ text: 'Composer' }] });
		// Creating defaults after credits must still respect header order.
		score.getOrCreateSystemLayout();
		part.setAbbreviationDisplay({
			printObject: 'no',
			runs: [
				{
					kind: 'display-text',
					text: 'Gtr.',
					format: { 'font-weight': 'bold' },
				},
			],
		});
		part.setAbbreviation('Gtr.');
		part.setNameDisplay({
			runs: [
				{
					kind: 'display-text',
					text: 'Guitar',
					format: { 'font-style': 'italic' },
				},
				{ kind: 'accidental-text', text: 'flat' },
			],
		});
		part.setLabel('Classical Guitar');
		expect(schemaErrors(doc)).toEqual([]);
		const restored = roundTrip(doc).score;
		expect(restored.version).toBe('4.0');
		expect(restored.title).toBe('Allegro');
		expect(restored.workTitle).toBe('Sonata');
		expect(restored.workNumber).toBe('Op. 1');
		expect(restored.movementNumber).toBe('II');
		expect(restored.creators).toEqual(score.creators);
		expect(restored.creators.map((value) => value.type)).toEqual([
			'composer',
			'lyricist',
			'custom-role',
		]);
		expect(restored.rights).toEqual(score.rights);
		expect(restored.relations).toEqual(score.relations);
		expect(restored.source).toBe('Archive');
		expect(restored.encoding).toEqual(score.encoding);
		expect(restored.miscellaneous).toEqual(score.miscellaneous);
		expect(restored.credits).toEqual(score.credits);
		expect(restored.credits[1]?.page).toBeNull();
		expect(restored.parts[0]?.nameDisplay).toEqual(part.nameDisplay);
		expect(restored.parts[0]?.abbreviationDisplay).toEqual(
			part.abbreviationDisplay,
		);
		expect(restored.parts[0]?.abbreviation).toBe('Gtr.');
		expect(restored.parts[0]?.label).toBe('Classical Guitar');
	});

	it('reads repeated dates and empty metadata without synthesizing defaults', () => {
		const doc = new MDOMParser().parseFromString(
			'<score-partwise><identification><creator/><encoding><encoding-date>2008-02-06</encoding-date><encoding-date>2025-07-26</encoding-date><encoder/></encoding><miscellaneous><miscellaneous-field name="empty"/></miscellaneous></identification><credit><credit-words/></credit></score-partwise>',
		);
		expect(doc.score.creators).toEqual([{ text: null, type: null }]);
		expect(doc.score.encoding?.date).toBe('2008-02-06');
		expect(doc.score.encoding?.dates).toEqual(['2008-02-06', '2025-07-26']);
		expect(doc.score.encoding?.encoders).toEqual([{ text: null, type: null }]);
		expect(doc.score.miscellaneous).toEqual([{ name: 'empty', text: null }]);
		expect(doc.score.credits).toEqual([
			{ page: null, types: [], words: [{ text: null, format: {} }] },
		]);
		expect(roundTrip(doc).score.encoding).toEqual(doc.score.encoding);
	});

	it('patches encoding without deleting other fields or unknown XML', () => {
		const doc = new MDOMParser().parseFromString(
			`<score-partwise version="3.1"><work><work-title>Work</work-title><opus href="collection.xml"/></work><identification><creator type="composer" custom="kept">Name</creator><encoding><software>Old</software><encoder>Encoder</encoder><supports type="no" element="beam"/><future foo="bar"/></encoding></identification><credit><credit-type>title</credit-type><credit-symbol font-family="Bravura">segno</credit-symbol><credit-words font-size="12">Text</credit-words></credit><part-list><score-part id="P1"><part-name>Part</part-name></score-part></part-list><part id="P1"><measure number="1"/></part></score-partwise>`,
		);
		const score = doc.score;
		expect(score.version).toBe('3.1');
		score.setEncoding({ software: ['New'], descriptions: [] });
		score.setWorkNumber('1');
		score.addCreator({ text: 'Another' });
		expect(score.encoding?.encoders).toEqual([{ text: 'Encoder', type: null }]);
		expect(score.encoding?.supports[0]?.type).toBe('no');
		expect(score.title).toBe('Work');
		const xml = new MusicXMLSerializer().serializeToString(roundTrip(doc));
		expect(xml).toContain('<future foo="bar"/>');
		expect(xml).toContain('custom="kept"');
		expect(xml).toContain('<opus href="collection.xml"/>');
		expect(xml).toContain(
			'<credit-symbol font-family="Bravura">segno</credit-symbol>',
		);
		expect(score.credits[0]?.words[0]?.format['font-size']).toBe('12');
	});

	it('removes optional fields and rejects unsupported writer versions and pages', () => {
		const doc = MDocument.empty();
		const score = doc.score;
		const part = score.addPart();
		part.addMeasure();
		score.setWorkTitle('Title');
		score.setWorkNumber('1');
		score.setWorkNumber(null);
		score.setMovementNumber('1');
		score.setMovementNumber(null);
		score.setSource('Source');
		score.setSource(null);
		score.setEncoding({ software: ['App'] });
		score.setEncoding(null);
		part.setAbbreviation('P.');
		part.setAbbreviation(null);
		part.setNameDisplay({ runs: [] });
		part.setNameDisplay(null);
		part.setAbbreviationDisplay({ runs: [] });
		part.setAbbreviationDisplay(null);
		score.setVersion(null);
		expect(score.version).toBeNull();
		expect(score.workNumber).toBeNull();
		expect(score.title).toBe('Title');
		expect(part.nameDisplay).toBeNull();
		expect(part.abbreviationDisplay).toBeNull();
		expect(part.abbreviation).toBeNull();
		expect(score.encoding).toBeNull();
		// Runtime checks protect untyped JavaScript callers too.
		// @ts-expect-error unsupported version
		expect(() => score.setVersion('9.0')).toThrow();
		for (const page of [0, -1, 1.5, Number.NaN]) {
			expect(() =>
				score.addCredit({ page, words: [{ text: 'Title' }] }),
			).toThrow();
		}
		expect(schemaErrors(doc)).toEqual([]);
	});
});
