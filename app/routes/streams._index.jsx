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
    const crtime = stream.crtime || fs.statSync(stream.fileName).birthtimeMs;
    return {
      name: streamName,
      length: stream.length,
      metadata: stream.metadata,
      crtime
    };
  });

  // Streams starting with '_' should always be shown first, then newest streams.
  streams.sort((a, b) => {
    const aIsSystem = a.name.startsWith('_');
    const bIsSystem = b.name.startsWith('_');
    if (aIsSystem !== bIsSystem) return aIsSystem ? -1 : 1;
    return b.crtime - a.crtime;
  });

  return {
    storeName: eventstore.storeName,
    streams
  };
}

/** Separates flat streams (no '/') from hierarchical ones and builds a recursive tree for the latter. */
function buildStreamTree(streams) {
  const createNode = () => ({ children: {}, stream: null });
  const root = createNode();
  const topLevelEntries = [];

  for (const stream of streams) {
    if (!stream.name.includes('/')) {
      topLevelEntries.push({ type: 'flat', stream });
      continue;
    }
    const parts = stream.name.split('/');
    const topLevelSegment = parts[0];

    if (!root.children[topLevelSegment]) {
      root.children[topLevelSegment] = createNode();
      topLevelEntries.push({
        type: 'group',
        segment: topLevelSegment,
        path: topLevelSegment,
        node: root.children[topLevelSegment]
      });
    }

    let node = root.children[topLevelSegment];
    for (const part of parts.slice(1, -1)) {
      if (!node.children[part]) node.children[part] = createNode();
      node = node.children[part];
    }
    const last = parts.at(-1);
    if (!node.children[last]) node.children[last] = createNode();
    node.children[last].stream = stream;
  }

  return { topLevelEntries, treeRoot: root };
}

function countLeaves(node) {
  let count = node.stream ? 1 : 0;
  for (const child of Object.values(node.children)) count += countLeaves(child);
  return count;
}

function buildVisibleRows(topLevelEntries, expandedPaths) {
  const rows = [];

  const addGroupRow = (segment, node, depth, path) => {
    const isOpen = expandedPaths.has(path);
    rows.push({
      kind: 'group',
      id: `group:${path}`,
      path,
      segment,
      depth,
      node,
      isOpen,
      leafCount: countLeaves(node),
      counted: !isOpen
    });

    if (!isOpen) return;

    for (const [childSegment, childNode] of Object.entries(node.children)) {
      const childPath = `${path}/${childSegment}`;
      const hasChildren = Object.keys(childNode.children).length > 0;
      if (hasChildren) {
        addGroupRow(childSegment, childNode, depth + 1, childPath);
      } else if (childNode.stream) {
        rows.push({
          kind: 'leaf',
          id: `leaf:${childNode.stream.name}`,
          path: childPath,
          segment: childSegment,
          depth: depth + 1,
          stream: childNode.stream,
          counted: true
        });
      }
    }
  };

  for (const entry of topLevelEntries) {
    if (entry.type === 'flat') {
      rows.push({
        kind: 'leaf',
        id: `leaf:${entry.stream.name}`,
        path: entry.stream.name,
        segment: entry.stream.name,
        depth: 0,
        stream: entry.stream,
        counted: true
      });
      continue;
    }

    addGroupRow(entry.segment, entry.node, 0, entry.path);
  }

  return rows;
}

function buildPagedRows(rows, start, end) {
  const selectedIds = new Set();
  const ancestorPaths = new Set();
  let countedIndex = 0;

  const collectAncestors = (path) => {
    if (!path.includes('/')) return;
    const parts = path.split('/');
    for (let i = 1; i < parts.length; i++) {
      ancestorPaths.add(parts.slice(0, i).join('/'));
    }
  };

  for (const row of rows) {
    if (!row.counted) continue;
    if (countedIndex >= start && countedIndex < end) {
      selectedIds.add(row.id);
      collectAncestors(row.path);
    }
    countedIndex += 1;
  }

  return rows.filter((row) => selectedIds.has(row.id) || (row.kind === 'group' && ancestorPaths.has(row.path)));
}

function renderRow(row, expandedPaths, onToggle) {
  const indent = `calc(0.75rem + ${row.depth * 1.5}em)`;

  if (row.kind === 'group') {
    return (
      <tr key={row.id} className="stream-cat-row" onClick={() => onToggle(row.path)}>
        <td colSpan={4} className="stream-cat-cell" style={{ paddingLeft: indent }}>
          <div className="stream-cat-inner">
            <span className="stream-cat-toggle">
              <i className="material-icons">{expandedPaths.has(row.path) ? 'folder_open' : 'folder'}</i>
              <span className="stream-cat-label">{row.segment}</span>
            </span>
            <span className="tag t-primary">
              {row.leafCount} stream{row.leafCount !== 1 ? 's' : ''}
            </span>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr key={row.id} className="stream-leaf-row">
      <td className="cell-name" style={{ paddingLeft: indent }}>
        <Link to={`/streams/${encodeURIComponent(row.stream.name)}`} title={row.stream.name}>
          <i className="material-icons">receipt_long</i>
          {row.segment}
        </Link>
      </td>
      <td>
        <span className="cell-date">
          <DateFormat value={row.stream.crtime} />
        </span>
      </td>
      <td>
        <span className="tag t-info">{row.stream.length} events</span>
      </td>
      <td className="cell-json">
        <Json data={row.stream.metadata} collapsed={true} />
      </td>
    </tr>
  );
}

export default function StreamsIndex() {
  const { storeName, streams } = useLoaderData();
  const { topLevelEntries, treeRoot } = buildStreamTree(streams);
  const topLevelGroupCount = Object.keys(treeRoot.children).length;
  const [expandedPaths, setExpandedPaths] = useState(() => new Set());

  const togglePath = (path) => {
    setExpandedPaths((current) => {
      const next = new Set(current);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const rows = buildVisibleRows(topLevelEntries, expandedPaths);
  const countedEntriesTotal = rows.reduce((count, row) => count + (row.counted ? 1 : 0), 0);
  const [start, end, nextPage, prevPage, hasNext, hasPrev] = usePagination(countedEntriesTotal);
  const visibleEntries = buildPagedRows(rows, start, end);

  const visibleStart = countedEntriesTotal === 0 ? 0 : Math.min(start + 1, countedEntriesTotal);
  const visibleEnd = Math.min(end, countedEntriesTotal);

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
          {topLevelGroupCount > 0 && (
            <span className="page-pill">
              <i className="material-icons">account_tree</i>
              {topLevelGroupCount} top-level groups
            </span>
          )}
          <span className="page-pill">
            <i className="material-icons">layers</i>
            {visibleStart}-{visibleEnd} paged items
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
                 {visibleEntries.map((row) => renderRow(row, expandedPaths, togglePath))}
               </tbody>
              <tfoot>
                <tr>
                  <td colSpan={4}>
                    <div className="data-foot">
                      <span>
                        Showing <strong>{visibleStart}-{visibleEnd}</strong> of {streams.length} streams
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
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
