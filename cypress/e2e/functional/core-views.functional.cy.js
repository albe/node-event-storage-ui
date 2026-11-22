describe('Core views', () => {
  it('shows stream list and opens a stream detail', () => {
    cy.visit('/streams');
    cy.contains('Stream browser').should('be.visible');
    cy.get('table tbody tr').its('length').should('be.greaterThan', 0);

    cy.get('table tbody tr a')
      .first()
      .then(($streamLink) => {
        const streamName = $streamLink.attr('title');
        cy.visit($streamLink.attr('href'));
        cy.contains(`EventStream '${streamName}'`).should('be.visible');
      });
  });

  it('creates a consumer from the create page and opens its details', () => {
    const consumerName = Cypress._.uniqueId('cypress-core-');

    cy.visit('/consumers/create');
    cy.contains('Create Consumer').should('be.visible');
    cy.get('#streamName option')
      .first()
      .then(($option) => {
        cy.get('#streamName').select($option.val());
      });
    cy.get('#consumerName').type(consumerName);
    cy.contains('button', 'Create Consumer').click();
    // Wait for the create action to finish before navigating away, or the request is aborted.
    cy.contains('[role=alert]', `${consumerName}" created`).should('be.visible');

    cy.visit('/consumers');
    cy.contains('Consumer Browser').should('be.visible');
    cy.contains('table tbody tr td a', `${consumerName}`).click();
    cy.url().should('contain', `.${consumerName}`)
    cy.contains(`Consumer '${consumerName}@`).should('be.visible');
    cy.contains('Position').should('be.visible');
    cy.contains('State').should('be.visible');
  });
});

