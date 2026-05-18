import { useEffect, useState } from 'react';

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
      cpus: [],
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

      setSysinfo(data);
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
