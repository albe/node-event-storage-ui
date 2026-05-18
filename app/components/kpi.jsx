export default function Kpi({ value, stdDev, className }) {
	if (stdDev && Math.abs(value) < stdDev) {
		return (<span className={"kpi-pill flat" + (className ? ' ' + className : '')}><svg viewBox="0 0 24 24"><path d="M5 12h14"></path></svg> ~{value.toFixed(2)}%</span>);
	} else if (value > 0) {
		return (<span className={"kpi-pill up" + (className ? ' ' + className : '')}><svg viewBox="0 0 24 24"><path d="M7 17l10-10M7 7h10v10"></path></svg> +{value.toFixed(2)}%</span>);
	} else if (value === 0) {
		return (<span className={"kpi-pill info" + (className ? ' ' + className : '')}><svg viewBox="0 0 24 24"><path d="M5 12h14"></path></svg> steady</span>);
	} else {
		return (<span className={"kpi-pill down" + (className ? ' ' + className : '')}><svg viewBox="0 0 24 24"><path d="M7 7l10 10M7 17h10V7"></path></svg> {value.toFixed(2)}%</span>);
	}
}