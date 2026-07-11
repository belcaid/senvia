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
    cy.contains('Synchronisation')
  })

  it('shows the alert inbox and explicit bulk actions', () => {
    cy.contains('Alertes').click()
    cy.url().should('include', '/tabs/alertes')
    cy.get('.alerts-filters').first().find('.alerts-chip').should('have.length', 2)
    cy.get('.alerts-filters').first().find('.alerts-chip').first().should('have.class', 'alerts-chip--active')
    cy.get('.alerts-filters--sub .alerts-chip').should('have.length.at.least', 2)
    cy.get('ion-select').should('not.exist')
    cy.get('.alerts-list ion-item').first().within(() => {
      cy.get('ion-button').should('not.exist')
    })
    cy.get('ion-button.alerts-mark-read-btn').click()
    cy.get('.alert-unread-dot').should('not.exist')
  })

  it('opens the plant creation form', () => {
    cy.contains('Nouvelle plante').click()
    cy.url().should('include', '/plants/new')
    cy.contains('Ajout plante')
    cy.contains('Ajouter la plante')
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

  it('keeps the search icon readable in light and dark themes', () => {
    cy.get('ion-searchbar').should(($searchbar) => {
      expect(getComputedStyle($searchbar[0]).getPropertyValue('--icon-color').trim()).to.equal('#254735')
    })

    cy.document().then((document) => {
      document.documentElement.setAttribute('data-theme', 'dark')
    })

    cy.get('ion-searchbar').should(($searchbar) => {
      expect(getComputedStyle($searchbar[0]).getPropertyValue('--icon-color').trim()).to.equal('#ffffff')
    })
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
