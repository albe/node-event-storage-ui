import ChartistGraph from 'react-chartist';

/**
 * @param {{options?: { lineSmooth?: { type: string, values: object }}}} props
 * @returns {JSX.Element}
 * @constructor
 */
export default function Chart(props) {
	const { Interpolation } = require('chartist');
	if (props.options?.lineSmooth?.type) {
		const { type, values } = props.options.lineSmooth;
		props.options.lineSmooth = (Interpolation && type in Interpolation) ? Interpolation[type](values) : undefined;
	}
	if (!['Bar', 'Line', 'Pie'].includes(props.type)) {
		return null;
	}
	return (<ChartistGraph {...props} />);
}