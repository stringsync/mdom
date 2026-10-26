import { MElement } from './m-node';

/** Which pages a `<page-margins>` applies to. */
export type MarginType = 'odd' | 'even' | 'both';

/**
 * One `<page-margins>`, in tenths. `type` is null when the attribute is absent
 * (MusicXML then means "both" in `<defaults>`, and the current page in a
 * `<print>`). A side is null when the file left it out — the schema requires all
 * four, but real exports do drop them, and a missing side is not a zero.
 */
export interface PageMargins {
	type: MarginType | null;
	left: number | null;
	right: number | null;
	top: number | null;
	bottom: number | null;
}

/** The four sides `setMargins` writes, in tenths; the schema requires them all. */
export interface PageMarginsSpec {
	left: number;
	right: number;
	top: number;
	bottom: number;
}

const SIDES = ['left', 'right', 'top', 'bottom'] as const;

function tenths(text: string | null | undefined): number | null {
	return text == null ? null : Number(text);
}

function marginType(node: MElement): MarginType | null {
	const type = node.getAttribute('type');
	return type === 'odd' || type === 'even' || type === 'both' ? type : null;
}

/**
 * A `<page-layout>`: page size and margins, all in tenths (convert with the
 * score's `scaling`). In `<defaults>` it is the score-wide page; in a measure's
 * `<print>` it overrides the page starting there, and any value it leaves out
 * falls back to the defaults. Setters keep the schema's child order (size, then
 * up to two margin blocks) so the result stays valid.
 */
export class PageLayout extends MElement {
	constructor() {
		super('page-layout');
	}

	/** `<page-height>` in tenths; null when unset. */
	get height(): number | null {
		return tenths(this.child('page-height')?.text);
	}

	/** `<page-width>` in tenths; null when unset. */
	get width(): number | null {
		return tenths(this.child('page-width')?.text);
	}

	/**
	 * Set the page size in tenths, or remove it with null. Height and width are
	 * written together because the schema only allows the pair.
	 */
	setSize(size: { height: number; width: number } | null): void {
		this.child('page-height')?.remove();
		this.child('page-width')?.remove();
		if (size === null) {
			return;
		}
		const first = this.children[0] ?? null;
		for (const [tag, value] of [
			['page-height', size.height],
			['page-width', size.width],
		] as const) {
			const element = new MElement(tag);
			element.setText(String(value));
			this.insertBefore(element, first);
		}
	}

	/** Every `<page-margins>` block as written, in document order. */
	get margins(): PageMargins[] {
		return this.childrenNamed('page-margins').map((node) => ({
			type: marginType(node),
			left: tenths(node.child('left-margin')?.text),
			right: tenths(node.child('right-margin')?.text),
			top: tenths(node.child('top-margin')?.text),
			bottom: tenths(node.child('bottom-margin')?.text),
		}));
	}

	/**
	 * The margins that apply to an odd or even page: the block of that type, else
	 * a `both` or untyped block. Null when neither is present.
	 */
	getMargins(page: 'odd' | 'even'): PageMargins | null {
		const margins = this.margins;
		return (
			margins.find((each) => each.type === page) ??
			margins.find((each) => each.type === 'both' || each.type === null) ??
			null
		);
	}

	/**
	 * Set the margins for `type` pages, or remove that type's block with null.
	 * Setting `both` replaces every block. Setting `odd` or `even` where one shared block exists
	 * splits it: the shared block is retyped to the other parity so those pages
	 * keep their margins.
	 */
	setMargins(type: MarginType, margins: PageMarginsSpec | null): void {
		const blocks = this.childrenNamed('page-margins');
		if (type === 'both') {
			for (const block of blocks) {
				block.remove();
			}
		} else {
			const other = type === 'odd' ? 'even' : 'odd';
			const hasOther = blocks.some((block) => marginType(block) === other);
			for (const block of blocks) {
				const existing = marginType(block);
				if (existing === type) {
					block.remove();
				} else if (existing !== other && margins !== null) {
					if (hasOther) {
						block.remove();
					} else {
						block.setAttribute('type', other);
					}
				}
			}
		}
		if (margins === null) {
			return;
		}
		const block = new MElement('page-margins');
		block.setAttribute('type', type);
		for (const side of SIDES) {
			const element = new MElement(`${side}-margin`);
			element.setText(String(margins[side]));
			block.append(element);
		}
		this.append(block);
	}
}
