import Link from 'next/link';
import Head from 'next/head';
import Layout from '../../components/layout';
import Json from '../../components/json';
import getEventStore from '../../eventstore';
import usePagination from '../../hooks/paginate';

export async function getServerSideProps(context) {
	//await initEventStore();
	return getEventStore({ readOnly: true }).then(({eventstore}) => {
		const props = {
			props: {
				storeName: eventstore.storeName,
				streams: Object.keys(eventstore.streams).map(streamName => {
					const stream = eventstore.streams[streamName].index;
					return {
						name: streamName,
						length: stream.length,
						metadata: stream.metadata
					};
				})
			}
		};
		eventstore.close();
		return props;
	});
}

export default function Index({ storeName, streams }) {
	const [start, end, nextPage, prevPage, hasNext, hasPrev] = usePagination(streams.length);
	return (
		<Layout>
			<Head>
				<title>event-storage: Stream Browser</title>
			</Head>
			<div className="card">
				<h2 className="card-header card-header-info">Stream browser ({storeName})</h2>
				<div className="card-body">
					<table className="table table-hover">
						<thead>
							<tr>
								<th style={{width:'35%'}}>Stream name</th>
								<th style={{width:'10%'}}>Events</th>
								<th>Metadata</th>
							</tr>
						</thead>
						<tbody>
						{streams.slice(start, end).map(stream => {
							return (<tr key={stream.name}>
								<td><Link href={"/streams/"+stream.name}>{stream.name}</Link></td>
								<td>{stream.length}</td>
								<td><Json data={stream.metadata} /></td>
							</tr>);
						})}
						</tbody>
						<tfoot>
							<tr>
								<td colSpan={3}>
									<button disabled={!hasPrev} className="btn btn-info" onClick={prevPage}>Prev</button>
									<button disabled={!hasNext} className="btn btn-info" onClick={nextPage}>Next</button>
								</td>
							</tr>
						</tfoot>
					</table>
				</div>
			</div>
		</Layout>);
}