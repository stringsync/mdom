import { MElement } from './m-node';
import { insertMetadata } from './score-metadata';

/**
 * A `<staff-layout>`: the vertical gap above one staff of a part, from the
 * bottom line of the staff above it, in tenths. In `<defaults>` it applies to
 * every system of every part; in a measure's `<print>` it overrides the system
 * starting there. MusicXML ignores it for the first staff of a system.
 */
export class StaffLayout extends MElement {
	constructor() {
		super('staff-layout');
	}

	/** The `number` attribute: which staff of the part, top first; `'1'` when absent. */
	get staff(): string {
		return this.getAttribute('number') ?? '1';
	}

	/** `<staff-distance>` in tenths; null when unset, which leaves it to the defaults or the application. */
	get distance(): number | null {
		const text = this.child('staff-distance')?.text;
		return text == null ? null : Number(text);
	}

	/** Set `<staff-distance>` in tenths, or remove it with null. */
	setDistance(tenths: number | null): void {
		if (tenths === null) {
			this.child('staff-distance')?.remove();
			return;
		}
		let element = this.child('staff-distance');
		if (!element) {
			element = new MElement('staff-distance');
			this.append(element);
		}
		element.setText(String(tenths));
	}
}

/** The `<staff-layout>` for `staff` among `parent`'s children; a numberless one is staff 1. */
export function staffLayoutIn(
	parent: MElement | null | undefined,
	staff: string,
): StaffLayout | null {
	return (
		parent?.childrenOfType(StaffLayout).find((each) => each.staff === staff) ??
		null
	);
}

/**
 * Get or create the `<staff-layout>` for `staff` in `parent`, keeping the
 * parent's schema `order` and the layouts sorted by staff number. `number` is
 * written only when `staff` is given, as with clefs.
 */
export function getOrCreateStaffLayoutIn(
	parent: MElement,
	staff: string | undefined,
	order: readonly string[],
): StaffLayout {
	const existing = staffLayoutIn(parent, staff ?? '1');
	if (existing) {
		return existing;
	}
	const layout = new StaffLayout();
	if (staff !== undefined) {
		layout.setAttribute('number', staff);
	}
	const after = parent
		.childrenOfType(StaffLayout)
		.find((each) => Number(each.staff) > Number(staff ?? '1'));
	if (after) {
		parent.insertBefore(layout, after);
	} else {
		insertMetadata(parent, layout, order);
	}
	return layout;
}
