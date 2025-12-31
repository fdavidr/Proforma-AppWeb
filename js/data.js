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

// Variables de paginación para historial
let historyPage = 1;
const itemsPerPage = 20;

// Variable para el rol seleccionado durante el login
let selectedLoginRole = 'admin';

// ==================== FUNCIONES DE PERSISTENCIA ====================
async function loadData() {
    // Intentar cargar desde Firebase/localStorage
    const saved = await loadAllData();
    
    if (saved) {
        try {
            const currentRole = appData.userRole;
            
            if (saved.company) {
                appData.company.name = saved.company.name || 'Nombre de la Empresa';
                appData.company.slogan = saved.company.slogan || 'Eslogan de la empresa';
                appData.company.nit = saved.company.nit || '';
                appData.company.logo = saved.company.logo || '';
            }
            
            if (saved.clients) appData.clients = saved.clients;
            if (saved.sellers) appData.sellers = saved.sellers;
            if (saved.products) appData.products = saved.products;
            if (saved.pdfHistory) appData.pdfHistory = saved.pdfHistory;
            if (saved.currentQuoteNumber) appData.currentQuoteNumber = saved.currentQuoteNumber;
            if (saved.currentSaleNumber) appData.currentSaleNumber = saved.currentSaleNumber;
            if (saved.terms) appData.terms = saved.terms;
            if (saved.documentType) appData.documentType = saved.documentType;
            
            appData.userRole = currentRole;
            
            appData.currentClient = null;
            appData.currentSeller = null;
            appData.currentProduct = null;
            appData.currentQuoteItems = [];
        } catch (e) {
            console.error('Error al cargar datos:', e);
        }
    }
}

async function saveData() {
    await saveAllData(appData);
}
