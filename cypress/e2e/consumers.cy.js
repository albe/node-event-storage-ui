/**
 * Cypress E2E test for consumer preview flow.
 *
 * Run with:
 *   npx cypress run --spec cypress/e2e/consumers.cy.js
 */

const SETUP_STREAM = 'cypress-setup-stream';

describe('Consumers', () => {
  before(() => {
    // Ensure at least one stream exists before running consumer tests.
    // consumers.cy.js runs first alphabetically, so we create a stream here
    // rather than depending on write-events.cy.js having run before us.
    cy.visit('/write-events');
    cy.get('#streamName').type(SETUP_STREAM);
    cy.get('#events').type('[{"type":"ConsumerTestSetup"}]', { parseSpecialCharSequences: false });
    cy.get('[type=submit]').click();
    cy.contains('Events committed successfully').should('be.visible');
  });

  it('previews consumer state and captures a screenshot', () => {
    const testConsumerName = `cypress-preview-${Date.now()}`;
    const initialStateJson = '{"count":0}';
    const consumerLogic = `(event, state, setState) => {
  setState({ ...state, count: (state.count || 0) + 1 });
}`;

    cy.visit('/consumers');
    cy.contains('Add Consumer').should('be.visible');
    // The component initialises streamName to streamNames[0], so the first
    // option is already selected — no explicit cy.select() needed.
    cy.get('#streamName option').its('length').should('be.greaterThan', 0);
    cy.get('#consumerName').type(testConsumerName);
    cy.get('#consumerLogic').type('{selectAll}{backspace}').type(consumerLogic, { parseSpecialCharSequences: false });
    cy.get('#initialState').type('{selectAll}{backspace}').type(initialStateJson, { parseSpecialCharSequences: false });

    cy.intercept('POST', '**/consumers*').as('previewRequest');
    cy.contains('button', 'Preview').click();
    cy.wait('@previewRequest');
    cy.contains('Run preview to evaluate consumer state.').should('not.exist');
    cy.contains('count').should('be.visible');
    cy.screenshot('consumers-preview-executed', { overwrite: true });
  });
});
