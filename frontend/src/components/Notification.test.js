
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import Notification from './Notification';

describe('Notification Component', () => {
    // Test 1: No renderiza nada si no hay mensaje
    test('does not render when message is empty', () => {
        const { container } = render(<Notification message="" type="success" onClear={() => { }} />);
        expect(container.firstChild).toBeNull();
    });

    // Test 2: Renderiza mensaje de éxito correctamente
    test('renders success message with correct style', () => {
        render(<Notification message="Éxito total" type="success" onClear={() => { }} />);
        const alert = screen.getByText('Éxito total');
        expect(alert).toBeInTheDocument();
        // Verificamos color verde (aprox)
        expect(alert).toHaveStyle('background-color: #28a745');
    });

    // Test 3: Renderiza mensaje de error correctamente
    test('renders error message with correct style', () => {
        render(<Notification message="Error fatal" type="error" onClear={() => { }} />);
        const alert = screen.getByText('Error fatal');
        expect(alert).toBeInTheDocument();
        // Verificamos color rojo (aprox)
        expect(alert).toHaveStyle('background-color: #dc3545');
    });

    // Test 4: Llama a onClear después de 3 segundos
    test('calls onClear after 3 seconds', () => {
        jest.useFakeTimers();
        const mockOnClear = jest.fn();

        render(<Notification message="Mensaje temporal" type="success" onClear={mockOnClear} />);

        // Aserción inicial: no se ha llamado
        expect(mockOnClear).not.toHaveBeenCalled();

        // Avanzamos el tiempo 3 segundos
        act(() => {
            jest.advanceTimersByTime(3000);
        });

        // Aserción final: se debió llamar
        expect(mockOnClear).toHaveBeenCalledTimes(1);

        jest.useRealTimers();
    });
});
