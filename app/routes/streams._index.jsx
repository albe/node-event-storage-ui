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
}

export default function StreamsIndex() {
  const { storeName, streams } = useLoaderData();
  const [start, end, nextPage, prevPage, hasNext, hasPrev] = usePagination(streams.length);

  return (
    <div className="page-stack">
      <section className="page-hero hero">
        <div className="hero-text">
          <div className="page-eyebrow eyebrow">Explorer</div>
          <h2 className="page-title hero-title">Stream browser ({storeName})</h2>
          <p className="page-subtitle hero-sub">
            Inspect streams, creation dates, event counts, and index metadata in a cleaner table layout.
          </p>
        </div>
        <div className="page-actions hero-actions">
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

      <section className="admin-panel card">
        <div className="admin-panel__header card-head">
          <div className="card-title-wrap">
            <div className="panel-eyebrow eyebrow">Catalog</div>
            <h3 className="panel-title card-title">Available streams</h3>
          </div>
          <span className="tag t-primary">{streams.length} records</span>
        </div>
        <div className="admin-panel__body admin-panel__body--compact">
          <div className="admin-table-wrap table-scroll">
            <table className="table table-hover admin-table data-table">
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
                    <td className="cell-name">
                      <Link to={`/streams/${encodeURIComponent(stream.name)}`}>{stream.name}</Link>
                    </td>
                    <td>
                      <span className="cell-date">
                        <DateFormat value={stream.crtime} />
                      </span>
                    </td>
                    <td>
                      <span className="tag t-info">{stream.length} events</span>
                    </td>
                    <td className="cell-json">
                      <Json data={stream.metadata} collapsed={true} />
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={4}>
                    <div className="data-foot">
                      <span>
                        Showing <strong>{start + 1}-{Math.min(end, streams.length)}</strong> of {streams.length}{' '}
                        streams
                      </span>
                      <div className="button-row">
                      <button disabled={!hasPrev} className="btn btn--primary-soft" onClick={prevPage}>
                        Prev
                      </button>
                      <button disabled={!hasNext} className="btn btn--primary-soft" onClick={nextPage}>
                        Next
                      </button>
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
