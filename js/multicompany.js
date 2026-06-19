// ==================== GESTIÓN MULTI-EMPRESA ====================
//
// Modelo:
// - Cada empresa tiene credenciales de administrador propias.
// - La empresa "default" (Ciam) usa las credenciales del sistema (CiamP25 / CiamP25).
// - Las empresas creadas se guardan en localStorage (proformaCompanies). Máximo 3.
// - En el login NO se selecciona empresa: el sistema detecta a qué empresa
//   pertenecen las credenciales ingresadas y carga sus datos automáticamente.
// - La creación de empresas solo está disponible desde la pantalla de login.

const MAX_COMPANIES = 3; // máximo de empresas que se pueden crear (sin contar la default)
const DEFAULT_ADMIN_USERNAME = 'CiamP25';
const DEFAULT_ADMIN_PASSWORD = 'CiamP25';

// ---- Detección de empresa por credenciales ----

// Detecta de forma sincrónica si las credenciales corresponden al admin de alguna empresa.
// Retorna el objeto empresa (incluye id) o null.
function detectCompanyByAdmin(username, password) {
    const defaultName = (typeof appData !== 'undefined' && appData.company && appData.company.name)
        ? appData.company.name
        : 'Empresa Principal';

    const allCompanies = [
        { id: 'default', name: defaultName, adminUsername: DEFAULT_ADMIN_USERNAME, adminPassword: DEFAULT_ADMIN_PASSWORD }
    ].concat(getCompanies());

    return allCompanies.find(c => c.adminUsername === username && c.adminPassword === password) || null;
}

// Detecta (de forma asíncrona) a qué empresa pertenece un vendedor con esas credenciales.
// Recorre todas las empresas leyendo su lista de vendedores sin alterar el estado global.
async function detectCompanyBySeller(username, password) {
    const allCompanies = [{ id: 'default' }].concat(getCompanies());

    for (const company of allCompanies) {
        let sellers = [];
        if (typeof readCompanySellers === 'function') {
            sellers = await readCompanySellers(company.id);
        }
        const seller = sellers.find(s => s.username === username && s.password === password);
        if (seller) {
            return { companyId: company.id, seller };
        }
    }
    return null;
}

// Cambia la empresa activa y recarga sus datos en memoria, evitando que queden
// datos de la empresa anterior. No recarga la página.
async function switchCompanyData(companyId) {
    if (typeof stopCountersSync === 'function') stopCountersSync();
    if (typeof stopHistorySync === 'function') stopHistorySync();

    setActiveCompanyId(companyId);
    resetCompanyScopedData();
    if (typeof loadData === 'function') {
        await loadData();
    }
}

// Restaura a valores por defecto los campos de datos propios de cada empresa,
// para evitar fugas de información entre empresas al cambiar sin recargar.
function resetCompanyScopedData() {
    appData.company = {
        name: 'Nombre de la Empresa',
        slogan: 'Eslogan de la empresa',
        nit: '',
        adminRecoveryEmail: '',
        logo: ''
    };
    appData.clients = [];
    appData.sellers = [];
    appData.products = [];
    appData.pdfHistory = [];
    appData.gastos = [];
    appData.inventories = [
        { id: 'cochabamba', name: 'Cochabamba' },
        { id: 'santacruz', name: 'Santa Cruz' }
    ];
    appData.currentQuoteNumber = 100000;
    appData.currentSaleNumber = 100000;
    appData.currentSaleNumbers = {};
    appData.currentDeliveryNumber = 100000;
}

// ---- Creación de empresa (solo desde el login, sección inline) ----

// Muestra la sección de crear empresa y oculta el login
function showCreateCompanySection() {
    if (getCompanies().length >= MAX_COMPANIES) {
        alert(`Solo se pueden crear un máximo de ${MAX_COMPANIES} empresas.`);
        return;
    }
    const nameInput = document.getElementById('newCompanyName');
    const userInput = document.getElementById('newCompanyAdminUser');
    const passInput = document.getElementById('newCompanyAdminPass');
    if (nameInput) nameInput.value = '';
    if (userInput) userInput.value = '';
    if (passInput) passInput.value = '';
    document.getElementById('loginModeSection').style.display = 'none';
    document.getElementById('createCompanySection').style.display = 'block';
    if (nameInput) nameInput.focus();
}

