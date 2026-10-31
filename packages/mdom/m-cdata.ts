import { MMutation } from "./m-mutation";
import { MNode } from "./m-node";

/**
 * A `<![CDATA[…]]>` section, preserved verbatim so documents round-trip. Kept
 * distinct from {@link MText} because the content is emitted unescaped, it
 * doesn't feed the `text` accessor, which reads ordinary value elements.
 */
export class MCData extends MNode {
	constructor(private _value: string) {
		super();
	}

	get value(): string {
		return this._value;
	}
	set value(value: string) {
		MMutation.set(this, "value", this._value, value, (next) => {
			this._value = next;
		});
	}
}
