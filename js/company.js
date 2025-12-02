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
        // Validar tamaño (máximo 500KB)
        if (file.size > 500000) {
            alert('El logo es muy grande. Máximo 500KB. Intenta con una imagen más pequeña o comprimida.');
            event.target.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = function(e) {
            // Comprimir logo (200x200 px máximo)
            if (typeof window.compressImage === 'function') {
                window.compressImage(e.target.result, 200, 200, (compressedImage) => {
                    document.getElementById('logoPreview').src = compressedImage;
                    document.getElementById('logoPreview').style.display = 'block';
                });
            } else {
                document.getElementById('logoPreview').src = e.target.result;
                document.getElementById('logoPreview').style.display = 'block';
            }
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
