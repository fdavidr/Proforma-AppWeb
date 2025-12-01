// ==================== AUTENTICACIÓN ====================

function selectRole(role) {
    selectedLoginRole = role;
    document.querySelectorAll('.role-selector').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
}

function initLogin() {
    document.getElementById('loginForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        let isValid = false;
        let userRole = null;

        // Validar credenciales según el rol seleccionado
        if (selectedLoginRole === 'admin') {
            if (username === 'CiamP25' && password === 'CiamP25') {
                isValid = true;
                userRole = 'admin';
            }
        } else if (selectedLoginRole === 'vendedor') {
            if (username === 'VendedorX25' && password === 'VendedorX25') {
                isValid = true;
                userRole = 'vendedor';
            }
        }

        if (isValid) {
            appData.userRole = userRole;
            document.getElementById('loginScreen').style.display = 'none';
            document.getElementById('app').style.display = 'block';
            init();
        } else {
            const errorDiv = document.getElementById('loginError');
            errorDiv.textContent = 'Usuario o contraseña incorrectos para el rol seleccionado';
            errorDiv.classList.remove('hidden');
        }
    });
}

function logout() {
    if (confirm('¿Está seguro de cerrar sesión?')) {
        saveData();
        
        appData.userRole = null;
        selectedLoginRole = 'admin';
        document.getElementById('loginScreen').style.display = 'flex';
        document.getElementById('app').style.display = 'none';
        document.getElementById('username').value = '';
        document.getElementById('password').value = '';
        document.getElementById('loginError').classList.add('hidden');
        // Resetear selector de rol
        document.querySelectorAll('.role-selector').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.role === 'admin') {
                btn.classList.add('active');
            }
        });
    }
}

// Exponer funciones globalmente
window.selectRole = selectRole;
window.logout = logout;
