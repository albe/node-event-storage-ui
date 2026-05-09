import { json } from '@remix-run/node';
import { Link, useLoaderData } from '@remix-run/react';
import getEventStore from '../../eventstore';
import DateFormat from '../components/date';
import Json from '../components/json';

export const meta = ({ params }) => [
  { title: `event-storage: EventStream ${params.streamName}` }
];

export async function loader({ params }) {
  const { streamName } = params;
  const { eventstore } = await getEventStore({ readOnly: true });

  try {
    const from = parseInt(params.from ?? '1', 10) || 1;
    const amount = parseInt(params.amount ?? '10', 10) || 10;
    const direction = params.direction === 'backwards' ? 'backwards' : 'forwards';
    const events = [];

    const until = direction === 'backwards' ? from - amount + 1 : from + amount - 1;
    const streamLength = eventstore.getStreamVersion(streamName);
    let stream = eventstore.getEventStream(streamName);
    if (stream !== false) {
      stream = stream.from(from)[direction](amount);
      stream.forEach((payload, metadata, eventStream) => {
        events.push({ payload, metadata, stream: eventStream });
      });
    }

    return json({
      streamName,
      stream: events,
      direction,
      amount,
      next:
        direction === 'backwards'
          ? until - 1
          : until >= streamLength
            ? 0
            : until + 1,
      prev: direction === 'backwards' ? from + amount : from - amount
    });
  } finally {
    eventstore.close();
  }
}

export default function EventStreamPaged() {
  const { streamName, stream, direction, amount, next, prev } = useLoaderData();

  return (
    <div className="card">
      <div className="card-header card-header-info">
        <h2>EventStream '{streamName}'</h2>
      </div>
      <div className="card-body">
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
