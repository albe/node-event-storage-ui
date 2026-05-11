import { useEffect, useState } from 'react';

export default function Chart(props) {
  const [ChartistGraph, setChartistGraph] = useState(null);
  const [Interpolation, setInterpolation] = useState(null);

  useEffect(() => {
    import('react-chartist').then((module) => {
      const Component = typeof module.default === 'function' ? module.default : module.default?.default;
      setChartistGraph(() => Component);
    });
    import('chartist').then((module) => {
      const lib = module.default || module;
      setInterpolation(() => lib.Interpolation);
    });
  }, []);

  if (!ChartistGraph || !Interpolation || !['Bar', 'Line', 'Pie'].includes(props.type)) {
    return null;
  }

  const options = props.options ? { ...props.options } : undefined;
  if (options?.lineSmooth?.type) {
    const { type, values } = options.lineSmooth;
    options.lineSmooth = type in Interpolation ? Interpolation[type](values) : undefined;
  }

  return <ChartistGraph {...props} options={options} />;
}
