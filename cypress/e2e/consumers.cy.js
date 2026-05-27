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
    cy.contains('a', 'Commit Events').should('be.visible');
    cy.contains('button', 'Create Consumer').should('be.disabled');
    cy.contains('button', 'Preview').should('be.visible');
    cy.contains('button', 'Preview').should('not.be.disabled');
    cy.get('form[action="/consumers?index"]').first().submit();
    cy.get('.json-surface .json-view', { timeout: 20000 }).should('be.visible');
    cy.screenshot('consumers-preview-executed', { overwrite: true });
  });

  it('creates a consumer and captures a consumer detail screenshot', () => {
    const consumerName = `cypress-detail-${Date.now()}`;

    cy.visit('/consumers');
    cy.get('#streamName option', { timeout: 10000 }).its('length').should('be.greaterThan', 0);
    cy.get('#streamName option').first().then(($opt) => {
      cy.get('#streamName').select($opt.val());
    });
    cy.get('#consumerName').type(consumerName);
    cy.contains('button', 'Create Consumer').click();
    cy.get('.alert.success', { timeout: 10000 }).should('contain.text', 'created.');

    cy.contains('table tbody tr td a', consumerName).scrollIntoView().click();
    cy.contains(`Consumer '${consumerName}@`).should('be.visible');
    cy.contains('Position').should('be.visible');
    cy.contains('State').should('be.visible');
    cy.get('.json-surface .json-view', { timeout: 10000 }).should('be.visible');
    cy.screenshot('consumers-detail', { overwrite: true });
  });
});
