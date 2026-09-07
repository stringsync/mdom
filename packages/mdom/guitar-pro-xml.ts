import { MCData, MElement, MText, required } from './m-node';
import { appendValue } from './measure';

/** GPIF uses document-local table IDs, independent of XML element order. */
export class GuitarProXml {
	private readonly tables = new Map<string, Map<string, MElement>>();
	constructor(readonly root: MElement) {
		this.normalizeText(root);
		if (root.tag !== 'GPIF') {
			throw new Error('Expected a GPIF root');
		}
		for (const [table, tag] of Object.entries({
			Tracks: 'Track',
			Bars: 'Bar',
			Voices: 'Voice',
			Beats: 'Beat',
			Notes: 'Note',
			Rhythms: 'Rhythm',
		})) {
			const entries = new Map<string, MElement>();
			for (const node of required(
				root.child(table),
				`GPIF ${table}`,
			).childrenNamed(tag)) {
				const id = required(node.getAttribute('id'), `GPIF ${tag} id`);
				if (entries.has(id)) {
					throw new Error(`Duplicate GPIF ${tag} id: ${id}`);
				}
				entries.set(id, node);
			}
			this.tables.set(table, entries);
		}
	}
	private normalizeText(node: MElement): void {
		const text = node.children.filter(
			(child): child is MText | MCData =>
				child instanceof MText || child instanceof MCData,
		);
		if (text.length) {
			node.insertBefore(
				new MText(text.map((child) => child.value).join('')),
				text[0]!,
			);
			for (const child of text) {
				child.remove();
			}
		}
		for (const child of node.childrenOfType(MElement)) {
			this.normalizeText(child);
		}
	}

	get(table: string, id: string): MElement {
		return required(
			this.tables.get(table)?.get(id),
			`GPIF ${table} reference ${id}`,
		);
	}
	static refs(node: MElement | null | undefined): string[] {
		return node?.text?.trim().split(/\s+/).filter(Boolean) ?? [];
	}
	static property(node: MElement, name: string): MElement | undefined {
		return node
			.child('Properties')
			?.childrenNamed('Property')
			.find((p) => p.getAttribute('name') === name);
	}
	static add(
		parent: MElement,
		tag: string,
		value?: string | number,
		attrs: Record<string, string> = {},
	): MElement {
		const node =
			value == null
				? new MElement(tag)
				: appendValue(parent, tag, String(value));
		if (!node.parent) {
			parent.append(node);
		}
		for (const [key, val] of Object.entries(attrs)) {
			node.setAttribute(key, val);
		}
		return node;
	}
	static addProperty(
		node: MElement,
		name: string,
		tag: string,
		value: string | number,
	): MElement {
		const props =
			node.child('Properties') ?? GuitarProXml.add(node, 'Properties');
		const prop = GuitarProXml.add(props, 'Property', undefined, { name });
		GuitarProXml.add(prop, tag, value);
		return prop;
	}
}
