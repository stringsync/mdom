import type { FrameSpec } from "./frame";
import type { FrameNoteSpec } from "./frame-note";
import type { GuitarProValues } from "./guitar-pro-values";
import { GuitarProXml as X } from "./guitar-pro-xml";
import type {
	Harmony,
	HarmonyDegreeSpec,
	HarmonyKindValue,
	HarmonySpec,
	HarmonyStepSpec,
} from "./harmony";
import { MElement } from "./m-element";

/**
 * Reads a GPIF `DiagramCollection` item as a harmony: root, kind and bass from
 * its `<Chord>` when it has one (Guitar Pro 7+), otherwise from its name, and
 * its `<Diagram>` as a frame.
 */
export function readDiagram(
	item: MElement,
	values: GuitarProValues,
): HarmonySpec | null {
	const name = item.getAttribute("name") ?? "";
	const parsed = parseName(name);
	const chord = item.child("Chord");
	let spec: HarmonySpec;
	const root = step(chord?.child("KeyNote"));
	if (root) {
		const degrees: Degrees = new Map();
		for (const node of chord!.childrenNamed("Degree")) {
			const degree = INTERVALS[node.getAttribute("interval") ?? ""];
			const alter =
				degree == null
					? undefined
					: alteration(degree, node.getAttribute("alteration") ?? "");
			if (degree == null || alter == null) {
				values.unsupported("chord degree");
				continue;
			}
			if (node.getAttribute("omitted") !== "true") {
				degrees.set(degree, alter);
			}
		}
		const { kind, degrees: changes } = kindOf(degrees);
		const bass = step(chord!.child("BassNote"));
		spec = { root, kind, degrees: changes };
		if (bass && !sameStep(bass, root)) {
			spec.bass = bass;
		}
	} else if (parsed) {
		const kind =
			KINDS.find(([, suffix]) => suffix === parsed.suffix)?.[0] ??
			SUFFIX_ALIASES[parsed.suffix] ??
			"other";
		spec = { root: parsed.root, kind };
		if (parsed.bass && !sameStep(parsed.bass, parsed.root)) {
			spec.bass = parsed.bass;
		}
	} else {
		values.unsupported("chord diagrams without a chord root");
		return null;
	}
	// Keep the name Guitar Pro prints when it spells the same root.
	const kind = spec.kind as HarmonyKindValue;
	if (
		parsed &&
		sameStep(parsed.root, spec.root!) &&
		parsed.suffix !== KINDS.find(([value]) => value === kind)?.[1]
	) {
		spec.kind = { value: kind, text: parsed.suffix };
	}
	const diagram = item.child("Diagram");
	if (diagram) {
		const frame = readFrame(diagram);
		const shown = showDiagram(diagram);
		if (shown || frame.notes.length) {
			spec.frame = frame;
			if (!shown) {
				spec.printFrame = false;
			}
		}
	}
	return spec;
}

function showDiagram(diagram: MElement): boolean {
	// Diagram flags sit directly under <Diagram>, not in a <Properties> list.
	return (
		diagram
			.childrenNamed("Property")
			.find((mElement) => mElement.getAttribute("name") === "ShowDiagram")
			?.getAttribute("value") !== "false"
	);
}

function readFrame(diagram: MElement): FrameSpec {
	const strings = Number(diagram.getAttribute("stringCount") ?? 6);
	const frets = Number(diagram.getAttribute("fretCount") ?? 5);
	const baseFret = Number(diagram.getAttribute("baseFret") ?? 0);
	for (const [value, label] of [
		[strings, "string count"],
		[frets, "fret count"],
		[baseFret, "base fret"],
	] as const) {
		if (!Number.isInteger(value) || value < (label === "base fret" ? 0 : 1)) {
			throw new Error(`Invalid GPIF diagram ${label}`);
		}
	}
	// Positions name fingers; one finger over several strings at a fret is a barre.
	const fingers = new Map<string, string>();
	const barres = new Map<string, number[]>();
	for (const position of diagram
		.child("Fingering")
		?.childrenNamed("Position") ?? []) {
		const finger = FINGERS[position.getAttribute("finger") ?? ""];
		if (!finger) {
			continue;
		}
		const at = `${position.getAttribute("string")}:${position.getAttribute("fret")}`;
		fingers.set(at, finger);
		const barre = `${finger}:${position.getAttribute("fret")}`;
		barres.set(barre, [
			...(barres.get(barre) ?? []),
			Number(position.getAttribute("string")),
		]);
	}
	const notes: FrameNoteSpec[] = [];
	for (const fret of diagram.childrenNamed("Fret")) {
		const string = Number(fret.getAttribute("string"));
		const relative = Number(fret.getAttribute("fret"));
		if (
			!Number.isInteger(string) ||
			string < 0 ||
			string >= strings ||
			!Number.isInteger(relative) ||
			relative < 0
		) {
			throw new Error("Invalid GPIF diagram fret");
		}
		const note: FrameNoteSpec = {
			// GPIF counts strings up from the lowest; MusicXML down from the highest.
			string: strings - string,
			// Fret 0 is open wherever the window starts.
			fret: relative ? baseFret + relative : 0,
		};
		const finger = fingers.get(`${string}:${relative}`);
		if (finger) {
			note.fingering = finger;
			const barre = barres.get(`${finger}:${relative}`) ?? [];
			if (barre.length > 1) {
				if (string === Math.min(...barre)) {
					note.barre = "start";
				} else if (string === Math.max(...barre)) {
					note.barre = "stop";
				}
			}
		}
		notes.push(note);
	}
	// Lowest string first, so a barre starts before it stops.
	notes.sort(
		(frameNoteSpec, frameNoteSpec2) =>
			frameNoteSpec2.string - frameNoteSpec.string,
	);
	return {
		strings,
		frets,
		...(baseFret ? { firstFret: baseFret + 1 } : {}),
		notes,
	};
}

