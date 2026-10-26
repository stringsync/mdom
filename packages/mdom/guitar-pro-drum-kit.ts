// SPDX-License-Identifier: MPL-2.0
// Guitar Pro's standard drum kit and GP6 drum mapping, from alphaTab's
// PercussionMapper and test data. See THIRD_PARTY.md.
// Copyright © 2025 Daniel Kuschny and Contributors.
import { GuitarProValues } from './guitar-pro-values';
import { GuitarProXml as X } from './guitar-pro-xml';
import type { MElement } from './m-node';
import type { DisplayPositionSpec, NoteheadValue } from './note';

/** One playable sound of a Guitar Pro drum kit, as GPIF's `<Articulation>` stores it. */
export interface GuitarProDrumArticulation {
	element: string;
	elementType: string;
	soundbank: string;
	name: string;
	/** Steps below the top line of the five-line staff; negative is above it. */
	staffLine: number;
	/** SMuFL glyph names for short, half and whole notes. */
	noteheads: string[];
	techniquePlacement: string;
	techniqueSymbol: string;
	/** Guitar Pro's id for the sound, a MIDI key beyond 87 for variants. */
	id: number;
	rseSound: string;
	/** General MIDI drum key it plays. */
	output: number;
}

/** Element name, type, soundbank, then name, staff line, noteheads, technique placement and symbol, id, RSE sound and MIDI key per articulation. */
type ElementRow = [
	string,
	string,
	string,
	[string, number, string, string, string, number, string, number][],
];

