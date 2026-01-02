// ==================== INICIALIZACIÓN DE LA APLICACIÓN ====================

async function init() {
    // Inicializar Firebase (si está configurado)
    if (typeof initFirebase === 'function') {
        await initFirebase();
    }
    
    await loadData();
    updateUI();
    loadTerms();
    initPdfDatePicker();
}

// Inicializar selector de fecha para PDF
function initPdfDatePicker() {
    const dateInput = document.getElementById('pdfDate');
    if (!dateInput) return;
    
    // Establecer fecha actual por defecto
    const today = new Date();
    dateInput.value = today.toISOString().split('T')[0];
    
    // Calcular fecha mínima (1 mes atrás)
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    
    // Establecer límites
    dateInput.min = oneMonthAgo.toISOString().split('T')[0];
    dateInput.max = today.toISOString().split('T')[0];
    
    // Validar en tiempo real
    dateInput.addEventListener('change', function() {
        const selectedDate = new Date(this.value + 'T00:00:00');
        const minDate = new Date(oneMonthAgo.toISOString().split('T')[0] + 'T00:00:00');
        const maxDate = new Date(today.toISOString().split('T')[0] + 'T00:00:00');
        
        if (selectedDate < minDate) {
            alert('La fecha no puede ser mayor a 1 mes atrás');
            this.value = today.toISOString().split('T')[0];
        } else if (selectedDate > maxDate) {
            alert('No se pueden seleccionar fechas futuras');
            this.value = today.toISOString().split('T')[0];
        }
    });
}

// Inicializar el sistema de login cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    initLogin();
});
