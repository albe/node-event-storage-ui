import { useEffect, useMemo, useRef, useState } from 'react';
import Select from 'react-select';
import { Form, Link, useFetcher, useLoaderData, useSearchParams } from 'react-router';
import getEventStore from '../../eventstore';
import DateFormat from '../components/date';
import Json from '../components/json';

export const meta = () => [{ title: 'event-storage: Query' }];
const MATCHER_HINT_SAMPLE_SIZE = 120;
const MATCHER_HINT_EXAMPLE_LIMIT = 4;
const MATCHER_OPERATORS = [
  { value: '$eq', label: '$eq (equals)' },
  { value: '$ne', label: '$ne (not equals)' },
  { value: '$gt', label: '$gt (greater than)' },
  { value: '$gte', label: '$gte (greater than or equal)' },
  { value: '$lt', label: '$lt (less than)' },
  { value: '$lte', label: '$lte (less than or equal)' }
];
const MATCHER_OPERATOR_SET = new Set(MATCHER_OPERATORS.map((operator) => operator.value));

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

function isObjectRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isOperatorMatcherObject(value) {
  if (!isObjectRecord(value)) {
    return false;
  }
  const keys = Object.keys(value);
  return keys.length > 0 && keys.every((key) => MATCHER_OPERATOR_SET.has(key));
}

function registerMatcherHintValue(hintMap, path, value) {
  if (!path) {
    return;
  }
  if (!hintMap.has(path)) {
    hintMap.set(path, new Set());
  }
  const examples = hintMap.get(path);
  if (examples.size >= MATCHER_HINT_EXAMPLE_LIMIT) {
    return;
  }
  examples.add(JSON.stringify(value));
}

function collectMatcherHints(hintMap, basePath, value, depth = 0) {
  if (depth > 4 || value === undefined) {
    return;
  }

  if (!isObjectRecord(value)) {
    registerMatcherHintValue(hintMap, basePath, value);
    return;
  }

  for (const [key, nestedValue] of Object.entries(value)) {
    const nextPath = basePath ? `${basePath}.${key}` : key;
    if (isObjectRecord(nestedValue)) {
      collectMatcherHints(hintMap, nextPath, nestedValue, depth + 1);
      continue;
    }
    if (Array.isArray(nestedValue)) {
      registerMatcherHintValue(hintMap, nextPath, nestedValue);
      continue;
    }
    registerMatcherHintValue(hintMap, nextPath, nestedValue);
  }
}

function createMatcherHints(eventstore, selectedTypes) {
  if (!(selectedTypes instanceof Array) || selectedTypes.length === 0) {
    return [];
  }

  const hintMap = new Map();
  const samplePerType = Math.max(1, Math.floor(MATCHER_HINT_SAMPLE_SIZE / selectedTypes.length));

  for (const streamName of selectedTypes) {
    const stream = eventstore.getEventStream(streamName);
    if (stream === false) {
      continue;
    }

    stream
      .from(1)
      .forwards(samplePerType)
      .forEach((payload, metadata) => {
        collectMatcherHints(hintMap, 'payload', payload);
        collectMatcherHints(hintMap, 'metadata', metadata);
      });
  }

  return [...hintMap.entries()]
    .map(([path, examples]) => ({ path, examples: [...examples] }))
    .sort((left, right) => left.path.localeCompare(right.path));
}

function parseMatcherObject(text) {
  if (!text || text.trim() === '') {
    return {};
  }
  const parsed = JSON.parse(text);
  if (!isObjectRecord(parsed)) {
    throw new Error('Matcher must be a JSON object.');
  }
  return parsed;
}

