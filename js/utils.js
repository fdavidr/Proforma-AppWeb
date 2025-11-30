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
    if (appData.company.logo) {
        document.getElementById('companyLogo').src = appData.company.logo;
    }
    document.getElementById('quoteNumber').textContent = 'Nº ' + appData.currentQuoteNumber;
    
    // Ocultar botones para vendedores
    const historyBtn = document.getElementById('historyBtn');
    const configBtn = document.getElementById('configBtn');
    
    if (appData.userRole === 'vendedor') {
        if (historyBtn) historyBtn.style.display = 'none';
        if (configBtn) configBtn.style.display = 'none';
    } else {
        if (historyBtn) historyBtn.style.display = '';
        if (configBtn) configBtn.style.display = '';
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
