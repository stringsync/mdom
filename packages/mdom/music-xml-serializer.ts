import type { MDocument } from './m-document';
import { MCData, MElement, type MNode, MText } from './m-node';
import {
	escapeXmlAttribute,
	escapeXmlCData,
	escapeXmlText,
} from './xml-syntax';

const INDENT = '  ';

/**
 * Serializes an {@link MDocument} back to a MusicXML string. The output is
 * always well-formed XML whose structure matches the tree exactly: every text,
 * attribute, and CDATA value is escaped, so no string held in the document can
 * become markup. Throws if a value holds a character XML cannot represent.
 */
export class MusicXMLSerializer {
	serializeToString(doc: MDocument): string {
		const lines: string[] = [];
		if (doc.declaration) {
			lines.push(`<?xml${this.attributes(doc.declaration)}?>`);
		}
		if (doc.doctype) {
			lines.push(`<!DOCTYPE ${doc.doctype}>`);
		}
		lines.push(this.element(doc.root, 0));
		return lines.join('\n');
	}

	private element(element: MElement, depth: number): string {
		const open = `<${element.tag}${this.attributes(element.attributes)}`;
		const children = element.children;
		if (
			children.length === 0 &&
			element.getAttribute('xml:space') !== 'preserve'
		) {
			return `${open}/>`;
		}
		// Indentation is whitespace a parser reads back as text, so it is only
		// added between child elements, never beside text or CDATA.
		const indented = children.every((child) => child instanceof MElement);
		const body = children
			.map((child) => this.child(child, depth + 1, indented))
			.join('');
		const close = indented ? `\n${INDENT.repeat(depth)}` : '';
		return `${open}>${body}${close}</${element.tag}>`;
	}

	private child(node: MNode, depth: number, indented: boolean): string {
		if (node instanceof MText) {
			return escapeXmlText(node.value);
		}
		if (node instanceof MCData) {
			return escapeXmlCData(node.value);
		}
		const element = this.element(node as MElement, depth);
		return indented ? `\n${INDENT.repeat(depth)}${element}` : element;
	}

	private attributes(attributes: Readonly<Record<string, string>>): string {
		return Object.entries(attributes)
			.map(([name, value]) => ` ${name}="${escapeXmlAttribute(value)}"`)
			.join('');
	}
}
