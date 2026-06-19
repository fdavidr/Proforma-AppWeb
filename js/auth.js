// ==================== AUTENTICACIÓN ====================

function initLogin() {
    document.getElementById('loginForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        let isValid = false;
        let userRole = null;
        let sellerData = null;

        // Detectar rol automáticamente por credenciales (credenciales según empresa activa)
        const _creds = (typeof getActiveCompanyCredentials === 'function')
            ? getActiveCompanyCredentials()
            : { adminUsername: 'CiamP25', adminPassword: 'CiamP25' };
        if (username === _creds.adminUsername && password === _creds.adminPassword) {
            isValid = true;
            userRole = 'admin';
        } else {
            const seller = appData.sellers.find(s => 
                s.username === username && s.password === password
            );

            if (seller) {
                isValid = true;
                userRole = 'vendedor';
                sellerData = seller;
            }
        }

        if (isValid) {
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
        } else {
            const errorDiv = document.getElementById('loginError');
            errorDiv.textContent = 'Usuario o contraseña incorrectos';
            errorDiv.classList.remove('hidden');
        }
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
