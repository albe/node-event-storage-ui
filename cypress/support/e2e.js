// Wait for React to finish hydrating a specific DOM element before interacting with it.
// React sets an internal __reactFiber$ key on each DOM node during its hydration pass.
// Checking for this key on a leaf element guarantees React has processed that element
// and attached its event handlers (onChange, onClick, etc.).
// cy.get().should() retries the assertion automatically until it passes or times out.
Cypress.Commands.add('waitForReact', (selector) => {
  const sel = selector || 'body';
  cy.get(sel).should(($el) => {
    const el = $el[0];
    expect(
      Object.keys(el).some(k => k.startsWith('__reactFiber$')),
      `React fiber attached to "${sel}"`
    ).to.be.true;
  });
});
