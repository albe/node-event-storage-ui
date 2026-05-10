import { useState } from 'react';
import { json } from 'react-router';
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

    return json({
      storeName: eventstore.storeName,
      storageDirectory: eventstore.storageDirectory,
      streamsCount: Object.keys(eventstore.streams).length,
      eventsCount: eventstore.length,
      consumersCount: consumers.length,
      stats: storageStats ?? {}
    });
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
        tension: 0
      }
    },
    fullWidth: true,
    low: 0,
    chartPadding: {
      top: 10,
      right: 25,
      bottom: 0,
      left: 0
    },
    axisY: {
      labelOffset: {
        y: 10
      }
    },
    axisX: {
      labelOffset: {
        x: -30
      }
    }
  };
  const [currentStream, setStream] = useState('_all');
  const commitTimes = datas[currentStream]?.times || [];
  const lastCommit = commitTimes.length > 0 ? commitTimes[commitTimes.length - 1] : 0;
  const lastCommitAgo = lastCommit > 0 ? (Date.now() - lastCommit) / 1000 : -1;

  return (
    <div className="card card-chart">
      <div className="card-header card-header-info">
        <Chart
          type="Line"
          options={optionsLineChart}
          data={eventsChartData(currentStream in datas ? datas[currentStream] : {})}
        />
      </div>
      <div className="card-body">
        <h4 className="card-title">
          Stream Events{' '}
          <form className="pull-right">
            <div className="form-group">
              <label htmlFor="streamSelect">Stream</label>
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
          </form>
        </h4>
        <p className="card-category">
          <span className="text-success">
            <i className="fa fa-long-arrow-up" /> 55 events/s{' '}
          </span>{' '}
          in the last 24h
        </p>
      </div>
      <div className="card-footer">
        <div className="stats">
          <i className="material-icons">access_time</i> last commit {formatTimeAgo(lastCommitAgo)}
        </div>
      </div>
    </div>
  );
}

function memChartData(datas) {
  return {
    labels: datas.map((_, index) => (index === 0 ? 'now' : index === datas.length - 2 ? `${index * 10}s` : '')),
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
    <div className="card card-chart">
      <div className="card-header card-header-success">
        <Chart type="Bar" options={optionsBarChart} data={memChartData(usage)} />
      </div>
      <div className="card-body">
        <h4 className="card-title">MEM Usage</h4>
        <p className="card-category">used / available</p>
      </div>
      <div className="card-footer">
        <div className="stats">
          <i className="material-icons">history</i> last {usage.length * 10} seconds
        </div>
      </div>
    </div>
  );
}

