// ==================== INICIALIZACIÓN DE LA APLICACIÓN ====================

function init() {
    loadData();
    updateUI();
    loadTerms();
}

// Inicializar el sistema de login cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    initLogin();
});
