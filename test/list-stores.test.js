import { describe, it } from 'mocha';
import expect from 'expect.js';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

describe('listStores', () => {
  for (const [description, streamsDirectory] of [
    ['the default streams directory', undefined],
    ['a configured relative streams directory', 'custom/streams']
  ]) {
    it(`lists store directories containing their named index file in ${description}`, () => {
      const testDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'event-storage-ui-stores-'));

      try {
        const storesDirectory = path.join(testDirectory, 'stores');
        const storeName = 'valid-store';
        const validStoreDirectory = path.join(storesDirectory, storeName);
        const invalidStoreDirectory = path.join(storesDirectory, 'invalid-store');
        const streamsPath = streamsDirectory || 'streams';
        fs.mkdirSync(path.join(validStoreDirectory, streamsPath), { recursive: true });
        fs.mkdirSync(path.join(invalidStoreDirectory, streamsPath, '.index'), { recursive: true });
        fs.writeFileSync(path.join(validStoreDirectory, streamsPath, `${storeName}.index`), '');

        const configPath = path.join(testDirectory, 'eventstore.config.json');
        fs.writeFileSync(configPath, JSON.stringify({
          storesDirectory,
          options: streamsDirectory ? { streamsDirectory } : {}
        }));

        const moduleUrl = new URL('../eventstore.js', import.meta.url).href;
        const result = spawnSync(
          process.execPath,
          ['--input-type=module', '-e', `import { listStores } from '${moduleUrl}'; process.stdout.write(JSON.stringify(listStores()));`],
          {
            encoding: 'utf8',
            env: { ...process.env, EVENT_STORAGE_UI_CONFIG: configPath }
          }
        );

        expect(result.status).to.be(0);
        expect(JSON.parse(result.stdout)).to.eql([storeName]);
      } finally {
        fs.rmSync(testDirectory, { recursive: true, force: true });
      }
    });
  }

  it('rejects absolute and parent-relative streams directories', () => {
    const testDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'event-storage-ui-stores-'));

    try {
      const configPath = path.join(testDirectory, 'eventstore.config.json');
      const moduleUrl = new URL('../eventstore.js', import.meta.url).href;
      for (const streamsDirectory of [path.join(testDirectory, 'absolute'), '../outside']) {
        fs.writeFileSync(configPath, JSON.stringify({
          storesDirectory: path.join(testDirectory, 'stores'),
          options: { streamsDirectory }
        }));

        const result = spawnSync(
          process.execPath,
          ['--input-type=module', '-e', `import { listStores } from '${moduleUrl}'; listStores();`],
          {
            encoding: 'utf8',
            env: { ...process.env, EVENT_STORAGE_UI_CONFIG: configPath }
          }
        );

        expect(result.status).not.to.be(0);
        expect(result.stderr).to.contain('options.streamsDirectory must');
      }
    } finally {
      fs.rmSync(testDirectory, { recursive: true, force: true });
    }
  });

  it('opens each store with its streams directory inside the store directory', () => {
    const testDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'event-storage-ui-stores-'));

    try {
      const storesDirectory = path.join(testDirectory, 'stores');
      const storeName = 'custom-store';
      const storageDirectory = path.join(storesDirectory, storeName);
      const streamsDirectory = 'custom/streams';
      const fullStreamsDirectory = path.join(storageDirectory, streamsDirectory);
      fs.mkdirSync(fullStreamsDirectory, { recursive: true });
      fs.writeFileSync(path.join(fullStreamsDirectory, `${storeName}.index`), '');

      const configPath = path.join(testDirectory, 'eventstore.config.json');
      fs.writeFileSync(configPath, JSON.stringify({
        storesDirectory,
        options: { streamsDirectory }
      }));

      const eventstoreModuleUrl = new URL('../eventstore.js', import.meta.url).href;
      const script = `import getEventStore from '${eventstoreModuleUrl}'; const { eventstore } = await getEventStore({ readOnly: false }, '${storeName}'); const result = { storageDirectory: eventstore.storageDirectory, streamsDirectory: eventstore.streamsDirectory }; eventstore.close(); process.stdout.write(JSON.stringify(result));`;
      const result = spawnSync(
        process.execPath,
        ['--input-type=module', '-e', script],
        {
          encoding: 'utf8',
          env: { ...process.env, EVENT_STORAGE_UI_CONFIG: configPath }
        }
      );

      expect(result.status).to.be(0);
      expect(JSON.parse(result.stdout)).to.eql({
        storageDirectory,
        streamsDirectory: fullStreamsDirectory
      });
    } finally {
      fs.rmSync(testDirectory, { recursive: true, force: true });
    }
  });
});
