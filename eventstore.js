import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { randomUUID } from 'node:crypto';
import addStorageStats from './projections/StorageStats';

const MAX_CONSUMER_LOGIC_LENGTH = 10000;
const CONSUMER_LOGIC_TIMEOUT_MS = 200;

function readConfig() {
  return JSON.parse(fs.readFileSync('./eventstore.config.json').toString());
}

export function listStores() {
  const config = readConfig();
  if (!config.storesDirectory) return [];
  try {
    const entries = fs.readdirSync(config.storesDirectory, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isDirectory())
      .filter((entry) =>
        fs.existsSync(path.join(config.storesDirectory, entry.name, '.index'))
      )
      .map((entry) => entry.name);
  } catch {
    return [];
  }
}

function resolveStoreName(config, storeNameOverride) {
  const baseName = storeNameOverride || config.storeName || 'eventstore';
  if (config.storesDirectory) {
    const available = listStores();
    const selected = available.includes(baseName) ? baseName : (available[0] || baseName);
    return path.join(config.storesDirectory, selected);
  }
  return baseName;
}

export function getStoreLockStatus(storeNameOverride) {
  const config = readConfig();
  const storePath = resolveStoreName(config, storeNameOverride);
  return fs.existsSync(path.join(storePath, '.lock'));
}

export async function commitToEventStore(streamName, events, metadata, storeNameOverride) {
  const eventStoreModule = await import('event-storage');
  const EventStore = eventStoreModule.default || eventStoreModule;
  const config = readConfig();
  const defaultOptions = config.options || {};
  const storeName = resolveStoreName(config, storeNameOverride);
  const options = Object.assign({}, defaultOptions, { readOnly: false });

  return new Promise((resolve, reject) => {
    const eventstore = new EventStore(storeName, options);
    eventstore.on('error', (err) => {
      reject(new Error('The store is locked by another process: ' + (err?.message || 'unknown error')));
    });
    eventstore.on('ready', () => {
      try {
        const eventsArray = Array.isArray(events) ? events : [events];
        eventstore.commit(streamName, eventsArray, metadata || undefined);
        eventstore.close();
        resolve({ success: true });
      } catch (err) {
        eventstore.close();
        reject(err);
      }
    });
  });
}

function normalizeStreamNames(streamNamesInput) {
  if (Array.isArray(streamNamesInput)) {
    return Array.from(new Set(streamNamesInput.map((name) => String(name).trim()).filter(Boolean)));
  }

  return Array.from(
    new Set(
      String(streamNamesInput || '')
        .split(',')
        .map((name) => name.trim())
        .filter(Boolean)
    )
  );
}

