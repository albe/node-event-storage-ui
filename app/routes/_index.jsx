import { useState } from 'react';
import { useLoaderData } from 'react-router';
import getEventStore from '../../eventstore';
import { formatTimeAgo } from '../../helpers/format';
import Chart from '../components/chart';
import useSysinfo from '../hooks/sysinfo';

export const meta = () => [{ title: 'event-storage: Dashboard' }];

export async function loader({ request }) {
  const url = new URL(request.url);
  const storeNameOverride = url.searchParams.get('store') || undefined;
  const { eventstore, storageStats } = await getEventStore({ readOnly: true }, storeNameOverride);

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

    return {
      storeName: eventstore.storeName,
      storageDirectory: eventstore.storageDirectory,
      streamsCount: Object.keys(eventstore.streams).length,
      eventsCount: eventstore.length,
      consumersCount: consumers.length,
      stats: storageStats ?? {}
    };
  } finally {
    eventstore.close();
  }
}

function eventsChartData({ times, amounts }) {
  return {
    labels: (times || []).map((timestamp) => new Date(timestamp).toLocaleTimeString()),
    series: [amounts || []]
  };
}

function EventsChart({ datas }) {
  const optionsLineChart = {
    lineSmooth: {
      type: 'cardinal',
      values: {
        tension: 0.35
      }
    },
    fullWidth: true,
    showArea: true,
    showPoint: false,
    low: 0,
    chartPadding: {
      top: 10,
      right: 10,
      bottom: 0,
      left: 0
    },
    axisY: {
      labelOffset: {
        y: 10
      }
    },
    axisX: {
      showGrid: false,
      labelOffset: {
        x: -12
      }
    }
  };
  const [currentStream, setStream] = useState('_all');
  const commitTimes = datas[currentStream]?.times || [];
  const lastCommit = commitTimes.length > 0 ? commitTimes[commitTimes.length - 1] : 0;
  const lastCommitAgo = lastCommit > 0 ? (Date.now() - lastCommit) / 1000 : -1;

  return (
    <section className="admin-panel card">
      <div className="admin-panel__header card-head">
        <div className="card-title-wrap">
          <div className="panel-eyebrow eyebrow">Events</div>
          <h3 className="panel-title card-title">Stream Events</h3>
          <p className="panel-subtitle hero-sub">Review recent event throughput for the selected stream.</p>
        </div>
        <div className="admin-panel__toolbar">
          <label htmlFor="streamSelect" className="sr-only">
            Stream
          </label>
          <select
            id="streamSelect"
            className="form-control"
            value={currentStream}
            onChange={(e) => setStream(e.target.value)}
          >
            {Object.keys(datas)
              .sort()
              .map((stream) => (
                <option key={stream} value={stream}>
                  {stream}
                </option>
              ))}
          </select>
        </div>
      </div>
      <div className="admin-panel__body card-body card-body--panel">
        <div className="admin-chart-surface">
          <Chart
            className="admin-chart admin-chart--events"
            type="Line"
            options={optionsLineChart}
            data={eventsChartData(currentStream in datas ? datas[currentStream] : {})}
          />
        </div>
      </div>
      <div className="admin-panel__footer">
        <div className="admin-chart-meta">
          <i className="material-icons">access_time</i>
          <span>last commit {formatTimeAgo(lastCommitAgo)}</span>
        </div>
      </div>
    </section>
  );
}

function memChartData(datas) {
  return {
    labels: datas.map((_, index) =>
      index === 0 ? 'now' : index === datas.length - 2 ? `${index * 10}s` : ''
    ),
    series: [
      datas.map((data) => (data.used / data.total) * 100).reverse(),
      datas.map((data) => (data.free / data.total) * 100).reverse()
    ]
  };
}

