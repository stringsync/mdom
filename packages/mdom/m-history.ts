import type { Resource } from 'webappwiz/disposable';
import { Dispatcher, type Events } from 'webappwiz/events';
import { MMutation } from './m-mutation';
import type { MElement } from './m-node';

/** A committed edit, undo, or redo. History state is already updated when delivered. */
export interface MHistoryChange {
	readonly kind: 'edit' | 'undo' | 'redo';
	readonly label: string;
}

/** Synchronous, named edits that retain the original document and node objects. */
export class MHistory implements Resource {
	private past: Step[] = [];
	private future: Step[] = [];
	private dispatcher = new Dispatcher<{ change: MHistoryChange }>();
	readonly events: Events<{ change: MHistoryChange }> = this.dispatcher.events;

	/** Access through `doc.history`; a document has one history. */
	constructor(private readonly root: MElement) {
		MMutation.enable(root);
	}

	get canUndo(): boolean {
		return this.past.length > 0;
	}
	get canRedo(): boolean {
		return this.future.length > 0;
	}
	get undoLabel(): string | null {
		return this.past.at(-1)?.label ?? null;
	}
	get redoLabel(): string | null {
		return this.future.at(-1)?.label ?? null;
	}

	/** Commit one step, or restore all mutations and rethrow if the callback fails. */
	edit<T>(
		label: string,
		operation: () => T extends PromiseLike<unknown> ? never : T,
	): T {
		MMutation.assertIdle();
		if (
			Object.prototype.toString.call(operation) === '[object AsyncFunction]'
		) {
			throw new Error('mdom: transaction callbacks must be synchronous');
		}
		const mutation = new MMutation(this.root);
		const result = mutation.run(operation);
		if (mutation.commit()) {
			this.past.push({ label, mutation });
			this.future = [];
			this.notify('edit', label);
		}
		return result;
	}

	/** Undo the latest step. Returns false when there is nothing to undo. */
	undo(): boolean {
		MMutation.assertIdle();
		const step = this.past.pop();
		if (!step) {
			return false;
		}
		step.mutation.restore('before');
		this.future.push(step);
		this.notify('undo', step.label);
		return true;
	}

	/** Redo the latest undone step. Returns false when there is nothing to redo. */
	redo(): boolean {
		MMutation.assertIdle();
		const step = this.future.pop();
		if (!step) {
			return false;
		}
		step.mutation.restore('after');
		this.past.push(step);
		this.notify('redo', step.label);
		return true;
	}

	/** Release retained steps and listeners. The history remains usable and enabled. */
	dispose(): void {
		MMutation.assertIdle();
		this.past = [];
		this.future = [];
		this.dispatcher.dispose();
	}

	private notify(kind: MHistoryChange['kind'], label: string): void {
		MMutation.notify(() =>
			this.dispatcher.dispatch('change', Object.freeze({ kind, label })),
		);
	}
}

interface Step {
	label: string;
	mutation: MMutation;
}
