export default function Radial({ value, max, label, caption, className }) {
	max = max || 100;
	const pct = value * 100 / max;
	return (<div className="sv-radial">
		<div className="sv-radial-chart">
			<svg viewBox="0 0 80 80">
				<circle className="radial-track" cx="40" cy="40" r="32"></circle>
				<circle className={"radial-fill " + (pct >= 95 ? "danger" : className ?? "info")} cx="40" cy="40" r="32" pathLength="100" stroke-dasharray={pct + ' 100'}></circle>
			</svg>
			<span className="pct">{pct.toFixed(0)}%</span></div>
		<div className="sv-radial-text">
			{label && <div className="sv-radial-name">{label}</div>}
			{caption && <div className="sv-radial-caption">{caption}</div>}
		</div>
	</div>);
}