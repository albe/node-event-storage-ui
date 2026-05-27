import vm from 'node:vm';
import { randomUUID } from 'node:crypto';
import getEventStore from '../eventstore';

const MAX_CONSUMER_LOGIC_LENGTH = 10000;
const CONSUMER_LOGIC_TIMEOUT_MS = 200;

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

function buildConsumerRouteIdentifier(streamName, consumerName) {
  const indexName = streamName === '_all' ? '_all' : `stream-${streamName}`;
  return `${indexName}.${consumerName}`;
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
      consumerIdentifier: buildConsumerRouteIdentifier(normalizedStreamName, normalizedConsumerName),
      streamName: normalizedStreamName,
      consumerName: normalizedConsumerName
    };
  } finally {
    eventstore.close();
  }
}
