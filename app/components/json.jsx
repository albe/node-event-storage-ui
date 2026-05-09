import { useEffect, useState } from 'react';

export default function Json({ data }) {
  const [ReactJson, setReactJson] = useState(null);

  useEffect(() => {
    import('react-json-view').then((module) => setReactJson(() => module.default));
  }, []);

  if (!ReactJson) {
    return null;
  }

  return (
    <ReactJson
      src={data}
      collapsed={true}
      name={null}
      displayDataTypes={false}
      style={{ background: 'transparent' }}
      theme="monokai"
    />
  );
}
