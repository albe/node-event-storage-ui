import { Link, useLoaderData } from 'react-router';
import { useState } from 'react';
import getEventStore from '../../eventstore';
import DateFormat from '../components/date';
import Json from '../components/json';
import StreamInfoPanel from '../components/stream-info-panel';

export const meta = ({ params }) => [{ title: `event-storage: EventStream ${params.streamName}` }];

export async function loader({ params, request }) {
  const { streamName } = params;
  const url = new URL(request.url);
  const storeNameOverride = url.searchParams.get('store') || undefined;
  const { eventstore } = await getEventStore({ readOnly: true }, storeNameOverride);

  const from = 1;
  const amount = 10;
  const direction = 'forwards';
  const events = [];
  const streamIndex = eventstore.streams[streamName]?.index;
  const streamIndexMetadata = streamIndex?.metadata || null;
  const matcher = streamIndexMetadata?.matcher ?? null;
  const writePartitionName = `${eventstore.storage.storageFile}.${streamName}`;
  const writePartition = Object.values(eventstore.storage.partitions).find(
    (partition) => partition.name === writePartitionName
  );
  const isWriteStream = !!writePartition;
  let partitionMetadata = null;
  if (writePartition) {
    writePartition.open();
    partitionMetadata = writePartition.metadata || null;
  }

  const until = from + amount - 1;
  const streamLength = eventstore.getStreamVersion(streamName);
  let stream = eventstore.getEventStream(streamName);
  if (stream !== false) {
    stream = stream.from(from).forwards(amount);
    stream.forEach((payload, metadata, eventStream) => {
      events.push({ payload, metadata, stream: eventStream });
    });
  }

  return {
    streamName,
    stream: events,
    direction,
    amount,
    next: until >= streamLength ? 0 : until + 1,
    prev: from - amount,
    streamInfo: {
      indexMetadata: streamIndexMetadata,
      matcher,
      isWriteStream,
      partitionMetadata
    }
  };
}

export default function EventStream() {
  const { streamName, stream, direction, amount, next, prev, streamInfo } = useLoaderData();
  const [showInfo, setShowInfo] = useState(false);

  return (
    <div className="page-stack">
      <section className="page-hero hero">
        <div className="hero-text">
          <div className="page-eyebrow eyebrow">Explorer</div>
          <h2 className="page-title hero-title">EventStream '{streamName}'</h2>
          <p className="page-subtitle hero-sub">
            Review committed events, payloads, metadata, and paging controls for this stream.
          </p>
        </div>
        <div className="page-actions hero-actions">
          <button
            type="button"
            className="btn btn--ghost"
            aria-label="Toggle stream info"
            aria-expanded={showInfo}
            onClick={() => setShowInfo((open) => !open)}
          >
            <i className="material-icons">info</i> {showInfo ? 'Hide' : 'Show'} Stream Info
          </button>
          <span className="page-pill">
            <i className="material-icons">receipt_long</i>
            {stream.length} events loaded
          </span>
        </div>
      </section>

      {showInfo && (
        <section className="admin-panel card">
          <div className="admin-panel__header card-head">
            <div className="card-title-wrap">
              <div className="panel-eyebrow eyebrow">Metadata</div>
              <h3 className="panel-title card-title">Stream Info</h3>
            </div>
          </div>
          <div className="admin-panel__body card-body card-body--panel">
            <StreamInfoPanel streamInfo={streamInfo} />
          </div>
        </section>
      )}

      <section className="admin-panel card">
        <div className="admin-panel__header card-head">
          <div className="card-title-wrap">
            <div className="panel-eyebrow eyebrow">Events</div>
            <h3 className="panel-title card-title">Committed events</h3>
          </div>
          <span className="tag t-primary">{stream.length} loaded</span>
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
                  <tr key={`${event.stream}@${event.metadata.streamVersion}`}>
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
                        Showing <strong>{stream.length}</strong> committed events from the first page
                      </span>
                      <div className="button-row">
                        {prev <= 0 ? (
                          <button type="button" className="btn btn--primary-soft" disabled>
                            Prev
                          </button>
                        ) : (
                          <Link
                            to={`/streams/${encodeURIComponent(streamName)}/${prev}/${direction}/${amount}`}
                            className="btn btn--primary-soft"
                          >
                            Prev
                          </Link>
                        )}
                        {next <= 0 ? (
                          <button type="button" className="btn btn--primary-soft" disabled>
                            Next
                          </button>
                        ) : (
                          <Link
                            to={`/streams/${encodeURIComponent(streamName)}/${next}/${direction}/${amount}`}
                            className="btn btn--primary-soft"
                          >
                            Next
                          </Link>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
