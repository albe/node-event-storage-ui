This is an admin dashboard for inspecting a running [node-event-storage](https://github.com/albe/node-event-storage) on the same machine. It is built using [Remix](https://remix.run/) with modern React and based on the creative-tim [material dashboard dark](https://demos.creative-tim.com/material-dashboard-dark/examples/dashboard.html).

## Screenshots

### Dashboard

![Dashboard](public/screenshots/dashboard.png)

### Event Stream

![Event Stream](public/screenshots/event-stream.png)

## Usage

```
git clone https://github.com/albe/node-event-storage-ui.git
cd node-event-storage-ui
npm install
npm run dev
```

or

```
npm run build && npm start
```
for creating a production build and running it. Make sure the webserver is not reachable from the public internet though.

To adjust the path to your local node-event-storage edit the `eventstore.config.json` file and adjust the `storeName` and `options.storageDirectory` JSON properties.

You can also protect the UI with HTTP Basic Auth by setting `basicAuth.username` and `basicAuth.password`. If either value is empty, Basic Auth is disabled.
**WARNING:** Never expose Basic Auth over plain HTTP in untrusted networks; use HTTPS (or a trusted private network only), because credentials are sent with every request and can be intercepted.
Configuration is loaded at server startup, so restart the app after changing `eventstore.config.json`.

```json
{
  "storeName": "eventstore",
  "storesDirectory": null,
  "options": {},
  "basicAuth": {
    "username": "admin",
    "password": "change-me"
  }
}
```
