import { useState, useCallback } from 'react';
import { data } from 'react-router';
import { useLoaderData, useActionData, useNavigation, useSearchParams } from 'react-router';
import { Form } from 'react-router';
import { getStoreLockStatus, commitToEventStore } from '../../eventstore';
import Json from '../components/json';

export const meta = () => [{ title: 'event-storage: Write Events' }];

export async function loader({ request }) {
  const url = new URL(request.url);
  const storeNameOverride = url.searchParams.get('store') || undefined;
  const storeLocked = getStoreLockStatus(storeNameOverride);
  return { storeLocked, storeNameOverride: storeNameOverride || null };
}

export async function action({ request }) {
  const url = new URL(request.url);
  const storeNameOverride = url.searchParams.get('store') || undefined;

  const formData = await request.formData();
  const streamName = formData.get('streamName')?.trim();
  const eventsJson = formData.get('events')?.trim();
  const metadataJson = formData.get('metadata')?.trim();

  if (!streamName) {
    return data({ error: 'Stream name is required.' }, { status: 400 });
  }

  let events;
  try {
    events = JSON.parse(eventsJson);
  } catch {
    return data({ error: 'Events field contains invalid JSON.' }, { status: 400 });
  }

  let metadata = undefined;
  if (metadataJson) {
    try {
      metadata = JSON.parse(metadataJson);
    } catch {
      return data({ error: 'Metadata field contains invalid JSON.' }, { status: 400 });
    }
  }

  try {
    await commitToEventStore(streamName, events, metadata, storeNameOverride);
    return { success: true, streamName };
  } catch (err) {
    return data(
      { error: err?.message || 'Failed to commit events. The store may be locked.' },
      { status: 500 }
    );
  }
}

function tryParseJson(str) {
  if (!str || !str.trim()) return { value: null, error: null, empty: true };
  try {
    return { value: JSON.parse(str), error: null, empty: false };
  } catch (e) {
    return { value: null, error: e.message, empty: false };
  }
}

function shouldShowPreview(result) {
  return !result.empty && !result.error && result.value !== null;
}

function isFormValid(streamName, eventsResult) {
  return !!streamName.trim() && !eventsResult.error && !eventsResult.empty;
}