// Guitar Pro 7's default drum kit, in the order GPIF indexes it: notes name
// an articulation by its position in this flattened list.
// biome-ignore format: one articulation per line keeps the kit readable
const elements: ElementRow[] = [
	["Snare", "snare", "Master-Snare", [
		["Snare (hit)", 3, "noteheadBlack noteheadHalf noteheadWhole", "outside", "", 38, "stick.hit.hit", 38],
		["Snare (side stick)", 3, "noteheadXBlack noteheadXBlack noteheadXBlack", "outside", "", 37, "stick.hit.sidestick", 37],
		["Snare (rim shot)", 3, "noteheadDiamondWhite noteheadDiamondWhite noteheadDiamondWhite", "outside", "", 91, "stick.hit.rimshot", 38],
	]],
	["Charley", "hiHat", "Master-Hihat", [
		["Hi-Hat (closed)", -1, "noteheadXBlack noteheadXBlack noteheadXBlack", "outside", "", 42, "stick.hit.closed", 42],
		["Hi-Hat (half)", -1, "noteheadCircleSlash noteheadCircleSlash noteheadCircleSlash", "outside", "", 92, "stick.hit.half", 46],
		["Hi-Hat (open)", -1, "noteheadCircleX noteheadCircleX noteheadCircleX", "outside", "", 46, "stick.hit.open", 46],
		["Pedal Hi-Hat (hit)", 9, "noteheadXBlack noteheadXBlack noteheadXBlack", "outside", "", 44, "pedal.hit.pedal", 44],
	]],
	["Acoustic Kick Drum", "kickDrum", "AcousticKick-Percu", [
		["Kick (hit)", 8, "noteheadBlack noteheadHalf noteheadWhole", "outside", "", 35, "pedal.hit.hit", 35],
	]],
	["Kick Drum", "kickDrum", "Master-Kick", [
		["Kick (hit)", 7, "noteheadBlack noteheadHalf noteheadWhole", "outside", "", 36, "pedal.hit.hit", 36],
	]],
	["Tom Very High", "tom", "Master-Tom05", [
		["High Floor Tom (hit)", 1, "noteheadBlack noteheadHalf noteheadWhole", "outside", "", 50, "stick.hit.hit", 50],
	]],
	["Tom High", "tom", "Master-Tom04", [
		["High Tom (hit)", 2, "noteheadBlack noteheadHalf noteheadWhole", "outside", "", 48, "stick.hit.hit", 48],
	]],
	["Tom Medium", "tom", "Master-Tom03", [
		["Mid Tom (hit)", 4, "noteheadBlack noteheadHalf noteheadWhole", "outside", "", 47, "stick.hit.hit", 47],
	]],
	["Tom Low", "tom", "Master-Tom02", [
		["Low Tom (hit)", 5, "noteheadBlack noteheadHalf noteheadWhole", "outside", "", 45, "stick.hit.hit", 45],
	]],
	["Tom Very Low", "tom", "Master-Tom01", [
		["Very Low Tom (hit)", 6, "noteheadBlack noteheadHalf noteheadWhole", "outside", "", 43, "stick.hit.hit", 43],
	]],
	["Ride", "ride", "Master-Ride", [
		["Ride (edge)", 0, "noteheadXBlack noteheadXBlack noteheadXBlack", "above", "pictEdgeOfCymbal", 93, "stick.hit.edge", 51],
		["Ride (middle)", 0, "noteheadXBlack noteheadXBlack noteheadXBlack", "outside", "", 51, "stick.hit.mid", 51],
		["Ride (bell)", 0, "noteheadDiamondWhite noteheadDiamondWhite noteheadDiamondWhite", "outside", "", 53, "stick.hit.bell", 53],
		["Ride (choke)", 0, "noteheadXBlack noteheadXBlack noteheadXBlack", "outside", "articStaccatoAbove", 94, "stick.hit.choke", 51],
	]],
	["Splash", "splash", "Master-Splash", [
		["Splash (hit)", -2, "noteheadXBlack noteheadXBlack noteheadXBlack", "outside", "", 55, "stick.hit.hit", 55],
		["Splash (choke)", -2, "noteheadXBlack noteheadXBlack noteheadXBlack", "outside", "articStaccatoAbove", 95, "stick.hit.choke", 55],
	]],
	["China", "china", "Master-China", [
		["China (hit)", -3, "noteheadHeavyXHat noteheadHeavyXHat noteheadHeavyXHat", "outside", "", 52, "stick.hit.hit", 52],
		["China (choke)", -3, "noteheadHeavyXHat noteheadHeavyXHat noteheadHeavyXHat", "outside", "", 96, "stick.hit.choke", 52],
	]],
	["Crash High", "crash", "Master-Crash02", [
		["Crash high (hit)", -2, "noteheadHeavyX noteheadHeavyX noteheadHeavyX", "outside", "", 49, "stick.hit.hit", 49],
		["Crash high (choke)", -2, "noteheadHeavyX noteheadHeavyX noteheadHeavyX", "outside", "articStaccatoAbove", 97, "stick.hit.choke", 49],
	]],
	["Crash Medium", "crash", "Master-Crash01", [
		["Crash medium (hit)", -1, "noteheadHeavyX noteheadHeavyX noteheadHeavyX", "outside", "", 57, "stick.hit.hit", 57],
		["Crash medium (choke)", -1, "noteheadHeavyX noteheadHeavyX noteheadHeavyX", "outside", "articStaccatoAbove", 98, "stick.hit.choke", 57],
	]],
	["Cowbell Low", "cowbell", "CowbellBig-Percu", [
		["Cowbell low (hit)", 1, "noteheadTriangleUpBlack noteheadTriangleUpHalf noteheadTriangleUpWhole", "outside", "", 99, "stick.hit.hit", 56],
		["Cowbell low (tip)", 1, "noteheadXBlack noteheadXHalf noteheadXWhole", "outside", "", 100, "stick.hit.tip", 56],
	]],
	["Cowbell Medium", "cowbell", "CowbellMid-Percu", [
		["Cowbell medium (hit)", 0, "noteheadTriangleUpBlack noteheadTriangleUpHalf noteheadTriangleUpWhole", "outside", "", 56, "stick.hit.hit", 56],
		["Cowbell medium (tip)", 0, "noteheadXBlack noteheadXHalf noteheadXWhole", "outside", "", 101, "stick.hit.tip", 56],
	]],
	["Cowbell High", "cowbell", "CowbellSmall-Percu", [
		["Cowbell high (hit)", -1, "noteheadTriangleUpBlack noteheadTriangleUpHalf noteheadTriangleUpWhole", "outside", "", 102, "stick.hit.hit", 56],
		["Cowbell high (tip)", -1, "noteheadXBlack noteheadXHalf noteheadXWhole", "outside", "", 103, "stick.hit.tip", 56],
	]],
	["Woodblock Low", "woodblock", "WoodblockLow-Percu", [
		["Woodblock low (hit)", -9, "noteheadTriangleUpBlack noteheadTriangleUpBlack noteheadTriangleUpBlack", "outside", "", 77, "stick.hit.hit", 77],
	]],
	["Woodblock High", "woodblock", "WoodblockHigh-Percu", [
		["Woodblock high (hit)", -10, "noteheadTriangleUpBlack noteheadTriangleUpBlack noteheadTriangleUpBlack", "outside", "", 76, "stick.hit.hit", 76],
	]],
	["Bongo High", "bongo", "BongoHigh-Percu", [
		["Bongo High (hit)", -4, "noteheadBlack noteheadHalf noteheadWhole", "outside", "", 60, "hand.hit.hit", 60],
		["Bongo High (mute)", -5, "noteheadBlack noteheadHalf noteheadWhole", "inside", "noteheadParenthesis", 104, "hand.hit.mute", 60],
		["Bongo High (slap)", -6, "noteheadXBlack noteheadXBlack noteheadXBlack", "outside", "", 105, "hand.hit.slap", 60],
	]],
	["Bongo Low", "bongo", "BongoLow-Percu", [
		["Bongo Low (hit)", -7, "noteheadBlack noteheadHalf noteheadWhole", "outside", "", 61, "hand.hit.hit", 61],
		["Bongo Low (mute)", -8, "noteheadBlack noteheadHalf noteheadWhole", "inside", "noteheadParenthesis", 106, "hand.hit.mute", 61],
		["Bongo Low (slap)", -16, "noteheadXBlack noteheadXBlack noteheadXBlack", "outside", "", 107, "hand.hit.slap", 61],
	]],
	["Timbale Low", "timbale", "TimbaleLow-Percu", [
		["Timbale low (hit)", 10, "noteheadBlack noteheadHalf noteheadWhole", "outside", "", 66, "stick.hit.hit", 66],
	]],
	["Timbale High", "timbale", "TimbaleHigh-Percu", [
		["Timbale high (hit)", 9, "noteheadBlack noteheadHalf noteheadWhole", "outside", "", 65, "stick.hit.hit", 65],
	]],
	["Agogo Low", "agogo", "AgogoLow-Percu", [
		["Agogo low (hit)", 12, "noteheadBlack noteheadHalf noteheadWhole", "outside", "", 68, "stick.hit.hit", 68],
	]],
	["Agogo High", "agogo", "AgogoHigh-Percu", [
		["Agogo high (hit)", 11, "noteheadBlack noteheadHalf noteheadWhole", "outside", "", 67, "stick.hit.hit", 67],
	]],
	["Conga Low", "conga", "CongaLow-Percu", [
		["Conga low (hit)", 17, "noteheadBlack noteheadHalf noteheadWhole", "outside", "", 64, "hand.hit.hit", 64],
		["Conga low (slap)", 16, "noteheadXBlack noteheadXBlack noteheadXBlack", "outside", "", 108, "hand.hit.slap", 64],
		["Conga low (mute)", 15, "noteheadBlack noteheadHalf noteheadWhole", "inside", "noteheadParenthesis", 109, "hand.hit.mute", 64],
	]],
	["Conga High", "conga", "CongaHigh-Percu", [
		["Conga high (hit)", 14, "noteheadBlack noteheadHalf noteheadWhole", "outside", "", 63, "hand.hit.hit", 63],
		["Conga high (slap)", 13, "noteheadXBlack noteheadXBlack noteheadXBlack", "outside", "", 110, "hand.hit.slap", 63],
		["Conga high (mute)", 19, "noteheadBlack noteheadHalf noteheadWhole", "inside", "noteheadParenthesis", 62, "hand.hit.mute", 62],
	]],
	["Whistle Low", "whistle", "WhistleLow-Percu", [
		["Whistle low (hit)", -11, "noteheadBlack noteheadHalf noteheadWhole", "outside", "", 72, "blow.hit.hit", 72],
	]],
	["Whistle High", "whistle", "WhistleHigh-Percu", [
		["Whistle high (hit)", -17, "noteheadBlack noteheadHalf noteheadWhole", "outside", "", 71, "blow.hit.hit", 71],
	]],
	["Guiro", "guiro", "Guiro-Percu", [
		["Guiro (hit)", 38, "noteheadBlack noteheadHalf noteheadWhole", "outside", "", 73, "stick.hit.hit", 73],
		["Guiro (scrap-return)", 37, "noteheadBlack noteheadHalf noteheadWhole", "outside", "", 74, "stick.scrape.return", 74],
	]],
	["Surdo", "surdo", "Surdo-Percu", [
		["Surdo (hit)", 36, "noteheadBlack noteheadHalf noteheadWhole", "outside", "", 86, "brush.hit.hit", 86],
		["Surdo (mute)", 35, "noteheadXBlack noteheadXBlack noteheadXBlack", "inside", "noteheadParenthesis", 87, "brush.hit.mute", 87],
	]],
	["Tambourine", "tambourine", "Tambourine-Percu", [
		["Tambourine (hit)", 3, "noteheadTriangleUpBlack noteheadTriangleUpBlack noteheadTriangleUpBlack", "outside", "", 54, "hand.hit.hit", 54],
		["Tambourine (return)", 2, "noteheadTriangleUpBlack noteheadTriangleUpBlack noteheadTriangleUpBlack", "above", "stringsUpBow", 111, "hand.hit.return", 54],
		["Tambourine (roll)", 1, "noteheadTriangleUpBlack noteheadTriangleUpBlack noteheadTriangleUpBlack", "above", "stringsDownBow", 112, "hand.hit.roll", 54],
		["Tambourine (hand)", -7, "noteheadXBlack noteheadXBlack noteheadXBlack", "outside", "", 113, "hand.hit.handhit", 54],
	]],
	["Cuica", "cuica", "Cuica-Percu", [
		["Cuica (open)", 30, "noteheadBlack noteheadHalf noteheadWhole", "outside", "", 79, "hand.hit.hit", 79],
		["Cuica (mute)", 29, "noteheadXBlack noteheadXBlack noteheadXBlack", "outside", "", 78, "hand.hit.mute", 78],
	]],
	["Vibraslap", "vibraslap", "Vibraslap-Percu", [
		["Vibraslap (hit)", 28, "noteheadBlack noteheadHalf noteheadWhole", "outside", "", 58, "hand.hit.hit", 58],
	]],
	["Triangle", "triangle", "Triangle-Percu", [
		["Triangle (hit)", 27, "noteheadBlack noteheadHalf noteheadWhole", "outside", "", 81, "stick.hit.hit", 81],
		["Triangle (mute)", 26, "noteheadXBlack noteheadXBlack noteheadXBlack", "inside", "noteheadParenthesis", 80, "stick.hit.mute", 80],
	]],
	["Grancassa", "grancassa", "Grancassa-Percu", [
		["Grancassa (hit)", 25, "noteheadBlack noteheadHalf noteheadWhole", "outside", "", 114, "mallet.hit.hit", 43],
	]],
	["Piatti", "piatti", "Piatti-Percu", [
		["Piatti (hit)", 18, "noteheadBlack noteheadHalf noteheadWhole", "outside", "", 115, "hand.hit.hit", 49],
		["Piatti (hand)", 24, "noteheadXBlack noteheadXBlack noteheadXBlack", "outside", "", 116, "hand.hit.hit", 49],
	]],
	["Cabasa", "cabasa", "Cabasa-Percu", [
		["Cabasa (hit)", 23, "noteheadBlack noteheadHalf noteheadWhole", "outside", "", 69, "hand.hit.hit", 69],
		["Cabasa (return)", 22, "noteheadBlack noteheadHalf noteheadWhole", "outside", "stringsUpBow", 117, "hand.hit.return", 69],
	]],
	["Castanets", "castanets", "Castanets-Percu", [
		["Castanets (hit)", 21, "noteheadBlack noteheadHalf noteheadWhole", "outside", "", 85, "hand.hit.hit", 85],
	]],
	["Claves", "claves", "Claves-Percu", [
		["Claves (hit)", 20, "noteheadBlack noteheadHalf noteheadWhole", "outside", "", 75, "stick.hit.hit", 75],
	]],
	["Left Maraca", "maraca", "Maracas-Percu", [
		["Left Maraca (hit)", -12, "noteheadBlack noteheadHalf noteheadWhole", "outside", "", 70, "hand.hit.hit", 70],
		["Left Maraca (return)", -13, "noteheadBlack noteheadHalf noteheadWhole", "outside", "stringsUpBow", 118, "hand.hit.return", 70],
	]],
	["Right Maraca", "maraca", "Maracas-Percu", [
		["Right Maraca (hit)", -14, "noteheadBlack noteheadHalf noteheadWhole", "outside", "", 119, "hand.hit.hit", 70],
		["Right Maraca (return)", -15, "noteheadBlack noteheadHalf noteheadWhole", "outside", "stringsUpBow", 120, "hand.hit.return", 70],
	]],
	["Shaker", "shaker", "ShakerStudio-Percu", [
		["Shaker (hit)", -23, "noteheadBlack noteheadHalf noteheadWhole", "outside", "", 82, "hand.hit.hit", 82],
		["Shaker (return)", -24, "noteheadBlack noteheadHalf noteheadWhole", "outside", "stringsUpBow", 122, "hand.hit.return", 82],
	]],
	["Bell Tree", "bellTree", "BellTree-Percu", [
		["Bell Tree (hit)", -18, "noteheadBlack noteheadHalf noteheadWhole", "outside", "", 84, "stick.hit.hit", 53],
		["Bell Tree (return)", -19, "noteheadBlack noteheadHalf noteheadWhole", "outside", "stringsUpBow", 123, "stick.hit.return", 53],
	]],
	["Jingle Bell", "jingleBell", "JingleBell-Percu", [
		["Jingle Bell (hit)", -20, "noteheadBlack noteheadHalf noteheadWhole", "outside", "", 83, "stick.hit.hit", 53],
	]],
	["Tinkle Bell", "jingleBell", "JingleBell-Percu", [
		["Tinkle Bell (hit)", -20, "noteheadBlack noteheadHalf noteheadWhole", "outside", "", 83, "stick.hit.hit", 53],
	]],
	["Golpe", "unpitched", "Golpe-Percu", [
		["Golpe (thumb)", -21, "noteheadNull noteheadNull noteheadNull", "below", "guitarGolpe", 124, "thumb.hit.body", 62],
		["Golpe (finger)", -22, "noteheadNull noteheadNull noteheadNull", "above", "guitarGolpe", 125, "finger4.hit.body", 62],
	]],
	["Hand Clap", "handClap", "GroupHandClap-Percu", [
		["Hand Clap (hit)", 3, "noteheadBlack noteheadHalf noteheadWhole", "outside", "", 39, "hand.hit.hit", 39],
	]],
	["Electric Snare", "snare", "ElectricSnare-Percu", [
		["Electric Snare (hit)", 3, "noteheadBlack noteheadHalf noteheadWhole", "outside", "", 40, "stick.hit.hit", 40],
	]],
	["Sticks", "snare", "Stick-Percu", [
		["Snare (side stick)", 3, "noteheadSlashedBlack2 noteheadSlashedBlack2 noteheadSlashedBlack2", "outside", "", 31, "stick.hit.sidestick", 40],
	]],
	["Very Low Floor Tom", "tom", "LowFloorTom-Percu", [
		["Low Floor Tom (hit)", 5, "noteheadBlack noteheadHalf noteheadWhole", "outside", "", 41, "stick.hit.hit", 41],
	]],
	["Ride Cymbal 2", "ride", "Ride-Percu", [
		["Ride (edge)", 2, "noteheadXBlack noteheadXBlack noteheadXBlack", "above", "pictEdgeOfCymbal", 59, "stick.hit.edge", 59],
		["Ride (middle)", 2, "noteheadXBlack noteheadXBlack noteheadXBlack", "outside", "", 126, "stick.hit.mid", 59],
		["Ride (bell)", 2, "noteheadDiamondWhite noteheadDiamondWhite noteheadDiamondWhite", "outside", "", 127, "stick.hit.bell", 59],
		["Ride (choke)", 2, "noteheadXBlack noteheadXBlack noteheadXBlack", "outside", "articStaccatoAbove", 29, "stick.hit.choke", 59],
	]],
	["Reverse Cymbal", "crash", "Reverse-Cymbal", [
		["Reverse Cymbal (hit)", -3, "noteheadXBlack noteheadXBlack noteheadXBlack", "outside", "", 30, "stick.hit.hit", 49],
	]],
	["Metronome", "snare", "Metronome-Percu", [
		["Metronome (hit)", 3, "noteheadXBlack noteheadXBlack noteheadXBlack", "outside", "", 33, "stick.hit.sidestick", 37],
		["Metronome (bell)", 3, "noteheadBlack noteheadBlack noteheadBlack", "outside", "", 34, "stick.hit.hit", 38],
	]],
];

