import { useEffect, useState } from 'react';

function getLoad({ load, loadUser, loadSystem, loadNice, loadIdle, loadIrq }) {
  return { load, loadUser, loadSystem, loadNice, loadIdle, loadIrq };
}

function getCurrentLoad({
  currentLoad,
  currentLoadUser,
  currentLoadSystem,
  currentLoadNice,
  currentLoadIdle,
  currentLoadIrq
}) {
  return {
    load: currentLoad,
    loadUser: currentLoadUser,
    loadSystem: currentLoadSystem,
    loadNice: currentLoadNice,
    loadIdle: currentLoadIdle,
    loadIrq: currentLoadIrq
  };
}

function getMem({ total, free, used }) {
  return { total, free, used };
}

function getNetworkSnapshot(networkStats) {
  if (!(networkStats instanceof Array) || networkStats.length === 0) {
    return { rxSec: 0, txSec: 0, interfaces: {} };
  }

  return networkStats.reduce(
    (snapshot, stats) => {
      const interfaceName = stats.iface || 'unknown';
      const rxSec = stats.rx_sec || 0;
      const txSec = stats.tx_sec || 0;

      snapshot.interfaces[interfaceName] = {
        rxSec,
        txSec,
        operstate: stats.operstate || 'unknown'
      };

      return {
        ...snapshot,
        rxSec: snapshot.rxSec + rxSec,
        txSec: snapshot.txSec + txSec
      };
    },
    { rxSec: 0, txSec: 0, interfaces: {} }
  );
}

function appendHistory(history, value) {
  const next = [...history, value];
  if (next.length > 20) {
    next.shift();
  }
  return next;
}

export default function useSysinfo() {
  const [sysinfo, setSysinfo] = useState({
    fsSize: null,
    fsStats: null,
    currentLoad: null,
    processLoad: null,
    mem: null,
    networkStats: null,
    history: {
      cpu: [],
      cpus: null,
      mem: [],
      network: []
    }
  });

  useEffect(() => {
    let interval;
    let stopped = false;

    const refresh = async () => {
      const response = await fetch('/resources/sysinfo');
      const data = await response.json();
      if (stopped) {
        return;
      }

      setSysinfo((current) => {
        const cpu = appendHistory(current.history.cpu, getCurrentLoad(data.currentLoad));
        const cpus =
          current.history.cpus?.map((cpuHistory, index) =>
            appendHistory(cpuHistory, getLoad(data.currentLoad.cpus[index]))
          ) || data.currentLoad.cpus.map((cpuStats) => [getLoad(cpuStats)]);
        const mem = appendHistory(current.history.mem, getMem(data.mem));
        const network = appendHistory(current.history.network, getNetworkSnapshot(data.networkStats));
        return { ...data, history: { cpu, cpus, mem, network } };
      });
    };

    refresh().catch((error) => {
      console.error('Failed to load sysinfo', error);
    });
    interval = setInterval(() => {
      refresh().catch((error) => {
        console.error('Failed to load sysinfo', error);
      });
    }, 5000);

    return () => {
      stopped = true;
      clearInterval(interval);
    };
  }, []);

  return sysinfo;
}
