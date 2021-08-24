This is an admin dashboard for inspecting a running [node-event-storage](https://github.com/albe/node-event-storage) on the same machine. It is built using [nextjs](https://nextjs.org/) with SSR and based on the creative-tim [material dashboard dark](https://demos.creative-tim.com/material-dashboard-dark/examples/dashboard.html).

## Usage

```
git clone https://github.com/albe/node-event-storage-ui.git
cd node-event-storage-ui
npm install
npm run dev
```

or

```
npm build && npm start
```
for creating a production build and running it. Make sure the webserver is not reachable from the public internet though.

To adjust the path to your local node-event-storage edit the `eventstore.config.js` file and adjust the `storeName` and `options.storageDirectory` JSON properties.