function parseMatcherValue(text) {
  const value = text?.trim() ?? '';
  if (value === '') {
    return '';
  }
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function parseCommaSeparatedValues(valueText) {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < valueText.length; index++) {
    const char = valueText[index];
    if (char === '"') {
      const nextChar = valueText[index + 1];
      if (inQuotes && nextChar === '"') {
        current += '"';
        index++;
        continue;
      }
      inQuotes = !inQuotes;
      continue;
    }

    if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  if (inQuotes) {
    throw new Error('Multi-value list contains an unterminated quoted value.');
  }

  values.push(current);
  return values;
}

function setMatcherPathValue(target, path, value) {
  const parts = path.split('.').filter(Boolean);
  if (parts.length === 0) {
    return;
  }
  let cursor = target;
  for (let index = 0; index < parts.length - 1; index++) {
    const part = parts[index];
    if (!isObjectRecord(cursor[part])) {
      cursor[part] = {};
    }
    cursor = cursor[part];
  }
  cursor[parts[parts.length - 1]] = value;
}

function getMatcherPathValue(target, path) {
  const parts = path.split('.').filter(Boolean);
  if (parts.length === 0) {
    return undefined;
  }
  let cursor = target;
  for (const part of parts) {
    if (!isObjectRecord(cursor) || !(part in cursor)) {
      return undefined;
    }
    cursor = cursor[part];
  }
  return cursor;
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
  const hintsOnly = searchParams.get('hintsOnly') === '1';
  const hintsKey = searchParams.get('hintsKey') || selectedTypes.join('\u0001');
  const matcherText = searchParams.get('matcher') || '';
  const minRevisionInput = searchParams.get('minRevision') || '';

  const from = parsePositiveInt(searchParams.get('from'), 1);
  const amount = Math.min(parsePositiveInt(searchParams.get('amount'), 10), 200);
  const direction = searchParams.get('direction') === 'backwards' ? 'backwards' : 'forwards';
  const minRevision = parsePositiveInt(minRevisionInput, 1);

  const matcherResult = buildMatcher(matcherText);
  const matcherHints = createMatcherHints(eventstore, selectedTypes);
  if (hintsOnly) {
    return { matcherHints, hintsKey };
  }
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
    matcherHints,
    condition: null,
    error: matcherResult.error
  };

  if (selectedTypes.length === 0 || matcherResult.error) {
    return result;
  }

  try {
    const { stream: queryStream, condition } = eventstore.query(
      selectedTypes,
      matcherResult.matcher,
      minRevision,
      false
    );
    const total = queryStream.length;
    const slicedStream = queryStream.from(from)[direction](amount);
    const events = [];
    slicedStream.forEach((payload, metadata, streamName) => {
      events.push({ payload, metadata, stream: streamName });
    });

    const next = direction === 'backwards'
      ? Math.max(from - amount, 0)
      : (from + events.length - 1 < total ? from + amount : 0);

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
    matcherHints,
    stream,
    total,
    prev,
    next,
    amount,
    direction,
    condition,
    error
  } = useLoaderData();
  const matcherHintsFetcher = useFetcher();
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
  const selectedTypeValues = useMemo(
    () => selectedTypeOptions.map((option) => option.value),
    [selectedTypeOptions]
  );
  const selectedTypeKey = useMemo(
    () => selectedTypeValues.join('\u0001'),
    [selectedTypeValues]
  );
  const lastRequestedHintsKeyRef = useRef(selectedTypeKey);
  const [matcherEditorText, setMatcherEditorText] = useState(matcherText);
  const [liveMatcherHints, setLiveMatcherHints] = useState(matcherHints);
  const [selectedMatcherPath, setSelectedMatcherPath] = useState('');
  const [selectedMatcherValue, setSelectedMatcherValue] = useState('');
  const [matcherValueMode, setMatcherValueMode] = useState('single');
  const [selectedMatcherOperator, setSelectedMatcherOperator] = useState('');
  const [matcherBuilderError, setMatcherBuilderError] = useState('');
  const selectedMatcherHint = useMemo(
    () => liveMatcherHints.find((hint) => hint.path === selectedMatcherPath) ?? null,
    [liveMatcherHints, selectedMatcherPath]
  );
  const matcherValueSuggestions = useMemo(() => {
    const suggestions = new Set(selectedMatcherHint?.examples ?? []);
    suggestions.add('0');
    suggestions.add('1');
    suggestions.add('true');
    suggestions.add('false');
    suggestions.add('null');
    suggestions.add('""');
    return [...suggestions];
  }, [selectedMatcherHint]);

  useEffect(() => {
    const selectedSet = new Set(selectedTypes);
    setSelectedTypeOptions(typeOptions.filter((option) => selectedSet.has(option.value)));
  }, [selectedTypes, typeOptions]);

  useEffect(() => {
    setMatcherEditorText(matcherText);
  }, [matcherText]);

  useEffect(() => {
    setLiveMatcherHints(matcherHints);
  }, [matcherHints]);

  useEffect(() => {
    if (!matcherHintsFetcher.data || !(matcherHintsFetcher.data.matcherHints instanceof Array)) {
      return;
    }
    if (matcherHintsFetcher.data.hintsKey !== lastRequestedHintsKeyRef.current) {
      return;
    }
    setLiveMatcherHints(matcherHintsFetcher.data.matcherHints);
  }, [matcherHintsFetcher.data]);

  useEffect(() => {
    if (selectedTypeKey === lastRequestedHintsKeyRef.current) {
      return;
    }
    lastRequestedHintsKeyRef.current = selectedTypeKey;

    const params = new URLSearchParams();
    if (store) {
      params.set('store', store);
    }
    for (const type of selectedTypeValues) {
      params.append('types', type);
    }
    params.set('hintsOnly', '1');
    params.set('hintsKey', selectedTypeKey);

    const timeoutId = setTimeout(() => {
      matcherHintsFetcher.load(`/query?${params.toString()}`);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [selectedTypeKey, selectedTypeValues, store]);

  useEffect(() => {
    if (selectedMatcherPath === '') {
      return;
    }
    if (!liveMatcherHints.some((hint) => hint.path === selectedMatcherPath)) {
      setSelectedMatcherPath('');
      setSelectedMatcherValue('');
    }
  }, [liveMatcherHints, selectedMatcherPath]);

  useEffect(() => {
    if (!selectedMatcherHint || selectedMatcherHint.examples.length === 0) {
      return;
    }
    setSelectedMatcherValue(selectedMatcherHint.examples[0]);
  }, [selectedMatcherHint]);

  function addMatcherRuleFromHint() {
    if (!selectedMatcherPath) {
      setMatcherBuilderError('Please choose a matcher field first.');
      return;
    }

    try {
      const matcherObject = parseMatcherObject(matcherEditorText);
      if (matcherValueMode === 'multi') {
        const values = parseCommaSeparatedValues(selectedMatcherValue)
          .map((value) => value.trim())
          .filter((value) => value !== '')
          .map((value) => parseMatcherValue(value));
        if (values.length === 0) {
          setMatcherBuilderError('Please provide at least one value for multi-value matching.');
          return;
        }
        setMatcherPathValue(matcherObject, selectedMatcherPath, values);
      } else if (matcherValueMode === 'operator') {
        const operator = selectedMatcherOperator.trim();
        if (!MATCHER_OPERATOR_SET.has(operator)) {
          setMatcherBuilderError(`Unsupported operator \"${operator}\". Use one of: ${MATCHER_OPERATORS.map((item) => item.value).join(', ')}`);
          return;
        }
        const matcherValue = parseMatcherValue(selectedMatcherValue);
        const existingValue = getMatcherPathValue(matcherObject, selectedMatcherPath);
        if (isOperatorMatcherObject(existingValue)) {
          existingValue[operator] = matcherValue;
        } else {
          setMatcherPathValue(matcherObject, selectedMatcherPath, { [operator]: matcherValue });
        }
      } else {
        setMatcherPathValue(matcherObject, selectedMatcherPath, parseMatcherValue(selectedMatcherValue));
      }
      setMatcherEditorText(JSON.stringify(matcherObject, null, 2));
      setMatcherBuilderError('');
      setSelectedMatcherPath('');
      setSelectedMatcherValue('');
      setMatcherValueMode('single');
      setSelectedMatcherOperator('$eq');
    } catch (builderError) {
      setMatcherBuilderError(builderError.message || 'Matcher could not be updated.');
    }
  }

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
          <section className="admin-panel admin-panel--allow-overflow card">
            <div className="admin-panel__header card-head">
              <div className="card-title-wrap">
                <div className="panel-eyebrow eyebrow">Query Input</div>
                <h3 className="panel-title card-title">Types & Revision</h3>
              </div>
            </div>
            <div className="admin-panel__body card-body card-body--panel">
              <div className="form-stack">
                <div className="form-group field">
                  <label htmlFor="types" className="field-label">
                    Event Types
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
                <div className="button-row">
                  <button type="submit" className="btn btn--primary">
                    <i className="material-icons button-icon-inline">search</i> Run Query
                  </button>
                </div>
              </div>
            </div>
          </section>

          <section className="admin-panel card">
            <div className="admin-panel__header card-head">
              <div className="card-title-wrap">
                <div className="panel-eyebrow eyebrow">Query Input</div>
                <h3 className="panel-title card-title">Matcher</h3>
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
                    placeholder={'{\n  "metadata": { "tenant": "acme" },\n  "payload": { "amount": { "$gte": 100 } }\n}'}
                    value={matcherEditorText}
                    onChange={(event) => setMatcherEditorText(event.target.value)}
                  />
                </div>
                {liveMatcherHints.length > 0 && (
                  <div className="form-group field">
                    <label className="field-label">Matcher Assistant</label>
                    {matcherHintsFetcher.state === 'loading' && (
                      <div className="progress-note">Updating suggestions...</div>
                    )}
                    <div className="form-stack">
                      <select
                        data-testid="matcher-mode"
                        className="select"
                        value={matcherValueMode}
                        onChange={(event) => setMatcherValueMode(event.target.value)}
                      >
                        <option value="single">Single value</option>
                        <option value="multi">Multi-value (comma-separated)</option>
                        <option value="operator">Operator matcher</option>
                      </select>

                      <select
                        data-testid="matcher-path"
                        className="select"
                        value={selectedMatcherPath}
                        onChange={(event) => setSelectedMatcherPath(event.target.value)}
                      >
                        <option value="">Select a suggested field...</option>
                        {liveMatcherHints.map((hint) => (
                          <option key={hint.path} value={hint.path}>
                            {hint.path}
                          </option>
                        ))}
                      </select>

                      {matcherValueMode === 'operator' && (
                        <input
                          type="text"
                          data-testid="matcher-operator"
                          list="matcher-operators"
                          className="input text-mono"
                          placeholder="$gte"
                          value={selectedMatcherOperator}
                          onChange={(event) => setSelectedMatcherOperator(event.target.value)}
                        />
                      )}

                      <input
                        type="text"
                        data-testid="matcher-value"
                        list="matcher-value-suggestions"
                        className="input text-mono"
                        placeholder="Suggested value (JSON or plain text)"
                        value={selectedMatcherValue}
                        onChange={(event) => setSelectedMatcherValue(event.target.value)}
                      />
                      <datalist id="matcher-value-suggestions">
                        {matcherValueSuggestions.map((suggestedValue) => (
                          <option key={suggestedValue} value={suggestedValue} />
                        ))}
                      </datalist>
                      <datalist id="matcher-operators">
                        {MATCHER_OPERATORS.map((operator) => (
                          <option key={operator.value} value={operator.value} label={operator.label} />
                        ))}
                      </datalist>
                    </div>
                    {matcherValueMode === 'multi' && (
                      <div className="progress-note">
                        Use a comma-separated list. Put values with commas in double quotes.
                      </div>
                    )}
                    {matcherValueMode === 'operator' && (
                      <div className="progress-note">
                        Operator matchers use syntax like {'{ "payload": { "amount": { "$gte": 100 } } }'}.
                      </div>
                    )}
                    {selectedMatcherHint && selectedMatcherHint.examples.length > 0 && (
                      <div className="progress-note">
                        Sample values: {selectedMatcherHint.examples.join(' | ')}
                      </div>
                    )}
                    {matcherBuilderError && <div className="text-danger">{matcherBuilderError}</div>}
                    <div className="button-row">
                      <button
                        type="button"
                        data-testid="matcher-add-rule"
                        className="btn btn--soft-primary"
                        onClick={addMatcherRuleFromHint}
                      >
                        Add Rule to Matcher
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
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




