/**
 * Cypress screenshot test for the consumer page shell.
 *
 * Run with:
 *   npx cypress run --spec cypress/e2e/consumers.cy.js
 */

describe('Consumers', () => {
  it('captures initial consumer page view screenshot', () => {
    cy.visit('/consumers');
    cy.contains('Add Consumer').should('be.visible');
    cy.screenshot('consumers-preview-executed', { overwrite: true });
  });
});
