describe('README screenshots', () => {
  it('captures dashboard screenshot', () => {
    cy.visit('/');
    cy.contains('Dashboard', { timeout: 20000 }).should('be.visible');
    cy.screenshot('dashboard', { overwrite: true });
  });

  it('captures event stream screenshot', () => {
    cy.visit('/streams');
    cy.contains('Stream browser', { timeout: 20000 }).should('be.visible');

    cy.get('table tbody tr a', { timeout: 20000 })
      .first()
      .then(($streamLink) => {
        cy.visit($streamLink.attr('href'));
      });

    cy.contains('EventStream', { timeout: 20000 }).should('be.visible');
    cy.screenshot('event-stream', { overwrite: true });
  });

  it('captures consumers preview screenshot', () => {
    cy.visit('/consumers');
    cy.contains('Add Consumer', { timeout: 20000 }).should('be.visible');
    cy.get('form[action="/consumers?index"]').first().submit();
    cy.get('.json-surface .json-view', { timeout: 20000 }).should('be.visible');
    cy.screenshot('consumers-preview-executed', { overwrite: true });
  });

  it('captures commit-events screenshot', () => {
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
    cy.screenshot('write-events-filled', { overwrite: true });
  });
});

