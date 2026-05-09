import { json } from '@remix-run/node';
import { Link, useLoaderData } from '@remix-run/react';
import getEventStore from '../../eventstore';
import usePagination from '../hooks/paginate';

export const meta = () => [{ title: 'event-storage: Consumers' }];

export async function loader() {
  const { eventstore } = await getEventStore({ readOnly: true });

  try {
    const consumers = await new Promise((resolve, reject) => {
      eventstore.scanConsumers((err, scannedConsumers) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(scannedConsumers);
      });
    });

    return json({
      consumers: consumers.map((consumerIdentifier) =>
        [consumerIdentifier].concat(consumerIdentifier.split('.', 2))
      )
    });
  } finally {
    eventstore.close();
  }
}

export default function Consumers() {
  const { consumers } = useLoaderData();
  const [start, end, nextPage, prevPage, hasNext, hasPrev] = usePagination(
    consumers.length
  );

  return (
    <div className="card">
      <div className="card-header card-header-info">
        <h2>Consumers</h2>
      </div>
      <div className="card-body">
        <table className="table table-hover">
          <thead>
            <tr>
              <th>Name</th>
              <th>Stream</th>
            </tr>
          </thead>
          <tbody>
            {consumers.slice(start, end).map(([consumerIdentifier, streamName, consumerName]) => (
              <tr key={consumerIdentifier}>
                <td>
                  <Link to={`/consumers/${encodeURIComponent(consumerIdentifier)}`}>
                    {consumerName}
                  </Link>
                </td>
                <td>
                  <Link to={`/consumers/${encodeURIComponent(consumerIdentifier)}`}>
                    {streamName}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={2}>
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
