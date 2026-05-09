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
      mem: []
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
        return { ...data, history: { cpu, cpus, mem } };
      });
    };

    refresh().catch((error) => {
      console.error('Failed to load sysinfo', error);
    });
    interval = setInterval(() => {
      refresh().catch((error) => {
        console.error('Failed to load sysinfo', error);
      });
    }, 10000);

    return () => {
      stopped = true;
      clearInterval(interval);
    };
  }, []);

  return sysinfo;
}