function MemUsageChart({ usage }) {
  const optionsBarChart = {
    low: 0,
    high: 100,
    fullWidth: true,
    stackBars: true,
    seriesBarDistance: 18,
    chartPadding: {
      top: 10,
      right: 5,
      bottom: 0,
      left: 0
    },
    axisY: {
      labelOffset: {
        y: 10
      }
    },
    axisX: {
      showGrid: false,
      labelOffset: {
        x: -10
      }
    }
  };

  return (
    <section className="admin-panel card">
      <div className="admin-panel__header card-head">
        <div className="card-title-wrap">
          <div className="panel-eyebrow eyebrow">System</div>
          <h3 className="panel-title card-title">MEM Usage</h3>
          <p className="panel-subtitle hero-sub">Used versus available memory over recent samples.</p>
        </div>
        <span className="page-pill">used / available</span>
      </div>
      <div className="admin-panel__body card-body card-body--panel">
        <div className="admin-chart-surface">
          <Chart className="admin-chart admin-chart--memory" type="Bar" options={optionsBarChart} data={memChartData(usage)} />
        </div>
      </div>
      <div className="admin-panel__footer">
        <div className="admin-chart-meta">
          <i className="material-icons">history</i>
          <span>last {usage.length * 10} seconds</span>
        </div>
      </div>
    </section>
  );
}

function loadChartData(datas) {
  return {
    labels: datas.map((_, index) =>
      index === 0 ? 'now' : index === datas.length - 2 ? `${index * 10}s` : ''
    ),
    series: [
      datas.map((data) => data.loadIrq + data.loadSystem + data.loadUser).reverse(),
      datas.map((data) => data.loadIrq + data.loadSystem).reverse(),
      datas.map((data) => data.loadIrq).reverse()
    ]
  };
}

function CpuUsageChart({ usage }) {
  const optionsAreaChart = {
    lineSmooth: {
      type: 'cardinal',
      values: {
        tension: 1
      }
    },
    low: 0,
    fullWidth: true,
    showPoint: false,
    showArea: true,
    chartPadding: {
      top: 10,
      right: 5,
      bottom: 0,
      left: 0
    },
    axisY: {
      labelOffset: {
        y: 10
      }
    },
    axisX: {
      showGrid: false,
      labelOffset: {
        x: -20
      }
    }
  };

  return (
    <section className="admin-panel card">
      <div className="admin-panel__header card-head">
        <div className="card-title-wrap">
          <div className="panel-eyebrow eyebrow">System</div>
          <h3 className="panel-title card-title">CPU Load</h3>
          <p className="panel-subtitle hero-sub">
            Current CPU load broken down by user, system, and irq.
          </p>
        </div>
        <span className="page-pill">user / system / irq</span>
      </div>
      <div className="admin-panel__body card-body card-body--panel">
        <div className="admin-chart-surface">
          <Chart className="admin-chart admin-chart--load" type="Line" options={optionsAreaChart} data={loadChartData(usage)} />
        </div>
      </div>
      <div className="admin-panel__footer">
        <div className="admin-chart-meta">
          <i className="material-icons">history</i>
          <span>last {usage.length * 10} seconds</span>
        </div>
      </div>
    </section>
  );
}

function MetricCard({ label, icon, value, meta, children, className = '' }) {
  return (
    <article className={`metric-card ${className}`.trim()}>
      <div className="metric-card__header">
        <div className="metric-card__label">{label}</div>
        <span className="metric-card__icon">{icon}</span>
      </div>
      <div className="metric-card__value">{value}</div>
      <div className="metric-card__meta">{meta}</div>
      {children}
    </article>
  );
}

