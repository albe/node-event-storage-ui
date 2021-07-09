import dynamic from 'next/dynamic';

const ReactJson = dynamic(() =>
		import('react-json-view'),
	{ ssr: false }
)

export default function Json({data}) {
	return (<ReactJson src={data} collapsed={true} name={null} displayDataTypes={false} style={{background:'transparent'}} theme="monokai" />);
}
