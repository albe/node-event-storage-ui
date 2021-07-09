import Head from 'next/head';
import Link from 'next/link';
import Layout from '../../components/layout';
import getEventStore from '../../eventstore';
import usePagination from '../../hooks/paginate';

export async function getServerSideProps(context) {
	return getEventStore({readOnly: true}).then(({eventstore}) => {
		return new Promise((resolve, reject) => eventstore.scanConsumers((err, consumers) => {
			if (err) {
				reject(err);
				return;
			}
			resolve({ props: { consumers: consumers.map(consumerIdentifier => [consumerIdentifier].concat(consumerIdentifier.split('.', 2))) } });
		}));
	});
}

export default function Consumers({ consumers }) {
	const [start, end, nextPage, prevPage, hasNext, hasPrev] = usePagination(consumers.length);
	return (<Layout>
		<Head>
			<title>event-storage: Consumers</title>
		</Head>

		<div className="card">
			<div className="card-header card-header-info">
				<h2>Consumers</h2>
				{/*<ul className="nav nav-tabs pull-right">
					<li className="nav-item">
						<a className="nav-link active" href="consumers/add">
							<i className="material-icons">add</i> Add
						</a>
					</li>
				</ul>*/}
			</div>
			<div className="card-body">
				<table className="table table-hover">
					<thead>
						<tr>
							<th>Name</th>
							<th>Stream</th>
						</tr>
					</thead>
					<tbody>
						{consumers.slice(start, end).map(([consumerIdentifier, streamName, consumerName]) =>
							<tr key={consumerIdentifier}>
								<td>
									<Link href={"/consumers/"+consumerIdentifier}>{consumerName}</Link>
								</td>
								<td>
									<Link href={"/consumers/"+consumerIdentifier}>{streamName}</Link>
								</td>
							</tr>
						)}
					</tbody>
					<tfoot>
					<tr>
						<td colSpan={2}>
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