import {
  Links,
  Meta,
  NavLink,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
  useLocation,
  useNavigate,
  useSearchParams
} from 'react-router';
import materialIconsWoff2 from '@fontsource/material-icons/files/material-icons-latin-400-normal.woff2?url';
import roboto300Woff2 from '@fontsource/roboto/files/roboto-latin-300-normal.woff2?url';
import roboto400Woff2 from '@fontsource/roboto/files/roboto-latin-400-normal.woff2?url';
import roboto500Woff2 from '@fontsource/roboto/files/roboto-latin-500-normal.woff2?url';
import roboto700Woff2 from '@fontsource/roboto/files/roboto-latin-700-normal.woff2?url';
import adminatorCss from 'adminator-admin-dashboard/src/assets/styles/2026/index.scss?url';
import { listStores, getStoreLockStatus } from '../eventstore';

const fontFacesCss = `
@font-face {
  font-family: 'Material Icons';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url('${materialIconsWoff2}') format('woff2');
}

@font-face {
  font-family: 'Roboto';
  font-style: normal;
  font-weight: 300;
  font-display: swap;
  src: url('${roboto300Woff2}') format('woff2');
}

@font-face {
  font-family: 'Roboto';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url('${roboto400Woff2}') format('woff2');
}

@font-face {
  font-family: 'Roboto';
  font-style: normal;
  font-weight: 500;
  font-display: swap;
  src: url('${roboto500Woff2}') format('woff2');
}

@font-face {
  font-family: 'Roboto';
  font-style: normal;
  font-weight: 700;
  font-display: swap;
  src: url('${roboto700Woff2}') format('woff2');
}
`;

export const links = () => [
  { rel: 'stylesheet', href: adminatorCss },
  { rel: 'stylesheet', href: '/assets/css/material-overrides.css' },
  { rel: 'icon', href: '/favicon.ico' }
];

export async function loader({ request }) {
  const url = new URL(request.url);
  const storeNameOverride = url.searchParams.get('store') || undefined;
  const stores = listStores();
  const storeLocked = getStoreLockStatus(storeNameOverride);
  return { stores, storeLocked };
}

export const meta = () => [
  { title: 'event-storage-ui' },
  {
    name: 'viewport',
    content:
      'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0'
  }
];

export default function App() {
  const { stores, storeLocked } = useLoaderData();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const currentStore = searchParams.get('store') || (stores.length > 0 ? stores[0] : '');
  const storeSearch = currentStore ? `?store=${currentStore}` : '';

  function handleStoreChange(e) {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('store', e.target.value);
    navigate(`${location.pathname}?${newParams.toString()}`);
  }

  return (
    <html lang="en" data-theme="dark">
      <head>
        <meta charSet="utf-8" />
        <style>{fontFacesCss}</style>
        <Meta />
        <Links />
      </head>
      <body>
        <div className="shell">
          <aside className="d-sidebar">
            <div className="brand">
              <div className="brand-text">
                <div className="brand-name">event-storage-ui</div>
                <div className="brand-tag">node-event-storage</div>
              </div>
              <div className="brand-logo brand-logo-transparent">
                <img alt="" src="/icon-hero-variant-3.svg" />
              </div>
            </div>

            <nav className="nav-section">
            <div className="nav-label">Workspace</div>
              <NavLink
                to={`/${storeSearch}`}
                className={({ isActive }) => `nav-link${isActive ? ' is-active' : ''}`}
                end
              >
                <i className="material-icons">dashboard</i>
                <span>Dashboard</span>
              </NavLink>
              <NavLink
                to={`/streams${storeSearch}`}
                className={({ isActive }) => `nav-link${isActive ? ' is-active' : ''}`}
              >
                <i className="material-icons">table_rows</i>
                <span>Stream Browser</span>
              </NavLink>
              <NavLink
                to={`/query${storeSearch}`}
                className={({ isActive }) => `nav-link${isActive ? ' is-active' : ''}`}
              >
                <i className="material-icons">search</i>
                <span>Query</span>
              </NavLink>
              {!storeLocked && (
                <NavLink
                  to={`/commit-events${storeSearch}`}
                  className={({ isActive }) => `nav-link${isActive ? ' is-active' : ''}`}
                >
                  <i className="material-icons">edit</i>
                  <span>Commit Events</span>
                </NavLink>
              )}
              <NavLink
                to={`/consumers${storeSearch}`}
                className={({ isActive }) => `nav-link${isActive ? ' is-active' : ''}`}
                end
              >
                <i className="material-icons">manage_search</i>
                <span>Consumer Browser</span>
              </NavLink>
              <NavLink
                to={`/consumers/create${storeSearch}`}
                className={({ isActive }) => `nav-link${isActive ? ' is-active' : ''}`}
              >
                <i className="material-icons">playlist_add</i>
                <span>Create Consumer</span>
              </NavLink>
            </nav>
          </aside>

          <div className="main">
            <header className="d-topbar">
              <div className="crumbs">
                <img src="/logo_white.svg" className="topbar-logo" alt="* event-storage" />
              </div>
              <div className="topbar-actions">
                <ul className="nav-right">
                  {stores.length > 1 && (
                    <li>
                      <select
                        className="select topbar-store-select"
                        value={currentStore}
                        onChange={handleStoreChange}
                        aria-label="Select store"
                      >
                        {stores.map((store) => (
                          <option key={store} value={store}>
                            {store}
                          </option>
                        ))}
                      </select>
                    </li>
                  )}
                  {storeLocked && (
                    <li>
                      <span
                        title="This store is locked for writing by an external process"
                        className="store-locked-badge"
                      >
                        ❗
                      </span>
                    </li>
                  )}
                </ul>
              </div>
            </header>

            <main className="content">
              <div className="container-fluid">
                <Outlet />
              </div>
            </main>

            <footer className="d-footer">
              <div>
                <div className="copyright float-right">
                  &copy;{new Date().getFullYear()}, built with{' '}
                  <i className="material-icons">favorite</i> for node-event-storage
                </div>
              </div>
            </footer>
          </div>
        </div>

        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
