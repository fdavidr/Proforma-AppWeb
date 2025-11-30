// ==================== GESTIÓN DE EMPRESA ====================

function openCompanySettings() {
    document.getElementById('modalCompanyName').value = appData.company.name;
    document.getElementById('modalCompanySlogan').value = appData.company.slogan;
    if (appData.company.logo) {
        document.getElementById('logoPreview').src = appData.company.logo;
        document.getElementById('logoPreview').style.display = 'block';
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
    appData.company.name = document.getElementById('modalCompanyName').value;
    appData.company.slogan = document.getElementById('modalCompanySlogan').value;
    const logoPreview = document.getElementById('logoPreview');
    if (logoPreview.style.display !== 'none') {
        appData.company.logo = logoPreview.src;
    }
    saveData();
    updateUI();
    closeModal('companyModal');
}

// Exponer funciones globalmente
window.openCompanySettings = openCompanySettings;
window.handleLogoUpload = handleLogoUpload;
window.saveCompanySettings = saveCompanySettings;
