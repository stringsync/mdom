import { describe, expect, it } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";
import {
	GuitarProParser,
	GuitarProSerializer,
	MDOMParser,
} from "@stringsync/mdom";

// The Guitar Pro coverage scoreboard: every Guitar Pro fixture imported and every
// MusicXML file in the corpus exported, with each feature `unsupported: 'omit'`
// drops and any error that still stops the conversion. The snapshot is the
// scoreboard, so a coverage task shows up as its rows turning `ok`; refresh it
// with `mdom test -u` once a change makes a row go green.

describe("Guitar Pro coverage scoreboard", () => {
	it("imports every Guitar Pro fixture", async () => {
		const files = fs
			.readdirSync(fixtures)
			.filter((name) => /\.(gp|gp[3-5]|gpx)$/.test(name))
			.sort();
		const rows: Row[] = await Promise.all(
			files.map((file) => {
				const bytes = new Uint8Array(
					fs.readFileSync(path.join(fixtures, file)),
				);
				return convert(file, (onUnsupported) =>
					new GuitarProParser().parseFromBytes(bytes, {
						unsupported: "omit",
						onUnsupported,
					}),
				);
			}),
		);

		expect(table("Import", rows)).toMatchSnapshot();
	});

	it("exports every MusicXML file in the corpus", async () => {
		const rows: Row[] = await Promise.all(
			musicXmlFiles(examples).map((file) => {
				const xml = fs.readFileSync(path.join(examples, file), "utf-8");
				return convert(file, (onUnsupported) =>
					new GuitarProSerializer().serializeToBytes(
						new MDOMParser().parseFromString(xml),
						{ unsupported: "omit", onUnsupported },
					),
				);
			}),
		);

		expect(table("Export", rows)).toMatchSnapshot();
	});
});

const fixtures = path.join(__dirname, "../mdom/fixtures/guitar-pro");
const examples = path.join(__dirname, "examples");

interface Row {
	file: string;
	features: string[];
	error: string | null;
}

const convert = async (
	file: string,
	conversion: (onUnsupported: (feature: string) => void) => Promise<unknown>,
): Promise<Row> => {
	const features = new Set<string>();
	let error: string | null = null;
	try {
		await conversion((feature) => features.add(feature));
	} catch (thrown) {
		error = (thrown instanceof Error ? thrown.message : String(thrown)).split(
			"\n",
		)[0]!;
	}
	return { file, features: [...features].sort(), error };
};

const result = (row: Row): string => {
	const parts = [
		...(row.features.length > 0
			? [`omits ${row.features.map((feature) => `\`${feature}\``).join(", ")}`]
			: []),
		...(row.error ? [`error: ${row.error.replaceAll("|", "\\|")}`] : []),
	];
	return parts.length > 0 ? parts.join("; ") : "ok";
};

const table = (title: string, rows: Row[]): string => {
	const clean = rows.filter((row) => result(row) === "ok").length;
	const blockers = new Map<string, number>();
	for (const row of rows) {
		for (const feature of row.features) {
			blockers.set(feature, (blockers.get(feature) ?? 0) + 1);
		}
	}
	return [
		`## ${title}: ${clean} of ${rows.length} ok`,
		"",
		"| File | Result |",
		"| --- | --- |",
		...rows.map((row) => `| \`${row.file}\` | ${result(row)} |`),
		"",
		"| Omitted feature | Files |",
		"| --- | --- |",
		...[...blockers]
			.sort(
				([featureA, countA], [featureB, countB]) =>
					countB - countA || featureA.localeCompare(featureB),
			)
			.map(([feature, count]) => `| \`${feature}\` | ${count} |`),
	].join("\n");
};

const musicXmlFiles = (directory: string): string[] =>
	fs
		.readdirSync(directory, { recursive: true, encoding: "utf-8" })
		.filter((file) => /\.(xml|musicxml)$/.test(file))
		.sort();
