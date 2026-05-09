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
} from '@remix-run/react';
import { json } from '@remix-run/node';
import materialDashboardCss from 'material-dashboard-dark-edition/assets/css/material-dashboard.css?url';
import materialIconsCss from '@fontsource/material-icons/index.css?url';
import { listStores } from '../eventstore';

export const links = () => [
  { rel: 'stylesheet', href: materialDashboardCss },
  { rel: 'stylesheet', href: materialIconsCss },
  { rel: 'stylesheet', href: '/assets/css/material-overrides.css' },
  {
    rel: 'stylesheet',
    href: 'https://fonts.googleapis.com/css?family=Roboto:300,400,500,700|Roboto+Slab:400,700'
  },
  {
    rel: 'stylesheet',
    href: 'https://maxcdn.bootstrapcdn.com/font-awesome/latest/css/font-awesome.min.css'
  },
  { rel: 'icon', href: '/favicon.ico' }
];

export async function loader() {
  return json({ stores: listStores() });
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
  const { stores } = useLoaderData();
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
