import { Link, useLoaderData } from 'react-router';
import getEventStore from '../../eventstore';
import usePagination from '../hooks/paginate';

export const meta = () => [{ title: 'event-storage: Consumer Browser' }];

export async function loader({ request }) {
  const url = new URL(request.url);
  const storeNameOverride = url.searchParams.get('store') || undefined;
  const storeSearch = storeNameOverride ? `?store=${encodeURIComponent(storeNameOverride)}` : '';
  const { eventstore } = await getEventStore({ readOnly: true }, storeNameOverride);

  const consumers = await new Promise((resolve, reject) => {
    eventstore.scanConsumers((err, scannedConsumers) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(scannedConsumers);
    });
  });

  return {
    storeSearch,
    streamCount: Object.keys(eventstore.streams).length,
    consumers: consumers
      .map((consumerIdentifier) => [consumerIdentifier].concat(consumerIdentifier.split('.', 2)))
      .sort((a, b) => a[0].localeCompare(b[0]))
  };
}

export default function ConsumerBrowser() {
  const { consumers, streamCount, storeSearch } = useLoaderData();
  const [start, end, nextPage, prevPage, hasNext, hasPrev] = usePagination(consumers.length);

  return (
    <div className="page-stack">
      <section className="page-hero hero">
        <div className="hero-text">
          <div className="page-eyebrow eyebrow">Consumers</div>
          <h2 className="page-title hero-title">Consumer Browser</h2>
          <p className="page-subtitle hero-sub">Browse registered consumers and open their details.</p>
        </div>
        <div className="page-actions hero-actions">
          <span className="page-pill">
            <i className="material-icons">sync_alt</i>
            {consumers.length} registered
          </span>
          <span className="page-pill">
            <i className="material-icons">view_stream</i>
            {streamCount} streams available
          </span>
          <Link to={`/consumers/create${storeSearch}`} className="btn btn--primary">
            Create Consumer
          </Link>
        </div>
      </section>

      <section className="admin-panel card">
        <div className="admin-panel__header card-head">
          <div className="card-title-wrap">
            <div className="panel-eyebrow eyebrow">Registry</div>
            <h3 className="panel-title card-title">Registered consumers</h3>
          </div>
          <span className="tag t-primary">{consumers.length} registered</span>
        </div>
        <div className="admin-panel__body admin-panel__body--compact">
          <div className="admin-table-wrap table-scroll">
            <table className="table table-hover admin-table data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Stream</th>
                </tr>
              </thead>
              <tbody>
                {consumers.slice(start, end).map(([consumerIdentifier, streamName, consumerName]) => {
                  const consumerPath = `/consumers/${encodeURIComponent(consumerIdentifier)}${storeSearch}`;
                  return (
                    <tr key={consumerIdentifier}>
                      <td className="cell-name">
                        <Link to={consumerPath}>{consumerName}</Link>
                      </td>
                      <td>
                        <Link to={consumerPath} className="tag t-info">
                          {streamName}
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={2}>
                    <div className="data-foot">
                      <span>
                        Showing <strong>{start + 1}-{Math.min(end, consumers.length)}</strong> of{' '}
                        {consumers.length}
                      </span>
                      <div className="button-row">
                        <button disabled={!hasPrev} className="btn btn--ghost" onClick={prevPage}>
                          Prev
                        </button>
                        <button disabled={!hasNext} className="btn btn--ghost" onClick={nextPage}>
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
