import { useState } from 'react';
import { useLoaderData } from 'react-router';
import getEventStore from '../../eventstore';
import { formatTimeAgo } from '../../helpers/format';
import Chart from '../components/chart';
import useSysinfo from '../hooks/sysinfo';
import Kpi from "../components/kpi.jsx";
import Radial from "../components/radial.jsx";

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

const COLORS = { primary: '#00bcd4', success: '#32d48e', warning: '#f59e0b' };
const THEME_SERIES_COLORS = [
  '#00bcd4',
  '#32d48e',
  '#f59e0b',
  '#38bdf8',
  '#ff6b6b',
  '#b794f6',
  '#f472b6',
  '#fb923c',
  '#0891b2',
  '#9ca3af'
];

function formatDataSize(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0 KB';
  }

  if (bytes >= 1024 ** 3) {
    return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
  }

  if (bytes >= 1024 ** 2) {
    return `${(bytes / 1024 ** 2).toFixed(2)} MB`;
  }

  return `${(bytes / 1024).toFixed(2)} KB`;
}

function formatDataRate(bytesPerSecond) {
  return `${formatDataSize(bytesPerSecond)}/s`;
}

function getNetworkOverview(networkStats) {
  if (!(networkStats instanceof Array) || networkStats.length === 0) {
    return {
      rxTotal: 0,
      txTotal: 0,
      rxSec: 0,
      txSec: 0,
      online: false,
      onlineInterfaceLabel: 'no interface'
    };
  }

  const totals = networkStats.reduce(
    (accumulator, stats) => ({
      rxTotal: accumulator.rxTotal + (stats.rx_bytes || 0),
      txTotal: accumulator.txTotal + (stats.tx_bytes || 0),
      rxSec: accumulator.rxSec + (stats.rx_sec || 0),
      txSec: accumulator.txSec + (stats.tx_sec || 0)
    }),
    { rxTotal: 0, txTotal: 0, rxSec: 0, txSec: 0 }
  );

  const activeInterface = networkStats.find((stats) => stats.operstate === 'up');

  return {
    ...totals,
    online: Boolean(activeInterface),
    onlineInterfaceLabel: activeInterface?.iface || 'no active interface'
  };
}

function getNetworkInterfaces(networkStats) {
  if (!(networkStats instanceof Array)) {
    return [];
  }

  return networkStats
    .map((stats) => stats.iface)
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));
}

function isInterfaceOnline(networkStats, selectedInterface) {
  if (!(networkStats instanceof Array) || networkStats.length === 0) {
    return false;
  }

  if (selectedInterface === '_all') {
    return networkStats.some((stats) => stats.operstate === 'up');
  }

  return networkStats.some(
    (stats) => stats.iface === selectedInterface && stats.operstate === 'up'
  );
}

function getNetworkRateForEntry(entry, selectedInterface) {
  if (!entry) {
    return { rxSec: 0, txSec: 0 };
  }

  if (selectedInterface === '_all') {
    return { rxSec: entry.rxSec || 0, txSec: entry.txSec || 0 };
  }

  const interfaceStats = entry.interfaces?.[selectedInterface];
  return {
    rxSec: interfaceStats?.rxSec || 0,
    txSec: interfaceStats?.txSec || 0
  };
}

function networkChartData(history, selectedInterface) {
  const samples = Array.isArray(history) ? history : [];

  return {
    labels: samples.map((_, index) =>
      index === 0 ? 'now' : index === samples.length - 2 ? `${index * 5}s` : ''
    ),
    datasets: [
      {
        label: 'RX/s',
        data: samples.map((entry) => getNetworkRateForEntry(entry, selectedInterface).rxSec).reverse(),
        borderColor: COLORS.primary,
        backgroundColor: COLORS.primary + '1f',
        borderWidth: 2.8,
        fill: true,
        tension: 0.35,
        pointRadius: 0
      },
      {
        label: 'TX/s',
        data: samples.map((entry) => getNetworkRateForEntry(entry, selectedInterface).txSec).reverse(),
        borderColor: COLORS.success,
        backgroundColor: COLORS.success + '1f',
        borderWidth: 2.6,
        fill: true,
        tension: 0.35,
        pointRadius: 0
      }
    ]
  };
}

const networkChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      mode: 'index',
      intersect: false,
      callbacks: {
        label(context) {
          return `${context.dataset.label} ${formatDataRate(context.parsed.y || 0)}`;
        }
      }
    }
  },
  scales: {
    y: {
      beginAtZero: true,
      ticks: {
        color: '#9e9e9e',
        font: { size: 11 },
        callback(value) {
          return formatDataRate(Number(value || 0));
        }
      },
      grid: { color: 'rgba(255,255,255,0.06)', drawBorder: false }
    },
    x: { ticks: { color: '#9e9e9e', font: { size: 11 } }, grid: { display: false } }
  }
};

function eventsChartData({ times, amounts }) {
  return {
    labels: (times || []).map((timestamp) => new Date(timestamp).toLocaleTimeString()),
    datasets: [{
      data: amounts || [],
      borderColor: COLORS.primary,
      backgroundColor: COLORS.primary + '2e',
      borderWidth: 3,
      fill: true,
      tension: 0.35,
      pointRadius: 0
    }]
  };
}

const eventsChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false } },
  scales: {
    y: { beginAtZero: true, ticks: { color: '#9e9e9e', font: { size: 11 } }, grid: { color: 'rgba(255,255,255,0.06)', drawBorder: false } },
    x: { ticks: { color: '#9e9e9e', font: { size: 11 } }, grid: { display: false } }
  }
};

function EventsChart({ datas }) {
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
            className="select"
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
            options={eventsChartOptions}
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
    datasets: [
      {
        label: 'Used',
        data: datas.map((data) => (data.used / data.total) * 100).reverse(),
        backgroundColor: COLORS.primary,
        borderRadius: 8,
        barPercentage: 0.6
      },
      {
        label: 'Free',
        data: datas.map((data) => (data.free / data.total) * 100).reverse(),
        backgroundColor: COLORS.success,
        borderRadius: 8,
        barPercentage: 0.6
      }
    ]
  };
}

const memChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false } },
  scales: {
    y: { beginAtZero: true, max: 100, stacked: true, ticks: { color: '#9e9e9e', font: { size: 11 } }, grid: { color: 'rgba(255,255,255,0.06)', drawBorder: false } },
    x: { stacked: true, ticks: { color: '#9e9e9e', font: { size: 11 } }, grid: { display: false } }
  }
};

function MemUsageChart({ usage }) {
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
          <Chart className="admin-chart admin-chart--memory" type="Bar" options={memChartOptions} data={memChartData(usage)} />
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

function cpuBreakdownChartData(datas) {
  return {
    labels: datas.map((_, index) =>
      index === 0 ? 'now' : index === datas.length - 2 ? `${index * 10}s` : ''
    ),
    datasets: [
      {
        label: 'User',
        data: datas.map((data) => data.loadUser).reverse(),
        borderColor: COLORS.primary,
        backgroundColor: COLORS.primary + '2e',
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointRadius: 0
      },
      {
        label: 'IRQ',
        data: datas.map((data) => data.loadIrq).reverse(),
        borderColor: COLORS.success,
        backgroundColor: COLORS.success + '28',
        borderWidth: 2.6,
        fill: true,
        tension: 0.4,
        pointRadius: 0
      },
      {
        label: 'Nice',
        data: datas.map((data) => data.loadNice).reverse(),
        borderColor: COLORS.warning,
        backgroundColor: COLORS.warning + '24',
        borderWidth: 2.4,
        fill: true,
        tension: 0.4,
        pointRadius: 0
      }
    ]
  };
}

function coreSeriesColor(index) {
  return THEME_SERIES_COLORS[index % THEME_SERIES_COLORS.length];
}

function cpuCoreChartData(coreUsage) {
  const maxSamples = coreUsage.reduce((max, series) => Math.max(max, series.length), 0);
  const labels = Array.from({ length: maxSamples }, (_, index) =>
    index === 0 ? 'now' : index === maxSamples - 2 ? `${index * 10}s` : ''
  );

  return {
    labels,
    datasets: coreUsage.map((series, index) => ({
      label: `CPU ${index + 1}`,
      data: series.map((point) => point.load).reverse(),
      borderColor: coreSeriesColor(index),
      borderWidth: 2,
      fill: false,
      tension: 0.25,
      pointRadius: 0
    }))
  };
}

const cpuBreakdownChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false } },
  scales: {
    y: { beginAtZero: true, /*max: 100,*/ ticks: { color: '#9e9e9e', font: { size: 11 } }, grid: { color: 'rgba(255,255,255,0.06)', drawBorder: false } },
    x: { ticks: { color: '#9e9e9e', font: { size: 11 } }, grid: { display: false } }
  }
};

const cpuCoreChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false, position: 'bottom', labels: { color: '#9e9e9e', boxWidth: 10 } },
    tooltip: { mode: 'index', intersect: false }
  },
  scales: {
    y: { beginAtZero: true, /*max: 100,*/ ticks: { color: '#9e9e9e', font: { size: 11 } }, grid: { color: 'rgba(255,255,255,0.06)', drawBorder: false } },
    x: { ticks: { color: '#9e9e9e', font: { size: 11 } }, grid: { display: false } }
  }
};

function CpuUsageChart({ usage, coreUsage }) {
  const [mode, setMode] = useState('breakdown');
  const hasCoreUsage = Array.isArray(coreUsage) && coreUsage.length > 0;
  const showCoreMode = mode === 'cores' && hasCoreUsage;

  const change = Array.isArray(usage) && usage.length > 0 ? (usage.at(-1)?.load - usage.at(-2)?.load) : 0;
  const chartData = showCoreMode ? cpuCoreChartData(coreUsage) : cpuBreakdownChartData(usage);
  const chartOptions = showCoreMode ? cpuCoreChartOptions : cpuBreakdownChartOptions;

  return (
    <section className="admin-panel card">
      <div className="admin-panel__header card-head">
        <div className="card-title-wrap">
          <div className="panel-eyebrow eyebrow">System</div>
          <h3 className="panel-title card-title">CPU Load
          <Kpi className="pull-right" value={change} /></h3>
          <p className="panel-subtitle hero-sub">
            {showCoreMode
              ? 'Per-core total CPU load over recent samples.'
              : 'Current CPU load broken down by user, irq, and nice.'}
          </p>
        </div>
        <div className="admin-panel__toolbar">
          <label htmlFor="cpuModeSelect" className="sr-only">CPU chart mode</label>
          <select
            id="cpuModeSelect"
            className="select"
            value={mode}
            onChange={(e) => setMode(e.target.value)}
          >
            <option value="breakdown">user / irq / nice</option>
            <option value="cores" disabled={!hasCoreUsage}>per core total</option>
          </select>
        </div>
      </div>
      <div className="admin-panel__body card-body card-body--panel">
        <div className="admin-chart-surface">
          <Chart className="admin-chart admin-chart--load" type="Line" options={chartOptions} data={chartData} />
        </div>
      </div>
      <div className="admin-panel__footer">
        <div className="admin-chart-meta">
          <i className="material-icons">history</i>
          <span>last {usage.length * 5} seconds</span>
        </div>
      </div>
    </section>
  );
}

