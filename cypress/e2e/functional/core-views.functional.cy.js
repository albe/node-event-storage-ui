describe('Core views', () => {
  it('shows stream list and opens a stream detail', () => {
    cy.visit('/streams');
    cy.contains('Stream browser').should('be.visible');
    cy.get('table tbody tr').its('length').should('be.greaterThan', 0);

    cy.get('table tbody tr a')
      .first()
      .then(($streamLink) => {
        const streamName = $streamLink.text().trim();
        cy.visit($streamLink.attr('href'));
        cy.contains(`EventStream '${streamName}'`).should('be.visible');
      });
  });

  it('creates a consumer from the create page and opens its details', () => {
    const consumerName = Cypress._.uniqueId('cypress-core-');

    cy.visit('/consumers/create');
    cy.contains('Create Consumer').should('be.visible');
    //cy.wait(500);
    // Wait for stream options to be populated (confirms data load + hydration).
    cy.get('#streamName option').its('length').should('be.greaterThan', 0);
    cy.get('#streamName').should('be.enabled');
    cy.get('#streamName option')
      .first()
      .then(($option) => {
        cy.get('#streamName').select($option.val());
      });
    cy.get('#consumerName').should('be.enabled').type(consumerName);
    cy.contains('button', 'Create Consumer').click();

    cy.visit('/consumers');
    cy.contains('Consumer Browser').should('be.visible');
    cy.contains('table tbody tr td a', `${consumerName}`).click();
    cy.url().should('contain', `.${consumerName}`)
    cy.contains(`Consumer '${consumerName}@`).should('be.visible');
    cy.contains('Position').should('be.visible');
    cy.contains('State').should('be.visible');
  });
});

