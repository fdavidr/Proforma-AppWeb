// ==================== GESTIÓN DE EMPRESA ====================

function openCompanySettings() {
    document.getElementById('modalCompanyName').value = appData.company.name || '';
    document.getElementById('modalCompanySlogan').value = appData.company.slogan || '';
    document.getElementById('modalCompanyNit').value = appData.company.nit || '';
    
    if (appData.company.logo) {
        document.getElementById('logoPreview').src = appData.company.logo;
        document.getElementById('logoPreview').style.display = 'block';
    } else {
        const preview = document.getElementById('logoPreview');
        preview.style.display = 'none';
        preview.src = '';
    }
    openModal('companyModal');
}

function handleLogoUpload(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('logoPreview').src = e.target.result;
            document.getElementById('logoPreview').style.display = 'block';
        };
        reader.readAsDataURL(file);
    }
}

function saveCompanySettings() {
    const name = document.getElementById('modalCompanyName').value.trim();
    const slogan = document.getElementById('modalCompanySlogan').value.trim();
    const nit = document.getElementById('modalCompanyNit').value.trim();
    const logoPreview = document.getElementById('logoPreview');
    
    appData.company.name = name || 'Nombre de la Empresa';
    appData.company.slogan = slogan || 'Eslogan de la empresa';
    appData.company.nit = nit;
    
    if (logoPreview.style.display !== 'none' && logoPreview.src) {
        appData.company.logo = logoPreview.src;
    }
    
    saveData();
    updateUI();
    closeModal('companyModal');
    
    alert('Configuración guardada correctamente');
}

// Exponer funciones globalmente
window.openCompanySettings = openCompanySettings;
window.handleLogoUpload = handleLogoUpload;
window.saveCompanySettings = saveCompanySettings;
