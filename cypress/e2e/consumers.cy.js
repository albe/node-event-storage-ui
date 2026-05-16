/**
 * Cypress screenshot test for the consumer page shell.
 *
 * Run with:
 *   npx cypress run --spec cypress/e2e/consumers.cy.js
 */

describe('Consumers', () => {
  it('previews consumer state and captures a screenshot', () => {
    cy.visit('/consumers');
    cy.contains('Add Consumer').should('be.visible');
    cy.screenshot('consumers-preview-executed', { overwrite: true });
  });
});
