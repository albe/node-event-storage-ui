import fs from 'fs';
import addStorageStats from "./projections/StorageStats";

export default async function getEventStore(options) {
	const EventStore = require('event-storage');
	const config = JSON.parse(fs.readFileSync('./eventstore.config.json').toString());
	const defaultOptions = config.options || {};
	const storeName = config.storeName || 'eventstore';
	options = Object.assign(defaultOptions, options);
	if (options.readOnly === true) {
		await initEventStore(storeName, options);
	}

	return new Promise(resolve => {
		const eventstore = new EventStore(storeName, options);
		eventstore.on('ready', () => {
			if (options.readOnly === true) {
				addStorageStats(eventstore).then(resolve);
			} else {
				resolve({ eventstore });
			}
		});
	});
}


export async function initEventStore(storeName, options) {
	try {
		console.time('initEventStore');
		await getEventStore(storeName, Object.assign({}, options, { readOnly: false })).then(({eventstore}) => {
			if (eventstore.length > 0) {
				eventstore.close();
				return;
			}
			eventstore.commit('foo-bar', [{some: 'foo'}, {some: 'bar'}]);
			eventstore.commit('requests-2021-' + (new Date()).getMonth(), [{
				type: 'Request',
				ip: '123.231.132.213',
				id: 1,
				headers: {'User-Agent': ['Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.77 Safari/537.36']},
				body: ''
			}], {correlationId: 1234});
			eventstore.commit('users', [{
				type: 'UserRegistered',
				username: 'admin',
				userId: 1,
				registeredAt: "2021-06-07T15:30:18.237Z"
			}], {correlationId: 1234, source: 'ip-1'});
			eventstore.commit('requests-2021-' + (new Date()).getMonth(), [{
				type: 'Request',
				ip: '123.231.132.213',
				id: 2,
				headers: {'User-Agent': ['Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.77 Safari/537.36']},
				body: ''
			}], {correlationId: 1235});
			eventstore.commit('users', [{
				type: 'UserRegistered',
				username: 'a.berl',
				userId: 2,
				registeredAt: (new Date()).toISOString()
			}], {correlationId: 1235, source: 'ip-2'});
			eventstore.commit('users', [{type: 'UserConfirmed', userId: 1}], {correlationId: 1234});
			eventstore.commit('users', [{
				type: 'UserRightsGranted',
				userId: 1,
				roles: ['Admin', 'User']
			}], {correlationId: 1234});
			const actions = ['LoggedIn', 'UserEdited', 'EmailChanged', 'FileDownloaded'];
			for (let i = 0; i < 50; i++) {
				const timestamp = Date.now() - 1000 * 3600 * 24 + i * 1000 * 300 + Math.floor(Math.random() * 1000 * 300);
				eventstore.commit('user-actions', [{
					type: actions[Math.floor(Math.random() * actions.length)],
					at: (new Date(timestamp)).toISOString(),
					userId: 1
				}], { committedAt: timestamp });
			}
			eventstore.close();
		});
	} catch {
	} finally { console.timeEnd('initEventStore'); }
}
