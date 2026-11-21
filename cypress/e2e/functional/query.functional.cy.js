describe('Query matcher assistant', () => {
  it('adds an operator matcher rule from suggestions', () => {
    cy.visit('/query?types=users');

    cy.contains('Matcher Assistant').should('be.visible');

    cy.get('[data-testid="matcher-mode"]').should('be.enabled').select('operator');

    cy.get('[data-testid="matcher-path"] option')
      .eq(1)
      .then(($option) => {
        cy.get('[data-testid="matcher-path"]').should('be.enabled').select($option.val());
      });

    cy.get('[data-testid="matcher-operator"]').clear().type('$gte');
    cy.get('[data-testid="matcher-value"]').clear().type('1');
    cy.get('[data-testid="matcher-add-rule"]').click();

    cy.get('#matcher').invoke('val').should('include', '$gte');
  });

  it('returns 8 user-actions events for the ISO date range operator matcher', () => {
    // The seed data puts user action i at a random time within [2026-01-01T00:00Z + i * 15min, + (i + 1) * 15min),
    // so this range contains exactly the actions 10 to 17.
    const matcher = {
      payload: {
        at: {
          $gte: '2026-01-01T02:30:00.000Z',
          $lt: '2026-01-01T04:30:00.000Z'
        }
      }
    };

    cy.visit(`/query?types=user-actions&matcher=${encodeURIComponent(JSON.stringify(matcher))}`);
    cy.contains('Showing').should('be.visible');
    cy.contains('Showing 8 events').should('be.visible');
  });
});


