const storePath = Cypress.env('STORE_PATH') || 'eventstore';

describe('Commit Events', () => {
  it('shows the commit-events form', () => {
    cy.visit('/commit-events');
    cy.contains('Commit Events').should('be.visible');
    cy.get('#streamName').should('be.visible');
    cy.get('#events').should('be.visible');
    cy.get('[type=submit]').should('be.disabled');
  });

  it('shows live JSON preview fully expanded when valid JSON is entered', () => {
    cy.visit('/commit-events');
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
  });

  it('shows a syntax error when invalid JSON is entered', () => {
    cy.visit('/commit-events');
    cy.get('#streamName').type('orders');
    cy.get('#events').type('{ invalid json }', { parseSpecialCharSequences: false });
    cy.contains('Syntax error').should('be.visible');
    cy.get('[type=submit]').should('be.disabled');
  });

  it('shows metadata section when expanded', () => {
    cy.visit('/commit-events');
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
  });

  it('commits events and shows success message', () => {
    cy.visit('/commit-events');
    cy.get('#streamName').type('cypress-test-stream');
    cy.get('#events').type(
      JSON.stringify([{ type: 'CypressTestEvent', testId: Date.now() }], null, 2),
      { parseSpecialCharSequences: false }
    );
    cy.get('[type=submit]').click();
    cy.contains('Events committed successfully').should('be.visible');
  });
});

describe('Commit Events - Locked Store', () => {
  before(() => {
    cy.task('lockStore', storePath);
  });

  after(() => {
    cy.task('unlockStore', storePath);
  });

  it('shows the locked store message', () => {
    cy.visit('/commit-events');
    cy.contains('locked by an external process').should('be.visible');
  });

  it('hides the Commit Events nav item when locked', () => {
    cy.visit('/');
    cy.contains('a', 'Commit Events').should('not.exist');
  });
});

