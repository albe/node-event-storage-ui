/**
 * Cypress E2E test for consumer preview flow.
 *
 * Run with:
 *   npx cypress run --spec cypress/e2e/consumers.cy.js
 */

describe('Consumers', () => {
  it('previews consumer state and captures a screenshot', () => {
    const testConsumerName = `cypress-preview-${Date.now()}`;
    const initialStateJson = '{"count":0}';
    const consumerLogic = `(event, state, setState) => {
  setState({ ...state, count: (state.count || 0) + 1 });
}`;

    cy.visit('/consumers');
    cy.contains('Add Consumer').should('be.visible');
    cy.get('#streamName option').its('length').should('be.greaterThan', 0);
    cy.get('#streamName option')
      .first()
      .invoke('val')
      .then((streamValue) => {
        expect(streamValue, 'at least one stream option value').to.not.be.empty;
        cy.get('#streamName').select(String(streamValue));
      });
    cy.get('#consumerName').type(testConsumerName);
    cy.get('#consumerLogic').clear().type(consumerLogic, { parseSpecialCharSequences: false });
    cy.get('#initialState').clear().type(initialStateJson, { parseSpecialCharSequences: false });

    cy.intercept('POST', '**/consumers*').as('previewRequest');
    cy.contains('button', 'Preview').click();
    cy.wait('@previewRequest');
    cy.contains('Run preview to evaluate consumer state.').should('not.exist');
    cy.contains('count').should('be.visible');
    cy.screenshot('consumers-preview-executed', { overwrite: true });
  });
});
