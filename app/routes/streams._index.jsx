import fs from 'node:fs';
import { json } from '@remix-run/node';
import { Link, useLoaderData } from '@remix-run/react';
import getEventStore from '../../eventstore';
import DateFormat from '../components/date';
import Json from '../components/json';
import usePagination from '../hooks/paginate';

export const meta = () => [{ title: 'event-storage: Stream Browser' }];

export async function loader({ request }) {
  const url = new URL(request.url);
  const storeNameOverride = url.searchParams.get('store') || undefined;
  const { eventstore } = await getEventStore({ readOnly: true }, storeNameOverride);

  try {
    const streams = Object.keys(eventstore.streams).map((streamName) => {
      const stream = eventstore.streams[streamName].index;
      const crtime = fs.statSync(stream.fileName).birthtimeMs;
      return {
        name: streamName,
        length: stream.length,
        metadata: stream.metadata,
        crtime
      };
    });

    return json({
      storeName: eventstore.storeName,
      streams
    });
  } finally {
    eventstore.close();
  }
}

export default function StreamsIndex() {
  const { storeName, streams } = useLoaderData();
  const [start, end, nextPage, prevPage, hasNext, hasPrev] = usePagination(streams.length);

  return (
    <div className="card">
      <h2 className="card-header card-header-info">Stream browser ({storeName})</h2>
      <div className="card-body">
        <table className="table table-hover">
          <thead>
            <tr>
              <th style={{ width: '30%' }}>Stream name</th>
              <th style={{ width: '15%' }}>Created at</th>
              <th style={{ width: '10%' }}>Events</th>
              <th>Metadata</th>
            </tr>
          </thead>
          <tbody>
            {streams.slice(start, end).map((stream) => (
              <tr key={stream.name}>
                <td>
                  <Link to={`/streams/${encodeURIComponent(stream.name)}`}>{stream.name}</Link>
                </td>
                <td>
                  <DateFormat value={stream.crtime} />
                </td>
                <td>{stream.length}</td>
                <td>
                  <Json data={stream.metadata} />
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={3}>
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
