const formatter = new Intl.DateTimeFormat(undefined, {
	day: '2-digit',
	month: '2-digit',
	year: 'numeric',
	hour: '2-digit',
	minute: '2-digit',
	second: '2-digit'
});

export default function Date({value}) {
	let date = value instanceof Date ? value : new Date(value);

	try {
		return formatter.format(date);
	} catch {
		console.error(`Can not format '${value}' as a date`);
		return value;
	}
}
