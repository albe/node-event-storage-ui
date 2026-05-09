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
        const cpu = current.history.cpu.concat(getCurrentLoad(data.currentLoad)).slice(-20);
        const cpus =
          current.history.cpus?.map((cpuHistory, index) =>
            cpuHistory.concat(getLoad(data.currentLoad.cpus[index])).slice(-20)
          ) || data.currentLoad.cpus.map((cpuStats) => [getLoad(cpuStats)]);
        const mem = current.history.mem.concat(getMem(data.mem)).slice(-20);
        return { ...data, history: { cpu, cpus, mem } };
      });
    };

    refresh().catch(() => undefined);
    interval = setInterval(() => {
      refresh().catch(() => undefined);
    }, 10000);

    return () => {
      stopped = true;
      clearInterval(interval);
    };
  }, []);

  return sysinfo;
}