/** The Guitar Pro chord name a harmony prints as. */
function chordName(harmony: Harmony): string {
	const root = harmony.root!;
	const kind = harmony.kind!;
	const bass = harmony.bass;
	const suffix =
		kind.text ?? KINDS.find(([value]) => value === kind.value)?.[1] ?? "";
	return `${root.step}${accidentalSymbol(root.alter ?? 0)}${suffix}${
		bass ? `/${bass.step}${accidentalSymbol(bass.alter ?? 0)}` : ""
	}`;
}

function writeStep(
	parent: MElement,
	tag: string,
	value: { step: string; alter: number | null },
	values: GuitarProValues,
): void {
	const accidental = Object.entries(ACCIDENTALS).find(
		([, alter]) => alter === (value.alter ?? 0),
	)?.[0];
	if (!accidental) {
		values.unsupported(`chord root alteration ${value.alter}`);
	}
	X.add(parent, tag, undefined, {
		step: value.step,
		accidental: accidental ?? "Natural",
	});
}

/**
 * Builds a GPIF `DiagramCollection` item from a harmony with a letter root,
 * or returns null after reporting it unsupported. Without a frame the
 * diagram is empty and hidden, so only the chord name shows.
 */
export function writeDiagram(
	harmony: Harmony,
	id: string,
	strings: number,
	values: GuitarProValues,
): MElement | null {
	const root = harmony.root;
	const kind = harmony.kind;
	if (!root || !kind || harmony.chords.length !== 1) {
		values.unsupported("chord symbols without a single letter root");
		return null;
	}
	const item = new MElement("Item");
	item.setAttribute("id", id);
	item.setAttribute("name", chordName(harmony));
	const frame = harmony.frame;
	const frameStrings = frame?.strings ?? strings;
	const frets = frame?.frets ?? 5;
	const dots = frame?.frameNotes ?? [];
	const stopped = dots.map((dot) => dot.fret).filter((fret) => fret > 0);
	// Without a stated first fret, start the window at the lowest dot only when the dots overrun it.
	let baseFret = Math.max(...stopped, 0) > frets ? Math.min(...stopped) - 1 : 0;
	if (frame?.firstFret != null) {
		baseFret = Math.max(frame.firstFret - 1, 0);
	}
	const diagram = X.add(item, "Diagram", undefined, {
		stringCount: String(frameStrings),
		fretCount: String(frets),
		baseFret: String(baseFret),
		barsStates: Array(frets).fill("1").join(" "),
	});
	const positions: [string, number, number][] = [];
	const barre = dots.find((dot) => dot.barre === "start");
	for (const dot of dots) {
		const string = frameStrings - dot.string;
		const fret = dot.fret ? dot.fret - baseFret : 0;
		if (string < 0 || string >= frameStrings || fret < 0) {
			values.unsupported("chord diagram dots outside the diagram");
			continue;
		}
		X.add(diagram, "Fret", undefined, {
			string: String(string),
			fret: String(fret),
		});
		const finger =
			dot.fingering ??
			(dot.barre && barre?.fret === dot.fret ? (barre.fingering ?? "1") : null);
		const name = Object.entries(FINGERS).find(
			([, value]) => value === finger,
		)?.[0];
		if (name) {
			positions.push([name, fret, string]);
		}
	}
	if (positions.length) {
		const fingering = X.add(diagram, "Fingering");
		for (const [finger, fret, string] of positions) {
			X.add(fingering, "Position", undefined, {
				finger,
				fret: String(fret),
				string: String(string),
			});
		}
	}
	for (const [name, shown] of [
		["ShowDiagram", frame != null && harmony.printFrame !== false],
		["ShowName", true],
		["ShowFingering", true],
	] as const) {
		X.add(diagram, "Property", undefined, {
			name,
			type: "bool",
			value: String(shown),
		});
	}
	const chord = X.add(item, "Chord");
	writeStep(chord, "KeyNote", root, values);
	writeStep(chord, "BassNote", harmony.bass ?? root, values);
	const degrees = degreesOf(kind.value, harmony.degrees);
	for (const [degree, alter] of [...degrees].sort(
		([first], [second]) => first - second,
	)) {
		const interval = Object.entries(INTERVALS).find(
			([, value]) => value === degree,
		)?.[0];
		const name = alterationName(degree, alter);
		if (!interval || !name) {
			values.unsupported(`chord degree ${degree} altered by ${alter}`);
			continue;
		}
		X.add(chord, "Degree", undefined, {
			interval,
			alteration: name,
			omitted: "false",
		});
	}
	return item;
}

