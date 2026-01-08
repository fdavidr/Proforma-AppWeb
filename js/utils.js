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
    updateDocumentNumber();
    
    // Ocultar/mostrar botones según rol
    const historyBtn = document.getElementById('historyBtn');
    const configBtn = document.getElementById('configBtn');
    const inventoryBtn = document.getElementById('inventoryBtn');
    const salesBtn = document.getElementById('salesBtn');
    const exportBtn = document.getElementById('exportBtn');
    const importBtn = document.getElementById('importBtn');
    
    if (appData.userRole === 'vendedor') {
        // Vendedor solo ve Ventas
        if (historyBtn) historyBtn.style.display = 'none';
        if (configBtn) configBtn.style.display = 'none';
        if (inventoryBtn) inventoryBtn.style.display = 'none';
        if (salesBtn) salesBtn.style.display = '';
        if (exportBtn) exportBtn.style.display = 'none';
        if (importBtn) importBtn.style.display = 'none';
        
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
        if (exportBtn) exportBtn.style.display = '';
        if (importBtn) importBtn.style.display = '';
        
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

// Actualizar número de documento según el tipo
function updateDocumentNumber() {
    const quoteNumberEl = document.getElementById('quoteNumber');
    if (quoteNumberEl) {
        if (appData.documentType === 'cotizacion') {
            quoteNumberEl.textContent = 'Nº ' + appData.currentQuoteNumber;
        } else {
            quoteNumberEl.textContent = 'Nº ' + appData.currentSaleNumber;
        }
    }
}

// ==================== FUNCIONES DE EXPORTACIÓN/IMPORTACIÓN ====================

function exportData() {
    try {
        // Crear objeto con todos los datos
        const dataToExport = {
            version: '1.0',
            exportDate: new Date().toISOString(),
            data: {
                company: appData.company,
                clients: appData.clients,
                sellers: appData.sellers,
                products: appData.products,
                pdfHistory: appData.pdfHistory,
                currentQuoteNumber: appData.currentQuoteNumber,
                currentSaleNumber: appData.currentSaleNumber
            }
        };
        
        // Convertir a JSON
        const jsonString = JSON.stringify(dataToExport, null, 2);
        
        // Crear Blob
        const blob = new Blob([jsonString], { type: 'application/json' });
        
        // Crear enlace de descarga
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        
        // Nombre del archivo con fecha
        const fecha = new Date().toISOString().split('T')[0];
        a.download = `ProformaBackup_${fecha}.json`;
        
        // Descargar
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        alert('✅ Datos exportados exitosamente');
        console.log('📤 Exportación completada');
    } catch (error) {
        console.error('❌ Error al exportar:', error);
        alert('Error al exportar los datos: ' + error.message);
    }
}

function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Confirmar antes de importar
    if (!confirm('⚠️ ¿Desea importar estos datos?\n\nEsto REEMPLAZARÁ todos los datos actuales (clientes, vendedores, productos, historial).\n\n✅ Haga clic en OK para continuar\n❌ Haga clic en Cancelar para abortar')) {
        event.target.value = ''; // Limpiar input
        return;
    }
    
    const reader = new FileReader();
    
    reader.onload = async function(e) {
        try {
            const importedData = JSON.parse(e.target.result);
            
            // Validar estructura
            if (!importedData.data) {
                throw new Error('Archivo inválido: falta estructura de datos');
            }
            
            // Importar datos
            if (importedData.data.company) appData.company = importedData.data.company;
            if (importedData.data.clients) appData.clients = importedData.data.clients;
            if (importedData.data.sellers) appData.sellers = importedData.data.sellers;
            if (importedData.data.products) appData.products = importedData.data.products;
            if (importedData.data.pdfHistory) appData.pdfHistory = importedData.data.pdfHistory;
            if (importedData.data.currentQuoteNumber) appData.currentQuoteNumber = importedData.data.currentQuoteNumber;
            if (importedData.data.currentSaleNumber) appData.currentSaleNumber = importedData.data.currentSaleNumber;
            
            // Guardar en localStorage
            await saveData();
            
            // Actualizar UI
            updateUI();
            
            alert('✅ Datos importados exitosamente\n\n' +
                  `Clientes: ${appData.clients.length}\n` +
                  `Vendedores: ${appData.sellers.length}\n` +
                  `Productos: ${appData.products.length}\n` +
                  `Historial: ${appData.pdfHistory.length}`);
            
            console.log('📥 Importación completada:', {
                clientes: appData.clients.length,
                vendedores: appData.sellers.length,
                productos: appData.products.length,
                historial: appData.pdfHistory.length
            });
            
        } catch (error) {
            console.error('❌ Error al importar:', error);
            alert('Error al importar los datos: ' + error.message);
        }
        
        // Limpiar input para permitir reimportar el mismo archivo
        event.target.value = '';
    };
    
    reader.onerror = function() {
        alert('Error al leer el archivo');
        event.target.value = '';
    };
    
    reader.readAsText(file);
}

// Exponer funciones globalmente
window.openModal = openModal;
window.closeModal = closeModal;
window.updateUI = updateUI;
window.updateDocumentNumber = updateDocumentNumber;
