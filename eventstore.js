import path from 'node:path';
import fs from 'node:fs';
import EventStore from 'event-storage';
import addStorageStats from './projections/StorageStats';
import { readConfigFile, resolveConfigPath } from './config';

const configPath = resolveConfigPath({ importMetaUrl: import.meta.url });
const cachedConfig = readConfigFile(configPath);

function readConfig() {

  return cachedConfig;
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

/**
 * Cached read-only EventStore instances, keyed by resolved store name.
 * Each instance stays open indefinitely; the FileWatcher inside ReadOnlyStorage
 * keeps it up to date when a writer appends new events or creates new streams.
 */
const readOnlyStoreCache = new Map();

export async function commitToEventStore(streamName, events, metadata, storeNameOverride) {
  const config = readConfig();
  const defaultOptions = config.options || {};
  const storeName = resolveStoreName(config, storeNameOverride);
  // Write stores are always created fresh and never cached.
  // addStorageStats (consumer registration) is intentionally omitted here.
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

export default async function getEventStore(options, storeNameOverride) {
  const config = readConfig();
  const defaultOptions = config.options || {};
  const storeName = resolveStoreName(config, storeNameOverride);
  options = Object.assign({}, defaultOptions, options);

  if (options.readOnly !== true) {
    // Non-cached write store – callers are responsible for closing it.
    return new Promise((resolve) => {
      const eventstore = new EventStore(storeName, options);
      eventstore.on('ready', () => resolve({ eventstore }));
    });
  }

  // Read-only: return the cached Promise if available.
  if (readOnlyStoreCache.has(storeName)) {
    return readOnlyStoreCache.get(storeName);
  }

  // Store the Promise synchronously before any await — Node.js is single-threaded,
  // so any concurrent cache miss will reuse this Promise instead of opening a second store.
  const storePromise = initEventStore(storeName, options).then(
    () => new Promise((resolve) => {
      const eventstore = new EventStore(storeName, options);
      eventstore.on('ready', () => addStorageStats(eventstore).then(resolve));
    })
  );
  readOnlyStoreCache.set(storeName, storePromise);
  return storePromise;
}

export async function initEventStore(storeName, options) {
  try {
    console.time('initEventStore');
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
