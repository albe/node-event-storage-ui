// The UI is server-side rendered. Until React has hydrated the page, its form controls are plain HTML:
// input typed into them is discarded by hydration. The app marks the document once hydration is done,
// so every page visit waits for that before a test interacts with the page.
Cypress.Commands.overwrite('visit', (visit, ...args) => {
  return visit(...args).then((win) => cy.get('html[data-hydrated]', { log: false }).then(() => win));
});