export const guitarProDrumKit: readonly GuitarProDrumArticulation[] =
	elements.flatMap(([element, elementType, soundbank, articulations]) =>
		articulations.map(
			([
				name,
				staffLine,
				noteheads,
				techniquePlacement,
				techniqueSymbol,
				id,
				rseSound,
				output,
			]) => ({
				element,
				elementType,
				soundbank,
				name,
				staffLine,
				noteheads: noteheads.split(' '),
				techniquePlacement,
				techniqueSymbol,
				id,
				rseSound,
				output,
			}),
		),
	);

// GP6 names a drum by element and variation; each row lists the articulation
// ids of one element's variations.
const gp6Elements = [
	[35, 35, 35],
	[38, 91, 37],
	[99, 100, 99],
	[56, 100, 56],
	[102, 103, 102],
	[43, 43, 43],
	[45, 45, 45],
	[47, 47, 47],
	[48, 48, 48],
	[50, 50, 50],
	[42, 92, 46],
	[44, 44, 44],
	[57, 98, 57],
	[49, 97, 49],
	[55, 95, 55],
	[51, 93, 127],
	[52, 96, 52],
];

/** The articulation id a GP6 element and variation name, or null when unknown. */
export function gp6ArticulationId(
	element: number,
	variation: number,
): number | null {
	return gp6Elements[element]?.[variation] ?? null;
}