/** A chord as a set of scale degrees, each altered in semitones from the major scale. */
type Degrees = Map<number, number>;

/** Each kind's degrees above the root, and the suffix Guitar Pro names it with. */
const KINDS: [HarmonyKindValue, string, Record<number, number>][] = [
	["major", "", { 3: 0, 5: 0 }],
	["minor", "m", { 3: -1, 5: 0 }],
	["augmented", "aug", { 3: 0, 5: 1 }],
	["diminished", "dim", { 3: -1, 5: -1 }],
	["dominant", "7", { 3: 0, 5: 0, 7: -1 }],
	["major-seventh", "maj7", { 3: 0, 5: 0, 7: 0 }],
	["minor-seventh", "m7", { 3: -1, 5: 0, 7: -1 }],
	["diminished-seventh", "dim7", { 3: -1, 5: -1, 7: -2 }],
	["augmented-seventh", "aug7", { 3: 0, 5: 1, 7: -1 }],
	["half-diminished", "m7b5", { 3: -1, 5: -1, 7: -1 }],
	["major-minor", "m(maj7)", { 3: -1, 5: 0, 7: 0 }],
	["major-sixth", "6", { 3: 0, 5: 0, 6: 0 }],
	["minor-sixth", "m6", { 3: -1, 5: 0, 6: 0 }],
	["dominant-ninth", "9", { 3: 0, 5: 0, 7: -1, 9: 0 }],
	["major-ninth", "maj9", { 3: 0, 5: 0, 7: 0, 9: 0 }],
	["minor-ninth", "m9", { 3: -1, 5: 0, 7: -1, 9: 0 }],
	["dominant-11th", "11", { 3: 0, 5: 0, 7: -1, 9: 0, 11: 0 }],
	["major-11th", "maj11", { 3: 0, 5: 0, 7: 0, 9: 0, 11: 0 }],
	["minor-11th", "m11", { 3: -1, 5: 0, 7: -1, 9: 0, 11: 0 }],
	["dominant-13th", "13", { 3: 0, 5: 0, 7: -1, 9: 0, 11: 0, 13: 0 }],
	["major-13th", "maj13", { 3: 0, 5: 0, 7: 0, 9: 0, 11: 0, 13: 0 }],
	["minor-13th", "m13", { 3: -1, 5: 0, 7: -1, 9: 0, 11: 0, 13: 0 }],
	["suspended-second", "sus2", { 2: 0, 5: 0 }],
	["suspended-fourth", "sus4", { 4: 0, 5: 0 }],
	["power", "5", { 5: 0 }],
	["other", "", {}],
];

/** Suffixes Guitar Pro or its users write that differ from the {@link KINDS} spelling. */
const SUFFIX_ALIASES: Record<string, HarmonyKindValue> = {
	min: "minor",
	"-": "minor",
	"+": "augmented",
	M7: "major-seventh",
	maj: "major",
	"°": "diminished",
	"°7": "diminished-seventh",
	// biome-ignore lint/complexity/useLiteralKeys: a bare ø key trips useNamingConvention's requireAscii
	["ø"]: "half-diminished",
	sus: "suspended-fourth",
};

const INTERVALS: Record<string, number> = {
	Second: 2,
	Third: 3,
	Fourth: 4,
	Fifth: 5,
	Sixth: 6,
	Seventh: 7,
	Ninth: 9,
	Eleventh: 11,
	Thirteenth: 13,
};

/** Fourths, fifths and elevenths are perfect; the rest major or minor. */
const PERFECT = new Set([4, 5, 11]);

