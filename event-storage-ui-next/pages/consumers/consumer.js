import Head from 'next/head';
import Layout from '../../components/layout';
import Json from '../../components/json';
import getEventStore from '../../eventstore';

export async function getServerSideProps(context) {
	const { consumerIdentifier } = context.query;
	return getEventStore({readOnly: true}).then(({eventstore}) => {
		const [indexName, consumerName] = consumerIdentifier.split('.', 2);
		const consumer = eventstore.getConsumer(indexName, consumerName);
		const consumerPosition = consumer.position;
		const consumerState = consumer.state;
		const indexLength = consumer.index.length;
		eventstore.close();
		return {
			props: {
				indexName,
				indexLength,
				consumerName,
				consumerPosition,
				consumerState
			}
		};
	});
}

export default function Consumer({ indexName, indexLength, consumerName, consumerPosition, consumerState }) {
	return (<Layout>
		<Head>
			<title>event-storage: Consumer {consumerName}</title>
		</Head>

		<div className="card">
			<div className="card-header card-header-info">
				<h2>Consumer '{consumerName}@{indexName}'</h2>
			</div>
			<div className="card-body">
				<table className="table table-hover">
					<thead>
					<tr>
						<th width="5%">Position</th>
						<th width="10%">Index</th>
						<th width="10%">Progress</th>
						<th>State</th>
					</tr>
					</thead>
					<tbody>
						<tr>
							<td>{consumerPosition}</td>
							<td>{indexName}</td>
							<td>{indexLength > 0 ? consumerPosition/indexLength*100 : 100}%</td>
							<td><Json data={consumerState} /></td>
						</tr>
					</tbody>
				</table>
			</div>
		</div>
	</Layout>);
}