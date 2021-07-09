import Head from 'next/head';
import dynamic from 'next/dynamic';
import Layout from '../components/layout';
import getEventStore from '../eventstore';
const Chart = dynamic(() => import('../components/chart'), { ssr: false });
import { formatTimeAgo } from '../helpers/format';
import useSysinfo from '../hooks/sysinfo';
import {useState} from "react";

export async function getServerSideProps(context) {
  return getEventStore({readOnly: true}).then(({eventstore, storageStats}) => {
    return new Promise((resolve, reject) => eventstore.scanConsumers((err, consumers) => {
      if (err) {
        reject(err);
        return;
      }
      const props = {
        props: {
          storeName: eventstore.storeName,
          storageDirectory: eventstore.storageDirectory,
          streamsCount: Object.keys(eventstore.streams).length,
          eventsCount: eventstore.length,
          consumersCount: consumers.length,
          stats: storageStats ?? {}
        }
      }
      resolve(props);
    }));
  });
}

/**
 * @param {object} args
 * @param {string[]} [args.times]
 * @param {number[]} [args.amounts]
 * @returns {{series: number[][], labels: string[]}}
 */
function eventsChartData({ times, amounts }) {
  return {
    labels: (times || []).map(timestamp => new Date(timestamp).toLocaleTimeString()),
    series: [ amounts || [] ]
  };
}

/**
 * @param {object} props
 * @param {{[string]: {times: string[], amounts: number[]}}} props.datas
 * @returns {JSX.Element}
 * @constructor
 */
function EventsChart({ datas }) {
  const optionsLineChart = {
    lineSmooth: {
      type: 'cardinal',
      values:{
        tension: 0
      }
    },
    fullWidth: true,
    low: 0,
    //high: 50, // creative tim: we recommend you to set the high sa the biggest value + something for a better look
    chartPadding: {
      top: 10,
      right: 25,
      bottom: 0,
      left: 0
    },
    axisY: {
      labelOffset: {
        y: 10
      },
    },
    axisX: {
      labelOffset: {
        x: -30
      },
    }
  };
  const [currentStream, setStream] = useState('_all');
  const commitTimes = datas[currentStream]?.times || [];
  const lastCommit = commitTimes.length > 0 ? commitTimes[commitTimes.length-1] : 0;
  const lastCommitAgo = lastCommit > 0 ? (Date.now() - lastCommit) / 1000 : -1;

  //console.log('last commit', lastCommit, lastCommitAgo);
  return (<div className="card card-chart">
    <div className="card-header card-header-info">
      <Chart type="Line" options={optionsLineChart} data={eventsChartData(currentStream in datas ? datas[currentStream] : {})} />
    </div>
    <div className="card-body">
      <h4 className="card-title">Stream Events <form className="pull-right"><div className="form-group">
          <label htmlFor="streamSelect">Stream</label>
          <select id="streamSelect" className="form-control" value={currentStream} onChange={e => setStream(e.target.value)}>
            {Object.keys(datas).sort().map(stream =>
                <option key={stream} value={stream}>{stream}</option>
            )}
          </select>
        </div></form></h4>
      <p className="card-category">
        <span className="text-success"><i className="fa fa-long-arrow-up"/> 55 events/s </span> in the last 24h {/* TODO: */}
      </p>
    </div>
    <div className="card-footer">
      <div className="stats">
        <i className="material-icons">access_time</i> last commit {formatTimeAgo(lastCommitAgo)}
      </div>
    </div>
  </div>);
}

/**
 * @param {array<{used: number, free: number, total: number}>} datas
 * @returns {{series: number[][], labels: string[]}}
 */
function memChartData(datas) {
  return {
    labels: datas.map((_, index) => index===0?'now':(index===datas.length-2?index*10+'s':'')),
    series: [
        datas.map(data => data.used/data.total*100).reverse(),
        datas.map(data => data.free/data.total*100).reverse()
    ]
  }
}

/**
 * @param {object} props
 * @param {array<{used: number, free: number, total: number}>} props.usage
 * @returns {JSX.Element}
 * @constructor
 */
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
      },
    },
    axisX: {
      showGrid: false,
      labelOffset: {
        x: -10
      },
    }
  };
  return (<div className="card card-chart">
    <div className="card-header card-header-success">
      <Chart type="Bar" options={optionsBarChart} data={memChartData(usage)} />
    </div>
    <div className="card-body">
      <h4 className="card-title">MEM Usage</h4>
      <p className="card-category">used / available</p>
    </div>
    <div className="card-footer">
      <div className="stats">
        <i className="material-icons">history</i> last {usage.length*10} seconds
      </div>
    </div>
  </div>);
}

/**
 * @param {array<{ loadUser: number, loadSystem: number, loadIrq: number }>} datas
 * @returns {{series: number[][], labels: string[]}}
 */
