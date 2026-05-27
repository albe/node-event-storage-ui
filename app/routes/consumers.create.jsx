import { data } from 'react-router';
import { Form, Link, useActionData, useFetcher, useLoaderData, useNavigation } from 'react-router';
import { useEffect, useMemo, useState } from 'react';
import getEventStore from '../../eventstore';
import { createConsumer, previewConsumerState } from '../consumers.server';
import Json from '../components/json';

const defaultConsumerLogic =
  '(event, state, setState) => {\n  setState({ ...state, count: (state.count || 0) + 1 });\n}';

export const meta = () => [{ title: 'event-storage: Create Consumer' }];

export async function loader({ request }) {
  const url = new URL(request.url);
  const storeNameOverride = url.searchParams.get('store') || undefined;
  const storeSearch = storeNameOverride ? `?store=${encodeURIComponent(storeNameOverride)}` : '';
  const { eventstore } = await getEventStore({ readOnly: true }, storeNameOverride);

  return {
    storeSearch,
    streamNames: Object.keys(eventstore.streams).sort(),
    registeredConsumerCount: await new Promise((resolve, reject) => {
      eventstore.scanConsumers((err, consumers) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(consumers.length);
      });
    })
  };
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
  const storeSearch = storeNameOverride ? `?store=${encodeURIComponent(storeNameOverride)}` : '';
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
      return { intent, previewState: result.state, streamNames: result.streamNames };
    }

    if (intent === 'create') {
      const result = await createConsumer(
        { streamName, consumerName, consumerLogic, initialState },
        storeNameOverride
      );
      return {
        intent,
        success: true,
        storeSearch,
        consumerIdentifier: result.consumerIdentifier,
        consumerDetailPath: `/consumers/${encodeURIComponent(result.consumerIdentifier)}${storeSearch}`
      };
    }

    return data({ error: 'Unknown action.' }, { status: 400 });
  } catch (err) {
    return data(
      {
        intent,
        error: err?.message || 'Consumer operation failed.'
      },
      { status: 400 }
    );
  }
}

