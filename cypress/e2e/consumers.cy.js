/**
 * Cypress E2E test for consumer preview flow.
 *
 * Run with:
 *   npx cypress run --spec cypress/e2e/consumers.cy.js
 */

describe('Consumers', () => {
  it('captures consumer view screenshot', () => {
    cy.visit('/consumers');
    cy.contains('Add Consumer').should('be.visible');
    cy.screenshot('consumers-preview-executed', { overwrite: true });
  });
});
