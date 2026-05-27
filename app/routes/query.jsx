import { useEffect, useMemo, useState } from 'react';
import Select from 'react-select';
import { Form, Link, useLoaderData, useSearchParams } from 'react-router';
import getEventStore from '../../eventstore';
import DateFormat from '../components/date';
import Json from '../components/json';

export const meta = () => [{ title: 'event-storage: Query' }];

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function normalizeSelectedTypes(types, availableTypes) {
  const available = new Set(availableTypes);
  return types.filter((type) => type && available.has(type));
}

function buildMatcher(matcherText) {
  if (!matcherText || matcherText.trim() === '') {
    return { matcher: null, error: null };
  }
  try {
    return { matcher: JSON.parse(matcherText), error: null };
  } catch (error) {
    return {
      matcher: null,
      error: `Matcher JSON is invalid: ${error.message}`
    };
  }
}

export async function loader({ request }) {
  const url = new URL(request.url);
  const searchParams = url.searchParams;
  const storeNameOverride = searchParams.get('store') || undefined;
  const { eventstore } = await getEventStore({ readOnly: true }, storeNameOverride);

  const types = Object.keys(eventstore.streams)
    .filter((streamName) => streamName !== '_all')
    .sort((left, right) => left.localeCompare(right));

  const selectedTypes = normalizeSelectedTypes(searchParams.getAll('types'), types);
  const matcherText = searchParams.get('matcher') || '';
  const minRevisionInput = searchParams.get('minRevision') || '';

  const from = parsePositiveInt(searchParams.get('from'), 1);
  const amount = Math.min(parsePositiveInt(searchParams.get('amount'), 10), 200);
  const direction = searchParams.get('direction') === 'backwards' ? 'backwards' : 'forwards';
  const minRevision = parsePositiveInt(minRevisionInput, 1);

  const matcherResult = buildMatcher(matcherText);
  const result = {
    storeName: eventstore.storeName,
    types,
    selectedTypes,
    matcherText,
    minRevisionInput,
    minRevision,
    direction,
    amount,
    from,
    next: 0,
    prev: 0,
    total: 0,
    stream: [],
    condition: null,
    error: matcherResult.error
  };

  if (selectedTypes.length === 0 || matcherResult.error) {
    return result;
  }

  try {
    const { stream: queryStream, condition } = eventstore.query(selectedTypes, matcherResult.matcher, minRevision, false);
    const total = queryStream.length;
    const slicedStream = queryStream.from(from)[direction](amount);
    const events = [];
    slicedStream.forEach((payload, metadata, streamName) => {
      events.push({ payload, metadata, stream: streamName });
    });

    let next = 0;
    if (direction === 'backwards') {
      const nextBackwardsPage = from - amount;
      next = nextBackwardsPage > 0 ? nextBackwardsPage : 0;
    } else {
      const loadedUntil = from + events.length - 1;
      next = loadedUntil < total ? from + amount : 0;
    }

    return {
      ...result,
      stream: events,
      total,
      next,
      prev: direction === 'backwards' ? from + amount : from - amount,
      condition: {
        noneMatchAfter: condition.noneMatchAfter
      },
      error: null
    };
  } catch (error) {
    return {
      ...result,
      error: error?.message || 'Query could not be executed.'
    };
  }
}

function QueryPagination({ prev, next, amount, direction }) {
  const [searchParams] = useSearchParams();

  function buildPageUrl(from) {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('from', String(from));
    nextParams.set('amount', String(amount));
    nextParams.set('direction', direction);
    return `/query?${nextParams.toString()}`;
  }

  return (
    <div className="button-row">
      {prev <= 0 ? (
        <button type="button" className="btn btn--ghost" disabled>
          Prev
        </button>
      ) : (
        <Link to={buildPageUrl(prev)} className="btn btn--ghost">
          Prev
        </Link>
      )}
      {next <= 0 ? (
        <button type="button" className="btn btn--ghost" disabled>
          Next
        </button>
      ) : (
        <Link to={buildPageUrl(next)} className="btn btn--ghost">
          Next
        </Link>
      )}
    </div>
  );
}