export default function CreateConsumer() {
  const { streamNames, registeredConsumerCount, storeSearch } = useLoaderData();
  const actionData = useActionData();
  const previewFetcher = useFetcher();
  const navigation = useNavigation();

  const [streamName, setStreamName] = useState(streamNames[0] || '');
  const [consumerName, setConsumerName] = useState('');
  const [consumerLogic, setConsumerLogic] = useState(defaultConsumerLogic);
  const [initialState, setInitialState] = useState('{}');

  useEffect(() => {
    if (streamName === '' && streamNames.length > 0) {
      setStreamName(streamNames[0]);
    }
  }, [streamName, streamNames]);

  const isCreating = navigation.state === 'submitting' && navigation.formData?.get('intent') === 'create';
  const isPreviewing = previewFetcher.state !== 'idle';
  const isCreateSuccess = actionData?.intent === 'create' && actionData?.success;
  const createError = actionData?.intent === 'create' ? actionData?.error : null;
  const previewResponse =
    previewFetcher.data?.intent === 'preview'
      ? previewFetcher.data
      : actionData?.intent === 'preview'
        ? actionData
        : null;
  const previewError = previewResponse?.error || null;
  const previewState = previewResponse?.previewState ?? null;

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

  const canPreview = useMemo(
    () => streamNames.includes(streamName) && !!consumerLogic.trim() && initialStateValidation.isValid,
    [streamNames, streamName, consumerLogic, initialStateValidation.isValid]
  );

  const canCreate = useMemo(() => canPreview && !!consumerName.trim(), [canPreview, consumerName]);

  return (
    <div className="page-stack">
      <section className="page-hero hero">
        <div className="hero-text">
          <div className="page-eyebrow eyebrow">Consumers</div>
          <h2 className="page-title hero-title">Create Consumer</h2>
          <p className="page-subtitle hero-sub">
            Create projection consumers and preview their derived state before saving.
          </p>
        </div>
        <div className="page-actions hero-actions">
          <span className="page-pill">
            <i className="material-icons">sync_alt</i>
            {registeredConsumerCount} registered
          </span>
          <span className="page-pill">
            <i className="material-icons">view_stream</i>
            {streamNames.length} streams available
          </span>
          <Link to={`/consumers${storeSearch}`} className="btn btn--ghost">
            Consumer Browser
          </Link>
        </div>
      </section>

      {(isCreateSuccess || createError) && (
        <section className="admin-panel card">
          <div className="admin-panel__body card-body card-body--panel">
            {isCreateSuccess && (
              <div className="alert success" role="alert">
                ✅ Consumer &quot;{actionData.consumerIdentifier}&quot; created.{' '}
                <Link to={actionData.consumerDetailPath}>Open details</Link>
              </div>
            )}
            {createError && (
              <div className="alert danger" role="alert">
                ❌ {createError}
              </div>
            )}
          </div>
        </section>
      )}

      <section className="panel-grid panel-grid--halves">
        <section className="admin-panel card">
          <div className="admin-panel__header card-head">
            <div className="card-title-wrap">
              <div className="panel-eyebrow eyebrow">Create</div>
              <h3 className="panel-title card-title">Add Consumer</h3>
            </div>
          </div>
          <div className="admin-panel__body card-body card-body--panel">
            <div className="form-stack">
              <div className="form-group field">
                <label htmlFor="streamName" className="field-label">
                  Stream Name
                </label>
                <select
                  id="streamName"
                  name="streamName"
                  className="select"
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
              <div className="form-group field">
                <label htmlFor="consumerName" className="field-label">
                  Consumer Name
                </label>
                <input
                  id="consumerName"
                  name="consumerName"
                  type="text"
                  className="input"
                  value={consumerName}
                  onChange={(e) => setConsumerName(e.target.value)}
                  placeholder="e.g. myConsumer"
                />
                <small className="field-help">Optional for preview. Required to create a consumer.</small>
              </div>
              <div className="form-group field">
                <label htmlFor="consumerLogic" className="field-label">
                  Consumer Logic (JavaScript function)
                </label>
                <textarea
                  id="consumerLogic"
                  name="consumerLogic"
                  className="textarea text-mono"
                  rows={10}
                  value={consumerLogic}
                  placeholder={defaultConsumerLogic}
                  onChange={(e) => setConsumerLogic(e.target.value)}
                />
              </div>
              <div className="form-group field">
                <label htmlFor="initialState" className="field-label">
                  Initial State (JSON object)
                </label>
                <textarea
                  id="initialState"
                  name="initialState"
                  className="textarea text-mono"
                  rows={4}
                  value={initialState}
                  placeholder="{}"
                  onChange={(e) => setInitialState(e.target.value)}
                />
                {!initialStateValidation.isValid && (
                  <small className="field-error">{initialStateValidation.error}</small>
                )}
              </div>
              <div className="form-actions">
                <previewFetcher.Form method="post">
                  <input type="hidden" name="intent" value="preview" />
                  <input type="hidden" name="streamName" value={streamName} />
                  <input type="hidden" name="consumerName" value={consumerName.trim() || 'preview-state'} />
                  <input type="hidden" name="consumerLogic" value={consumerLogic} />
                  <input type="hidden" name="initialState" value={initialState} />
                  <button type="submit" className="btn btn--ghost" disabled={!canPreview || isPreviewing}>
                    {isPreviewing ? 'Previewing…' : 'Preview'}
                  </button>
                </previewFetcher.Form>
                <span className="spacer" />
                <Form method="post">
                  <input type="hidden" name="intent" value="create" />
                  <input type="hidden" name="streamName" value={streamName} />
                  <input type="hidden" name="consumerName" value={consumerName} />
                  <input type="hidden" name="consumerLogic" value={consumerLogic} />
                  <input type="hidden" name="initialState" value={initialState} />
                  <button type="submit" className="btn btn--primary" disabled={!canCreate || isCreating}>
                    {isCreating ? 'Creating…' : 'Create Consumer'}
                  </button>
                </Form>
              </div>
            </div>
          </div>
        </section>

        <section className="admin-panel card">
          <div className="admin-panel__header card-head">
            <div className="card-title-wrap">
              <div className="panel-eyebrow eyebrow">Preview</div>
              <h3 className="panel-title card-title">Preview State</h3>
            </div>
          </div>
          <div className="admin-panel__body card-body card-body--panel">
            <div className="json-surface">
              {!previewError && previewState === null && (
                <span className="text-muted">Run preview to evaluate consumer state.</span>
              )}
              {previewError && <span className="text-danger">❌ {previewError}</span>}
              {!previewError && previewState !== null && <Json data={previewState} collapsed={false} />}
            </div>
          </div>
        </section>
      </section>
    </div>
  );
}



