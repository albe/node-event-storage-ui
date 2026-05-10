import { useEffect, useState } from 'react';

export default function Json({ data, collapsed = true }) {
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
      collapsed={collapsed}
      name={null}
      displayDataTypes={false}
      style={{ background: 'transparent' }}
      theme="monokai"
    />
  );
}
