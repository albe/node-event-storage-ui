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

/**
 * @param {EventStore} eventstore
 * @constructor
 */
export default function addStorageStats(eventstore) {
	return new Promise(resolve => {
		const storageStats = eventstore.getConsumer('_all', 'storageStats', {});
		storageStats.on('data', (event) => {
			storageStats.setState(state => {
				const _all = calculateDistribution('_all', event.metadata.committedAt, state);
				const stream = calculateDistribution(event.stream, event.metadata.committedAt, state);
				//console.log(event.stream, event.metadata);
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
		});
		storageStats.on('caught-up', () => resolve({eventstore, storageStats: storageStats.state}));
	});
}
