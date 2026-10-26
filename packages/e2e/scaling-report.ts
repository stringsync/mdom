import type { Operation, Sample } from './scaling-operations';
import type { Axis, ScoreShape } from './scaling-score';

export interface CaseResult {
	operation: Operation;
	size: number;
	counts?: ScoreShape & { totalMeasures: number; totalNotes: number };
	samples: Sample[];
	error?: string;
}
export function median(values: number[]): number {
	const sorted = [...values].sort((left, right) => left - right);
	const middle = Math.floor(sorted.length / 2);
	return sorted.length % 2
		? sorted[middle]!
		: (sorted[middle - 1]! + sorted[middle]!) / 2;
}

export function summarize(results: CaseResult[], axis: Axis) {
	const previous = new Map<
		Operation,
		{
			size: number;
			elapsedMs: number;
			heapBytes: number;
			documentHeapBytes: number;
		}
	>();
	return results.map((result) => {
		if (result.error || !result.samples.length) {
			return {
				operation: result.operation,
				axis,
				size: result.size,
				error: result.error ?? 'No samples',
			};
		}
		const elapsedMs = median(result.samples.map((sample) => sample.elapsedMs));
		const heapBytes = median(
			result.samples.map((sample) => sample.heapDeltaBytes),
		);
		const documentHeapBytes = median(
			result.samples.map((sample) => sample.documentHeapBytes),
		);
		const historySamples = result.samples.flatMap((sample) =>
			sample.history ? [sample.history] : [],
		);
		const historyBytesPerEntry = historySamples.length
			? median(historySamples.map((history) => history.bytesPerEntry))
			: null;
		const prior = previous.get(result.operation);
		// Ratios describe adjacent exact doublings only; missing/error cases do not
		// silently turn a 4x jump into a doubling ratio. Nonpositive deltas are noise.
		const doubling = prior && result.size === prior.size * 2;
		const timeRatio =
			doubling && prior.elapsedMs > 0 ? elapsedMs / prior.elapsedMs : null;
		const heapRatio =
			doubling && prior.heapBytes > 0 && heapBytes > 0
				? heapBytes / prior.heapBytes
				: null;
		const documentHeapRatio =
			doubling && prior.documentHeapBytes > 0 && documentHeapBytes > 0
				? documentHeapBytes / prior.documentHeapBytes
				: null;
		previous.set(result.operation, {
			size: result.size,
			elapsedMs,
			heapBytes,
			documentHeapBytes,
		});
		return {
			operation: result.operation,
			axis,
			size: result.size,
			elapsedMs,
			heapBytes,
			documentHeapBytes,
			historyBytesPerEntry,
			timeRatio,
			heapRatio,
			documentHeapRatio,
			flagged:
				(timeRatio ?? 0) > 3 ||
				(heapRatio ?? 0) > 3 ||
				(documentHeapRatio ?? 0) > 3,
		};
	});
}

export function formatTable(rows: ReturnType<typeof summarize>): string {
	const ratio = (value: number | null | undefined) =>
		value == null ? '—' : value.toFixed(2);
	const lines = [
		'operation\tsize\tms\ttime ×2\theap Δ bytes\theap ×2\tdoc bytes\tdoc ×2\thistory bytes/entry\tflag',
	];
	for (const row of rows) {
		if ('error' in row) {
			lines.push(`${row.operation}\t${row.size}\tERROR: ${row.error}`);
		} else {
			lines.push(
				[
					row.operation,
					row.size,
					row.elapsedMs.toFixed(3),
					ratio(row.timeRatio),
					Math.round(row.heapBytes),
					ratio(row.heapRatio),
					Math.round(row.documentHeapBytes),
					ratio(row.documentHeapRatio),
					ratio(row.historyBytesPerEntry),
					row.flagged ? '>3' : '',
				].join('\t'),
			);
		}
	}
	return lines.join('\n');
}
