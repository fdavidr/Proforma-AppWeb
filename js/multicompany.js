// ==================== GESTIÓN MULTI-EMPRESA ====================

// Muestra/oculta el dropdown de selección de empresa en el header
function toggleCompanyDropdown() {
    const menu = document.getElementById('companyDropdownMenu');
    if (!menu) return;
    if (menu.style.display === 'none' || menu.style.display === '') {
        renderCompanyDropdown();
        menu.style.display = 'block';
        setTimeout(() => document.addEventListener('click', _closeCompanyDropdownOutside), 0);
    } else {
        menu.style.display = 'none';
    }
}

function _closeCompanyDropdownOutside(e) {
    const container = document.getElementById('companySelectorContainer');
    if (container && !container.contains(e.target)) {
        const menu = document.getElementById('companyDropdownMenu');
        if (menu) menu.style.display = 'none';
        document.removeEventListener('click', _closeCompanyDropdownOutside);
    }
}

// Construye el contenido del dropdown con todas las empresas registradas
function renderCompanyDropdown() {
    const menu = document.getElementById('companyDropdownMenu');
    if (!menu) return;

    const activeId = getActiveCompanyId();
    const companies = getCompanies();
    const defaultName = (typeof appData !== 'undefined' && appData.company && appData.company.name)
        ? appData.company.name
        : 'Empresa Principal';

    const allCompanies = [
        { id: 'default', name: defaultName }
    ].concat(companies);

    menu.innerHTML = '';

    allCompanies.forEach(company => {
        const item = document.createElement('div');
        item.className = 'company-dropdown-item' + (company.id === activeId ? ' active' : '');

        const nameSpan = document.createElement('span');
        nameSpan.className = 'company-dropdown-name';
        nameSpan.textContent = company.name;

        item.appendChild(nameSpan);

        if (company.id === activeId) {
            const check = document.createElement('span');
            check.className = 'company-dropdown-check';
            check.textContent = '✓';
            item.appendChild(check);
        }

        if (company.id !== 'default') {
            const delBtn = document.createElement('button');
            delBtn.className = 'company-dropdown-del';
            delBtn.title = 'Quitar empresa de este dispositivo';
            delBtn.textContent = '✕';
            delBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                confirmRemoveCompany(company.id, company.name);
            });
            item.appendChild(delBtn);
        }

        if (company.id !== activeId) {
            item.style.cursor = 'pointer';
            item.addEventListener('click', function() {
                menu.style.display = 'none';
                document.removeEventListener('click', _closeCompanyDropdownOutside);
                switchToCompany(company.id);
            });
        }

        menu.appendChild(item);
    });

    // Separador
    const divider = document.createElement('div');
    divider.className = 'company-dropdown-divider';
    menu.appendChild(divider);

    // Botón "Nueva Empresa"
    const createBtn = document.createElement('div');
    createBtn.className = 'company-dropdown-item company-dropdown-create';
    createBtn.innerHTML = '<span>➕ Nueva Empresa</span>';
    createBtn.style.cursor = 'pointer';
    createBtn.addEventListener('click', function() {
        menu.style.display = 'none';
        document.removeEventListener('click', _closeCompanyDropdownOutside);
        openModal('createCompanyModal');
    });
    menu.appendChild(createBtn);
}

// Actualiza la etiqueta visible del selector en el header y en la pantalla de login
function updateCompanySelectorLabel() {
    const activeId = getActiveCompanyId();
    let name;

    if (activeId === 'default') {
        name = (typeof appData !== 'undefined' && appData.company && appData.company.name)
            ? appData.company.name
            : 'Empresa Principal';
    } else {
        const companies = getCompanies();
        const company = companies.find(c => c.id === activeId);
        name = company ? company.name : 'Empresa';
    }

    const label = document.getElementById('activeBranchLabel');
    if (label) label.textContent = '🏢 ' + name;

    const loginLabel = document.getElementById('loginCompanyLabel');
    if (loginLabel) loginLabel.textContent = '🏢 ' + name;
}

// Cambia la empresa activa: guarda estado actual, establece nueva empresa y recarga la página
async function switchToCompany(companyId) {
    if (companyId === getActiveCompanyId()) return;

    // Guardar estado actual antes de cambiar
    if (typeof saveData === 'function') {
        await saveData().catch(() => {});
    }

    // Detener sincronizaciones
    if (typeof stopCountersSync === 'function') stopCountersSync();
    if (typeof stopHistorySync === 'function') stopHistorySync();

    // Establecer nueva empresa y recargar
    setActiveCompanyId(companyId);
    window.location.reload();
}

// Crea una nueva empresa y cambia a ella
async function createNewCompany() {
    const name = document.getElementById('newCompanyName').value.trim();
    const slogan = document.getElementById('newCompanySlogan').value.trim();
    const nit = document.getElementById('newCompanyNit').value.trim();
    const adminUser = document.getElementById('newCompanyAdminUser').value.trim();
    const adminPass = document.getElementById('newCompanyAdminPass').value;

    if (!name) {
        alert('El nombre de la empresa es obligatorio.');
        return;
    }
    if (!adminUser || !adminPass) {
        alert('El usuario y contraseña de administrador son obligatorios.');
        return;
    }
    if (adminPass.length < 4) {
        alert('La contraseña debe tener al menos 4 caracteres.');
        return;
    }

    const id = 'company_' + Date.now();
    const newCompany = {
        id,
        name,
        slogan: slogan || '',
        nit: nit || '',
        adminUsername: adminUser,
        adminPassword: adminPass
    };

    const companies = getCompanies();
    companies.push(newCompany);
    saveCompaniesList(companies);

    closeModal('createCompanyModal');

    // Limpiar campos del formulario
    document.getElementById('newCompanyName').value = '';
    document.getElementById('newCompanySlogan').value = '';
    document.getElementById('newCompanyNit').value = '';
    document.getElementById('newCompanyAdminUser').value = '';
    document.getElementById('newCompanyAdminPass').value = '';

    // Cambiar a la nueva empresa
    await switchToCompany(id);
}

// Confirmar y eliminar empresa del listado local (no borra datos en Firebase)
function confirmRemoveCompany(companyId, companyName) {
    if (!confirm(`¿Quitar la empresa "${companyName}" de este dispositivo?\n\nLos datos en Firebase se conservan y pueden volver a agregarse ingresando las credenciales.`)) return;

    const companies = getCompanies();
    const filtered = companies.filter(c => c.id !== companyId);
    saveCompaniesList(filtered);

    // Si la empresa eliminada era la activa, regresar a la principal
    if (getActiveCompanyId() === companyId) {
        switchToCompany('default');
    } else {
        renderCompanyDropdown();
    }
}

// Abre un pequeño modal para "agregar" una empresa existente por su ID
function openAddExistingCompanyModal() {
    // No implementado aún — las empresas se crean con "Nueva Empresa"
    // Reservado para importación futura
}

// Exponer funciones globalmente
window.toggleCompanyDropdown = toggleCompanyDropdown;
window.renderCompanyDropdown = renderCompanyDropdown;
window.updateCompanySelectorLabel = updateCompanySelectorLabel;
window.switchToCompany = switchToCompany;
window.createNewCompany = createNewCompany;
window.confirmRemoveCompany = confirmRemoveCompany;
