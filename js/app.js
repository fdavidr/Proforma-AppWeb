// ==================== INICIALIZACIÓN DE LA APLICACIÓN ====================

async function init() {
    // Inicializar Firebase (si está configurado)
    if (typeof initFirebase === 'function') {
        await initFirebase();
    }
    
    await loadData();
    updateUI();
    loadTerms();
}

// Inicializar el sistema de login cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    initLogin();
});
