import fs from 'node:fs';
import { Link, useLoaderData } from 'react-router';
import { useState } from 'react';
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

  // Newest streams first
  streams.sort((a, b) => b.crtime - a.crtime);

  return {
    storeName: eventstore.storeName,
    streams
  };
}

function detectSeparator(streams) {
  for (const sep of ['-', '.', '/']) {
    const prefixes = new Set(streams.map((s) => s.name.split(sep)[0]));
    if (prefixes.size < streams.length) return sep;
  }
  return null;
}

function buildTree(streams) {
  const sep = detectSeparator(streams);
  if (!sep) return null;
  const categories = {};
  for (const stream of streams) {
    const idx = stream.name.indexOf(sep);
    const category = idx === -1 ? stream.name : stream.name.slice(0, idx);
    if (!categories[category]) categories[category] = [];
    categories[category].push(stream);
  }
  // Only use tree view when there's actual grouping
  if (Object.keys(categories).length === streams.length) return null;
  return { sep, categories };
}

function CategoryGroup({ category, streams, sep }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <tr className="stream-cat-row" onClick={() => setOpen((o) => !o)}>
        <td colSpan={4} className="stream-cat-cell">
          <div className="stream-cat-inner">
            <span className="stream-cat-toggle">
              <i className="material-icons">{open ? 'folder_open' : 'folder'}</i>
              <span className="stream-cat-label">{category}</span>
            </span>
            <span className="tag t-primary">
              {streams.length} stream{streams.length !== 1 ? 's' : ''}
            </span>
          </div>
        </td>
      </tr>
      {open &&
        streams.map((stream) => {
          const rest = stream.name.startsWith(category + sep)
            ? stream.name.slice(category.length + sep.length)
            : stream.name;
          return (
            <tr key={stream.name} className="stream-leaf-row">
              <td className="stream-leaf-name cell-name">
                <Link to={`/streams/${encodeURIComponent(stream.name)}`} title={stream.name}>
                  <i className="material-icons stream-leaf-icon">receipt_long</i>
                  {rest}
                </Link>
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
          );
        })}
    </>
  );
}

export default function StreamsIndex() {
  const { storeName, streams } = useLoaderData();
  const tree = buildTree(streams);
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
          {tree ? (
            <span className="page-pill">
              <i className="material-icons">account_tree</i>
              {Object.keys(tree.categories).length} categories
            </span>
          ) : (
            <span className="page-pill">
              <i className="material-icons">layers</i>
              {start + 1}-{Math.min(end, streams.length)} visible
            </span>
          )}
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
                {tree
                  ? Object.entries(tree.categories).map(([category, catStreams]) => (
                      <CategoryGroup
                        key={category}
                        category={category}
                        streams={catStreams}
                        sep={tree.sep}
                      />
                    ))
                  : streams.slice(start, end).map((stream) => (
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
              {!tree && (
                <tfoot>
                  <tr>
                    <td colSpan={4}>
                      <div className="data-foot">
                        <span>
                          Showing <strong>{start + 1}-{Math.min(end, streams.length)}</strong> of{' '}
                          {streams.length} streams
                        </span>
                        <div className="button-row">
                          <button disabled={!hasPrev} className="btn btn--soft-primary" onClick={prevPage}>
                            Prev
                          </button>
                          <button disabled={!hasNext} className="btn btn--soft-primary" onClick={nextPage}>
                            Next
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
