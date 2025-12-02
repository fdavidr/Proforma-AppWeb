// ==================== CONFIGURACIÓN DE FIREBASE ====================

// INSTRUCCIONES DE CONFIGURACIÓN:
// 1. Ve a https://console.firebase.google.com/
// 2. Crea un nuevo proyecto o selecciona uno existente
// 3. Ve a "Configuración del proyecto" > "General"
// 4. En "Tus aplicaciones" > "Web", copia la configuración
// 5. Reemplaza los valores de firebaseConfig con los tuyos

const firebaseConfig = {
    apiKey: "AIzaSyD1wsVXoeHCnnxJRr7yIShqpwS_2dd_4fY",
    authDomain: "ciam-6631a.firebaseapp.com",
    projectId: "ciam-6631a",
    storageBucket: "ciam-6631a.firebasestorage.app",
    messagingSenderId: "575414511596",
    appId: "1:575414511596:web:0e4ac0599a7e96583002c9"
};

// Inicializar Firebase (solo si está configurado)
let db = null;
let isFirebaseEnabled = false;

function initFirebase() {
    // Verificar si Firebase está configurado
    if (firebaseConfig.apiKey === "TU_API_KEY_AQUI") {
        console.log('Firebase no configurado. Usando localStorage como respaldo.');
        isFirebaseEnabled = false;
        return false;
    }

    try {
        // Inicializar Firebase
        if (typeof firebase !== 'undefined') {
            firebase.initializeApp(firebaseConfig);
            db = firebase.firestore();
            isFirebaseEnabled = true;
            console.log('Firebase inicializado correctamente');
            return true;
        } else {
            console.warn('Firebase SDK no cargado. Usando localStorage.');
            isFirebaseEnabled = false;
            return false;
        }
    } catch (error) {
        console.error('Error al inicializar Firebase:', error);
        isFirebaseEnabled = false;
        return false;
    }
}

// ==================== FUNCIONES DE BASE DE DATOS ====================

async function saveToFirestore(collection, data) {
    if (!isFirebaseEnabled) {
        return false;
    }

    try {
        await db.collection(collection).doc('data').set(data);
        return true;
    } catch (error) {
        console.error(`Error guardando en Firestore (${collection}):`, error);
        return false;
    }
}

async function loadFromFirestore(collection) {
    if (!isFirebaseEnabled) {
        return null;
    }

    try {
        const doc = await db.collection(collection).doc('data').get();
        if (doc.exists) {
            return doc.data();
        } else {
            return null;
        }
    } catch (error) {
        console.error(`Error cargando desde Firestore (${collection}):`, error);
        return null;
    }
}

// Función para guardar todos los datos de la aplicación
async function saveAllData(appData) {
    // Limitar historial a últimas 50 cotizaciones para evitar exceder límites
    const limitedHistory = appData.pdfHistory ? appData.pdfHistory.slice(-50) : [];
    
    const dataToSave = {
        company: { ...appData.company },
        clients: appData.clients,
        sellers: appData.sellers,
        products: appData.products,
        pdfHistory: limitedHistory,
        currentQuoteNumber: appData.currentQuoteNumber,
        terms: appData.terms,
        documentType: appData.documentType,
        lastUpdated: new Date().toISOString()
    };

    // Calcular tamaño aproximado
    const dataSize = JSON.stringify(dataToSave).length;

    // Guardar en localStorage siempre (respaldo)
    try {
        localStorage.setItem('proformaAppData', JSON.stringify(dataToSave));
    } catch (error) {
        if (error.name === 'QuotaExceededError') {
            // Reducir aún más el historial
            const minimalHistory = appData.pdfHistory.slice(-20);
            dataToSave.pdfHistory = minimalHistory;
            localStorage.setItem('proformaAppData', JSON.stringify(dataToSave));
        }
    }

    // Intentar guardar en Firestore si está habilitado
    if (isFirebaseEnabled) {
        // Si el documento es muy grande (>900KB), reducir historial
        if (dataSize > 900000) {
            dataToSave.pdfHistory = appData.pdfHistory.slice(-20);
        }
        await saveToFirestore('proformaApp', dataToSave);
    }
}

// Función para cargar todos los datos
async function loadAllData() {
    // Primero intentar cargar desde Firestore
    if (isFirebaseEnabled) {
        const firestoreData = await loadFromFirestore('proformaApp');
        if (firestoreData) {
            // Sincronizar con localStorage
            localStorage.setItem('proformaAppData', JSON.stringify(firestoreData));
            return firestoreData;
        }
    }

    // Si no hay datos en Firestore, cargar desde localStorage
    const localData = localStorage.getItem('proformaAppData');
    if (localData) {
        return JSON.parse(localData);
    }

    return null;
}

// Exponer funciones globalmente
window.initFirebase = initFirebase;
window.saveAllData = saveAllData;
window.loadAllData = loadAllData;
window.isFirebaseEnabled = () => isFirebaseEnabled;
