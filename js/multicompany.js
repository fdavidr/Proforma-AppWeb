// ==================== GESTIÓN MULTI-EMPRESA ====================

// ---- Selector de empresa en el LOGIN ----

function toggleLoginCompanyDropdown() {
    const menu = document.getElementById('loginCompanyDropdownMenu');
    if (!menu) return;
    if (menu.style.display === 'none' || menu.style.display === '') {
        renderLoginCompanyDropdown();
        menu.style.display = 'block';
        setTimeout(() => document.addEventListener('click', _closeLoginDropdownOutside), 0);
    } else {
        menu.style.display = 'none';
    }
}

function _closeLoginDropdownOutside(e) {
    const container = document.getElementById('loginCompanySelectorWrap');
    if (container && !container.contains(e.target)) {
        const menu = document.getElementById('loginCompanyDropdownMenu');
        if (menu) menu.style.display = 'none';
        document.removeEventListener('click', _closeLoginDropdownOutside);
    }
}

function renderLoginCompanyDropdown() {
    const menu = document.getElementById('loginCompanyDropdownMenu');
    if (!menu) return;

    const activeId = getActiveCompanyId();
    const companies = getCompanies();
    const defaultName = (typeof appData !== 'undefined' && appData.company && appData.company.name)
        ? appData.company.name
        : 'Empresa Principal';

    const allCompanies = [{ id: 'default', name: defaultName }].concat(companies);

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
        } else {
            item.style.cursor = 'pointer';
            item.addEventListener('click', function () {
                menu.style.display = 'none';
                document.removeEventListener('click', _closeLoginDropdownOutside);
                setActiveCompanyId(company.id);
                window.location.reload();
            });
        }

        menu.appendChild(item);
    });

    const divider = document.createElement('div');
    divider.className = 'company-dropdown-divider';
    menu.appendChild(divider);

    const createBtn = document.createElement('div');
    createBtn.className = 'company-dropdown-item company-dropdown-create';
    createBtn.innerHTML = '<span>➕ Nueva Empresa</span>';
    createBtn.style.cursor = 'pointer';
    createBtn.addEventListener('click', function () {
        menu.style.display = 'none';
        document.removeEventListener('click', _closeLoginDropdownOutside);
        openModal('createCompanyModal');
    });
    menu.appendChild(createBtn);
}

// ---- Selector de empresa en el HEADER ----

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

    if (!name) {
        alert('El nombre de la empresa es obligatorio.');
        document.getElementById('newCompanyName').focus();
        return;
    }

    // Heredar credenciales de la empresa activa (mismo administrador para todas)
    const currentCreds = (typeof getActiveCompanyCredentials === 'function')
        ? getActiveCompanyCredentials()
        : { adminUsername: 'CiamP25', adminPassword: 'CiamP25' };

    const id = 'company_' + Date.now();
    const newCompany = {
        id,
        name,
        slogan: '',
        nit: '',
        adminUsername: currentCreds.adminUsername || 'CiamP25',
        adminPassword: currentCreds.adminPassword || 'CiamP25'
    };

    const companies = getCompanies();
    companies.push(newCompany);
    saveCompaniesList(companies);

    closeModal('createCompanyModal');
    document.getElementById('newCompanyName').value = '';

    // Activar nueva empresa y recargar
    setActiveCompanyId(id);
    window.location.reload();
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
window.toggleLoginCompanyDropdown = toggleLoginCompanyDropdown;
window.renderCompanyDropdown = renderCompanyDropdown;
window.renderLoginCompanyDropdown = renderLoginCompanyDropdown;
window.updateCompanySelectorLabel = updateCompanySelectorLabel;
window.switchToCompany = switchToCompany;
window.createNewCompany = createNewCompany;
window.confirmRemoveCompany = confirmRemoveCompany;
