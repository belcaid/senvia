describe('Tabs navigation', () => {
  it('loads dashboard tab by default', () => {
    cy.visit('/')
    cy.contains('Dashboard')
    cy.contains('Favoris')
    cy.contains('Alertes')
    cy.contains('Reglages')
  })
})
