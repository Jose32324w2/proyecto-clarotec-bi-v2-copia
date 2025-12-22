// Describe el test
describe('Login Flow', () => {
    // Test de login exitoso
    it('successfully logs in', () => {
        // Visitamos la página de login
        cy.visit('http://localhost:3000/login');

        // Llenamos el formulario de login
        cy.get('input[type="email"]').type('luisad@gmail.com');
        cy.get('input[type="password"]').type('12345678Aa _');
        cy.get('button[type="submit"]').click();

        cy.url().should('include', '/inicio');
        cy.contains('Panel de Administración').should('be.visible');
    });

    // Test de login con credenciales incorrectas
    it('shows error on invalid credentials', () => {
        // Visitamos la página de login
        cy.visit('http://localhost:3000/login');

        // Llenamos el formulario de login con credenciales incorrectas
        cy.get('input[type="email"]').type('wrong@clarotec.com');
        cy.get('input[type="password"]').type('wrongpass');
        cy.get('button[type="submit"]').click();

        // Verificamos que se muestre el mensaje de error
        cy.contains('Credenciales incorrectas').should('be.visible');
    });
});
