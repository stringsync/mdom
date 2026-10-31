import { TransposeGroup } from "./transpose-group";

/**
 * A `<part-transpose>` inside `<for-part>`: the transposition a transposed part
 * created from a concert score would use. Same fields as {@link Transpose}.
 */
export class PartTranspose extends TransposeGroup {
	constructor() {
		super("part-transpose");
	}
}
