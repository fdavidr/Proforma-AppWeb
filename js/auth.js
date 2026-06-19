// ==================== AUTENTICACIÓN ====================

function initLogin() {
    document.getElementById('loginForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const errorDiv = document.getElementById('loginError');
        errorDiv.classList.add('hidden');

        let targetCompanyId = null;
        let userRole = null;
        let sellerData = null;

        // 1) Detectar ADMIN por credenciales (busca en todas las empresas)
        const adminCompany = (typeof detectCompanyByAdmin === 'function')
            ? detectCompanyByAdmin(username, password)
            : null;

        if (adminCompany) {
            targetCompanyId = adminCompany.id;
            userRole = 'admin';
        } else {
            // 2) Detectar VENDEDOR entre todas las empresas
            const sellerMatch = (typeof detectCompanyBySeller === 'function')
                ? await detectCompanyBySeller(username, password)
                : null;
            if (sellerMatch) {
                targetCompanyId = sellerMatch.companyId;
                userRole = 'vendedor';
                sellerData = sellerMatch.seller;
            }
        }

        if (!userRole) {
            errorDiv.textContent = 'Usuario o contraseña incorrectos';
            errorDiv.classList.remove('hidden');
            return;
        }

        // Si la empresa detectada no es la activa, cambiar y cargar sus datos
        if (targetCompanyId !== getActiveCompanyId() && typeof switchCompanyData === 'function') {
            await switchCompanyData(targetCompanyId);
        }

        // Si es una empresa creada y aún no tiene datos guardados, sembrar su nombre
        // (el ingresado al crearla) para que aparezca en el encabezado.
        if (userRole === 'admin' && targetCompanyId !== 'default' && typeof getCompanies === 'function') {
            const comp = getCompanies().find(c => c.id === targetCompanyId);
            if (comp && (!appData.company.name || appData.company.name === 'Nombre de la Empresa')) {
                appData.company.name = comp.name;
                if (comp.slogan) appData.company.slogan = comp.slogan;
                if (comp.nit) appData.company.nit = comp.nit;
            }
        }

        appData.userRole = userRole;
        appData.loggedSeller = sellerData;

        // Si es vendedor, configurar ciudad automáticamente
        if (userRole === 'vendedor' && sellerData) {
            appData.selectedSaleCity = sellerData.city;
        }

        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('app').style.display = 'block';

        // Actualizar label de empresa en header
        if (typeof updateCompanySelectorLabel === 'function') updateCompanySelectorLabel();

        // Forzar render del DOM antes de init
        setTimeout(() => init(), 0);
    });
}

function handleForgotPassword() {
    const username = document.getElementById('username').value.trim();
    const _creds = (typeof getActiveCompanyCredentials === 'function')
        ? getActiveCompanyCredentials()
        : { adminUsername: 'CiamP25' };

    if (username === _creds.adminUsername) {
        const recoveryEmail = appData.company.adminRecoveryEmail;

        if (recoveryEmail) {
            alert(`Recuperación de cuenta de administrador:\n${recoveryEmail}`);
        } else {
            alert('No hay un correo de recuperación configurado para el administrador');
        }
        return;
    }

    alert('NO ESTA HABILITADO PARA CAMBIAR CONTRASEÑA.');
}

function logout() {
    if (confirm('¿Está seguro de cerrar sesión?')) {
        saveData();

        if (typeof stopCountersSync === 'function') {
            stopCountersSync();
        }
        
        appData.userRole = null;
        appData.loggedSeller = null;
        document.getElementById('loginScreen').style.display = 'flex';
        document.getElementById('app').style.display = 'none';
        document.getElementById('username').value = '';
        document.getElementById('password').value = '';
        document.getElementById('loginError').classList.add('hidden');
    }
}

// Exponer funciones globalmente
window.logout = logout;
window.handleForgotPassword = handleForgotPassword;
