import React from 'react';

const PaginationControl = ({ currentPage, totalPages, onPageChange }) => {
    if (totalPages <= 1) return null;

    const handlePageChange = (page) => {
        if (page >= 1 && page <= totalPages && page !== currentPage) {
            onPageChange(page);
        }
    };

    const renderPageNumbers = () => {
        const pages = [];

        // Siempre mostrar página 1
        pages.push(
            <li key={1} className={`page-item ${currentPage === 1 ? 'active' : ''}`}>
                <button className="page-link" onClick={() => handlePageChange(1)}>1</button>
            </li>
        );

        // Ellipsis inicial
        if (currentPage > 3) {
            pages.push(<li key="dots1" className="page-item disabled"><span className="page-link">...</span></li>);
        }

        // Rango central
        let start = Math.max(2, currentPage - 1);
        let end = Math.min(totalPages - 1, currentPage + 1);

        // Ajustar si estamos cerca de los extremos para mantener consistencia
        if (currentPage <= 3) end = Math.min(totalPages - 1, 4);
        if (currentPage >= totalPages - 2) start = Math.max(2, totalPages - 3);

        for (let i = start; i <= end; i++) {
            pages.push(
                <li key={i} className={`page-item ${currentPage === i ? 'active' : ''}`}>
                    <button className="page-link" onClick={() => handlePageChange(i)}>{i}</button>
                </li>
            );
        }

        // Ellipsis final
        if (currentPage < totalPages - 2) {
            pages.push(<li key="dots2" className="page-item disabled"><span className="page-link">...</span></li>);
        }

        // Siempre mostrar última página si es > 1
        if (totalPages > 1) {
            pages.push(
                <li key={totalPages} className={`page-item ${currentPage === totalPages ? 'active' : ''}`}>
                    <button className="page-link" onClick={() => handlePageChange(totalPages)}>{totalPages}</button>
                </li>
            );
        }

        return pages;
    };

    return (
        <nav className="mt-4">
            <ul className="pagination justify-content-center">
                {/* Anterior */}
                <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                    <button
                        className="page-link"
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                    >
                        <i className="bi bi-chevron-left"></i>
                    </button>
                </li>

                {renderPageNumbers()}

                {/* Siguiente */}
                <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                    <button
                        className="page-link"
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                    >
                        <i className="bi bi-chevron-right"></i>
                    </button>
                </li>
            </ul>
        </nav>
    );
};

export default PaginationControl;
