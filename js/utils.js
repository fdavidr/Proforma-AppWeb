// ==================== FUNCIONES UTILITARIAS ====================

function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

function updateUI() {
    document.getElementById('companyName').textContent = appData.company.name;
    document.getElementById('companySlogan').textContent = appData.company.slogan;
    const companyNitEl = document.getElementById('companyNit');
    if (companyNitEl) {
        if (appData.company.nit) {
            companyNitEl.textContent = 'NIT: ' + appData.company.nit;
            companyNitEl.style.display = 'block';
        } else {
            companyNitEl.textContent = '';
            companyNitEl.style.display = 'none';
        }
    }
    if (appData.company.logo) {
        document.getElementById('companyLogo').src = appData.company.logo;
    }
    document.getElementById('quoteNumber').textContent = 'Nº ' + appData.currentQuoteNumber;
    
    // Ocultar/mostrar botones según rol
    const historyBtn = document.getElementById('historyBtn');
    const configBtn = document.getElementById('configBtn');
    const inventoryBtn = document.getElementById('inventoryBtn');
    const salesBtn = document.getElementById('salesBtn');
    
    if (appData.userRole === 'vendedor') {
        // Vendedor solo ve Ventas e Historial
        if (historyBtn) historyBtn.style.display = '';
        if (configBtn) configBtn.style.display = 'none';
        if (inventoryBtn) inventoryBtn.style.display = 'none';
        if (salesBtn) salesBtn.style.display = '';
    } else {
        // Admin ve todo
        if (historyBtn) historyBtn.style.display = '';
        if (configBtn) configBtn.style.display = '';
        if (inventoryBtn) inventoryBtn.style.display = '';
        if (salesBtn) salesBtn.style.display = '';
    }
}

// Cerrar autocompletado al hacer clic fuera
document.addEventListener('click', function(e) {
    if (!e.target.closest('.autocomplete-container')) {
        document.querySelectorAll('.autocomplete-list').forEach(list => {
            list.classList.remove('active');
        });
    }
});

// Exponer funciones globalmente
window.openModal = openModal;
window.closeModal = closeModal;
window.updateUI = updateUI;
