import { json } from '@remix-run/node';
import { Form, Link, useActionData, useFetcher, useLoaderData, useNavigation } from '@remix-run/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import getEventStore, { createConsumer, previewConsumerState } from '../../eventstore';
import Json from '../components/json';
import usePagination from '../hooks/paginate';

export const meta = () => [{ title: 'event-storage: Consumers' }];
const DEFAULT_CONSUMER_LOGIC =
  '(event, state, setState) => {\n  setState({ ...state, count: (state.count || 0) + 1 });\n}';

export async function loader({ request }) {
  const url = new URL(request.url);
  const storeNameOverride = url.searchParams.get('store') || undefined;
  const { eventstore } = await getEventStore({ readOnly: true }, storeNameOverride);

  try {
    const consumers = await new Promise((resolve, reject) => {
      eventstore.scanConsumers((err, scannedConsumers) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(scannedConsumers);
      });
    });

    return json({
      streamNames: Object.keys(eventstore.streams).sort(),
      consumers: consumers.map((consumerIdentifier) =>
        [consumerIdentifier].concat(consumerIdentifier.split('.', 2))
      )
    });
  } finally {
    eventstore.close();
  }
}

function tryParseInitialState(initialStateText) {
  if (!initialStateText || !initialStateText.trim()) {
    return {};
  }

  let initialState;
  try {
    initialState = JSON.parse(initialStateText);
  } catch {
    throw new Error('Initial state must be valid JSON.');
  }

  if (initialState === null || Array.isArray(initialState) || typeof initialState !== 'object') {
    throw new Error('Initial state must be a JSON object.');
  }

  return initialState;
}

export async function action({ request }) {
  const url = new URL(request.url);
  const storeNameOverride = url.searchParams.get('store') || undefined;
  const formData = await request.formData();
  const intent = formData.get('intent');
  const streamName = String(formData.get('streamName') || '').trim();
  const consumerName = String(formData.get('consumerName') || '').trim();
  const consumerLogic = String(formData.get('consumerLogic') || '').trim();
  const initialStateText = String(formData.get('initialState') || '').trim();

  try {
    const initialState = tryParseInitialState(initialStateText);

    if (intent === 'preview') {
      const result = await previewConsumerState(
        { streamNames: [streamName], consumerLogic, initialState },
        storeNameOverride
      );
      return json({ intent, previewState: result.state, streamNames: result.streamNames });
    }

    if (intent === 'create') {
      const result = await createConsumer(
        { streamName, consumerName, consumerLogic, initialState },
        storeNameOverride
      );
      return json({ intent, success: true, consumerIdentifier: result.consumerIdentifier });
    }

    return json({ error: 'Unknown action.' }, { status: 400 });
  } catch (err) {
    return json(
      {
        intent,
        error: err?.message || 'Consumer operation failed.'
      },
      { status: 400 }
    );
  }
}