/** The kit's articulations from a GPIF `<InstrumentSet>`, in index order. */
export function readDrumKit(set: MElement): GuitarProDrumArticulation[] {
	return (set.child('Elements')?.childrenNamed('Element') ?? []).flatMap(
		(element) =>
			(element.child('Articulations')?.childrenNamed('Articulation') ?? []).map(
				(articulation) => {
					const text = (tag: string) => articulation.child(tag)?.text ?? '';
					return {
						element: element.child('Name')?.text ?? '',
						elementType: element.child('Type')?.text ?? '',
						soundbank: element.child('SoundbankName')?.text ?? '',
						name: text('Name'),
						staffLine: GuitarProValues.integer(
							Number(text('StaffLine') || 0),
							'drum staff line',
							// Lines that keep the display octave within MusicXML's 0 to 9.
							-31,
							TOP_LINE,
						),
						noteheads: text('Noteheads').split(' ').filter(Boolean),
						techniquePlacement: text('TechniquePlacement'),
						techniqueSymbol: text('TechniqueSymbol'),
						id: Number(text('InputMidiNumbers').split(' ')[0] ?? -1),
						rseSound: text('OutputRSESound'),
						output: GuitarProValues.integer(
							Number(text('OutputMidiNumber') || 0),
							'drum MIDI key',
							0,
							127,
						),
					};
				},
			),
	);
}

