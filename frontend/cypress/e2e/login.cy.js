describe('Login Flow', () => {
    it('successfully logs in', () => {
        cy.visit('http://localhost:3000/login');

        cy.get('input[type="email"]').type('admin@clarotec.cl');
        cy.get('input[type="password"]').type('admin123');
        cy.get('button[type="submit"]').click();

        cy.url().should('include', '/dashboard');
        cy.contains('Panel de Administración').should('be.visible');
    });

    it('shows error on invalid credentials', () => {
        cy.visit('http://localhost:3000/login');

        cy.get('input[type="email"]').type('wrong@clarotec.cl');
        cy.get('input[type="password"]').type('wrongpass');
        cy.get('button[type="submit"]').click();

        // Esperamos explícitamente el mensaje completo para evitar ambigüedades
        cy.contains('Credenciales incorrectas').should('be.visible');
    });
});