function NetworkUsageChart({ history, networkStats }) {
  const [selectedInterface, setSelectedInterface] = useState('_all');
  const overview = getNetworkOverview(networkStats);
  const interfaces = getNetworkInterfaces(networkStats);
  const effectiveInterface = selectedInterface === '_all' || interfaces.includes(selectedInterface)
    ? selectedInterface
    : '_all';
  const hasInterfaces = interfaces.length > 0;
  const selectedLabel =
    effectiveInterface === '_all' ? overview.onlineInterfaceLabel : effectiveInterface;
  const selectedOnline = isInterfaceOnline(networkStats, effectiveInterface);
  const samples = Array.isArray(history) ? history : [];
  const latestSample = samples.length > 0 ? samples[samples.length - 1] : null;
  const selectedRate = getNetworkRateForEntry(latestSample, effectiveInterface);

  return (
    <section className="admin-panel card">
      <div className="admin-panel__header card-head">
        <div className="card-title-wrap">
          <div className="panel-eyebrow eyebrow">Network</div>
          <h3 className="panel-title card-title">RX / TX
            {selectedOnline ?
              <span className="badge success pull-right text-mono--sm">
                <i className="material-icons">arrow_upward</i>
              </span>
              :
              <span className="badge danger pull-right text-mono--sm">
                <i className="material-icons btn--outline-danger">arrow_downward</i>
              </span>
          }</h3>
          <p className="panel-subtitle hero-sub">Incoming and outgoing transfer rate over recent samples.</p>
        </div>
        <div className="admin-panel__toolbar">
          <label htmlFor="networkInterfaceSelect" className="sr-only">
            Interface
          </label>
          <select
            id="networkInterfaceSelect"
            className="select"
            value={effectiveInterface}
            onChange={(event) => setSelectedInterface(event.target.value)}
            disabled={!hasInterfaces}
          >
            <option value="_all">all interfaces</option>
            {interfaces.map((interfaceName) => (
              <option key={interfaceName} value={interfaceName}>
                {interfaceName}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="admin-panel__body card-body card-body--panel">
        <div className="admin-chart-surface">
          <Chart
            className="admin-chart admin-chart--network"
            type="Line"
            options={networkChartOptions}
            data={networkChartData(history, effectiveInterface)}
          />
        </div>
      </div>
      <div className="admin-panel__footer">
        <div className="admin-chart-meta">
          <i className="material-icons">swap_vert</i>
          <span>
            RX {formatDataRate(selectedRate.rxSec)} / TX {formatDataRate(selectedRate.txSec)}
          </span>
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
  const networkOverview = getNetworkOverview(sysinfo.networkStats);
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
            Monitor stream volume, system utilization, and storage health.
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
          className="metric-card--purple"
        />
        <MetricCard
          label="Consumers"
          icon={<i className="material-icons">sync_alt</i>}
          value={consumersCount}
          meta="Projection consumers scanning stream activity."
          className="metric-card--success"
        />
        <MetricCard
          label="Storage path"
          icon={<i className="material-icons">folder_open</i>}
          value={<span className="text-mono text-mono--sm">{storageDirectory}</span>}
          meta="Resolved storage directory for the active store."
          className="metric-card--warning"
        />
      </section>

      <section className="panel-grid panel-grid--thirds">
        <EventsChart datas={stats.commits || {}} />
        <CpuUsageChart usage={sysinfo.history.cpu} coreUsage={sysinfo.history.cpus || []} />
        <NetworkUsageChart history={sysinfo.history.network} networkStats={sysinfo.networkStats} />
      </section>

      <section className="panel-grid panel-grid--quarters">
        <MetricCard
          label="Used Space"
          icon={<i className="material-icons">storage</i>}
          value={
            sysinfo.fsSize
              ? `${(sysinfo.fsSize.used / 1e9).toFixed(1)}GB`
              : '—'
          }
          meta={sysinfo.fsSize ? '' : 'Waiting for fs stats'}
          className="metric-card--info"
        >
          {sysinfo.fsSize && <Radial value={sysinfo.fsSize.use ?? 0} label={sysinfo.fsSize.mount} caption={(sysinfo.fsSize.size / 1e9).toFixed(1)+'GB'} />}
        </MetricCard>
        <MetricCard
          label="Used Memory"
          icon={<i className="material-icons">memory</i>}
          value={
            sysinfo.mem
              ? `${(sysinfo.mem.used / 2 ** 30).toFixed(1)}GiB`
              : '—'
          }
          meta={
            sysinfo.mem
              ? `SWAP ${(sysinfo.mem.swapused / 2 ** 30).toFixed(1)}/${(
                  sysinfo.mem.swaptotal / 2 ** 30
                ).toFixed(1)} GiB`
              : 'Waiting for memory stats'
          }
          className="metric-card--pink"
        >
          {sysinfo.mem && <Radial className="pink"
                                  value={sysinfo.mem.used}
                                  max={sysinfo.mem.total}
                                  label="Total"
                                  caption={(sysinfo.mem.total / 2 ** 30).toFixed(1)+'GiB'} />}
          {swapUsage > 0.95 && <div className="metric-card__meta danger">Swap usage is high.</div>}
        </MetricCard>
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
          className="metric-card--success"
        />
        <MetricCard
          label="Network"
          icon={<i className="material-icons">swap_horiz</i>}
          value={`RX ${formatDataSize(networkOverview.rxTotal)} / TX ${formatDataSize(networkOverview.txTotal)}`}
          meta={
            networkOverview.online
              ? `online (${networkOverview.onlineInterfaceLabel}) · ${formatDataRate(networkOverview.rxSec)} / ${formatDataRate(networkOverview.txSec)}`
              : 'No active network interface'
          }
          className="metric-card--warning"
        />
      </section>
    </div>
  );
}
