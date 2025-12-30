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
        // Vendedor solo ve Ventas
        if (historyBtn) historyBtn.style.display = 'none';
        if (configBtn) configBtn.style.display = 'none';
        if (inventoryBtn) inventoryBtn.style.display = 'none';
        if (salesBtn) salesBtn.style.display = '';
        
        // Bloquear campo de vendedor y establecer vendedor logueado
        if (appData.loggedSeller) {
            const sellerInput = document.getElementById('sellerSelect');
            const sellerActionBtn = document.getElementById('sellerActionBtn');
            
            if (sellerInput) {
                sellerInput.value = appData.loggedSeller.name;
                sellerInput.disabled = true;
                sellerInput.style.backgroundColor = '#e9ecef';
                sellerInput.style.cursor = 'not-allowed';
                sellerInput.classList.add('valid-selection');
            }
            
            if (sellerActionBtn) {
                sellerActionBtn.style.display = 'none';
            }
            
            // Establecer vendedor actual automáticamente
            appData.currentSeller = appData.loggedSeller;
        }
    } else {
        // Admin ve todo
        if (historyBtn) historyBtn.style.display = '';
        if (configBtn) configBtn.style.display = '';
        if (inventoryBtn) inventoryBtn.style.display = '';
        if (salesBtn) salesBtn.style.display = '';
        
        // Admin puede cambiar vendedor
        const sellerInput = document.getElementById('sellerSelect');
        const sellerActionBtn = document.getElementById('sellerActionBtn');
        
        if (sellerInput) {
            sellerInput.disabled = false;
            sellerInput.style.backgroundColor = '';
            sellerInput.style.cursor = '';
        }
        
        if (sellerActionBtn) {
            sellerActionBtn.style.display = '';
        }
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
