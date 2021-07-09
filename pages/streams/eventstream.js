import Link from 'next/link';
import Head from 'next/head';
import Layout from '../../components/layout';
import Json from '../../components/json';
import DateFormat from '../../components/date';
import getEventStore from '../../eventstore';

export async function getServerSideProps(context) {
	const { streamName } = context.query;
	return getEventStore({readOnly: true}).then(({eventstore}) => {
		let { from, amount, direction, query } = context.query;
		const events = [];
		from = parseInt(from ?? '1', 10) ?? 1;
		amount = parseInt(amount ?? '10', 10) ?? 10;

		const until = direction === 'backwards' ? from - amount + 1 : from + amount - 1;
		const streamLength = eventstore.getStreamVersion(streamName);
		let stream = eventstore.getEventStream(streamName);
		if (stream !== false) {
			if (query instanceof Array) {
				while (query.length > 0) {
					const method = query.shift();
					let arg;
					if (!['fromStart', 'fromEnd'].includes(method)) {
						arg = query.shift();
					}
					console.log(`.${method}(${arg ?? ''})`);
					stream = stream[method](arg);
				}
			} else {
				console.log(`.from(${from}).${direction}(${amount})`);
				stream = stream.from(from)[direction ?? 'forwards'](amount);
			}
			stream.forEach((payload, metadata, stream) => {
				events.push({payload, metadata, stream});
			});
		}
		eventstore.close();
		return {
			props: {
				streamName,
				stream: events,
				from,
				direction,
				amount,
				next: direction === 'backwards' ? until - 1 : (until >= streamLength ? 0 : until + 1),
				prev: direction === 'backwards' ? from + amount : from - amount
			}
		};
	});
}

export default function EventStream({ streamName, stream, from, direction, amount, next, prev }) {
	return (<Layout>
		<Head>
			<title>event-storage: EventStream {streamName}</title>
		</Head>

		<div className="card">
			<div className="card-header card-header-info">
				<h2>EventStream '{streamName}'</h2>
			</div>
			<div className="card-body">
				<table className="table table-hover">
					<thead>
						<tr>
							<th width="5%">StreamVersion</th>
							<th width="10%">Stream</th>
							<th width="15%">Commit Date</th>
							<th width="30%">Payload</th>
							<th width="30%">Metadata</th>
							<th width="5%">CommitId</th>
							<th width="5%">CommitVersion</th></tr>
					</thead>
					<tbody>
					{stream.map(event => {
						return (<tr key={event.stream+'@'+event.metadata.streamVersion}>
							<td>{event.metadata.streamVersion}</td>
							<td>{event.stream}</td>
							<td><DateFormat value={event.metadata.committedAt} /></td>
							<td><Json data={event.payload} /></td>
							<td><Json data={event.metadata} /></td>
							<td className="text-right">{event.metadata.commitId}</td>
							<td className="text-right">{event.metadata.commitVersion + 1}/{event.metadata.commitSize}</td>
						</tr>);
					})}
					</tbody>
					<tfoot>
						<tr>
							<td colSpan={5}>
								<Link href={prev <= 0 ? '' : `/streams/${streamName}/${prev}/${direction}/${amount}`}>
									<a className={"btn btn-info" + (prev <= 0 ? ' disabled' : '')} role="button">Prev</a>
								</Link>
								<Link href={next <= 0 ? '' : `/streams/${streamName}/${next}/${direction}/${amount}`}>
									<a className={"btn btn-info" + (next <= 0 ? ' disabled' : '')} role="button">Next</a>
								</Link>
							</td>
						</tr>
					</tfoot>
				</table>
			</div>
		</div>
	</Layout>);
}