function loadChartData(datas) {
  return {
    labels: datas.map((_, index) => index===0?'now':(index===datas.length-2?index*10+'s':'')),
    series: [
      datas.map(data => data.loadIrq+data.loadSystem+data.loadUser).reverse(),
      datas.map(data => data.loadIrq+data.loadSystem).reverse(),
      datas.map(data => data.loadIrq).reverse()
    ]
  };
}

/**
 * @param {object} props
 * @param {array<{ loadUser: number, loadSystem: number, loadIrq: number }>} props.usage
 * @returns {JSX.Element}
 * @constructor
 */
function CpuUsageChart({ usage }) {
  const optionsAreaChart = {
    lineSmooth: {
      type: 'cardinal',
      values:{
        tension: 1
      }
    },
    low: 0,
    fullWidth: true,
    showPoint: false,
    showArea: true,
    //high: 50, // creative tim: we recommend you to set the high sa the biggest value + something for a better look
    chartPadding: {
      top: 10,
      right: 5,
      bottom: 0,
      left: 0
    },
    axisY: {
      labelOffset: {
        y: 10
      },
    },
    axisX: {
      //showLabel: false,
      showGrid: false,
      labelOffset: {
        x: -20
      },
    }
  };

  return (<div className="card card-chart">
    <div className="card-header card-header-warning">
      <Chart type="Line" options={optionsAreaChart} data={loadChartData(usage)} />
    </div>
    <div className="card-body">
      <h4 className="card-title">CPU Load</h4>
      <p className="card-category">user / system / irq</p>
    </div>
    <div className="card-footer">
      <div className="stats">
        <i className="material-icons">history</i> last {usage.length*10} seconds
      </div>
    </div>
  </div>);
}

export default function Dashboard({ storeName, storageDirectory, streamsCount, eventsCount, consumersCount, stats }) {
  const sysinfo = useSysinfo();
  if (sysinfo.fsSize instanceof Array) {
    sysinfo.fsSize = sysinfo.fsSize.find(fs => storageDirectory.startsWith(fs.mount));
  }

  return (<Layout>
    <Head>
      <title>event-storage: Dashboard</title>
    </Head>

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
            {sysinfo.fsSize &&
            <h3 className="card-title">
              {(sysinfo.fsSize.used / 1e9).toFixed(1)+"/"+(sysinfo.fsSize.size / 1e9).toFixed(1)}
              <small>GB</small>
            </h3>
            }
          </div>
          <div className="card-footer">
            <div className={"stats" + (sysinfo.fsSize && sysinfo.fsSize.use > 95 ? " text-danger" : "")}>
              <i className="material-icons">source</i>
              {sysinfo.fsSize &&
              <span>{sysinfo.fsSize.mount} ({sysinfo.fsSize.use}%)</span>
              }
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
            {sysinfo.mem &&
            <h3 className="card-title">
              {(sysinfo.mem.used / 2**30).toFixed(1)+"/"+(sysinfo.mem.total / 2**30).toFixed(1)}
              <small>GiB</small>
            </h3>
            }
          </div>
          <div className="card-footer">
            <div className={"stats" + (sysinfo.mem && sysinfo.mem.swapused/sysinfo.mem.swaptotal > 0.95 ? " text-danger" : "")}>
              <i className="material-icons">note_add</i>
              {sysinfo.mem &&
                  <>
                    <span>SWAP {(sysinfo.mem.swapused / 2**30).toFixed(1)+"/"+(sysinfo.mem.swaptotal / 2**30).toFixed(1)}</span>
                    <small>GiB</small>
                  </>
              }
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
            {sysinfo.currentLoad &&
            <h3 className="card-title">
              {sysinfo.currentLoad.currentLoad.toFixed(2)+"%"}
            </h3>
            }
          </div>
          <div className="card-footer">
            <div className="stats">
              {sysinfo.currentLoad && sysinfo.currentLoad.currentLoad <= 50 &&
              <>
                <i className="material-icons"></i>
                {sysinfo.currentLoad.currentLoadNice.toFixed(2)}% nice
              </>}
              {sysinfo.currentLoad && sysinfo.currentLoad.currentLoad > 50 &&
              <>
                <i className="material-icons text-danger">hourglass_bottom</i>
                high load
              </>
              }
            </div>
          </div>
        </div>
      </div>
      <div className="col-xl-3 col-lg-6 col-md-6 col-sm-6">
        <div className="card card-stats">
          <div className="card-header card-header-success card-header-icon">
            <div className="card-icon">
              <img src="/nodejs-icon.png" width="32" height="32" style={{ margin: 12 }} />
            </div>
            <p className="card-category">NodeJS</p>
            {sysinfo.processLoad &&
            <h3 className="card-title">
              {sysinfo.processLoad[0].cpu.toFixed(2)+"%/"+sysinfo.processLoad[0].mem.toFixed(2)+"%"}
            </h3>
            }
          </div>
          <div className="card-footer">
            <div className="stats">
              cpu/mem
              {sysinfo.processLoad && sysinfo.processLoad[0].cpu > 50 &&
              <>
                <i className="material-icons text-danger">hourglass_bottom</i>
                <span>high load</span>
              </>
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  </Layout>);
}
