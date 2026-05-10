// Wait for React 19 hydrateRoot to complete before interacting with the page.
// Cypress can visit a page and assert on SSR content before React has attached
// event handlers. This command waits for the root App component's useEffect to
// signal that hydration is done, ensuring onChange/onClick handlers are live.
Cypress.Commands.add('waitForReact', () => {
  cy.window().its('__reactHydrated').should('equal', true);
});

