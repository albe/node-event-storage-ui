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
    cy.contains('h2', 'Consumers').should('be.visible');
    cy.contains('a', 'Dashboard').should('be.visible');
    cy.contains('a', 'Stream Browser').should('be.visible');
    cy.contains('a', 'Write Events').should('be.visible');
    cy.contains('button', 'Create Consumer').should('be.disabled');
    cy.contains('button', 'Preview').should('be.visible');
    cy.contains('button', 'Preview').should('not.be.disabled');
    cy.get('form[action="/consumers?index"]').first().submit();
    cy.get('.json-surface .json-view', { timeout: 20000 }).should('be.visible');
    cy.screenshot('consumers-preview-executed', { overwrite: true });
  });
});
