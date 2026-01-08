// ==================== ESTRUCTURA DE DATOS GLOBAL ====================
let appData = {
    company: {
        name: 'Nombre de la Empresa',
        slogan: 'Eslogan de la empresa',
        nit: '',
        logo: ''
    },
    clients: [],
    sellers: [],
    products: [],
    quotes: [],
    pdfHistory: [],
    currentQuoteNumber: 100000,
    currentSaleNumber: 100000,
    currentClient: null,
    currentSeller: null,
    currentProduct: null,
    currentQuoteItems: [],
    documentType: 'cotizacion',
    selectedSaleCity: 'cochabamba',
    userRole: null,
    loggedSeller: null,
    terms: {
        cotizacion: [
            'Precios sujetos a cambio sin previo aviso',
            'Validez de la cotización: 15 días',
            'Formas de pago: efectivo, transferencia o tarjeta',
            'Tiempo de entrega: según disponibilidad'
        ],
        notaventa: [
            'Producto vendido sin garantía',
            'No se aceptan devoluciones',
            'Revisión del producto antes de retirarlo',
            'El cliente acepta el producto en las condiciones presentadas'
        ]
    }
};

// Variable para el rol seleccionado durante el login
let selectedLoginRole = 'admin';

// ==================== FUNCIONES DE PERSISTENCIA ====================
async function loadData() {
    try {
        // Intentar cargar desde Firebase/localStorage
        const saved = await loadAllData();
        
        if (saved) {
            // Cargar datos de la empresa
            if (saved.company) {
                appData.company = saved.company;
            }
            
            // Cargar listas de datos
            if (saved.clients) appData.clients = saved.clients;
            if (saved.sellers) appData.sellers = saved.sellers;
            if (saved.products) appData.products = saved.products;
            if (saved.pdfHistory) appData.pdfHistory = saved.pdfHistory;
            
            // Cargar números de documentos
            if (saved.currentQuoteNumber) appData.currentQuoteNumber = saved.currentQuoteNumber;
            if (saved.currentSaleNumber) appData.currentSaleNumber = saved.currentSaleNumber;
            
            // Cargar términos
            if (saved.terms) appData.terms = saved.terms;
            
            console.log('Datos cargados correctamente:', {
                clientes: appData.clients.length,
                vendedores: appData.sellers.length,
                productos: appData.products.length,
                historial: appData.pdfHistory.length
            });
        } else {
            console.log('No hay datos guardados, usando valores por defecto');
        }
    } catch (e) {
        console.error('Error al cargar datos:', e);
    }
}

async function saveData() {
    await saveAllData(appData);
}
