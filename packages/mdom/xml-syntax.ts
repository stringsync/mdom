/**
 * The XML 1.0 `Name` production. Tag and attribute names are checked against it
 * so that no name can carry markup (`>`, `=`, quotes, whitespace) into output.
 */
const NAME =
	// biome-ignore lint/suspicious/noMisleadingCharacterClass: the spec's NameChar ranges include combining marks, matched one code point at a time
	/^[:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\u{10000}-\u{EFFFF}][:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\u{10000}-\u{EFFFF}\-.0-9\u00B7\u0300-\u036F\u203F-\u2040]*$/u;

/** Characters XML 1.0 cannot represent at all, not even as a character reference. */
const ILLEGAL_CHAR = /[^\t\n\r\u0020-\uD7FF\uE000-\uFFFD\u{10000}-\u{10FFFF}]/u;

/**
 * An external-ID-only doctype: `root`, `root SYSTEM "uri"`, or
 * `root PUBLIC "id" "uri"`. Internal subsets are excluded (mdom never applies
 * them), and literals may not hold `<` or `>`, which an HTML parser would treat
 * as the end of the doctype.
 */
const DOCTYPE = new RegExp(
	`^${NAME.source.slice(1, -1)}(?:\\s+(?:SYSTEM\\s+${literal()}|PUBLIC\\s+${literal()}\\s+${literal()}))?$`,
	'u',
);

/** The XML declaration's pseudo-attributes and the values each may take. */
const DECLARATION: Record<string, RegExp> = {
	version: /^1\.[0-9]+$/,
	encoding: /^[A-Za-z][A-Za-z0-9._-]*$/,
	standalone: /^(?:yes|no)$/,
};

/** Throws unless `name` is a valid XML element or attribute name. */
export function assertXmlName(name: string, what: string): void {
	if (!NAME.test(name)) {
		throw new Error(`mdom: invalid XML ${what} name: ${JSON.stringify(name)}`);
	}
}

/** Escapes character data so it can only ever read back as text. */
export function escapeXmlText(value: string): string {
	assertXmlChars(value);
	// \r is escaped because parsers fold a literal CR into \n on read.
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/\r/g, '&#13;');
}

/** Escapes a value for a double-quoted attribute, whitespace included. */
export function escapeXmlAttribute(value: string): string {
	// Literal tabs and newlines in attributes are normalized to spaces on read,
	// so they go out as character references to survive a round trip.
	return escapeXmlText(value)
		.replace(/"/g, '&quot;')
		.replace(/\t/g, '&#9;')
		.replace(/\n/g, '&#10;');
}

/**
 * Wraps `value` in CDATA sections. Every `]]>` is split across two sections,
 * since a CDATA section has no escape and `]]>` would otherwise end it.
 */
export function escapeXmlCData(value: string): string {
	assertXmlChars(value);
	return `<![CDATA[${value.replace(/]]>/g, ']]]]><![CDATA[>')}]]>`;
}

/** Whether `doctype` is a doctype body mdom can write back safely. */
export function isSafeDoctype(doctype: string): boolean {
	return DOCTYPE.test(doctype);
}

/** Throws unless `declaration` holds only valid XML declaration values. */
export function assertXmlDeclaration(
	declaration: Readonly<Record<string, string>>,
): void {
	for (const [name, value] of Object.entries(declaration)) {
		if (!DECLARATION[name]?.test(value)) {
			throw new Error(
				`mdom: invalid XML declaration ${name}=${JSON.stringify(value)}`,
			);
		}
	}
}

function literal(): string {
	return `(?:"[^"<>]*"|'[^'<>]*')`;
}

function assertXmlChars(value: string): void {
	const match = ILLEGAL_CHAR.exec(value);
	if (match) {
		const code = match[0].codePointAt(0)?.toString(16).toUpperCase();
		throw new Error(
			`mdom: U+${code?.padStart(4, '0')} cannot be represented in XML`,
		);
	}
}
