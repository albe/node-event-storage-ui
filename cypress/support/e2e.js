// Wait for React 19 hydrateRoot to complete before interacting with the page.
// Cypress can visit a page and assert on SSR content before React has attached
// event handlers. This command waits for the root App component's useEffect to
// signal that hydration is done, ensuring onChange/onClick handlers are live.
Cypress.Commands.add('waitForReact', () => {
  cy.window().its('__reactHydrated').should('equal', true);
});

// Type a value into a React 19 controlled <input> or <textarea>.
// Cypress's built-in .type() fires synthetic keyboard events that React 19 may
// not process for controlled inputs (the onChange never fires). This command
// uses the native HTMLInputElement / HTMLTextAreaElement value setter followed
// by a bubbling "input" event, which React 19 reliably handles.
Cypress.Commands.add('reactType', { prevSubject: 'element' }, (subject, value) => {
  return cy.window().then((win) => {
    const el = subject[0];
    const proto =
      el.tagName === 'TEXTAREA'
        ? win.HTMLTextAreaElement.prototype
        : win.HTMLInputElement.prototype;
    const descriptor = Object.getOwnPropertyDescriptor(proto, 'value');
    if (descriptor && descriptor.set) {
      descriptor.set.call(el, value);
    } else {
      el.value = value;
    }
    el.dispatchEvent(new win.Event('input', { bubbles: true }));
  }).then(() => cy.wrap(subject));
});

