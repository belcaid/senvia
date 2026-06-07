describe('Tabs navigation', () => {
  beforeEach(() => {
    cy.visit('/')
  })

  it('loads the dashboard and primary navigation', () => {
    cy.contains('Mes plantes')
    cy.contains('Favoris')
    cy.contains('Alertes')
    cy.contains('Reglages')
  })

  it('opens the favorites and settings tabs', () => {
    cy.contains('Favoris').click()
    cy.url().should('include', '/tabs/favoris')
    cy.contains(/favori/i)

    cy.contains('Reglages').click()
    cy.url().should('include', '/tabs/reglages')
    cy.contains('Synchronisation et donnees')
  })

  it('opens the plant creation form', () => {
    cy.contains('Nouvelle plante').click()
    cy.url().should('include', '/plants/new')
    cy.contains('Ajout plante')
    cy.contains('Ajouter la plante')
  })
})
