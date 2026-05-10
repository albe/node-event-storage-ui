describe('Core views', () => {
  it('shows stream list and opens a stream detail', () => {
    cy.visit('/streams');
    cy.contains('Stream browser').should('be.visible');
    cy.get('table tbody tr').its('length').should('be.greaterThan', 0);

    cy.get('table tbody tr a')
      .first()
      .then(($streamLink) => {
        const streamName = $streamLink.text().trim();
        cy.wrap($streamLink).click();
        cy.contains(`EventStream '${streamName}'`).should('be.visible');
      });

    cy.get('table tbody tr').its('length').should('be.greaterThan', 0);
  });

  it('creates a consumer from the consumer view and opens its details', () => {
    const consumerName = Cypress._.uniqueId('cypress-core-');

    cy.visit('/consumers');
    cy.waitForReact();
    cy.contains('Consumers').should('be.visible');
    cy.get('#streamName option').its('length').should('be.greaterThan', 0);
    cy.get('#consumerName').type(consumerName);
    cy.contains('button', 'Create Consumer').click();

    cy.contains('created.').should('be.visible');
    cy.contains('table tbody tr td a', consumerName).should('be.visible').click();
    cy.contains(`Consumer '${consumerName}@`).should('be.visible');
    cy.contains('Position').should('be.visible');
    cy.contains('State').should('be.visible');
  });
});
