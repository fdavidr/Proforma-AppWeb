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
    currentClient: null,
    currentSeller: null,
    currentProduct: null,
    currentQuoteItems: [],
    documentType: 'cotizacion',
    userRole: null,
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
function loadData() {
    const saved = localStorage.getItem('proformaAppData');
    
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            const currentRole = appData.userRole;
            
            if (parsed.company) {
                appData.company.name = parsed.company.name || 'Nombre de la Empresa';
                appData.company.slogan = parsed.company.slogan || 'Eslogan de la empresa';
                appData.company.nit = parsed.company.nit || '';
                appData.company.logo = parsed.company.logo || '';
            }
            
            if (parsed.clients) appData.clients = parsed.clients;
            if (parsed.sellers) appData.sellers = parsed.sellers;
            if (parsed.products) appData.products = parsed.products;
            if (parsed.pdfHistory) appData.pdfHistory = parsed.pdfHistory;
            if (parsed.currentQuoteNumber) appData.currentQuoteNumber = parsed.currentQuoteNumber;
            if (parsed.terms) appData.terms = parsed.terms;
            if (parsed.documentType) appData.documentType = parsed.documentType;
            
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

function saveData() {
    const dataToSave = {
        company: { ...appData.company },
        clients: appData.clients,
        sellers: appData.sellers,
        products: appData.products,
        pdfHistory: appData.pdfHistory,
        currentQuoteNumber: appData.currentQuoteNumber,
        terms: appData.terms,
        documentType: appData.documentType
    };
    
    localStorage.setItem('proformaAppData', JSON.stringify(dataToSave));
}
