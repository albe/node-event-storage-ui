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
import materialIconsCss from '@fontsource/material-icons/index.css?url';
import roboto300Css from '@fontsource/roboto/300.css?url';
import roboto400Css from '@fontsource/roboto/400.css?url';
import roboto500Css from '@fontsource/roboto/500.css?url';
import roboto700Css from '@fontsource/roboto/700.css?url';
import fontAwesomeCss from 'font-awesome/css/font-awesome.min.css?url';
import adminatorCss from 'adminator-admin-dashboard/src/assets/styles/2026/index.scss?url';
import { listStores, getStoreLockStatus } from '../eventstore';

export const links = () => [
  { rel: 'stylesheet', href: materialIconsCss },
  { rel: 'stylesheet', href: roboto300Css },
  { rel: 'stylesheet', href: roboto400Css },
  { rel: 'stylesheet', href: roboto500Css },
  { rel: 'stylesheet', href: roboto700Css },
  { rel: 'stylesheet', href: fontAwesomeCss },
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
        <Meta />
        <Links />
      </head>
      <body>
        <div className="shell">
          <aside className="d-sidebar">
            <div className="brand brand--text-only">
              <div className="brand-text">
                <div className="brand-name">event-storage-ui</div>
                <div className="brand-tag">node-event-storage</div>
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
              >
                <i className="material-icons">restore_page</i>
                <span>Consumers</span>
              </NavLink>
            </nav>
          </aside>

          <div className="main">
            <header className="d-topbar">
              <div className="crumbs">
                <img src="/logo_white.png" className="topbar-logo" alt="* event-storage" />
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
