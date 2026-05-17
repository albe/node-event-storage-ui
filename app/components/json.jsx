import JsonViewModule from 'react18-json-view';
import 'react18-json-view/src/style.css';
import 'react18-json-view/src/dark.css';

const JsonView = JsonViewModule.default ?? JsonViewModule;

export default function Json({ data, collapsed = true, style = undefined, className = '' }) {
  const normalizedCollapsed = collapsed === false ? 1 : collapsed === true ? true : collapsed;

  return (
    <JsonView
      src={data}
      collapsed={normalizedCollapsed}
      displaySize={normalizedCollapsed === false ? false : 'collapsed'}
      dark={true}
      theme="default"
      className={`json-theme-adminator ${className}`.trim()}
      style={{ background: 'transparent', ...style }}
    />
  );
}
