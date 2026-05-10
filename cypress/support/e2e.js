// Wait for React to finish hydrating before interacting with controlled inputs.
// The App component sets window.__reactHydrated = true in a useEffect that runs
// after hydration completes. cy.window().should() retries the assertion
// automatically until it passes or the command timeout is reached.
Cypress.Commands.add('waitForReact', () => {
  cy.window().should((win) => {
    expect(win.__reactHydrated, 'React has hydrated').to.be.true;
  });
});
