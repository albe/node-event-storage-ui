import { json } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import getEventStore from '../../eventstore';
import Json from '../components/json';

export const meta = ({ params }) => [
  { title: `event-storage: Consumer ${params.consumerIdentifier}` }
];

export async function loader({ params, request }) {
  const consumerIdentifier = params.consumerIdentifier;
  const url = new URL(request.url);
  const storeNameOverride = url.searchParams.get('store') || undefined;
  const { eventstore } = await getEventStore({ readOnly: true }, storeNameOverride);

  try {
    const [indexName, consumerName] = consumerIdentifier.split('.', 2);
    const consumer = eventstore.getConsumer(indexName, consumerName);
    const consumerPosition = consumer.position;
    const consumerState = consumer.state;
    const indexLength = consumer.index.length;

    return json({
      indexName,
      indexLength,
      consumerName,
      consumerPosition,
      consumerState
    });
  } finally {
    eventstore.close();
  }
}

export default function Consumer() {
  const { indexName, indexLength, consumerName, consumerPosition, consumerState } =
    useLoaderData();

  return (
    <div className="card">
      <div className="card-header card-header-info">
        <h2>
          Consumer '{consumerName}@{indexName}'
        </h2>
      </div>
      <div className="card-body">
        <table className="table table-hover">
          <thead>
            <tr>
              <th width="5%">Position</th>
              <th width="10%">Index</th>
              <th width="10%">Progress</th>
              <th>State</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{consumerPosition}</td>
              <td>{indexName}</td>
              <td>{indexLength > 0 ? (consumerPosition / indexLength) * 100 : 100}%</td>
              <td>
                <Json data={consumerState} />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
