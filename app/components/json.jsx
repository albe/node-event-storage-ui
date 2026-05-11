import { useEffect, useState } from 'react';
import 'react18-json-view/src/style.css';
import 'react18-json-view/src/dark.css';

export default function Json({ data, collapsed = true, style = undefined }) {
  const [JsonView, setJsonView] = useState(null);

  useEffect(() => {
    import('react18-json-view').then((module) => setJsonView(() => module.default));
  }, []);

  if (!JsonView) {
    return null;
  }

  return (
    <JsonView
      src={data}
      collapsed={collapsed === true ? 1 : collapsed === false ? false : collapsed}
      dark={true}
      style={{ background: 'transparent', ...style }}
    />
  );
}
