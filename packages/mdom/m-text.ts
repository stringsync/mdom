import { MMutation } from "./m-mutation";
import { MNode } from "./m-node";

/** A text node, the leaf content held by value elements. */
export class MText extends MNode {
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
