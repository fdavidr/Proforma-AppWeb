// ==================== GESTIÓN DE EMPRESA ====================

function openCompanySettings() {
    document.getElementById('modalCompanyName').value = appData.company.name || '';
    document.getElementById('modalCompanySlogan').value = appData.company.slogan || '';
    document.getElementById('modalCompanyNit').value = appData.company.nit || '';
    document.getElementById('modalAdminRecoveryEmail').value = appData.company.adminRecoveryEmail || '';
    
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
            // Convertir PNG transparente a fondo blanco para compatibilidad con PDF
            convertTransparentToWhite(e.target.result, (convertedImage) => {
                // Comprimir logo (200x200 px máximo)
                if (typeof window.compressImage === 'function') {
                    window.compressImage(convertedImage, 200, 200, (compressedImage) => {
                        document.getElementById('logoPreview').src = compressedImage;
                        document.getElementById('logoPreview').style.display = 'block';
                    });
                } else {
                    document.getElementById('logoPreview').src = convertedImage;
                    document.getElementById('logoPreview').style.display = 'block';
                }
            });
        };
        reader.readAsDataURL(file);
    }
}

function saveCompanySettings() {
    const name = document.getElementById('modalCompanyName').value.trim();
    const slogan = document.getElementById('modalCompanySlogan').value.trim();
    const nit = document.getElementById('modalCompanyNit').value.trim();
    const adminRecoveryEmail = document.getElementById('modalAdminRecoveryEmail').value.trim();
    const logoPreview = document.getElementById('logoPreview');

    if (adminRecoveryEmail) {
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(adminRecoveryEmail)) {
            alert('Ingrese un correo electrónico válido para recuperación');
            return;
        }
    }
    
    appData.company.name = name || 'Nombre de la Empresa';
    appData.company.slogan = slogan || 'Eslogan de la empresa';
    appData.company.nit = nit;
    appData.company.adminRecoveryEmail = adminRecoveryEmail;
    
    if (logoPreview.style.display !== 'none' && logoPreview.src) {
        appData.company.logo = logoPreview.src;
    }
    
    saveData();
    updateUI();
    closeModal('companyModal');
    
    alert('Configuración guardada correctamente');
}

// Función para convertir transparencia a fondo blanco
function convertTransparentToWhite(base64, callback) {
    const img = new Image();
    img.onload = function() {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        
        // Rellenar con blanco primero
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Dibujar imagen encima
        ctx.drawImage(img, 0, 0);
        
        // Convertir a JPEG (sin transparencia)
        const result = canvas.toDataURL('image/jpeg', 0.95);
        callback(result);
    };
    img.src = base64;
}

// Exponer funciones globalmente
window.openCompanySettings = openCompanySettings;
window.handleLogoUpload = handleLogoUpload;
window.saveCompanySettings = saveCompanySettings;
window.convertTransparentToWhite = convertTransparentToWhite;

// ==================== GESTIÓN DE INVENTARIOS ====================

function openInventoryManagement() {
    loadInventoryList();
    openModal('inventoryManagementModal');
}

function loadInventoryList() {
    const container = document.getElementById('inventoryList');
    const countSpan = document.getElementById('inventoryCount');
    const addButton = document.getElementById('btnAddInventory');
    
    container.innerHTML = '';
    countSpan.textContent = appData.inventories.length;
    
    // Mostrar/ocultar botón de agregar según el límite
    if (appData.inventories.length >= 4) {
        addButton.style.display = 'none';
    } else {
        addButton.style.display = 'block';
    }
    
    appData.inventories.forEach(inventory => {
        const div = document.createElement('div');
        div.style.cssText = 'padding: 10px; background: white; border-radius: 8px; display: flex; justify-content: space-between; align-items: center;';
        
        const nameSpan = document.createElement('span');
        nameSpan.textContent = inventory.name;
        nameSpan.style.fontWeight = 'bold';
        
        div.appendChild(nameSpan);
        container.appendChild(div);
    });
}

function showNewInventoryForm() {
    document.getElementById('newInventoryForm').style.display = 'block';
    document.getElementById('btnAddInventory').style.display = 'none';
    document.getElementById('newInventoryName').value = '';
    document.getElementById('newInventoryName').focus();
}

function cancelNewInventory() {
    document.getElementById('newInventoryForm').style.display = 'none';
    document.getElementById('btnAddInventory').style.display = 'block';
}

async function confirmNewInventory() {
    const name = document.getElementById('newInventoryName').value.trim();
    
    if (createInventory(name)) {
        await saveData();
        
        // Actualizar lista de inventarios
        loadInventoryList();
        
        // Actualizar filtros de inventario si la sección está abierta
        const inventorySection = document.getElementById('inventorySection');
        if (inventorySection && inventorySection.style.display === 'block') {
            generateInventoryFilters();
        }
        
        // Ocultar formulario
        cancelNewInventory();
        
        alert(`Inventario "${name}" creado exitosamente`);
    }
}

// Exponer funciones
window.openInventoryManagement = openInventoryManagement;
window.showNewInventoryForm = showNewInventoryForm;
window.cancelNewInventory = cancelNewInventory;
window.confirmNewInventory = confirmNewInventory;
