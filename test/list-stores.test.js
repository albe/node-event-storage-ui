import { describe, it } from 'mocha';
import expect from 'expect.js';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

describe('listStores', () => {
  it('lists store directories containing their named index file', () => {
    const testDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'event-storage-ui-stores-'));

    try {
      const storesDirectory = path.join(testDirectory, 'stores');
      const storeName = 'valid-store';
      const validStoreDirectory = path.join(storesDirectory, storeName);
      const invalidStoreDirectory = path.join(storesDirectory, 'invalid-store');
      fs.mkdirSync(validStoreDirectory, { recursive: true });
      fs.mkdirSync(path.join(invalidStoreDirectory, '.index'), { recursive: true });
      fs.writeFileSync(path.join(validStoreDirectory, `${storeName}.index`), '');

      const configPath = path.join(testDirectory, 'eventstore.config.json');
      fs.writeFileSync(configPath, JSON.stringify({ storesDirectory }));

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
});
