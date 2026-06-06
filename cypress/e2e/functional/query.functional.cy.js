describe('Query matcher assistant', () => {
  it('adds an operator matcher rule from suggestions', () => {
    cy.visit('/streams');
    cy.get('table tbody tr a')
      .first()
      .then(($streamLink) => {
        const streamName = $streamLink.text().trim();
        cy.visit(`/query?types=${encodeURIComponent(streamName)}`);
      });

    cy.contains('Matcher Assistant').should('be.visible');

    cy.get('[data-testid="matcher-mode"]').select('operator');

    cy.get('[data-testid="matcher-path"] option')
      .eq(1)
      .then(($option) => {
        cy.get('[data-testid="matcher-path"]').select($option.val());
      });

    cy.get('[data-testid="matcher-operator"]').clear().type('$gte');
    cy.get('[data-testid="matcher-value"]').clear().type('1');
    cy.get('[data-testid="matcher-add-rule"]').click();

    cy.get('#matcher').invoke('val').should('include', '$gte');
  });

  it('returns 8 user-actions events for the ISO date range operator matcher', () => {
    const matcher = {
      payload: {
        at: {
          $gte: '2021-06-09T21:03:28.297Z',
          $lt: '2021-06-09T21:41:53.775Z'
        }
      }
    };

    cy.visit(`/query?types=user-actions&matcher=${encodeURIComponent(JSON.stringify(matcher))}`);
    cy.contains('Showing').should('be.visible');
    cy.contains('Showing 8 events').should('be.visible');
  });
});


