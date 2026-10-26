import { MElement, required } from './m-node';
import { PageLayout } from './page-layout';
import { insertMetadata } from './score-metadata';
import { SystemLayout } from './system-layout';

/** Canonical child order of the MusicXML `<print>` sequence. */
const ORDER = [
	'page-layout',
	'system-layout',
	'staff-layout',
	'measure-layout',
	'measure-numbering',
	'part-name-display',
	'part-abbreviation-display',
];

/** Which systems show measure numbers in multi-part music (`system` attribute). */
export type SystemRelation =
	| 'only-top'
	| 'only-bottom'
	| 'also-top'
	| 'also-bottom'
	| 'none';

/**
 * A `<measure-numbering>`: how often measure numbers show from here on
 * (`none`, every `measure`, or once per `system`), and its scope. `system` and
 * `staff` are null when absent (MusicXML then leaves the systems to the
 * application and uses staff 1).
 */
export interface MeasureNumbering {
	value: 'none' | 'measure' | 'system';
	system: SystemRelation | null;
	staff: number | null;
	multipleRestAlways: 'yes' | 'no' | null;
	multipleRestRange: 'yes' | 'no' | null;
}

/** What `setMeasureNumbering` writes; an omitted field is left as is, null removes it. */
export interface MeasureNumberingSpec {
	value: 'none' | 'measure' | 'system';
	system?: SystemRelation | null;
	staff?: number | null;
	multipleRestAlways?: 'yes' | 'no' | null;
	multipleRestRange?: 'yes' | 'no' | null;
}

const NUMBERING_VALUES = new Set(['none', 'measure', 'system']);
const SYSTEM_RELATIONS = new Set([
	'only-top',
	'only-bottom',
	'also-top',
	'also-bottom',
	'none',
]);

function yesNo(value: string | null): 'yes' | 'no' | null {
	return value === 'yes' || value === 'no' ? value : null;
}

/**
 * A `<print>`: layout instructions for the measure it leads. Carries the
 * system/page break flags, the page number and blank pages of a new page,
 * `<page-layout>` and `<system-layout>` overrides for the page and system
 * starting here, and `<measure-numbering>`. Other layout children (staff-layout,
 * measure-layout, part-name-display) are left as plain elements and still
 * round-trip. Writers keep the schema's child order.
 */
export class Print extends MElement {
	constructor() {
		super('print');
	}

	/**
	 * `new-system` as MusicXML writes it: 'yes', 'no', or null when the attribute
	 * is absent. The three are distinct instructions — `"no"` is a positive
	 * statement ("the document laid this line out; this measure stays on its
	 * line"), which silence is not. {@link newSystem} collapses it to a boolean for
	 * the common "does a break start here" question.
	 */
	get systemBreak(): 'yes' | 'no' | null {
		const value = this.getAttribute('new-system');
		return value === 'yes' || value === 'no' ? value : null;
	}

	/** `new-page`, with the same three states as {@link systemBreak}. */
	get pageBreak(): 'yes' | 'no' | null {
		const value = this.getAttribute('new-page');
		return value === 'yes' || value === 'no' ? value : null;
	}

	/** Whether this measure starts a new system (`new-system="yes"`). */
	get newSystem(): boolean {
		return this.getAttribute('new-system') === 'yes';
	}

	set newSystem(value: boolean) {
		this.setAttribute('new-system', value ? 'yes' : 'no');
	}

	/** Whether this measure starts a new page (`new-page="yes"`). */
	get newPage(): boolean {
		return this.getAttribute('new-page') === 'yes';
	}

	set newPage(value: boolean) {
		this.setAttribute('new-page', value ? 'yes' : 'no');
	}

	/**
	 * `page-number`: the number printed on the new page (a token, so `"iv"` is
	 * allowed); null when absent. MusicXML ignores it unless `new-page="yes"`.
	 */
	get pageNumber(): string | null {
		return this.getAttribute('page-number');
	}

	/** Set the new page's number, or remove it with null. Setting one also starts a new page. */
	setPageNumber(value: string | null): void {
		if (value === null) {
			this.removeAttribute('page-number');
			return;
		}
		this.newPage = true;
		this.setAttribute('page-number', value);
	}

	/**
	 * `blank-page`: how many blank pages (for credits only) come before this
	 * measure; 0 when absent. MusicXML ignores it unless `new-page="yes"`.
	 */
	get blankPage(): number {
		return Number(this.getAttribute('blank-page') ?? 0);
	}

	/** Insert `count` blank pages before this measure, which also starts a new page; 0 removes them. */
	setBlankPage(count: number): void {
		if (!Number.isSafeInteger(count) || count < 0) {
			throw new Error('Blank page count must be a non-negative integer');
		}
		if (count === 0) {
			this.removeAttribute('blank-page');
			return;
		}
		this.newPage = true;
		this.setAttribute('blank-page', String(count));
	}

	/** The `<page-layout>` override for the page starting here; null when unset. */
	get pageLayout(): PageLayout | null {
		return this.childrenOfType(PageLayout)[0] ?? null;
	}

	/** Get or create the `<page-layout>` override, placed first. */
	getOrCreatePageLayout(): PageLayout {
		const existing = this.pageLayout;
		if (existing) {
			return existing;
		}
		const layout = new PageLayout();
		insertMetadata(this, layout, ORDER);
		return layout;
	}

	/** The `<measure-numbering>` change starting here; null when unset. */
	get measureNumbering(): MeasureNumbering | null {
		const node = this.child('measure-numbering');
		if (!node) {
			return null;
		}
		const value = node.text?.trim() ?? null;
		const system = node.getAttribute('system');
		const staff = node.getAttribute('staff');
		return {
			value: required(
				value !== null && NUMBERING_VALUES.has(value)
					? (value as MeasureNumbering['value'])
					: null,
				'measure-numbering value',
			),
			system:
				system !== null && SYSTEM_RELATIONS.has(system)
					? (system as SystemRelation)
					: null,
			staff: staff === null ? null : Number(staff),
			multipleRestAlways: yesNo(node.getAttribute('multiple-rest-always')),
			multipleRestRange: yesNo(node.getAttribute('multiple-rest-range')),
		};
	}

	/**
	 * Set measure numbering from here on, or remove it with null. Patches an
	 * existing element, so formatting attributes it carries are kept.
	 */
	setMeasureNumbering(spec: MeasureNumberingSpec | null): void {
		let node = this.child('measure-numbering');
		if (spec === null) {
			node?.remove();
			return;
		}
		if (!node) {
			node = new MElement('measure-numbering');
			insertMetadata(this, node, ORDER);
		}
		node.setText(spec.value);
		const attributes = {
			system: spec.system,
			staff: spec.staff,
			'multiple-rest-always': spec.multipleRestAlways,
			'multiple-rest-range': spec.multipleRestRange,
		};
		for (const [name, value] of Object.entries(attributes)) {
			if (value === null) {
				node.removeAttribute(name);
			} else if (value !== undefined) {
				node.setAttribute(name, String(value));
			}
		}
	}

	/** The `<system-layout>` override for the system starting here; null when unset. */
	get systemLayout(): SystemLayout | null {
		return this.childrenOfType(SystemLayout)[0] ?? null;
	}

	/** Get or create the `<system-layout>` override, placed right after `<page-layout>`. */
	getOrCreateSystemLayout(): SystemLayout {
		const existing = this.systemLayout;
		if (existing) {
			return existing;
		}
		const layout = new SystemLayout();
		insertMetadata(this, layout, ORDER);
		return layout;
	}
}
