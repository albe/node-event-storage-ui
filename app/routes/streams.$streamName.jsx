import { json } from '@remix-run/node';
import { Link, useLoaderData } from '@remix-run/react';
import { useState } from 'react';
import getEventStore from '../../eventstore';
import DateFormat from '../components/date';
import Json from '../components/json';

export const meta = ({ params }) => [
  { title: `event-storage: EventStream ${params.streamName}` }
];

export async function loader({ params, request }) {
  const { streamName } = params;
  const url = new URL(request.url);
  const storeNameOverride = url.searchParams.get('store') || undefined;
  const { eventstore } = await getEventStore({ readOnly: true }, storeNameOverride);

  try {
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

    return json({
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
    });
  } finally {
    eventstore.close();
  }
}

export default function EventStream() {
  const { streamName, stream, direction, amount, next, prev, streamInfo } = useLoaderData();
  const [showInfo, setShowInfo] = useState(false);
  const matcherIsFunctionExpression = typeof streamInfo.matcher === 'string';
  const matcherIsJson = streamInfo.matcher !== null && typeof streamInfo.matcher === 'object';

  return (
    <div className="card">
      <div className="card-header card-header-info">
        <div className="d-flex align-items-center justify-content-between">
          <h2 className="mb-0">EventStream '{streamName}'</h2>
          <button
            type="button"
            className="btn btn-link btn-sm text-white mb-0"
            aria-label="Toggle stream info"
            aria-expanded={showInfo}
            onClick={() => setShowInfo((open) => !open)}
          >
            <i className="material-icons">info</i>
          </button>
        </div>
      </div>
      <div className="card-body">
        {showInfo && (
          <div className="alert alert-dark">
            <div>
              <strong>Matcher</strong>
              {matcherIsJson ? (
                <Json data={streamInfo.matcher} />
              ) : matcherIsFunctionExpression ? (
                <textarea
                  className="form-control"
                  value={streamInfo.matcher}
                  readOnly
                  rows={4}
                  style={{ marginTop: 8, marginBottom: 12 }}
                />
              ) : (
                <div style={{ marginTop: 8, marginBottom: 12 }}>n/a</div>
              )}
            </div>
            <div style={{ marginBottom: 12 }}>
              <strong>Write stream (partition):</strong> {streamInfo.isWriteStream ? 'Yes' : 'No'}
            </div>
            {streamInfo.isWriteStream && (
              <div>
                <strong>Partition metadata</strong>
                <Json data={streamInfo.partitionMetadata} />
              </div>
            )}
          </div>
        )}
        <table className="table table-hover">
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
                <td>{event.metadata.streamVersion}</td>
                <td>{event.stream}</td>
                <td>
                  <DateFormat value={event.metadata.committedAt} />
                </td>
                <td>
                  <Json data={event.payload} />
                </td>
                <td>
                  <Json data={event.metadata} />
                </td>
                <td className="text-right">{event.metadata.commitId}</td>
                <td className="text-right">
                  {event.metadata.commitVersion + 1}/{event.metadata.commitSize}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={5}>
                {prev <= 0 ? (
                  <span className="btn btn-info disabled">Prev</span>
                ) : (
                  <Link
                    to={`/streams/${encodeURIComponent(
                      streamName
                    )}/${prev}/${direction}/${amount}`}
                    className="btn btn-info"
                  >
                    Prev
                  </Link>
                )}
                {next <= 0 ? (
                  <span className="btn btn-info disabled">Next</span>
                ) : (
                  <Link
                    to={`/streams/${encodeURIComponent(
                      streamName
                    )}/${next}/${direction}/${amount}`}
                    className="btn btn-info"
                  >
                    Next
                  </Link>
                )}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