/**
 * Appends a kit's articulations to a GPIF `<InstrumentSet>`'s `<Elements>`,
 * one `<Element>` for each run of articulations sharing an element.
 */
export function writeDrumKit(
	set: MElement,
	kit: readonly GuitarProDrumArticulation[] = guitarProDrumKit,
): void {
	const elementsNode = set.child('Elements') ?? X.add(set, 'Elements');
	let elementNode: MElement | null = null;
	let elementName = '';
	for (const articulation of kit) {
		if (!elementNode || articulation.element !== elementName) {
			elementName = articulation.element;
			elementNode = X.add(elementsNode, 'Element');
			X.add(elementNode, 'Name', articulation.element);
			X.add(elementNode, 'Type', articulation.elementType);
			X.add(elementNode, 'SoundbankName', articulation.soundbank);
			X.add(elementNode, 'Articulations');
		}
		const node = X.add(elementNode.child('Articulations')!, 'Articulation');
		for (const [tag, value] of Object.entries({
			Name: articulation.name,
			StaffLine: articulation.staffLine,
			Noteheads: articulation.noteheads.join(' '),
			TechniquePlacement: articulation.techniquePlacement,
			TechniqueSymbol: articulation.techniqueSymbol,
			InputMidiNumbers: articulation.id,
			OutputRSESound: articulation.rseSound,
			OutputMidiNumber: articulation.output,
		})) {
			X.add(node, tag, value);
		}
	}
}

