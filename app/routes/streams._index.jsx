import fs from 'node:fs';
import { Link, useLoaderData } from 'react-router';
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

    return {
      storeName: eventstore.storeName,
      streams
    };
  } finally {
    eventstore.close();
  }
}

export default function StreamsIndex() {
  const { storeName, streams } = useLoaderData();
  const [start, end, nextPage, prevPage, hasNext, hasPrev] = usePagination(streams.length);

  return (
    <div className="page-stack">
      <section className="page-hero">
        <div>
          <div className="page-eyebrow">Explorer</div>
          <h2 className="page-title">Stream browser ({storeName})</h2>
          <p className="page-subtitle">
            Inspect streams, creation dates, event counts, and index metadata in a cleaner table layout.
          </p>
        </div>
        <div className="page-actions">
          <span className="page-pill">
            <i className="material-icons">table_rows</i>
            {streams.length} total streams
          </span>
          <span className="page-pill">
            <i className="material-icons">layers</i>
            {start + 1}-{Math.min(end, streams.length)} visible
          </span>
        </div>
      </section>

      <section className="admin-panel">
        <div className="admin-panel__header">
          <div>
            <div className="panel-eyebrow">Catalog</div>
            <h3 className="panel-title">Available streams</h3>
          </div>
          <div className="progress-note">Open a stream to inspect committed events and metadata.</div>
        </div>
        <div className="admin-panel__body admin-panel__body--compact">
          <div className="admin-table-wrap">
            <table className="table table-hover admin-table">
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
                  <td colSpan={4}>
                    <div className="button-row">
                      <button disabled={!hasPrev} className="btn btn-info" onClick={prevPage}>
                        Prev
                      </button>
                      <button disabled={!hasNext} className="btn btn-info" onClick={nextPage}>
                        Next
                      </button>
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
