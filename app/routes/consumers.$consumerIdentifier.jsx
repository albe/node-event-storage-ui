import { useLoaderData } from 'react-router';
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

    return {
      indexName,
      indexLength,
      consumerName,
      consumerPosition,
      consumerState
    };
  } finally {
    eventstore.close();
  }
}

export default function Consumer() {
  const { indexName, indexLength, consumerName, consumerPosition, consumerState } =
    useLoaderData();
  const progressDisplay =
    indexLength > 0 ? `${((consumerPosition / indexLength) * 100).toFixed(2)}%` : 'N/A';

  return (
    <div className="page-stack">
      <section className="page-hero hero">
        <div className="hero-text">
          <div className="page-eyebrow eyebrow">Consumers</div>
          <h2 className="page-title hero-title">
            Consumer '{consumerName}@{indexName}'
          </h2>
          <p className="page-subtitle hero-sub">
            Review current consumer position, progress through the source index, and persisted state.
          </p>
        </div>
        <div className="page-actions hero-actions">
          <span className="page-pill">
            <i className="material-icons">timeline</i>
            {progressDisplay === 'N/A' ? 'Progress unavailable' : `${progressDisplay} progress`}
          </span>
        </div>
      </section>

      <section className="detail-grid">
        <article className="detail-card">
          <div className="meta-list__label">Position</div>
          <div className="detail-card__value">{consumerPosition}</div>
        </article>
        <article className="detail-card">
          <div className="meta-list__label">Index</div>
          <div className="detail-card__value text-mono">{indexName}</div>
        </article>
        <article className="detail-card">
          <div className="meta-list__label">Progress</div>
          <div className="detail-card__value">{progressDisplay}</div>
        </article>
      </section>

      <section className="admin-panel card">
        <div className="admin-panel__header card-head">
          <div className="card-title-wrap">
            <div className="panel-eyebrow eyebrow">State</div>
            <h3 className="panel-title card-title">Consumer details</h3>
          </div>
        </div>
        <div className="admin-panel__body card-body card-body--panel">
          <div className="meta-list">
            <div className="meta-list__item">
              <div className="meta-list__label">Index size</div>
              <div className="meta-list__value">{indexLength}</div>
            </div>
            <div className="meta-list__item">
              <div className="meta-list__label">State</div>
              <div className="json-surface json-surface--short">
                <Json data={consumerState} />
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
