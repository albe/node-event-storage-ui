function JsonBlock({ data }) {
  if (data === null || data === undefined) {
    return <div className="stream-info-panel__empty">n/a</div>;
  }

  return <pre className="stream-info-panel__code">{JSON.stringify(data, null, 2)}</pre>;
}

function FunctionBlock({ value }) {
  if (!value) {
    return <div className="stream-info-panel__empty">n/a</div>;
  }

  return <pre className="stream-info-panel__code">{value}</pre>;
}

export default function StreamInfoPanel({ streamInfo }) {
  const matcherIsFunctionExpression = typeof streamInfo.matcher === 'string';
  const matcherIsJson = streamInfo.matcher !== null && typeof streamInfo.matcher === 'object';

  return (
    <div className="stream-info-panel" role="region" aria-label="Expanded stream info">
      <div className="row">
        <div className="col-lg-7 col-md-12">
          <section className="stream-info-panel__section">
            <div className="stream-info-panel__label">Matcher</div>
            {matcherIsJson ? (
              <JsonBlock data={streamInfo.matcher} />
            ) : matcherIsFunctionExpression ? (
              <FunctionBlock value={streamInfo.matcher} />
            ) : (
              <div className="stream-info-panel__empty">n/a</div>
            )}
          </section>
        </div>
        <div className="col-lg-5 col-md-12">
          <section className="stream-info-panel__section">
            <div className="stream-info-panel__label">Partition</div>
            <div className="stream-info-panel__status">
              <span className="stream-info-panel__status-label">Write stream</span>
              <span
                className={`stream-info-panel__status-badge ${
                  streamInfo.isWriteStream
                    ? 'stream-info-panel__status-badge--active'
                    : 'stream-info-panel__status-badge--inactive'
                }`}
              >
                {streamInfo.isWriteStream ? 'Yes' : 'No'}
              </span>
            </div>
            {streamInfo.isWriteStream && (
              <>
                <div className="stream-info-panel__sublabel">Metadata</div>
                <JsonBlock data={streamInfo.partitionMetadata} />
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
