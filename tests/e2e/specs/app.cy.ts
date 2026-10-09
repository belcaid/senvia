describe('Tabs navigation', () => {
  beforeEach(() => {
    cy.visit('/')
  })

  it('loads the dashboard and primary navigation', () => {
    cy.contains('Mes plantes')
    cy.contains('Favoris')
    cy.contains('Alertes')
    cy.contains('Réglages')
  })

  it('opens the favorites and settings tabs', () => {
    cy.contains('ion-label', 'Favoris').closest('ion-tab-button').click()
    cy.url().should('include', '/tabs/favoris')
    cy.contains(/favori/i)

    cy.contains('ion-label', 'Réglages').closest('ion-tab-button').click()
    cy.url().should('include', '/tabs/reglages')
    cy.contains('Personnalisez seulement ce qui compte au quotidien.')
  })

  it('shows the alert inbox and explicit bulk actions', () => {
    cy.contains('ion-label', 'Alertes').closest('ion-tab-button').click()
    cy.url().should('include', '/tabs/alertes')
    cy.get('.alerts-tabs .alert-tab').should('have.length', 3)
    cy.get('.alerts-controls ion-select').should('not.exist')
    cy.get('.alerts-list .alert-card').should('have.length.at.least', 1)
    cy.contains('Tout marquer comme vu').click()
    cy.contains('Tout marquer comme vu').should('not.exist')
  })

  it('opens the plant creation form', () => {
    cy.contains('Nouvelle plante').click()
    cy.url().should('include', '/plants/new')
    cy.contains('Ajoutez votre plante')
    cy.contains('Continuer')
  })

  it('opens the dashboard filters with their controls', () => {
    cy.get('ion-button.dashboard-icon-action').first().click()
    cy.get('ion-modal.dashboard-filters-modal').should('be.visible')
    cy.get('ion-select', { includeShadowDom: true }).should('have.length', 2)
    cy.contains('Appliquer')
    cy.get('ion-button.filters-modal-close')
      .shadow()
      .find('button')
      .should('have.attr', 'aria-label', 'Fermer les filtres')
    cy.get('ion-button.filters-modal-close').click()
    cy.get('ion-modal.dashboard-filters-modal').should('not.be.visible')
  })

  it('uses the dark visual identity consistently', () => {
    cy.get('ion-searchbar').should(($searchbar) => {
      expect(getComputedStyle($searchbar[0]).getPropertyValue('--icon-color').trim()).to.equal('#ffffff')
    })
    cy.document().its('documentElement.dataset.theme').should('equal', 'dark')
  })

  it('keeps the dashboard controls usable on mobile', () => {
    cy.viewport(390, 844)
    cy.reload()
    cy.contains('Mes plantes')
    cy.get('ion-button.dashboard-icon-action').first().click()
    cy.get('ion-modal.dashboard-filters-modal').should('be.visible')
    cy.get('ion-select', { includeShadowDom: true }).should('have.length', 2)
    cy.contains('Appliquer')
  })
})
