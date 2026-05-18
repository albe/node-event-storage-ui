describe('Dashboard screenshots', () => {
  it('captures stream screenshots', () => {
    cy.visit('/streams');
    cy.contains('Stream browser').should('be.visible');
    cy.screenshot('stream-browser-react-json-view', { overwrite: true });

    cy.get('table tbody tr a')
      .first()
      .then(($streamLink) => {
        cy.visit($streamLink.attr('href'));
      });

    cy.contains('EventStream').should('be.visible');
    cy.screenshot('event-stream', { overwrite: true });

    cy.contains('button', 'Show Stream Info').click();
    cy.contains('Stream Info').should('be.visible');
    cy.screenshot('stream-info-open-react-json-view', { overwrite: true });
  });
});