const ACCIDENTALS: Record<string, number> = {
	DoubleFlat: -2,
	Flat: -1,
	Natural: 0,
	Sharp: 1,
	DoubleSharp: 2,
};

const FINGERS: Record<string, string> = {
	Thumb: "T",
	Index: "1",
	Middle: "2",
	Ring: "3",
	Pinky: "4",
};

function alteration(degree: number, name: string): number | undefined {
	return PERFECT.has(degree)
		? { Diminished: -1, Perfect: 0, Augmented: 1 }[name]
		: { Diminished: -2, Minor: -1, Major: 0, Augmented: 1 }[name];
}

function alterationName(degree: number, alter: number): string | undefined {
	return PERFECT.has(degree)
		? { "-1": "Diminished", "0": "Perfect", "1": "Augmented" }[alter]
		: { "-2": "Diminished", "-1": "Minor", "0": "Major", "1": "Augmented" }[
				alter
			];
}

function accidentalSymbol(alter: number): string {
	return { "-2": "bb", "-1": "b", "0": "", "1": "#", "2": "x" }[alter] ?? "";
}

/** The kind closest to `degrees`, and the added, altered and subtracted degrees that make up the difference. */
function kindOf(degrees: Degrees): {
	kind: HarmonyKindValue;
	degrees: HarmonyDegreeSpec[];
} {
	let best: { kind: HarmonyKindValue; degrees: HarmonyDegreeSpec[] } | null =
		null;
	for (const [kind, , base] of KINDS) {
		const changes: HarmonyDegreeSpec[] = [];
		for (const [value, alter] of Object.entries(base)) {
			const degree = Number(value);
			const present = degrees.get(degree);
			if (present == null) {
				changes.push({ value: degree, type: "subtract" });
			} else if (present !== alter) {
				changes.push({ value: degree, type: "alter", alter: present - alter });
			}
		}
		for (const [degree, alter] of degrees) {
			if (!(degree in base)) {
				changes.push({ value: degree, type: "add", alter });
			}
		}
		if (!best || changes.length < best.degrees.length) {
			best = {
				kind,
				degrees: changes.sort(
					(harmonyDegreeSpec, harmonyDegreeSpec2) =>
						harmonyDegreeSpec.value - harmonyDegreeSpec2.value,
				),
			};
		}
	}
	return best!;
}

/** Undo {@link kindOf}: the degrees a kind and its changes spell. */
function degreesOf(
	kind: HarmonyKindValue,
	changes: { value: number; type: string; alter: number }[],
): Degrees {
	const degrees: Degrees = new Map(
		Object.entries(KINDS.find(([value]) => value === kind)?.[2] ?? {}).map(
			([degree, alter]) => [Number(degree), alter],
		),
	);
	for (const change of changes) {
		if (change.type === "subtract") {
			degrees.delete(change.value);
		} else if (change.type === "alter") {
			degrees.set(
				change.value,
				(degrees.get(change.value) ?? 0) + change.alter,
			);
		} else {
			degrees.set(change.value, change.alter);
		}
	}
	return degrees;
}

// vet-ignore noop-objects-over-null: an absent <root-step> or similar child is XML data, read straight from child().
function step(node: MElement | null | undefined): HarmonyStepSpec | null {
	const letter = node?.getAttribute("step");
	if (!letter || !/^[A-G]$/.test(letter)) {
		return null;
	}
	const alter = ACCIDENTALS[node!.getAttribute("accidental") ?? "Natural"];
	if (alter == null) {
		return null;
	}
	return alter ? { step: letter, alter } : { step: letter };
}

function sameStep(
	harmonyStepSpec: HarmonyStepSpec,
	harmonyStepSpec2: HarmonyStepSpec,
): boolean {
	return (
		harmonyStepSpec.step === harmonyStepSpec2.step &&
		(harmonyStepSpec.alter ?? 0) === (harmonyStepSpec2.alter ?? 0)
	);
}

/** A chord name such as `C#m7/G#`: its root, the suffix after it, and any slash bass. */
function parseName(name: string): {
	root: HarmonyStepSpec;
	suffix: string;
	bass: HarmonyStepSpec | null;
} | null {
	const match = /^([A-G])(#|b)?(.*?)(?:\/([A-G])(#|b)?)?$/.exec(name.trim());
	if (!match) {
		return null;
	}
	const spell = (letter: string, accidental?: string): HarmonyStepSpec =>
		accidental
			? { step: letter, alter: accidental === "#" ? 1 : -1 }
			: { step: letter };
	return {
		root: spell(match[1]!, match[2]),
		suffix: match[3]!,
		bass: match[4] ? spell(match[4], match[5]) : null,
	};
}
