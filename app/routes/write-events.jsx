import { useState, useCallback } from 'react';
import { json } from '@remix-run/node';
import { useLoaderData, useActionData, useNavigation, useSearchParams } from '@remix-run/react';
import { Form } from '@remix-run/react';
import { getStoreLockStatus, commitToEventStore } from '../../eventstore';
import Json from '../components/json';

export const meta = () => [{ title: 'event-storage: Write Events' }];

export async function loader({ request }) {
  const url = new URL(request.url);
  const storeNameOverride = url.searchParams.get('store') || undefined;
  const storeLocked = getStoreLockStatus(storeNameOverride);
  return json({ storeLocked, storeNameOverride: storeNameOverride || null });
}

export async function action({ request }) {
  const url = new URL(request.url);
  const storeNameOverride = url.searchParams.get('store') || undefined;

  const formData = await request.formData();
  const streamName = formData.get('streamName')?.trim();
  const eventsJson = formData.get('events')?.trim();
  const metadataJson = formData.get('metadata')?.trim();

  if (!streamName) {
    return json({ error: 'Stream name is required.' }, { status: 400 });
  }

  let events;
  try {
    events = JSON.parse(eventsJson);
  } catch {
    return json({ error: 'Events field contains invalid JSON.' }, { status: 400 });
  }

  let metadata = undefined;
  if (metadataJson) {
    try {
      metadata = JSON.parse(metadataJson);
    } catch {
      return json({ error: 'Metadata field contains invalid JSON.' }, { status: 400 });
    }
  }

  try {
    await commitToEventStore(streamName, events, metadata, storeNameOverride);
    return json({ success: true, streamName });
  } catch (err) {
    return json(
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
      <div className="card">
        <div className="card-header card-header-danger">
          <h2>Write Events ({storeName})</h2>
        </div>
        <div className="card-body">
          <div className="alert alert-danger" role="alert">
            <span style={{ fontSize: 20, marginRight: 8 }}>❗</span>
            This Eventstore is currently locked by an external process. Writing is not possible
            while the store is locked.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header card-header-info">
        <h2>Write Events ({storeName})</h2>
      </div>
      <div className="card-body">
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

        <Form method="post">
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

          <div className="row" style={{ marginTop: 16 }}>
            <div className="col-md-6">
              <div className="form-group">
                <label htmlFor="events">
                  <strong>Events</strong>{' '}
                  <small className="text-muted">
                    (JSON object or array of objects)
                  </small>
                </label>
                <textarea
                  id="events"
                  name="events"
                  className="form-control"
                  rows={10}
                  placeholder={'[\n  { "type": "MyEvent", "data": "value" }\n]'}
                  value={eventsText}
                  onChange={handleEventsChange}
                  style={{ fontFamily: 'monospace', fontSize: 13 }}
                />
              </div>
            </div>
            <div className="col-md-6">
              <label>
                <strong>Preview</strong>
              </label>
              <div
                style={{
                  minHeight: 120,
                  padding: 12,
                  background: '#272822',
                  borderRadius: 4,
                  color: '#f8f8f2',
                  fontSize: 13
                }}
              >
                {eventsResult.empty && (
                  <span className="text-muted">Enter JSON above to see a preview.</span>
                )}
                {!eventsResult.empty && eventsResult.error && (
                  <span className="text-danger">Syntax error: {eventsResult.error}</span>
                )}
                {!eventsResult.empty && !eventsResult.error && eventsResult.value !== null && (
                  <Json data={eventsResult.value} />
                )}
              </div>
            </div>
          </div>

          <div style={{ marginTop: 16 }}>
            <button
              type="button"
              className="btn btn-default btn-sm"
              onClick={() => setMetadataExpanded((v) => !v)}
              aria-expanded={metadataExpanded}
            >
              <i className="material-icons" style={{ fontSize: 16, verticalAlign: 'middle' }}>
                {metadataExpanded ? 'expand_less' : 'expand_more'}
              </i>{' '}
              {metadataExpanded ? 'Hide' : 'Show'} Event Metadata (optional)
            </button>
          </div>

          {metadataExpanded && (
            <div className="row" style={{ marginTop: 12 }}>
              <div className="col-md-6">
                <div className="form-group">
                  <label htmlFor="metadata">
                    <strong>Metadata</strong>{' '}
                    <small className="text-muted">(JSON object, optional)</small>
                  </label>
                  <textarea
                    id="metadata"
                    name="metadata"
                    className="form-control"
                    rows={6}
                    placeholder={'{\n  "correlationId": "abc123"\n}'}
                    value={metadataText}
                    onChange={handleMetadataChange}
                    style={{ fontFamily: 'monospace', fontSize: 13 }}
                  />
                </div>
              </div>
              <div className="col-md-6">
                <label>
                  <strong>Metadata Preview</strong>
                </label>
                <div
                  style={{
                    minHeight: 80,
                    padding: 12,
                    background: '#272822',
                    borderRadius: 4,
                    color: '#f8f8f2',
                    fontSize: 13
                  }}
                >
                  {metadataResult.empty && (
                    <span className="text-muted">Enter JSON above to see a preview.</span>
                  )}
                  {!metadataResult.empty && metadataResult.error && (
                    <span className="text-danger">Syntax error: {metadataResult.error}</span>
                  )}
                  {!metadataResult.empty && !metadataResult.error && metadataResult.value !== null && (
                    <Json data={metadataResult.value} />
                  )}
                </div>
              </div>
            </div>
          )}

          <div style={{ marginTop: 24 }}>
            <button
              type="submit"
              className="btn btn-info"
              disabled={isSubmitting || eventsResult.error || eventsResult.empty || !streamName.trim()}
            >
              {isSubmitting ? (
                <>
                  <i className="material-icons" style={{ fontSize: 16, verticalAlign: 'middle' }}>
                    hourglass_empty
                  </i>{' '}
                  Committing…
                </>
              ) : (
                <>
                  <i className="material-icons" style={{ fontSize: 16, verticalAlign: 'middle' }}>
                    save
                  </i>{' '}
                  Commit
                </>
              )}
            </button>
          </div>
        </Form>
      </div>
    </div>
  );
}
