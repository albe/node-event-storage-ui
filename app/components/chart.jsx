import { useEffect, useState } from 'react';

let registered = false;

async function ensureChartJsRegistered() {
  if (registered) return;
  const { Chart, LineElement, BarElement, PointElement, LineController, BarController,
    CategoryScale, LinearScale, Filler, Tooltip, Legend } = await import('chart.js');
  Chart.register(LineElement, BarElement, PointElement, LineController, BarController,
    CategoryScale, LinearScale, Filler, Tooltip, Legend);
  registered = true;
}

export default function Chart({ type, data, options, className }) {
  const [ChartComponent, setChartComponent] = useState(null);

  useEffect(() => {
    Promise.all([
      import('react-chartjs-2'),
      ensureChartJsRegistered()
    ]).then(([mod]) => {
      const Components = { Line: mod.Line, Bar: mod.Bar };
      setChartComponent(() => Components[type]);
    });
  }, [type]);

  if (!ChartComponent) return null;

  return (
    <div className={className}>
      <ChartComponent data={data} options={options} />
    </div>
  );
}
