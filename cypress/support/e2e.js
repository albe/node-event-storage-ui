// React error #418 is a hydration mismatch thrown when Cypress's browser
// instrumentation injects scripts into the page before React can hydrate,
// making the client DOM differ from the SSR HTML. The app is correct in
// production; returning false prevents Cypress from failing tests for it.
Cypress.on('uncaught:exception', (err) => {
  if (err.message.includes('#418')) {
    return false;
  }
});