const STEPS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
// Staff line 0 is the top line, F5 through a percussion clef as through a treble clef.
const TOP_LINE = 5 * 7 + STEPS.indexOf('F');

/** The display step and octave of a Guitar Pro drum staff line. */
export function displayOfStaffLine(line: number): DisplayPositionSpec {
	const steps = TOP_LINE - line;
	return { step: STEPS[((steps % 7) + 7) % 7]!, octave: Math.floor(steps / 7) };
}

/** The Guitar Pro drum staff line of a display step and octave. */
export function staffLineOf(position: DisplayPositionSpec): number {
	const step = STEPS.indexOf(position.step.toUpperCase());
	if (step < 0) {
		throw new Error(`Invalid display step: ${position.step}`);
	}
	return TOP_LINE - (position.octave * 7 + step);
}

/** The glyph a kit drum draws for a note type: kits list short, half and whole. */
export function drumGlyph(
	drum: GuitarProDrumArticulation,
	type: string,
): string {
	return (
		drum.noteheads[
			({ half: 1, whole: 2 } as Record<string, number>)[type] ?? 0
		] ??
		drum.noteheads[0] ??
		''
	);
}

/** The MusicXML notehead a SMuFL glyph draws; null for the default head. */
export function noteheadOfGlyph(
	glyph: string,
): { value: NoteheadValue; filled?: boolean } | null {
	if (/^notehead(Black|Half|Whole)$/.test(glyph)) {
		return null;
	}
	if (/^notehead(X|HeavyX)/.test(glyph)) {
		return { value: 'x' };
	}
	if (glyph === 'noteheadCircleX') {
		return { value: 'circle-x' };
	}
	if (glyph === 'noteheadCircleSlash') {
		return { value: 'circled' };
	}
	if (glyph.startsWith('noteheadDiamond')) {
		return { value: 'diamond', filled: glyph.includes('Black') };
	}
	if (glyph.startsWith('noteheadTriangleUp')) {
		return { value: 'triangle' };
	}
	if (glyph.startsWith('noteheadSlashed')) {
		return { value: 'slashed' };
	}
	if (glyph === 'noteheadNull') {
		return { value: 'none' };
	}
	return null;
}