export default function WriteEvents() {
  const { storeLocked, storeNameOverride } = useLoaderData();
  const actionData = useActionData();
  const navigation = useNavigation();
  const [searchParams] = useSearchParams();
  const isSubmitting = navigation.state === 'submitting';

  const [streamName, setStreamName] = useState('');
  const [eventsText, setEventsText] = useState('');
  const [metadataText, setMetadataText] = useState('');
  const [metadataExpanded, setMetadataExpanded] = useState(false);

  const eventsResult = tryParseJson(eventsText);
  const metadataResult = tryParseJson(metadataText);

  const handleStreamNameChange = useCallback((e) => setStreamName(e.target.value), []);
  const handleEventsChange = useCallback((e) => setEventsText(e.target.value), []);
  const handleMetadataChange = useCallback((e) => setMetadataText(e.target.value), []);

  const storeName = storeNameOverride || searchParams.get('store') || 'eventstore';

  if (storeLocked) {
    return (
      <div className="page-stack">
        <section className="page-hero">
          <div>
            <div className="page-eyebrow">Writer</div>
            <h2 className="page-title">Write Events ({storeName})</h2>
            <p className="page-subtitle">
              Writing is disabled while this store is locked by an external process.
            </p>
          </div>
          <div className="page-actions">
            <span className="page-pill">
              <i className="material-icons">lock</i>
              Locked
            </span>
          </div>
        </section>

        <section className="admin-panel">
          <div className="admin-panel__body">
            <div className="status-banner" role="alert">
              <span className="status-banner__icon">❗</span>
              <div className="status-banner__text">
                This Eventstore is currently locked by an external process. Writing is not possible while the
                store is locked.
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="page-stack">
      <section className="page-hero">
        <div>
          <div className="page-eyebrow">Writer</div>
          <h2 className="page-title">Write Events ({storeName})</h2>
          <p className="page-subtitle">
            Compose new event payloads, preview parsed JSON, and optionally attach metadata before committing.
          </p>
        </div>
      </section>

      {(actionData?.success || actionData?.error) && (
        <section className="admin-panel">
          <div className="admin-panel__body">
            {actionData?.success && (
              <div className="alert alert-success" role="alert">
                ✅ Events committed successfully to stream &quot;{actionData.streamName}&quot;.
              </div>
            )}
            {actionData?.error && (
              <div className="alert alert-danger" role="alert">
                ❌ {actionData.error}
              </div>
            )}
          </div>
        </section>
      )}

      <Form method="post" className="page-stack">
        <section className="panel-grid panel-grid--halves">
          <section className="admin-panel">
            <div className="admin-panel__header">
              <div>
                <div className="panel-eyebrow">Compose</div>
                <h3 className="panel-title">Event payload</h3>
              </div>
            </div>
            <div className="admin-panel__body">
              <div className="form-stack">
                <div className="form-group">
                  <label htmlFor="streamName">
                    <strong>Stream Name</strong>
                  </label>
                  <input
                    id="streamName"
                    name="streamName"
                    type="text"
                    className="form-control"
                    placeholder="e.g. users or orders-2024"
                    value={streamName}
                    onChange={handleStreamNameChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="events">
                    <strong>Events</strong>{' '}
                    <small className="text-muted">(JSON object or array of objects)</small>
                  </label>
                  <textarea
                    id="events"
                    name="events"
                    className="form-control text-mono"
                    rows={14}
                    placeholder={'[\n  { "type": "MyEvent", "data": "value" }\n]'}
                    value={eventsText}
                    onChange={handleEventsChange}
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="admin-panel">
            <div className="admin-panel__header">
              <div>
                <div className="panel-eyebrow">Preview</div>
                <h3 className="panel-title">Parsed events</h3>
              </div>
            </div>
            <div className="admin-panel__body">
              <div className="json-surface">
                {eventsResult.empty && <span className="text-muted">Enter JSON above to see a preview.</span>}
                {!eventsResult.empty && eventsResult.error && (
                  <span className="text-danger">Syntax error: {eventsResult.error}</span>
                )}
                {shouldShowPreview(eventsResult) && <Json data={eventsResult.value} collapsed={false} />}
              </div>
            </div>
          </section>
        </section>

        <section className="admin-panel">
          <div className="admin-panel__header">
            <div>
              <div className="panel-eyebrow">Optional</div>
              <h3 className="panel-title">Event Metadata</h3>
            </div>
            <div className="admin-panel__toolbar">
                <button
                  type="button"
                  className="btn btn-default btn-sm"
                  onClick={() => setMetadataExpanded((v) => !v)}
                  aria-expanded={metadataExpanded}
                >
                  <i className="material-icons button-icon-inline">
                    {metadataExpanded ? 'expand_less' : 'expand_more'}
                  </i>{' '}
                  {metadataExpanded ? 'Hide' : 'Show'} Event Metadata (optional)
                </button>
            </div>
          </div>
          {metadataExpanded && (
            <div className="admin-panel__body">
              <div className="panel-grid panel-grid--halves">
                <div className="form-group">
                  <label htmlFor="metadata">
                    <strong>Metadata</strong>{' '}
                    <small className="text-muted">(JSON object, optional)</small>
                  </label>
                  <textarea
                    id="metadata"
                    name="metadata"
                    className="form-control text-mono"
                    rows={8}
                    placeholder={'{\n  "correlationId": "abc123"\n}'}
                    value={metadataText}
                    onChange={handleMetadataChange}
                  />
                </div>
                <div>
                  <label>
                    <strong>Metadata Preview</strong>
                  </label>
                  <div className="json-surface json-surface--short">
                    {metadataResult.empty && (
                      <span className="text-muted">Enter JSON above to see a preview.</span>
                    )}
                    {!metadataResult.empty && metadataResult.error && (
                      <span className="text-danger">Syntax error: {metadataResult.error}</span>
                    )}
                    {shouldShowPreview(metadataResult) && (
                      <Json data={metadataResult.value} collapsed={false} />
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        <section className="admin-panel">
          <div className="admin-panel__footer">
            <div className="progress-note">Validate the JSON preview before committing new events.</div>
            <button
              type="submit"
              className="btn btn-info"
              disabled={isSubmitting || !isFormValid(streamName, eventsResult)}
            >
              {isSubmitting ? (
                <>
                  <i className="material-icons button-icon-inline">
                    hourglass_empty
                  </i>{' '}
                  Committing…
                </>
              ) : (
                <>
                  <i className="material-icons button-icon-inline">
                    save
                  </i>{' '}
                  Commit
                </>
              )}
            </button>
          </div>
        </section>
      </Form>
    </div>
  );
}
