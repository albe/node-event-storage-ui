/**
 * Cypress E2E tests and screenshots for the Write Events feature.
 *
 * Run with:
 *   npx cypress run --spec cypress/e2e/write-events.cy.js
 *
 * Or open interactively:
 *   npx cypress open
 */

const STORE_PATH = Cypress.env('STORE_PATH') || 'eventstore';

describe('Write Events', () => {
  it('shows the empty write-events form', () => {
    cy.visit('/write-events');
    cy.contains('Write Events').should('be.visible');
    cy.get('#streamName').should('be.visible');
    cy.get('#events').should('be.visible');
    cy.get('[type=submit]').should('be.disabled');
    cy.screenshot('write-events', { overwrite: true });
  });

  it('shows live JSON preview when valid JSON is entered', () => {
    cy.visit('/write-events');
    cy.get('#streamName').type('orders');
    cy.get('#events').type(
      JSON.stringify(
        [{ type: 'OrderPlaced', orderId: 'abc-123', amount: 99.99, currency: 'USD' }],
        null,
        2
      ),
      { parseSpecialCharSequences: false }
    );
    cy.contains('OrderPlaced').should('be.visible');
    cy.get('[type=submit]').should('not.be.disabled');
    cy.screenshot('write-events-filled', { overwrite: true });
  });

  it('shows a syntax error when invalid JSON is entered', () => {
    cy.visit('/write-events');
    cy.get('#streamName').type('orders');
    cy.get('#events').type('{ invalid json }', { parseSpecialCharSequences: false });
    cy.contains('Syntax error').should('be.visible');
    cy.get('[type=submit]').should('be.disabled');
  });

  it('shows metadata section when expanded', () => {
    cy.visit('/write-events');
    cy.get('#events').type(
      JSON.stringify([{ type: 'OrderPlaced', orderId: 'abc-123' }], null, 2),
      { parseSpecialCharSequences: false }
    );
    cy.get('button[aria-expanded]').click();
    cy.get('#metadata').should('be.visible');
    cy.get('#metadata').type(
      JSON.stringify({ correlationId: 'req-456', source: 'admin-ui' }, null, 2),
      { parseSpecialCharSequences: false }
    );
    cy.screenshot('write-events-with-metadata', { overwrite: true });
  });

  it('commits events and shows success message', () => {
    cy.visit('/write-events');
    cy.get('#streamName').type('cypress-test-stream');
    cy.get('#events').type(
      JSON.stringify([{ type: 'CypressTestEvent', testId: Date.now() }], null, 2),
      { parseSpecialCharSequences: false }
    );
    cy.get('[type=submit]').click();
    cy.contains('Events committed successfully').should('be.visible');
  });
});

describe('Write Events - Locked Store', () => {
  before(() => {
    // Create a .lock folder in the store directory to simulate an external lock.
    // This requires the Cypress task defined in cypress.config.js.
    cy.task('lockStore', STORE_PATH);
  });

  after(() => {
    cy.task('unlockStore', STORE_PATH);
  });

  it('shows the locked store message', () => {
    cy.visit('/write-events');
    cy.contains('locked by an external process').should('be.visible');
    cy.screenshot('write-events-locked', { overwrite: true });
  });

  it('shows ❗ icon in the navbar', () => {
    cy.visit('/');
    cy.get('[title*="locked"]').should('be.visible');
    cy.screenshot('dashboard-locked', { overwrite: true });
  });

  it('hides the Write Events nav item when locked', () => {
    cy.visit('/');
    cy.contains('a', 'Write Events').should('not.exist');
  });
});