function loadChartData(datas) {
  return {
    labels: datas.map((_, index) => (index === 0 ? 'now' : index === datas.length - 2 ? `${index * 10}s` : '')),
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
    <div className="card card-chart">
      <div className="card-header card-header-warning">
        <Chart type="Line" options={optionsAreaChart} data={loadChartData(usage)} />
      </div>
      <div className="card-body">
        <h4 className="card-title">CPU Load</h4>
        <p className="card-category">user / system / irq</p>
      </div>
      <div className="card-footer">
        <div className="stats">
          <i className="material-icons">history</i> last {usage.length * 10} seconds
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { storeName, storageDirectory, streamsCount, eventsCount, consumersCount, stats } =
    useLoaderData();
  const sysinfo = useSysinfo();
  const swapUsage =
    sysinfo.mem && sysinfo.mem.swaptotal > 0
      ? sysinfo.mem.swapused / sysinfo.mem.swaptotal
      : 0;
  const usedSpaceStatsClass =
    sysinfo.fsSize && sysinfo.fsSize.use > 95 ? 'stats text-danger' : 'stats';
  if (sysinfo.fsSize instanceof Array) {
    sysinfo.fsSize = sysinfo.fsSize.find((fs) =>
      storageDirectory.startsWith(fs.mount)
    );
  }

  return (
    <>
      <div className="card">
        <div className="card-header card-header-info">
          <h2>Dashboard ({storeName})</h2>
        </div>
        <div className="card-body">
          <table className="table table-hover">
            <thead>
              <tr>
                <th>Streams</th>
                <th>Events</th>
                <th>Consumers</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{streamsCount}</td>
                <td>{eventsCount}</td>
                <td>{consumersCount}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <div className="row">
        <div className="col-xl-4 col-lg-12">
          <EventsChart datas={stats.commits || {}} />
        </div>
        <div className="col-xl-4 col-lg-12">
          <MemUsageChart usage={sysinfo.history.mem} />
        </div>
        <div className="col-xl-4 col-lg-12">
          <CpuUsageChart usage={sysinfo.history.cpu} />
        </div>
      </div>
      <div className="row">
        <div className="col-xl-3 col-lg-6 col-md-6 col-sm-6">
          <div className="card card-stats">
            <div className="card-header card-header-info card-header-icon">
              <div className="card-icon">
                <i className="material-icons">storage</i>
              </div>
              <p className="card-category">Used Space</p>
              {sysinfo.fsSize && (
                <h3 className="card-title">
                  {(sysinfo.fsSize.used / 1e9).toFixed(1) +
                    '/' +
                    (sysinfo.fsSize.size / 1e9).toFixed(1)}
                  <small>GB</small>
                </h3>
              )}
            </div>
            <div className="card-footer">
              <div className={usedSpaceStatsClass}>
                <i className="material-icons">source</i>
                {sysinfo.fsSize && (
                  <span>
                    {sysinfo.fsSize.mount} ({sysinfo.fsSize.use}%)
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="col-xl-3 col-lg-6 col-md-6 col-sm-6">
          <div className="card card-stats">
            <div className="card-header card-header-success card-header-icon">
              <div className="card-icon">
                <i className="material-icons">memory</i>
              </div>
              <p className="card-category">Used Memory</p>
              {sysinfo.mem && (
                <h3 className="card-title">
                  {(sysinfo.mem.used / 2 ** 30).toFixed(1) +
                    '/' +
                    (sysinfo.mem.total / 2 ** 30).toFixed(1)}
                  <small>GiB</small>
                </h3>
              )}
            </div>
            <div className="card-footer">
              <div
                className={`stats${swapUsage > 0.95 ? ' text-danger' : ''}`}
              >
                <i className="material-icons">note_add</i>
                {sysinfo.mem && (
                  <>
                    <span>
                      SWAP{' '}
                      {(sysinfo.mem.swapused / 2 ** 30).toFixed(1) +
                        '/' +
                        (sysinfo.mem.swaptotal / 2 ** 30).toFixed(1)}
                    </span>
                    <small>GiB</small>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="col-xl-3 col-lg-6 col-md-6 col-sm-6">
          <div className="card card-stats">
            <div className="card-header card-header-warning card-header-icon">
              <div className="card-icon">
                <i className="material-icons">developer_board</i>
              </div>
              <p className="card-category">CPU Load</p>
              {sysinfo.currentLoad && (
                <h3 className="card-title">{sysinfo.currentLoad.currentLoad.toFixed(2) + '%'}</h3>
              )}
            </div>
            <div className="card-footer">
              <div className="stats">
                {sysinfo.currentLoad && sysinfo.currentLoad.currentLoad <= 50 && (
                  <>
                    <i className="material-icons"></i>
                    {sysinfo.currentLoad.currentLoadNice.toFixed(2)}% nice
                  </>
                )}
                {sysinfo.currentLoad && sysinfo.currentLoad.currentLoad > 50 && (
                  <>
                    <i className="material-icons text-danger">hourglass_bottom</i>
                    high load
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="col-xl-3 col-lg-6 col-md-6 col-sm-6">
          <div className="card card-stats">
            <div className="card-header card-header-success card-header-icon">
              <div className="card-icon">
                <img
                  src="/nodejs-icon.png"
                  width="32"
                  height="32"
                  style={{ margin: 12 }}
                  alt="Node.js"
                />
              </div>
              <p className="card-category">NodeJS</p>
              {sysinfo.processLoad && (
                <h3 className="card-title">
                  {sysinfo.processLoad[0].cpu.toFixed(2) +
                    '%/' +
                    sysinfo.processLoad[0].mem.toFixed(2) +
                    '%'}
                </h3>
              )}
            </div>
            <div className="card-footer">
              <div className="stats">
                cpu/mem
                {sysinfo.processLoad && sysinfo.processLoad[0].cpu > 50 && (
                  <>
                    <i className="material-icons text-danger">hourglass_bottom</i>
                    <span>high load</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
