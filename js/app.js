// ==================== INICIALIZACIÓN DE LA APLICACIÓN ====================

async function init() {
    // Los datos ya fueron cargados en DOMContentLoaded
    // Solo actualizar UI y configuraciones
    updateUI();
    
    // Forzar carga de términos con reintentos automáticos
    forceLoadTermsWithRetry();
    
    // Reintentar carga adicional después de 500ms por seguridad
    setTimeout(() => {
        loadTerms();
    }, 500);
    
    initPdfDatePicker();
    
    // Inicializar conversión automática a mayúsculas
    initUppercaseInputs();
    
    // Mostrar selector de documentos por defecto
    const typeToggle = document.querySelector('.type-toggle');
    if (typeToggle) {
        typeToggle.style.display = 'flex';
    }
    
    // Establecer botón de Documentos como activo por defecto
    if (typeof setActiveMenuButton === 'function') {
        setActiveMenuButton('documentsBtn');
    }

    // Sincronizar contadores de documentos entre múltiples equipos
    if (typeof startCountersSync === 'function') {
        startCountersSync();
    }
}

// Inicializar conversión automática a mayúsculas para todos los inputs de texto
function initUppercaseInputs() {
    // Convertir a mayúsculas en tiempo real para inputs de texto y textareas
    const convertToUppercase = (event) => {
        const input = event.target;
        const start = input.selectionStart;
        const end = input.selectionEnd;
        
        input.value = input.value.toUpperCase();
        
        // Restaurar posición del cursor
        input.setSelectionRange(start, end);
    };
    
    // Función para verificar si un input debe ser excluido
    const shouldExcludeInput = (input) => {
        // Excluir campos de contraseña
        if (input.type === 'password') return true;
        
        // Excluir campos del login (username y password están en #loginScreen)
        const loginScreen = document.getElementById('loginScreen');
        if (loginScreen && loginScreen.contains(input)) return true;
        
        // Excluir textareas de términos y condiciones
        if (input.id && ['term1', 'term2', 'term3', 'term4'].includes(input.id)) return true;
        
        return false;
    };
    
    // Agregar listener a todos los inputs de texto existentes
    const textInputs = document.querySelectorAll('input[type="text"], input[type="email"], textarea');
    textInputs.forEach(input => {
        if (!shouldExcludeInput(input)) {
            input.addEventListener('input', convertToUppercase);
        }
    });
    
    // Observer para inputs dinámicos que se agreguen después
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
                if (node.nodeType === 1) { // Element node
                    // Si el nodo es un input o textarea
                    if ((node.tagName === 'INPUT' && (node.type === 'text' || node.type === 'email')) || node.tagName === 'TEXTAREA') {
                        if (!shouldExcludeInput(node)) {
                            node.addEventListener('input', convertToUppercase);
                        }
                    }
                    // Buscar inputs dentro del nodo agregado
                    const inputs = node.querySelectorAll('input[type="text"], input[type="email"], textarea');
                    inputs.forEach(input => {
                        if (!shouldExcludeInput(input)) {
                            input.addEventListener('input', convertToUppercase);
                        }
                    });
                }
            });
        });
    });
    
    // Observar cambios en el documento
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
}

// Inicializar selector de fecha para PDF
function initPdfDatePicker() {
    const dateInput = document.getElementById('pdfDate');
    if (!dateInput) return;
    
    // Establecer fecha actual por defecto
    const today = new Date();
    dateInput.value = today.toISOString().split('T')[0];
    
    // Calcular fecha mínima (1 mes atrás)
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    
    // Establecer límites
    dateInput.min = oneMonthAgo.toISOString().split('T')[0];
    dateInput.max = today.toISOString().split('T')[0];
    
    // Validar en tiempo real
    dateInput.addEventListener('change', function() {
        const selectedDate = new Date(this.value + 'T00:00:00');
        const minDate = new Date(oneMonthAgo.toISOString().split('T')[0] + 'T00:00:00');
        const maxDate = new Date(today.toISOString().split('T')[0] + 'T00:00:00');
        
        if (selectedDate < minDate) {
            alert('La fecha no puede ser mayor a 1 mes atrás');
            this.value = today.toISOString().split('T')[0];
        } else if (selectedDate > maxDate) {
            alert('No se pueden seleccionar fechas futuras');
            this.value = today.toISOString().split('T')[0];
        }
    });
}

// Inicializar el sistema de login cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', async function() {
    // Inicializar Firebase primero
    if (typeof initFirebase === 'function') {
        await initFirebase();
    }
    
    // Cargar datos antes del login (necesario para verificar vendedores)
    await loadData();
    
    // Inicializar sistema de login
    initLogin();
});
