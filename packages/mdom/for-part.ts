import { MElement } from "./m-element";
import { required } from "./m-node";
import { PartClef, type PartClefSpec } from "./part-clef";
import { PartTranspose } from "./part-transpose";
import { insertMetadata, setMetadataText } from "./score-metadata";
import type { TransposeSpec } from "./transpose-group";

/**
 * A `<for-part>` inside `<attributes>` of a concert score: how a transposed part
 * created from it is to be written. The concert score itself stays at sounding
 * pitch; this only declares the alternate. A numberless one applies to every
 * staff of the created part.
 */
export class ForPart extends MElement {
	constructor() {
		super("for-part");
	}

	/** The staff this applies to; null when numberless, which means every staff. */
	get staff(): string | null {
		return this.getAttribute("number");
	}

	/** `<part-clef>`; null when the created part keeps the score's clef. */
	get partClef(): PartClef | null {
		return this.childrenOfType(PartClef)[0] ?? null;
	}

	/** Set `<part-clef>`, or remove it with null. */
	setPartClef(spec: PartClefSpec | null): PartClef | null {
		this.partClef?.remove();
		if (spec === null) {
			return null;
		}
		const clef = new PartClef();
		setMetadataText(clef, "sign", spec.sign, CLEF_ORDER);
		if (spec.line != null) {
			setMetadataText(clef, "line", String(spec.line), CLEF_ORDER);
		}
		if (spec.octaveChange != null) {
			setMetadataText(
				clef,
				"clef-octave-change",
				String(spec.octaveChange),
				CLEF_ORDER,
			);
		}
		insertMetadata(this, clef, FOR_PART_ORDER);
		return clef;
	}

	/** `<part-transpose>`. Required by the schema. */
	get partTranspose(): PartTranspose {
		return required(
			this.childrenOfType(PartTranspose)[0],
			"<part-transpose> in <for-part>",
		);
	}

	/** Set `<part-transpose>`, replacing any earlier one. */
	setPartTranspose(spec: TransposeSpec): PartTranspose {
		let transpose = this.childrenOfType(PartTranspose)[0];
		if (!transpose) {
			transpose = new PartTranspose();
			insertMetadata(this, transpose, FOR_PART_ORDER);
		}
		transpose.setTransposition(spec);
		return transpose;
	}
}

/** A `<for-part>` element built from `spec`, detached. */
export function buildForPart(spec: ForPartSpec, staff?: string): ForPart {
	const forPart = new ForPart();
	if (staff != null) {
		forPart.setAttribute("number", staff);
	}
	if (spec.clef) {
		forPart.setPartClef(spec.clef);
	}
	forPart.setPartTranspose(spec.transpose);
	return forPart;
}

/** What a `<for-part>` declares: the created part's transposition and clef. */
export interface ForPartSpec {
	/** The created part's clef, when it changes (a bass clarinet's treble clef). */
	clef?: PartClefSpec;
	transpose: TransposeSpec;
}

/** Canonical child order of the MusicXML clef group, as `<part-clef>` uses it. */
const CLEF_ORDER = ["sign", "line", "clef-octave-change"];

/** Canonical child order of `<for-part>`. */
const FOR_PART_ORDER = ["part-clef", "part-transpose"];
