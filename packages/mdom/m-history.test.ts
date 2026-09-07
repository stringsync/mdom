import { beforeEach, describe, expect, it } from 'bun:test';
import { MDocument } from './m-document';
import { MDOMParser } from './m-dom-parser';
import type { MHistory, MHistoryChange } from './m-history';
import { MCData, MElement, MText, required } from './m-node';
import type { Measure } from './measure';
import { MusicXMLSerializer } from './music-xml-serializer';
import type { Note } from './note';

describe('MHistory', () => {
	let doc: MDocument;
	let measure: Measure;
	let first: Note;
	let second: Note;
	let history: MHistory;
	let serializer: MusicXMLSerializer;

	beforeEach(() => {
		doc =
			new MDOMParser().parseFromString(`<score-partwise version="4.0"><part id="P1"><measure number="1">
			<attributes><divisions>4</divisions></attributes>
			<note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice><type>quarter</type></note>
			<note><pitch><step>D</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice><type>quarter</type></note>
			<backup><duration>8</duration></backup>
			<note><rest/><duration>8</duration><voice>2</voice><type>half</type></note>
		</measure></part></score-partwise>`);
		measure = required(doc.score.parts[0]?.measures[0], 'measure');
		first = required(measure.notes[0], 'first note');
		second = required(measure.notes[1], 'second note');
		history = doc.history;
		serializer = new MusicXMLSerializer();
	});

	it('groups a multi-note edit into one named step', () => {
		const root = doc.root;
		const before = serializer.serializeToString(doc);
		expect(
			history.edit('Add staccato', () => {
				first.addArticulation('staccato');
				second.addArticulation('staccato');
				return 42;
			}),
		).toBe(42);
		const mark = first.child('notations');
		expect(first.articulations).toEqual(['staccato']);
		expect(second.articulations).toEqual(['staccato']);
		expect(history.undoLabel).toBe('Add staccato');
		expect(history.canUndo).toBe(true);
		expect(history.undo()).toBe(true);
		expect(serializer.serializeToString(doc)).toBe(before);
		expect(history.undo()).toBe(false);
		expect(history.redoLabel).toBe('Add staccato');
		expect(history.redo()).toBe(true);
		expect(first.child('notations')).toBe(mark);
		expect(first.articulations).toEqual(['staccato']);
		expect(second.articulations).toEqual(['staccato']);
		expect(doc.root).toBe(root);
		expect(measure.notes[0]).toBe(first);
		expect(doc.history).toBe(history);
	});

	it('restores exact contents and original nodes after a failed operation while preserving both stacks', () => {
		history.edit('Color', () => first.setAttribute('color', '#123456'));
		history.edit('Accent', () => second.addArticulation('accent'));
		history.undo();
		const before = serializer.serializeToString(doc);
		const children = [...first.children];
		const pitch = first.pitch;
		const duration = required(first.child('duration'), 'duration');
		const text = required(duration.children[0], 'duration text');
		const error = new Error('failed');
		expect(() =>
			history.edit('Broken', () => {
				first.setPitch({ step: 'F', octave: 5 });
				first.setDuration({ type: 'half', dots: 1 });
				first.addSlur(second);
				second.remove();
				throw error;
			}),
		).toThrow(error);
		expect(serializer.serializeToString(doc)).toBe(before);
		expect(first.children).toEqual(children);
		expect(first.pitch).toBe(pitch);
		expect(duration.children[0]).toBe(text);
		expect(measure.notes[1]).toBe(second);
		expect(second.parent).toBe(measure);
		expect(history.undoLabel).toBe('Color');
		expect(history.redoLabel).toBe('Accent');
		history.redo();
		expect(second.articulations).toEqual(['accent']);
	});

	it('restores pitches, attributes, ordinary text, and CDATA by identity', () => {
		const pitch = first.pitch;
		const type = required(first.child('type'), 'type');
		const text = required(type.children[0], 'text') as MText;
		const cdata = new MCData('original');
		history.edit('CDATA', () => first.append(cdata));
		const before = serializer.serializeToString(doc);
		history.edit('Rewrite', () => {
			first.setPitch({ step: 'G', octave: 5, alter: 1 });
			first.setAttribute('color', '#abcdef');
			doc.root.removeAttribute('version');
			text.value = 'half';
			cdata.value = 'changed';
		});
		const replacement = first.pitch;
		const after = serializer.serializeToString(doc);
		expect(first.pitch?.step).toBe('G');
		expect(first.getAttribute('color')).toBe('#abcdef');
		expect(type.text).toBe('half');
		history.undo();
		expect(serializer.serializeToString(doc)).toBe(before);
		expect(first.pitch).toBe(pitch);
		expect(first.getAttribute('color')).toBeNull();
		expect(doc.root.getAttribute('version')).toBe('4.0');
		expect(text.value).toBe('quarter');
		expect(cdata.value).toBe('original');
		history.redo();
		expect(serializer.serializeToString(doc)).toBe(after);
		expect(first.pitch).toBe(replacement);
		expect(type.children[0]).toBe(text);
		expect(cdata.parent).toBe(first);
	});

	it('restores insertions, removals, sibling ordering, and moves between parents', () => {
		const before = serializer.serializeToString(doc);
		const firstChildren = [...first.children];
		const secondChildren = [...second.children];
		const pitch = required(first.pitch, 'pitch');
		const type = required(first.child('type'), 'type');
		const inserted = new MElement('probe');
		history.edit('Structure', () => {
			first.insertBefore(inserted, pitch);
			first.append(pitch);
			second.append(type);
			first.child('voice')?.remove();
		});
		const after = serializer.serializeToString(doc);
		expect(first.children[0]).toBe(inserted);
		expect(first.children.at(-1)).toBe(pitch);
		expect(type.parent).toBe(second);
		history.undo();
		expect(serializer.serializeToString(doc)).toBe(before);
		expect(first.children).toEqual(firstChildren);
		expect(second.children).toEqual(secondChildren);
		expect(inserted.parent).toBeNull();
		expect(type.parent).toBe(first);
		history.redo();
		expect(serializer.serializeToString(doc)).toBe(after);
		expect(first.children[0]).toBe(inserted);
		expect(type.parent).toBe(second);
	});

	it('replaces a child with an earlier sibling without leaving duplicate nodes', () => {
		const children = [...first.children];
		const pitch = required(first.pitch, 'pitch');
		const type = required(first.child('type'), 'type');
		history.edit('Replace', () => first.replaceChild(type, pitch));
		expect(first.children).toEqual([
			required(children[1], 'duration'),
			required(children[2], 'voice'),
			pitch,
		]);
		expect(type.parent).toBeNull();
		history.undo();
		expect(first.children).toEqual(children);
		expect(type.parent).toBe(first);
		history.redo();
		expect(first.children).toEqual([
			required(children[1], 'duration'),
			required(children[2], 'voice'),
			pitch,
		]);
	});

	it('restores rhythmic repair at multiple locations and paired slur markers', () => {
		const before = serializer.serializeToString(doc);
		const backup = required(
			measure.child('backup')?.child('duration'),
			'backup duration',
		);
		const backupText = backup.children[0];
		const slur = history.edit('Rhythm and slur', () => {
			first.setDuration({ type: 'half' });
			return first.addSlur(second);
		});
		const partner = slur.partner;
		const after = serializer.serializeToString(doc);
		expect(first.duration).toBe(8);
		expect(backup.text).toBe('12');
		expect(slur.partner?.note).toBe(second);
		history.undo();
		expect(serializer.serializeToString(doc)).toBe(before);
		expect(first.duration).toBe(4);
		expect(backup.text).toBe('8');
		expect(backup.children[0]).toBe(backupText);
		expect(first.slurs).toEqual([]);
		expect(second.slurs).toEqual([]);
		history.redo();
		expect(serializer.serializeToString(doc)).toBe(after);
		expect(first.slurs[0]).toBe(slur);
		expect(slur.partner).toBe(partner);
		expect(partner?.partner).toBe(slur);
	});

	it('keeps redo through empty, same-value, and net-zero edits', () => {
		history.edit('Accent', () => first.addArticulation('accent'));
		history.undo();
		const before = serializer.serializeToString(doc);
		history.edit('Empty', () => {});
		history.edit('Same', () => doc.root.setAttribute('version', '4.0'));
		history.edit('Net zero', () => {
			first.setAttribute('color', 'red');
			first.removeAttribute('color');
			const probe = new MElement('probe');
			first.append(probe);
			probe.setText('temporary');
			probe.remove();
			const pitch = required(first.pitch, 'pitch');
			first.append(pitch);
			first.insertBefore(pitch, first.children[0] ?? null);
		});
		expect(serializer.serializeToString(doc)).toBe(before);
		expect(history.canUndo).toBe(false);
		expect(history.redoLabel).toBe('Accent');
		history.redo();
		expect(first.articulations).toEqual(['accent']);
	});

	it('invalidates redo only after a new effective edit and reports empty history', () => {
		expect(history.canUndo).toBe(false);
		expect(history.canRedo).toBe(false);
		expect(history.undoLabel).toBeNull();
		expect(history.redoLabel).toBeNull();
		expect(history.undo()).toBe(false);
		expect(history.redo()).toBe(false);
		history.edit('One', () => first.setAttribute('color', 'red'));
		history.edit('Two', () => first.setAttribute('color', 'blue'));
		history.undo();
		expect(history.undoLabel).toBe('One');
		expect(history.redoLabel).toBe('Two');
		history.edit('Three', () => second.setAttribute('color', 'green'));
		expect(history.undoLabel).toBe('Three');
		expect(history.redoLabel).toBeNull();
		expect(history.redo()).toBe(false);
	});

	it('notifies once after each effective commit with final contents and action state', () => {
		const events: MHistoryChange[] = [];
		const contents: string[][] = [];
		const labels: (string | null)[] = [];
		const unlisten = history.events.on('change', (event) => {
			events.push(event);
			contents.push([...first.articulations, ...second.articulations]);
			labels.push(history.undoLabel);
		});
		history.edit('Marks', () => {
			first.addArticulation('accent');
			expect(events).toEqual([]);
			second.addArticulation('staccato');
		});
		history.undo();
		history.redo();
		history.edit('Empty', () => {});
		expect(() =>
			history.edit('Failed', () => {
				first.removeAttribute('color');
				throw new Error('failed');
			}),
		).toThrow('failed');
		expect(events).toEqual([
			{ kind: 'edit', label: 'Marks' },
			{ kind: 'undo', label: 'Marks' },
			{ kind: 'redo', label: 'Marks' },
		]);
		expect(contents).toEqual([
			['accent', 'staccato'],
			[],
			['accent', 'staccato'],
		]);
		expect(labels).toEqual(['Marks', null, 'Marks']);
		unlisten();
		history.undo();
		history.undo();
		expect(events).toHaveLength(3);
	});

	it('allows setup before history is enabled and rejects subsequent external mutations', () => {
		const plain = MDocument.empty();
		plain.score.addPart().addMeasure();
		const enabled = plain.history;
		const before = serializer.serializeToString(plain);
		expect(() => plain.root.setAttribute('version', '3.1')).toThrow(
			'history.edit',
		);
		expect(() => plain.root.append(new MElement('probe'))).toThrow(
			'history.edit',
		);
		expect(serializer.serializeToString(plain)).toBe(before);
		expect(enabled.canUndo).toBe(false);
		expect(() => {
			(required(first.child('type')?.children[0], 'text') as MText).value =
				'half';
		}).toThrow('history.edit');
	});

	it('protects removed nodes and can edit them in a later transaction', () => {
		const pitch = required(first.pitch, 'pitch');
		history.edit('Remove', () => pitch.remove());
		expect(() => pitch.setAttribute('color', 'red')).toThrow('history.edit');
		history.edit('Detached edit', () => pitch.setAttribute('color', 'red'));
		history.undo();
		history.undo();
		expect(first.pitch).toBe(pitch);
		expect(pitch.getAttribute('color')).toBeNull();
		history.redo();
		history.redo();
		expect(pitch.parent).toBeNull();
		expect(pitch.getAttribute('color')).toBe('red');
	});

	it('rolls back an outer transaction when nesting or undo is attempted', () => {
		const before = serializer.serializeToString(doc);
		expect(() =>
			history.edit('Outer', () => {
				first.addArticulation('accent');
				history.edit('Inner', () => second.addArticulation('accent'));
			}),
		).toThrow('nested');
		expect(serializer.serializeToString(doc)).toBe(before);
		expect(() =>
			history.edit('Outer', () => {
				first.addArticulation('accent');
				history.undo();
			}),
		).toThrow('nested');
		expect(serializer.serializeToString(doc)).toBe(before);
		expect(history.canUndo).toBe(false);
	});

	it('rejects nested transactions on another document before its callback runs', () => {
		const other = MDocument.empty();
		const otherHistory = other.history;
		expect(() =>
			history.edit('Outer', () =>
				otherHistory.edit('Inner', () =>
					other.root.setAttribute('version', '3.1'),
				),
			),
		).toThrow('nested');
		expect(other.root.getAttribute('version')).toBe('4.0');
		expect(otherHistory.canUndo).toBe(false);
	});

	it('rejects native async callbacks before invocation', () => {
		let invoked = false;
		expect(() =>
			history.edit(
				'Async',
				// @ts-expect-error Async callbacks are also rejected at compile time.
				async () => {
					invoked = true;
					first.addArticulation('accent');
				},
			),
		).toThrow('synchronous');
		expect(invoked).toBe(false);
		expect(first.articulations).toEqual([]);
		expect(history.canUndo).toBe(false);
	});

	it('rolls back a returned promise and denies mutations from its continuation', async () => {
		const before = serializer.serializeToString(doc);
		let continuation: Promise<void> = Promise.resolve();
		expect(() =>
			history.edit(
				'Promise',
				// @ts-expect-error Promise-returning callbacks are also rejected at compile time.
				() => {
					first.addArticulation('accent');
					continuation = Promise.resolve().then(() => {
						first.setAttribute('color', 'red');
					});
					return continuation;
				},
			),
		).toThrow('synchronous');
		await expect(continuation).rejects.toThrow('history.edit');
		expect(serializer.serializeToString(doc)).toBe(before);
		expect(history.canUndo).toBe(false);
	});

	it('rejects custom thenables and restores their synchronous mutations', () => {
		expect(() =>
			history.edit('Thenable', () => {
				first.setAttribute('color', 'red');
				return {
					// biome-ignore lint/suspicious/noThenProperty: deliberately exercise a custom thenable.
					then() {},
				};
			}),
		).toThrow('synchronous');
		expect(first.getAttribute('color')).toBeNull();
		expect(history.canUndo).toBe(false);
	});

	it('rejects cross-document moves before detaching and preserves both documents', () => {
		const other = MDocument.empty();
		const before = serializer.serializeToString(doc);
		const otherBefore = serializer.serializeToString(other);
		expect(() =>
			history.edit('Move', () => {
				first.setAttribute('color', 'red');
				other.root.append(first);
			}),
		).toThrow();
		expect(serializer.serializeToString(doc)).toBe(before);
		expect(serializer.serializeToString(other)).toBe(otherBefore);
		expect(first.parent).toBe(measure);
		expect(() =>
			history.edit('Import root', () => first.append(other.root)),
		).toThrow('between documents');
		expect(history.canUndo).toBe(false);
	});

	it('rejects moves between documents even without history and after detaching', () => {
		const left = MDocument.empty();
		const part = left.score.addPart();
		const right = MDocument.empty();
		expect(() => right.root.append(part)).toThrow('between documents');
		expect(part.parent).toBe(left.root);
		part.remove();
		expect(() => right.root.append(part)).toThrow('between documents');
		expect(part.parent).toBeNull();
		expect(() => new MDocument(left.root)).toThrow('already belong');
	});

	it('rejects cycles and invalid references without disturbing the tree', () => {
		const before = serializer.serializeToString(doc);
		expect(() => history.edit('Cycle', () => first.append(measure))).toThrow(
			'contain itself',
		);
		expect(() =>
			history.edit('Reference', () =>
				first.insertBefore(second, new MElement('missing')),
			),
		).toThrow('reference');
		expect(() =>
			history.edit('Replacement', () =>
				first.replaceChild(second, new MElement('probe')),
			),
		).toThrow('target');
		expect(serializer.serializeToString(doc)).toBe(before);
		expect(history.canUndo).toBe(false);
	});

	it('keeps committed history when a listener throws and rejects reentrant edits', () => {
		const unlisten = history.events.on('change', () => {
			history.undo();
		});
		expect(() =>
			history.edit('Color', () => first.setAttribute('color', 'red')),
		).toThrow('nested');
		expect(first.getAttribute('color')).toBe('red');
		expect(history.undoLabel).toBe('Color');
		unlisten();
		history.undo();
		expect(first.getAttribute('color')).toBeNull();
	});

	it('releases listeners and retained steps on disposal and remains usable', () => {
		const events: MHistoryChange[] = [];
		history.events.on('change', (event) => events.push(event));
		history.edit('Color', () => first.setAttribute('color', 'red'));
		history.dispose();
		history.dispose();
		expect(history.canUndo).toBe(false);
		expect(history.canRedo).toBe(false);
		expect(first.getAttribute('color')).toBe('red');
		history.edit('Blue', () => first.setAttribute('color', 'blue'));
		expect(history.undoLabel).toBe('Blue');
		expect(events).toEqual([{ kind: 'edit', label: 'Color' }]);
	});
	it('does not replay changes to unrelated unattached builders', () => {
		const builder = new MElement('probe');
		history.edit('Color', () => {
			builder.setText('during');
			first.setAttribute('color', 'red');
		});
		builder.setText('later');
		history.undo();
		expect(builder.text).toBe('later');
		history.redo();
		expect(builder.text).toBe('later');
	});

	it('prevents direct changes to child arrays, parent links, and declaration fields', () => {
		const plain = MDocument.empty();
		expect(() => {
			(first.children as unknown[]).push(new MText('bad'));
		}).toThrow();
		expect(() => {
			// @ts-expect-error Parent links are maintained by structural mutations.
			first.parent = null;
		}).toThrow();
		expect(() => {
			Object.assign(plain.declaration ?? {}, { version: '2.0' });
		}).toThrow();
		expect(first.parent).toBe(measure);
		expect(plain.declaration?.version).toBe('1.0');
	});
	it('preserves redo after rejected external writes and permits caught nesting errors', () => {
		history.edit('Color', () => first.setAttribute('color', 'red'));
		history.undo();
		expect(() => first.setAttribute('color', 'blue')).toThrow('history.edit');
		expect(history.redoLabel).toBe('Color');
		history.edit('Outer', () => {
			expect(() => history.edit('Inner', () => {})).toThrow('nested');
			second.setAttribute('color', 'green');
		});
		expect(history.undoLabel).toBe('Outer');
		expect(history.redoLabel).toBeNull();
		history.undo();
		expect(second.getAttribute('color')).toBeNull();
		expect(history.canUndo).toBe(false);
	});

	it('rejects direct mutation during notification after committing the action', () => {
		const unlisten = history.events.on('change', () =>
			first.setAttribute('color', 'blue'),
		);
		expect(() =>
			history.edit('Color', () => first.setAttribute('color', 'red')),
		).toThrow('during change notifications');
		expect(first.getAttribute('color')).toBe('red');
		expect(history.undoLabel).toBe('Color');
		unlisten();
		history.undo();
		expect(first.getAttribute('color')).toBeNull();
	});
});
