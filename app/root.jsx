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
import { json } from 'react-router';
import materialDashboardCss from 'material-dashboard-dark-edition/assets/css/material-dashboard.css?url';
import materialIconsCss from '@fontsource/material-icons/index.css?url';
import roboto300Css from '@fontsource/roboto/300.css?url';
import roboto400Css from '@fontsource/roboto/400.css?url';
import roboto500Css from '@fontsource/roboto/500.css?url';
import roboto700Css from '@fontsource/roboto/700.css?url';
import robotoSlab400Css from '@fontsource/roboto-slab/400.css?url';
import robotoSlab700Css from '@fontsource/roboto-slab/700.css?url';
import fontAwesomeCss from 'font-awesome/css/font-awesome.min.css?url';
import { listStores, getStoreLockStatus } from '../eventstore';

export const links = () => [
  { rel: 'stylesheet', href: materialDashboardCss },
  { rel: 'stylesheet', href: materialIconsCss },
  { rel: 'stylesheet', href: roboto300Css },
  { rel: 'stylesheet', href: roboto400Css },
  { rel: 'stylesheet', href: roboto500Css },
  { rel: 'stylesheet', href: roboto700Css },
  { rel: 'stylesheet', href: robotoSlab400Css },
  { rel: 'stylesheet', href: robotoSlab700Css },
  { rel: 'stylesheet', href: fontAwesomeCss },
  { rel: 'stylesheet', href: '/assets/css/material-overrides.css' },
  { rel: 'icon', href: '/favicon.ico' }
];

export async function loader({ request }) {
  const url = new URL(request.url);
  const storeNameOverride = url.searchParams.get('store') || undefined;
  const stores = listStores();
  const storeLocked = getStoreLockStatus(storeNameOverride);
  return json({ stores, storeLocked });
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
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <Meta />
        <Links />
      </head>
      <body>
        <div className="dark-edition">
          <div className="wrapper" style={{ overflow: 'auto' }}>
            <div className="main-panel" style={{ width: '100%' }}>
              <nav className="navbar navbar-expand-lg bg-info navbar-absolute fixed-top">
                <div className="container-fluid">
                  <div className="navbar-wrapper" style={{ height: 40 }}>
                    <img
                      src="/logo_white.png"
                      style={{ width: 'auto', height: '100%' }}
                      alt="* event-storage"
                    />
                  </div>
                  <div className="collapse navbar-collapse justify-content-end">
                    <ul className="navbar-nav">
                      {stores.length > 1 && (
                        <li className="nav-item" style={{ display: 'flex', alignItems: 'center', marginRight: 8 }}>
                          <select
                            className="form-control"
                            value={currentStore}
                            onChange={handleStoreChange}
                            style={{ height: 36 }}
                            aria-label="Select store"
                          >
                            {stores.map((store) => (
                              <option key={store} value={store}>
                                {store}
                              </option>
                            ))}
                          </select>
                          {storeLocked && (
                            <span
                              title="This store is locked for writing by an external process"
                              style={{ marginLeft: 6, cursor: 'default', fontSize: 18, lineHeight: '36px' }}
                            >
                              ❗
                            </span>
                          )}
                        </li>
                      )}
                      {stores.length <= 1 && storeLocked && (
                        <li className="nav-item" style={{ display: 'flex', alignItems: 'center', marginRight: 8 }}>
                          <span
                            title="This store is locked for writing by an external process"
                            style={{ cursor: 'default', fontSize: 18, lineHeight: '36px' }}
                          >
                            ❗
                          </span>
                        </li>
                      )}
                      <li className="nav-item">
                        <NavLink to={`/${storeSearch}`} className="btn btn-info">
                          <i className="material-icons">dashboard</i> Dashboard
                        </NavLink>
                      </li>
                      <li className="nav-item">
                        <NavLink to={`/streams${storeSearch}`} className="btn btn-info">
                          <i className="material-icons">table_rows</i> Stream Browser
                        </NavLink>
                      </li>
                      <li className="nav-item">
                        <NavLink to={`/consumers${storeSearch}`} className="btn btn-info">
                          <i className="material-icons">restore_page</i> Consumers
                        </NavLink>
                      </li>
                      {!storeLocked && (
                        <li className="nav-item">
                          <NavLink to={`/write-events${storeSearch}`} className="btn btn-info">
                            <i className="material-icons">edit</i> Write Events
                          </NavLink>
                        </li>
                      )}
                    </ul>
                  </div>
                </div>
              </nav>

              <div className="content">
                <div className="container-fluid">
                  <Outlet />
                </div>
              </div>

              <footer className="footer">
                <div className="container-fluid">
                  <nav className="float-left">
                    <ul>
                      <li>
                        <a href="https://www.creative-tim.com">Creative Tim</a>
                      </li>
                    </ul>
                  </nav>
                  <div className="copyright float-right">
                    &copy;{new Date().getFullYear()}, made with{' '}
                    <i className="material-icons">favorite</i> by{' '}
                    <a
                      href="https://www.creative-tim.com"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Creative Tim
                    </a>{' '}
                    for a better web.
                  </div>
                </div>
              </footer>
            </div>
          </div>
        </div>

        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
