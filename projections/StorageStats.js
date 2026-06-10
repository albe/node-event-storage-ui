function calculateDistribution(streamName, committedAt, state) {
	const streamCommits = (state.streams?.[streamName] || []).concat([committedAt]).slice(-50);
	const commitRange = streamCommits.length > 1 ? streamCommits[streamCommits.length-1] - streamCommits[0] : 0;
	const commitDateSlice = Math.ceil(commitRange / 5);
	let committedUntil = streamCommits[0] + commitDateSlice;
	const commitDates = Array(5);
	let n = 0;
	const commitsWithin = Array(5).fill(0);
	for (let i=0;i<5;i++) {
		commitDates[i] = committedUntil;
		while (n < streamCommits.length && streamCommits[n] <= committedUntil) {
			commitsWithin[i]++;
			n++;
		}
		committedUntil += commitDateSlice;
	}
	return { streamCommits, commitDates, commitsWithin };
}

const DEFAULT_STARTUP_TIMEOUT_MS = 3000;

/**
 * @param {EventStore} eventstore
 * @constructor
 */
export default function addStorageStats(eventstore, { startupTimeoutMs = DEFAULT_STARTUP_TIMEOUT_MS } = {}) {
	return new Promise(resolve => {
		let settled = false;
		let timeout = null;

		const finish = (storageStats, reason, error = null) => {
			if (settled) {
				return;
			}
			settled = true;
			if (timeout) {
				clearTimeout(timeout);
			}
			if (storageStats) {
				storageStats.removeListener('data', onData);
				storageStats.removeListener('caught-up', onCaughtUp);
				storageStats.removeListener('error', onError);
			}
			if (error) {
				console.warn(`[event-storage-ui] storageStats fallback (${reason}): ${error.message}`);
			} else if (reason === 'timeout') {
				console.warn('[event-storage-ui] storageStats fallback (timeout). Continuing without caught-up signal.');
			}
			resolve({ eventstore, storageStats: storageStats?.state || {} });
		};

		const onData = (event) => {
			try {
				storageStats.setState(state => {
					const _all = calculateDistribution('_all', event.metadata.committedAt, state);
					const stream = calculateDistribution(event.stream, event.metadata.committedAt, state);
					return {
						...state,
						events: (state.events || 0) + 1,
						streams: {
							...state.streams,
							[event.stream]: stream.streamCommits,
							_all: _all.streamCommits
						},
						commits: {
							...state.commits,
							[event.stream]: {times: stream.commitDates, amounts: stream.commitsWithin},
							_all: {times: _all.commitDates, amounts: _all.commitsWithin}
						}
					};
				});
			} catch (error) {
				finish(storageStats, 'data-error', error);
			}
		};

		const onCaughtUp = () => finish(storageStats, 'caught-up');
		const onError = (error) => finish(storageStats, 'error', error instanceof Error ? error : new Error(String(error)));

		let storageStats;
		try {
			storageStats = eventstore.getConsumer('_all', 'storageStats', {});
		} catch (error) {
			finish(null, 'consumer-init-error', error instanceof Error ? error : new Error(String(error)));
			return;
		}

		storageStats.on('data', onData);
		storageStats.on('caught-up', onCaughtUp);
		storageStats.on('error', onError);

		timeout = setTimeout(() => finish(storageStats, 'timeout'), startupTimeoutMs);
	});
}