export default function Consumers() {
  const { consumers, streamNames } = useLoaderData();
  const actionData = useActionData();
  const previewFetcher = useFetcher();
  const navigation = useNavigation();
  const [start, end, nextPage, prevPage, hasNext, hasPrev] = usePagination(
    consumers.length
  );
  const [streamName, setStreamName] = useState(streamNames[0] || '');
  const [consumerName, setConsumerName] = useState('');
  const [consumerLogic, setConsumerLogic] = useState(DEFAULT_CONSUMER_LOGIC);
  const [initialState, setInitialState] = useState('{}');

  useEffect(() => {
    if (streamName === '' && streamNames.length > 0) {
      setStreamName(streamNames[0]);
    }
  }, [streamName, streamNames]);

  const isCreating =
    navigation.state === 'submitting' && navigation.formData?.get('intent') === 'create';
  const isPreviewing = previewFetcher.state !== 'idle';
  const isCreateSuccess = actionData?.intent === 'create' && actionData?.success;
  const createError = actionData?.intent === 'create' ? actionData?.error : null;
  const previewError = previewFetcher.data?.intent === 'preview' ? previewFetcher.data?.error : null;
  const previewState = previewFetcher.data?.intent === 'preview' ? previewFetcher.data?.previewState : null;
  const initialStateValidation = useMemo(() => {
    if (!initialState.trim()) {
      return { isValid: true, error: null };
    }
    try {
      const parsed = JSON.parse(initialState);
      if (parsed === null || Array.isArray(parsed) || typeof parsed !== 'object') {
        return { isValid: false, error: 'Initial state must be a JSON object.' };
      }
      return { isValid: true, error: null };
    } catch {
      return { isValid: false, error: 'Initial state must be valid JSON.' };
    }
  }, [initialState]);

  const canSubmit = useMemo(
    () =>
      streamNames.includes(streamName) &&
      !!consumerName.trim() &&
      !!consumerLogic.trim() &&
      initialStateValidation.isValid,
    [streamNames, streamName, consumerName, consumerLogic, initialStateValidation.isValid]
  );

  const onPreview = useCallback(() => {
    previewFetcher.submit(
      {
        intent: 'preview',
        streamName,
        consumerName,
        consumerLogic,
        initialState
      },
      { method: 'post' }
    );
  }, [previewFetcher, streamName, consumerName, consumerLogic, initialState]);

  return (
    <div className="card">
      <div className="card-header card-header-info">
        <h2>Consumers</h2>
      </div>
      <div className="card-body">
        {isCreateSuccess && (
          <div className="alert alert-success" role="alert">
            ✅ Consumer &quot;{actionData.consumerIdentifier}&quot; created.
          </div>
        )}
        {createError && (
          <div className="alert alert-danger" role="alert">
            ❌ {createError}
          </div>
        )}
        <div className="row">
          <div className="col-md-6">
            <h4>Add Consumer</h4>
            <div className="form-group">
              <label htmlFor="streamName">
                <strong>Stream Name</strong>
              </label>
              <select
                id="streamName"
                name="streamName"
                className="form-control"
                value={streamName}
                onChange={(e) => setStreamName(e.target.value)}
              >
                {streamNames.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="consumerName">
                <strong>Consumer Name</strong>
              </label>
              <input
                id="consumerName"
                name="consumerName"
                type="text"
                className="form-control"
                value={consumerName}
                onChange={(e) => setConsumerName(e.target.value)}
                placeholder="e.g. myConsumer"
              />
            </div>
            <div className="form-group">
              <label htmlFor="consumerLogic">
                <strong>Consumer Logic (JavaScript function)</strong>
              </label>
              <textarea
                id="consumerLogic"
                name="consumerLogic"
                className="form-control"
                rows={10}
                value={consumerLogic}
                onChange={(e) => setConsumerLogic(e.target.value)}
                style={{ fontFamily: 'monospace', fontSize: 13 }}
              />
            </div>
            <div className="form-group">
              <label htmlFor="initialState">
                <strong>Initial State (JSON object)</strong>
              </label>
              <textarea
                id="initialState"
                name="initialState"
                className="form-control"
                rows={4}
                value={initialState}
                onChange={(e) => setInitialState(e.target.value)}
                style={{ fontFamily: 'monospace', fontSize: 13 }}
              />
              {!initialStateValidation.isValid && (
                <small className="text-danger">{initialStateValidation.error}</small>
              )}
            </div>
            <div style={{ marginTop: 16 }}>
              <button
                type="button"
                className="btn btn-default"
                disabled={!canSubmit || isPreviewing}
                onClick={onPreview}
              >
                {isPreviewing ? 'Previewing…' : 'Preview'}
              </button>
              <Form method="post" style={{ display: 'inline-block', marginLeft: 8 }}>
                <input type="hidden" name="intent" value="create" />
                <input type="hidden" name="streamName" value={streamName} />
                <input type="hidden" name="consumerName" value={consumerName} />
                <input type="hidden" name="consumerLogic" value={consumerLogic} />
                <input type="hidden" name="initialState" value={initialState} />
                <button type="submit" className="btn btn-info" disabled={!canSubmit || isCreating}>
                  {isCreating ? 'Creating…' : 'Create Consumer'}
                </button>
              </Form>
            </div>
          </div>
          <div className="col-md-6">
            <h4>Preview State</h4>
            <div
              style={{
                minHeight: 200,
                padding: 12,
                background: '#272822',
                borderRadius: 4,
                color: '#f8f8f2',
                fontSize: 13
              }}
            >
              {!previewError && previewState === null && (
                <span style={{ color: '#bdbdbd' }}>Run preview to evaluate consumer state.</span>
              )}
              {previewError && <span className="text-danger">❌ {previewError}</span>}
              {!previewError && previewState !== null && <Json data={previewState} collapsed={false} />}
            </div>
          </div>
        </div>
        <hr />
        <table className="table table-hover">
          <thead>
            <tr>
              <th>Name</th>
              <th>Stream</th>
            </tr>
          </thead>
          <tbody>
            {consumers.slice(start, end).map(([consumerIdentifier, streamName, consumerName]) => (
              <tr key={consumerIdentifier}>
                <td>
                  <Link to={`/consumers/${encodeURIComponent(consumerIdentifier)}`}>
                    {consumerName}
                  </Link>
                </td>
                <td>
                  <Link to={`/consumers/${encodeURIComponent(consumerIdentifier)}`}>
                    {streamName}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={2}>
                <button disabled={!hasPrev} className="btn btn-info" onClick={prevPage}>
                  Prev
                </button>
                <button disabled={!hasNext} className="btn btn-info" onClick={nextPage}>
                  Next
                </button>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