export default function Dashboard() {
  const { storeName, storageDirectory, streamsCount, eventsCount, consumersCount, stats } =
    useLoaderData();
  const sysinfo = useSysinfo();
  const swapUsage =
    sysinfo.mem && sysinfo.mem.swaptotal > 0 ? sysinfo.mem.swapused / sysinfo.mem.swaptotal : 0;

  if (sysinfo.fsSize instanceof Array) {
    sysinfo.fsSize = sysinfo.fsSize.find((fs) => storageDirectory.startsWith(fs.mount));
  }

  return (
    <div className="page-stack">
      <section className="page-hero hero">
        <div className="hero-text">
          <div className="page-eyebrow eyebrow">Workspace</div>
          <h2 className="page-title hero-title">Dashboard ({storeName})</h2>
          <p className="page-subtitle hero-sub">
            Monitor stream volume, system utilization, and storage health for{' '}
            <span className="text-mono">{storageDirectory}</span>.
          </p>
        </div>
        <div className="page-actions hero-actions">
          <span className="page-pill">
            <i className="material-icons">view_stream</i>
            {streamsCount} streams
          </span>
          <span className="page-pill">
            <i className="material-icons">dynamic_feed</i>
            {eventsCount} events
          </span>
          <span className="page-pill">
            <i className="material-icons">groups</i>
            {consumersCount} consumers
          </span>
        </div>
      </section>

      <section className="metric-grid">
        <MetricCard
          label="Streams"
          icon={<i className="material-icons">view_stream</i>}
          value={streamsCount}
          meta="Indexed event streams available in this store."
          className="metric-card--primary"
        />
        <MetricCard
          label="Events"
          icon={<i className="material-icons">bolt</i>}
          value={eventsCount}
          meta="Committed events currently persisted on disk."
          className="metric-card--warning"
        />
        <MetricCard
          label="Consumers"
          icon={<i className="material-icons">sync_alt</i>}
          value={consumersCount}
          meta="Projection consumers scanning stream activity."
          className="metric-card--purple"
        />
        <MetricCard
          label="Storage path"
          icon={<i className="material-icons">folder_open</i>}
          value={<span className="text-mono text-mono--sm">{storageDirectory}</span>}
          meta="Resolved storage directory for the active store."
          className="metric-card--orange"
        />
      </section>

      <section className="panel-grid panel-grid--thirds">
        <EventsChart datas={stats.commits || {}} />
        <MemUsageChart usage={sysinfo.history.mem} />
        <CpuUsageChart usage={sysinfo.history.cpu} />
      </section>

      <section className="panel-grid panel-grid--quarters">
        <MetricCard
          label="Used Space"
          icon={<i className="material-icons">storage</i>}
          value={
            sysinfo.fsSize
              ? `${(sysinfo.fsSize.used / 1e9).toFixed(1)}/${(sysinfo.fsSize.size / 1e9).toFixed(1)}GB`
              : '—'
          }
          meta={sysinfo.fsSize ? `${sysinfo.fsSize.mount} (${sysinfo.fsSize.use}%)` : 'Waiting for fs stats'}
          className="metric-card--info"
        />
        <MetricCard
          label="Used Memory"
          icon={<i className="material-icons">memory</i>}
          value={
            sysinfo.mem
              ? `${(sysinfo.mem.used / 2 ** 30).toFixed(1)}/${(sysinfo.mem.total / 2 ** 30).toFixed(1)}GiB`
              : '—'
          }
          meta={
            sysinfo.mem
              ? `SWAP ${(sysinfo.mem.swapused / 2 ** 30).toFixed(1)}/${(
                  sysinfo.mem.swaptotal / 2 ** 30
                ).toFixed(1)} GiB`
              : 'Waiting for memory stats'
          }
          className="metric-card--success"
        >
          {swapUsage > 0.95 && <div className="metric-card__meta text-danger">Swap usage is high.</div>}
        </MetricCard>
        <MetricCard
          label="CPU Load"
          icon={<i className="material-icons">developer_board</i>}
          value={sysinfo.currentLoad ? `${sysinfo.currentLoad.currentLoad.toFixed(2)}%` : '—'}
          meta={
            sysinfo.currentLoad
              ? sysinfo.currentLoad.currentLoad > 50
                ? 'High load'
                : `${sysinfo.currentLoad.currentLoadNice.toFixed(2)}% nice`
              : 'Waiting for CPU stats'
          }
          className="metric-card--warning"
        />
        <MetricCard
          label="NodeJS"
          icon={<img src="/nodejs-icon.png" width="24" height="24" alt="Node.js" />}
          value={
            sysinfo.processLoad
              ? `${sysinfo.processLoad[0].cpu.toFixed(2)}%/${sysinfo.processLoad[0].mem.toFixed(2)}%`
              : '—'
          }
          meta={
            sysinfo.processLoad && sysinfo.processLoad[0].cpu > 50 ? 'cpu/mem · high load' : 'cpu/mem'
          }
          className="metric-card--pink"
        />
      </section>
    </div>
  );
}
