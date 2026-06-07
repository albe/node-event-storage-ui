const dashboardScreenshotDelayMs = 100000;

describe('README screenshots', () => {
  function visitQueryForFirstStream() {
    cy.visit('/streams');
    cy.contains('Stream browser', { timeout: 20000 }).should('be.visible');

    cy.get('table tbody tr a', { timeout: 20000 })
      .first()
      .then(($streamLink) => {
        const href = $streamLink.attr('href');
        const streamName = decodeURIComponent(href.split('/').pop().split('?')[0]);
        cy.visit(`/query?types=${encodeURIComponent(streamName)}`);
      });
  }

  it('captures dashboard screenshot', () => {
    cy.visit('/');
    cy.contains('Dashboard', { timeout: 20000 }).should('be.visible');
    cy.wait(dashboardScreenshotDelayMs);
    cy.screenshot('dashboard', { overwrite: true });
  });

  it('captures event stream screenshot', () => {
    cy.visit('/streams');
    cy.contains('Stream browser', { timeout: 20000 }).should('be.visible');

    cy.get('table tbody tr a', { timeout: 20000 })
      .first()
      .then(($streamLink) => {
        cy.visit($streamLink.attr('href'));
      });

    cy.contains('EventStream', { timeout: 20000 }).should('be.visible');
    cy.screenshot('event-stream', { overwrite: true });
  });

  it('captures query page screenshot', () => {
    visitQueryForFirstStream();

    cy.contains('Query Input', { timeout: 20000 }).should('be.visible');
    cy.contains('Matcher').should('be.visible');
    cy.screenshot('query-page', { overwrite: true });
  });

  it('captures query matcher screenshot', () => {
    visitQueryForFirstStream();

    cy.get('#matcher').type(
      JSON.stringify(
        {
          payload: {
            amount: {
              $gte: 100
            }
          }
        },
        null,
        2
      ),
      { parseSpecialCharSequences: false }
    );
    cy.contains('Run Query').should('be.visible');
    cy.screenshot('query-matcher', { overwrite: true });
  });

  it('captures consumers preview screenshot', () => {
    cy.visit('/consumers/create');
    cy.contains('Add Consumer', { timeout: 20000 }).should('be.visible');
    cy.contains('button', 'Preview').click();
    cy.get('.json-surface .json-view', { timeout: 20000 }).should('be.visible');
    cy.screenshot('consumers-preview-executed', { overwrite: true });
  });

  it('captures consumer browser screenshot', () => {
    cy.visit('/consumers');
    cy.contains('Consumer Browser', { timeout: 20000 }).should('be.visible');
    cy.get('table tbody tr', { timeout: 20000 }).its('length').should('be.greaterThan', 0);
    cy.screenshot('consumers-list', { overwrite: true });
  });

  it('captures consumer detail screenshot', () => {
    cy.visit('/consumers');
    cy.contains('Consumer Browser', { timeout: 20000 }).should('be.visible');
    cy.get('table tbody tr td a', { timeout: 20000 }).first().click();
    cy.contains('Consumer', { timeout: 10000 }).should('be.visible');
    cy.contains('Position').should('be.visible');
    cy.screenshot('consumers-detail', { overwrite: true });
  });

  it('captures commit-events screenshot', () => {
    cy.visit('/commit-events');
    cy.get('#streamName').type('orders');
    cy.get('#events').type(
      JSON.stringify(
        [{ type: 'OrderPlaced', orderId: 'abc-123', amount: 99.99, currency: 'USD' }],
        null,
        2
      ),
      { parseSpecialCharSequences: false }
    );
    cy.contains('OrderPlaced').should('be.visible');
    cy.screenshot('write-events-filled', { overwrite: true });
  });
});
