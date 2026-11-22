// The UI is server-side rendered and React hydrates the whole document. Until hydration is done, the form
// controls are plain HTML and input typed into them is discarded. The app marks the document once React
// has rendered it on the client, so every page visit waits for that before a test interacts with the page.
Cypress.Commands.overwrite('visit', (visit, ...args) => {
  return visit(...args).then((win) => cy.get('html[data-hydrated]', { log: false }).then(() => win));
});

// Cypress inserts its own script after `<head>` preceded by a space. React cannot hydrate past that text node,
// reports an element mismatch (#418 with "HTML") and renders the document again on the client, replacing all
// server-rendered elements. The visit above waits for that render, so this mismatch is harmless here.
// Text mismatches (#418 with "text") come from the app rendering differently on server and client and still fail.
Cypress.on('uncaught:exception', (err) => {
  if (err.message.includes('#418') && err.message.includes('args[]=HTML')) {
    return false;
  }
  return true;
});