// Vuelve al modo login
function showLoginSection() {
    document.getElementById('createCompanySection').style.display = 'none';
    document.getElementById('loginModeSection').style.display = 'block';
}

// Alias para compatibilidad con llamadas anteriores
function openCreateCompanyModal() {
    showCreateCompanySection();
}

// Verifica que un nombre de usuario de administrador esté disponible (no usado por
// la empresa por defecto ni por otra empresa creada). Comparación sin distinción de mayúsculas.
function isAdminUsernameAvailable(username) {
    const u = (username || '').trim().toLowerCase();
    if (!u) return false;
    if (u === DEFAULT_ADMIN_USERNAME.toLowerCase()) return false;
    return !getCompanies().some(c => (c.adminUsername || '').toLowerCase() === u);
}

// Crea una nueva empresa con credenciales propias y la activa.
function createNewCompany() {
    const name = document.getElementById('newCompanyName').value.trim();
    const adminUser = document.getElementById('newCompanyAdminUser').value.trim();
    const adminPass = document.getElementById('newCompanyAdminPass').value.trim();

    if (!name) {
        alert('El nombre de la empresa es obligatorio.');
        document.getElementById('newCompanyName').focus();
        return;
    }
    if (!adminUser || !adminPass) {
        alert('Debes definir un usuario y una contraseña de administrador.');
        return;
    }
    if (adminPass.length < 4) {
        alert('La contraseña debe tener al menos 4 caracteres.');
        return;
    }

    const companies = getCompanies();
    if (companies.length >= MAX_COMPANIES) {
        alert(`Solo se pueden crear un máximo de ${MAX_COMPANIES} empresas.`);
        return;
    }

    // Verificar disponibilidad del nombre de usuario
    if (!isAdminUsernameAvailable(adminUser)) {
        alert('El nombre de usuario ya está en uso por otra empresa. Elige uno diferente.');
        document.getElementById('newCompanyAdminUser').focus();
        return;
    }

    const id = 'company_' + Date.now();
    companies.push({
        id,
        name,
        slogan: '',
        nit: '',
        adminUsername: adminUser,
        adminPassword: adminPass
    });
    saveCompaniesList(companies);

    // Limpiar campos
    document.getElementById('newCompanyName').value = '';
    document.getElementById('newCompanyAdminUser').value = '';
    document.getElementById('newCompanyAdminPass').value = '';

    // Activar la nueva empresa y recargar para arrancar con datos limpios.
    setActiveCompanyId(id);
    alert('Empresa creada correctamente.\n\nInicia sesión con el usuario y la contraseña que configuraste.');
    window.location.reload();
}

// Actualiza la etiqueta del header (si existiera). El selector fue removido, pero
// se conserva la función por compatibilidad con llamadas existentes.
function updateCompanySelectorLabel() {
    const activeId = getActiveCompanyId();
    let name;

    if (activeId === 'default') {
        name = (typeof appData !== 'undefined' && appData.company && appData.company.name)
            ? appData.company.name
            : 'Empresa Principal';
    } else {
        const company = getCompanies().find(c => c.id === activeId);
        name = company ? company.name : 'Empresa';
    }

    const label = document.getElementById('activeBranchLabel');
    if (label) label.textContent = '🏢 ' + name;
}

// Exponer funciones globalmente
window.detectCompanyByAdmin = detectCompanyByAdmin;
window.detectCompanyBySeller = detectCompanyBySeller;
window.switchCompanyData = switchCompanyData;
window.resetCompanyScopedData = resetCompanyScopedData;
window.showCreateCompanySection = showCreateCompanySection;
window.showLoginSection = showLoginSection;
window.openCreateCompanyModal = openCreateCompanyModal;
window.isAdminUsernameAvailable = isAdminUsernameAvailable;
window.createNewCompany = createNewCompany;
window.updateCompanySelectorLabel = updateCompanySelectorLabel;
