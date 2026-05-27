describe('Core views', () => {
  it('shows stream list and opens a stream detail', () => {
    cy.visit('/streams');
    cy.contains('Stream browser', { timeout: 20000 }).should('be.visible');
    cy.get('table tbody tr', { timeout: 20000 }).its('length').should('be.greaterThan', 0);

    cy.get('table tbody tr a')
      .first()
      .then(($streamLink) => {
        const streamName = $streamLink.text().trim();
        cy.visit($streamLink.attr('href'));
        cy.contains(`EventStream '${streamName}'`).should('be.visible');
      });
  });

  it('creates a consumer from the consumer view and opens its details', () => {
    const consumerName = Cypress._.uniqueId('cypress-core-');

    cy.visit('/consumers');
    cy.contains('Consumers', { timeout: 20000 }).should('be.visible');
    cy.get('#streamName option', { timeout: 20000 }).its('length').should('be.greaterThan', 0);
    cy.get('#streamName option')
      .first()
      .then(($option) => {
        cy.get('#streamName').select($option.val());
      });
    cy.get('#consumerName').type(consumerName);
    cy.contains('button', 'Create Consumer').click();

    cy.get('.alert.success').scrollIntoView().should('contain.text', 'created.');
    cy.contains('table tbody tr td a', consumerName).scrollIntoView().should('be.visible').click();
    cy.contains(`Consumer '${consumerName}@`).should('be.visible');
    cy.contains('Position').should('be.visible');
    cy.contains('State').should('be.visible');
  });
});

