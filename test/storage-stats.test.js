import { EventEmitter } from 'node:events';
import { describe, it } from 'mocha';
import expect from 'expect.js';
import addStorageStats from '../projections/StorageStats.js';

class FakeConsumer extends EventEmitter {
  constructor() {
    super();
    this.state = {};
  }

  setState(updater) {
    this.state = updater(this.state || {});
  }
}

class FakeEventStore {
  constructor(consumerFactory) {
    this.consumerFactory = consumerFactory;
  }

  getConsumer() {
    return this.consumerFactory();
  }
}

describe('StorageStats hardening', () => {
  it('resolves on caught-up and updates state from data', async () => {
    const consumer = new FakeConsumer();
    const eventstore = new FakeEventStore(() => consumer);

    const promise = addStorageStats(eventstore, { startupTimeoutMs: 200 });

    consumer.emit('data', {
      stream: 'users-1',
      metadata: { committedAt: Date.now() }
    });
    consumer.emit('caught-up');

    const result = await promise;
    expect(result).to.have.key('eventstore');
    expect(result).to.have.key('storageStats');
    expect(result.storageStats.events).to.be(1);
    expect(result.storageStats.streams).to.have.key('users-1');
    expect(result.storageStats.streams).to.have.key('_all');
  });

  it('falls back cleanly when consumer emits error', async () => {
    const consumer = new FakeConsumer();
    const eventstore = new FakeEventStore(() => consumer);

    const promise = addStorageStats(eventstore, { startupTimeoutMs: 200 });
    consumer.emit('error', new Error('boom'));

    const result = await promise;
    expect(result).to.have.key('eventstore');
    expect(result).to.have.key('storageStats');
  });

  it('falls back after timeout when caught-up never arrives', async () => {
    const consumer = new FakeConsumer();
    const eventstore = new FakeEventStore(() => consumer);

    const startedAt = Date.now();
    const result = await addStorageStats(eventstore, { startupTimeoutMs: 50 });
    const duration = Date.now() - startedAt;

    expect(result).to.have.key('eventstore');
    expect(result).to.have.key('storageStats');
    expect(duration >= 40).to.be(true);
  });

  it('falls back when getConsumer throws', async () => {
    const eventstore = new FakeEventStore(() => {
      throw new Error('init failed');
    });

    const result = await addStorageStats(eventstore, { startupTimeoutMs: 200 });
    expect(result).to.have.key('eventstore');
    expect(result).to.have.key('storageStats');
  });
});

