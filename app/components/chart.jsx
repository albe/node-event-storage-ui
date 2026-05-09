import { useEffect, useState } from 'react';

export default function Chart(props) {
  const [ChartistGraph, setChartistGraph] = useState(null);
  const [Interpolation, setInterpolation] = useState(null);

  useEffect(() => {
    import('react-chartist').then((module) => setChartistGraph(() => module.default));
    import('chartist').then((module) => setInterpolation(() => module.Interpolation));
  }, []);

  if (!ChartistGraph || !['Bar', 'Line', 'Pie'].includes(props.type)) {
    return null;
  }

  const options = props.options ? { ...props.options } : undefined;
  if (Interpolation && options?.lineSmooth?.type) {
    const { type, values } = options.lineSmooth;
    options.lineSmooth =
      type in Interpolation ? Interpolation[type](values) : undefined;
  }

  return <ChartistGraph {...props} options={options} />;
}