export default function QueryPage() {
  const {
    storeName,
    types,
    selectedTypes,
    matcherText,
    minRevisionInput,
    stream,
    total,
    prev,
    next,
    amount,
    direction,
    condition,
    error
  } = useLoaderData();
  const [searchParams] = useSearchParams();
  const store = searchParams.get('store');
  const typeOptions = useMemo(
    () => types.map((type) => ({ value: type, label: type })),
    [types]
  );
  const [selectedTypeOptions, setSelectedTypeOptions] = useState(() => {
    const selectedSet = new Set(selectedTypes);
    return typeOptions.filter((option) => selectedSet.has(option.value));
  });

  useEffect(() => {
    const selectedSet = new Set(selectedTypes);
    setSelectedTypeOptions(typeOptions.filter((option) => selectedSet.has(option.value)));
  }, [selectedTypes, typeOptions]);

  return (
    <div className="page-stack">
      <section className="page-hero hero">
        <div className="hero-text">
          <div className="page-eyebrow eyebrow">Explorer</div>
          <h2 className="page-title hero-title">Query ({storeName})</h2>
          <p className="page-subtitle hero-sub">
            Run EventStore queries with multi-type selection, an optional JSON matcher, and optional min revision.
          </p>
        </div>
      </section>

      <Form method="get" className="page-stack">
        {store && <input type="hidden" name="store" value={store} />}
        <input type="hidden" name="from" value="1" />
        <input type="hidden" name="direction" value="forwards" />
        <input type="hidden" name="amount" value="10" />

        <section className="panel-grid panel-grid--halves">
          <section className="admin-panel card">
            <div className="admin-panel__header card-head">
              <div className="card-title-wrap">
                <div className="panel-eyebrow eyebrow">Query Input</div>
                <h3 className="panel-title card-title">Event Types</h3>
              </div>
            </div>
            <div className="admin-panel__body card-body card-body--panel">
              <div className="form-group field">
                <label htmlFor="types" className="field-label">
                  Event Types (Streams)
                </label>
                <Select
                  inputId="types"
                  className="react-select-container"
                  classNamePrefix="react-select"
                  isMulti
                  options={typeOptions}
                  value={selectedTypeOptions}
                  onChange={(options) => setSelectedTypeOptions(options ?? [])}
                  placeholder="Select one or more event types..."
                  noOptionsMessage={() => 'No matching event types'}
                />
                {selectedTypeOptions.map((option) => (
                  <input key={option.value} type="hidden" name="types" value={option.value} />
                ))}
              </div>
            </div>
          </section>

          <section className="admin-panel card">
            <div className="admin-panel__header card-head">
              <div className="card-title-wrap">
                <div className="panel-eyebrow eyebrow">Query Input</div>
                <h3 className="panel-title card-title">Matcher & Revision</h3>
              </div>
            </div>
            <div className="admin-panel__body card-body card-body--panel">
              <div className="form-stack">
                <div className="form-group field">
                  <label htmlFor="matcher" className="field-label">
                    JSON Matcher (optional)
                  </label>
                  <textarea
                    id="matcher"
                    name="matcher"
                    className="textarea text-mono"
                    rows={8}
                    placeholder={'{\n  "metadata": { "tenant": "acme" }\n}'}
                    defaultValue={matcherText}
                  />
                </div>
                <div className="form-group field">
                  <label htmlFor="minRevision" className="field-label">
                    Min Revision (optional)
                  </label>
                  <input
                    id="minRevision"
                    name="minRevision"
                    type="number"
                    min="1"
                    className="input"
                    placeholder="1"
                    defaultValue={minRevisionInput}
                  />
                </div>
              </div>
            </div>
          </section>
        </section>

        <section className="admin-panel card">
          <div className="admin-panel__footer">
            <div className="progress-note">Use the multi-select to choose one or more event types.</div>
            <button type="submit" className="btn btn--primary">
              <i className="material-icons button-icon-inline">search</i> Run Query
            </button>
          </div>
        </section>
      </Form>

      {error && (
        <section className="admin-panel card">
          <div className="admin-panel__body card-body card-body--panel">
            <div className="alert danger" role="alert">
              {error}
            </div>
          </div>
        </section>
      )}

      {selectedTypes.length > 0 && !error && (
        <section className="admin-panel card">
          <div className="admin-panel__header card-head">
            <div className="card-title-wrap">
              <div className="panel-eyebrow eyebrow">Result</div>
              <h3 className="panel-title card-title">Query Stream</h3>
            </div>
            <div className="admin-panel__toolbar">
              <span className="tag t-primary">{total} total</span>
              <span className="tag t-info">{direction}</span>
            </div>
          </div>
          <div className="admin-panel__body admin-panel__body--compact">
            <div className="admin-table-wrap table-scroll">
              <table className="table table-hover admin-table data-table">
                <thead>
                  <tr>
                    <th width="5%">StreamVersion</th>
                    <th width="10%">Stream</th>
                    <th width="15%">Commit Date</th>
                    <th width="30%">Payload</th>
                    <th width="30%">Metadata</th>
                    <th width="5%">CommitId</th>
                    <th width="5%">CommitVersion</th>
                  </tr>
                </thead>
                <tbody>
                  {stream.map((event) => (
                    <tr key={`${event.stream}@${event.metadata.commitId}@${event.metadata.commitVersion}`}>
                      <td>
                        <span className="tag t-primary">{event.metadata.streamVersion}</span>
                      </td>
                      <td>
                        <span className="tag t-info">{event.stream}</span>
                      </td>
                      <td>
                        <span className="cell-date">
                          <DateFormat value={event.metadata.committedAt} />
                        </span>
                      </td>
                      <td className="cell-json">
                        <Json data={event.payload} collapsed={false} />
                      </td>
                      <td className="cell-json">
                        <Json data={event.metadata} collapsed={true} />
                      </td>
                      <td className="text-right cell-mono">{event.metadata.commitId}</td>
                      <td className="text-right">
                        <span className="tag t-new">
                          {event.metadata.commitVersion + 1}/{event.metadata.commitSize}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={7}>
                      <div className="data-foot">
                        <span>
                          Showing <strong>{stream.length}</strong> events
                          {condition && (
                            <>
                              {' '}
                              (condition snapshot: <span className="text-mono">{condition.noneMatchAfter}</span>)
                            </>
                          )}
                        </span>
                        <QueryPagination prev={prev} next={next} amount={amount} direction={direction} />
                      </div>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}




