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
import { listStores, getStoreLockStatus } from '../eventstore';

export const links = () => [
  { rel: 'stylesheet', href: materialIconsCss },
  { rel: 'stylesheet', href: roboto300Css },
  { rel: 'stylesheet', href: roboto400Css },
  { rel: 'stylesheet', href: roboto500Css },
  { rel: 'stylesheet', href: roboto700Css },
  { rel: 'stylesheet', href: fontAwesomeCss },
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
        <div className="app-shell">
          <aside className="sidebar">
            <div className="sidebar-inner">
              <div className="sidebar-logo">
                <a className="sidebar-link text-decoration-none" href={storeSearch || '/'}>
                  <div className="logo">
                    <img src="/logo_color.png" alt="event-storage" />
                  </div>
                  <span className="logo-text">event-storage-ui</span>
                </a>
              </div>
              <ul className="sidebar-menu">
                <li className="nav-item">
                  <NavLink
                    to={`/${storeSearch}`}
                    className={({ isActive }) => `sidebar-link${isActive ? ' is-active' : ''}`}
                    end
                  >
                    <span className="icon-holder">
                      <i className="material-icons">dashboard</i>
                    </span>
                    <span className="title">Dashboard</span>
                  </NavLink>
                </li>
                <li className="nav-item">
                  <NavLink
                    to={`/streams${storeSearch}`}
                    className={({ isActive }) => `sidebar-link${isActive ? ' is-active' : ''}`}
                  >
                    <span className="icon-holder">
                      <i className="material-icons">table_rows</i>
                    </span>
                    <span className="title">Stream Browser</span>
                  </NavLink>
                </li>
                <li className="nav-item">
                  <NavLink
                    to={`/consumers${storeSearch}`}
                    className={({ isActive }) => `sidebar-link${isActive ? ' is-active' : ''}`}
                  >
                    <span className="icon-holder">
                      <i className="material-icons">restore_page</i>
                    </span>
                    <span className="title">Consumers</span>
                  </NavLink>
                </li>
                {!storeLocked && (
                  <li className="nav-item">
                    <NavLink
                      to={`/write-events${storeSearch}`}
                      className={({ isActive }) => `sidebar-link${isActive ? ' is-active' : ''}`}
                    >
                      <span className="icon-holder">
                        <i className="material-icons">edit</i>
                      </span>
                      <span className="title">Write Events</span>
                    </NavLink>
                  </li>
                )}
              </ul>
            </div>
          </aside>

          <div className="page-container">
            <header className="header navbar">
              <div className="header-container">
                <div className="nav-left">
                  <img src="/logo_white.png" className="topbar-logo" alt="* event-storage" />
                </div>
                <ul className="nav-right">
                  {stores.length > 1 && (
                    <li>
                      <select
                        className="form-control"
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

            <main className="main-content">
              <div className="container-fluid">
                <Outlet />
              </div>
            </main>

            <footer className="footer">
              <div className="container-fluid">
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