function validateConsumerLogicInput(consumerLogic) {
  if (typeof consumerLogic !== 'string' || !consumerLogic.trim()) {
    throw new Error('Consumer logic is required.');
  }

  if (consumerLogic.length > MAX_CONSUMER_LOGIC_LENGTH) {
    throw new Error(`Consumer logic is too large (max ${MAX_CONSUMER_LOGIC_LENGTH} characters).`);
  }

  const unsafePatterns = [
    /\b(?:import|export|require)\b/,
    /import\s*\(/,
    /\b(?:process|global|globalThis|module)\b/,
    /\b(?:Function|eval)\b/,
    /<\s*\/?\s*script\b/i
  ];
  if (unsafePatterns.some((pattern) => pattern.test(consumerLogic))) {
    throw new Error('Consumer logic contains unsafe syntax.');
  }
}

function executeConsumerLogic(consumerLogic, event, state, persistState) {
  let nextState = state;
  let calledSetState = false;
  const setState = (update) => {
    let resolvedState;
    try {
      resolvedState = typeof update === 'function' ? update(nextState) : update;
    } catch (err) {
      throw new Error(err?.message || 'setState update failed.');
    }
    nextState = resolvedState;
    calledSetState = true;
    if (persistState) {
      persistState(resolvedState);
    }
  };

  const context = vm.createContext({
    event,
    state: nextState,
    setState
  });

  const result = vm.runInContext(
    `(() => {
      const consumerHandler = (${consumerLogic});
      if (typeof consumerHandler !== 'function') {
        throw new Error('Consumer logic must evaluate to a function.');
      }
      return consumerHandler(event, state, setState);
    })()`,
    context,
    { timeout: CONSUMER_LOGIC_TIMEOUT_MS }
  );

  if (!calledSetState && typeof result !== 'undefined') {
    nextState = result;
  }

  if (typeof nextState === 'undefined') {
    throw new Error('Consumer state must not become undefined.');
  }

  return { nextState, calledSetState };
}

function readEventsForStreams(eventstore, streamNames) {
  if (streamNames.length === 0) {
    throw new Error('At least one stream name is required.');
  }

  if (streamNames.includes('_all')) {
    return eventstore.getAllEvents();
  }

  if (streamNames.length === 1) {
    const stream = eventstore.getEventStream(streamNames[0]);
    if (stream === false) {
      throw new Error(`Stream "${streamNames[0]}" does not exist.`);
    }
    return stream;
  }

  return eventstore.fromStreams(`_internal_preview_${randomUUID()}`, streamNames);
}

function replayConsumer({ stream, consumerLogic, initialState }) {
  let state = Object.freeze(initialState ?? {});
  stream.forEach((payload, metadata, eventStream) => {
    const execution = executeConsumerLogic(consumerLogic, { payload, metadata, stream: eventStream }, state);
    state = Object.freeze(execution.nextState);
  });
  return state;
}

export async function previewConsumerState(
  { streamNames: streamNamesInput, consumerLogic, initialState = {} },
  storeNameOverride
) {
  validateConsumerLogicInput(consumerLogic);
  const streamNames = normalizeStreamNames(streamNamesInput);
  const { eventstore } = await getEventStore({ readOnly: true }, storeNameOverride);

  try {
    const stream = readEventsForStreams(eventstore, streamNames);
    const state = replayConsumer({ stream, consumerLogic, initialState });
    return { state, streamNames };
  } finally {
    eventstore.close();
  }
}

export async function createConsumer(
  { streamName, consumerName, consumerLogic, initialState = {}, since = 0 },
  storeNameOverride
) {
  validateConsumerLogicInput(consumerLogic);

  if (typeof streamName !== 'string' || !streamName.trim()) {
    throw new Error('Stream name is required.');
  }

  if (typeof consumerName !== 'string' || !consumerName.trim()) {
    throw new Error('Consumer name is required.');
  }

  const normalizedStreamName = streamName.trim();
  const normalizedConsumerName = consumerName.trim();

  await previewConsumerState(
    { streamNames: [normalizedStreamName], consumerLogic, initialState },
    storeNameOverride
  );

  const { eventstore } = await getEventStore({ readOnly: false }, storeNameOverride);

  try {
    if (eventstore.getEventStream(normalizedStreamName) === false) {
      throw new Error(`Stream "${normalizedStreamName}" does not exist.`);
    }

    const consumer = eventstore.getConsumer(
      normalizedStreamName,
      normalizedConsumerName,
      initialState,
      since
    );

    await new Promise((resolve, reject) => {
      consumer.on('error', reject);
      consumer.on('data', (event) => {
        try {
          const execution = executeConsumerLogic(consumerLogic, event, consumer.state, (resolvedState) =>
            consumer.setState(resolvedState)
          );
          if (!execution.calledSetState && execution.nextState !== consumer.state) {
            consumer.setState(execution.nextState);
          }
        } catch (err) {
          reject(err);
        }
      });
      consumer.on('caught-up', () => resolve({ position: consumer.position, state: consumer.state }));
      consumer.start();
    });

    return {
      consumerIdentifier: `${normalizedStreamName}.${normalizedConsumerName}`,
      streamName: normalizedStreamName,
      consumerName: normalizedConsumerName
    };
  } finally {
    eventstore.close();
  }
}

export default async function getEventStore(options, storeNameOverride) {
  const eventStoreModule = await import('event-storage');
  const EventStore = eventStoreModule.default || eventStoreModule;
  const config = readConfig();
  const defaultOptions = config.options || {};
  const storeName = resolveStoreName(config, storeNameOverride);
  options = Object.assign(defaultOptions, options);
  if (options.readOnly === true) {
    await initEventStore(storeName, options);
  }

  return new Promise((resolve) => {
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
    const eventStoreModule = await import('event-storage');
    const EventStore = eventStoreModule.default || eventStoreModule;
    await new Promise((resolve) => {
      const eventstore = new EventStore(storeName, Object.assign({}, options, { readOnly: false }));
      eventstore.on('ready', () => {
        if (eventstore.length > 0) {
          eventstore.close();
          resolve();
          return;
        }
        eventstore.commit('foo-bar', [{ some: 'foo' }, { some: 'bar' }]);
        eventstore.commit(
          `requests-2021-${new Date().getMonth()}`,
          [
            {
              type: 'Request',
              ip: '123.231.132.213',
              id: 1,
              headers: {
                'User-Agent': [
                  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.77 Safari/537.36'
                ]
              },
              body: ''
            }
          ],
          { correlationId: 1234 }
        );
        eventstore.commit(
          'users',
          [
            {
              type: 'UserRegistered',
              username: 'admin',
              userId: 1,
              registeredAt: '2021-06-07T15:30:18.237Z'
            }
          ],
          { correlationId: 1234, source: 'ip-1' }
        );
        eventstore.commit(
          `requests-2021-${new Date().getMonth()}`,
          [
            {
              type: 'Request',
              ip: '123.231.132.213',
              id: 2,
              headers: {
                'User-Agent': [
                  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.77 Safari/537.36'
                ]
              },
              body: ''
            }
          ],
          { correlationId: 1235 }
        );
        eventstore.commit(
          'users',
          [
            {
              type: 'UserRegistered',
              username: 'a.berl',
              userId: 2,
              registeredAt: new Date().toISOString()
            }
          ],
          { correlationId: 1235, source: 'ip-2' }
        );
        eventstore.commit('users', [{ type: 'UserConfirmed', userId: 1 }], { correlationId: 1234 });
        eventstore.commit(
          'users',
          [
            {
              type: 'UserRightsGranted',
              userId: 1,
              roles: ['Admin', 'User']
            }
          ],
          { correlationId: 1234 }
        );
        const actions = ['LoggedIn', 'UserEdited', 'EmailChanged', 'FileDownloaded'];
        for (let i = 0; i < 50; i++) {
          const timestamp =
            Date.now() - 1000 * 3600 * 24 + i * 1000 * 300 + Math.floor(Math.random() * 1000 * 300);
          eventstore.commit(
            'user-actions',
            [
              {
                type: actions[Math.floor(Math.random() * actions.length)],
                at: new Date(timestamp).toISOString(),
                userId: 1
              }
            ],
            { committedAt: timestamp }
          );
        }
        eventstore.close();
        resolve();
      });
    });
  } catch {
  } finally {
    console.timeEnd('initEventStore');
  }
}
