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
    try {
        // Inicializar Firebase
        firebase.initializeApp(firebaseConfig);
        db = firebase.firestore();
        isFirebaseEnabled = true;
        console.log('✅ Firebase conectado exitosamente');
        return true;
    } catch (error) {
        console.error('❌ Error inicializando Firebase:', error);
        console.log('⚠️ Usando localStorage como respaldo');
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
    // Limitar cotizaciones a 10 y mantener todas las ventas
    let limitedHistory = appData.pdfHistory || [];
    const cotizaciones = limitedHistory.filter(entry => entry.type === 'cotizacion');
    const ventas = limitedHistory.filter(entry => entry.type === 'notaventa');
    
    // Ordenar cotizaciones por ID descendente (más recientes primero) y tomar las 10 más recientes
    const sortedCotizaciones = cotizaciones.sort((a, b) => b.id - a.id);
    const limitedCotizaciones = sortedCotizaciones.slice(0, 10);
    
    // Combinar cotizaciones limitadas con todas las ventas y ordenar por ID
    limitedHistory = [...limitedCotizaciones, ...ventas].sort((a, b) => b.id - a.id);
    
    const dataToSave = {
        company: { ...appData.company },
        clients: appData.clients || [],
        sellers: appData.sellers || [],
        products: appData.products || [],
        pdfHistory: limitedHistory,
        currentQuoteNumber: appData.currentQuoteNumber,
        currentSaleNumber: appData.currentSaleNumber,
        terms: appData.terms,
        documentType: appData.documentType,
        lastUpdated: new Date().toISOString()
    };

    console.log('💾 Guardando datos:', {
        company: dataToSave.company.name,
        clientes: dataToSave.clients.length,
        vendedores: dataToSave.sellers.length,
        productos: dataToSave.products.length,
        cotizaciones: limitedCotizaciones.length,
        ventas: ventas.length
    });

    // Intentar guardar en Firebase primero
    if (isFirebaseEnabled) {
        try {
            await db.collection('proformaApp').doc('appData').set(dataToSave);
            console.log('✅ Datos guardados exitosamente en Firebase');
            
            // También guardar en localStorage como respaldo
            localStorage.setItem('proformaAppData', JSON.stringify(dataToSave));
            return true;
        } catch (error) {
            console.error('❌ Error guardando en Firebase:', error);
            console.log('⚠️ Guardando solo en localStorage como respaldo');
        }
    }

    // Guardar en localStorage (si Firebase falla o no está disponible)
    try {
        localStorage.setItem('proformaAppData', JSON.stringify(dataToSave));
        console.log('✅ Datos guardados en localStorage');
        return true;
    } catch (error) {
        console.error('❌ Error guardando en localStorage:', error);
        if (error.name === 'QuotaExceededError') {
            alert('Espacio de almacenamiento lleno. Eliminando datos antiguos...');
            // Reducir ventas si hay problemas de espacio
            const ventas = appData.pdfHistory.filter(entry => entry.type === 'notaventa')
                .sort((a, b) => b.id - a.id)
                .slice(0, 50); // Solo mantener 50 ventas más recientes
            dataToSave.pdfHistory = [...limitedCotizaciones, ...ventas].sort((a, b) => b.id - a.id);
            localStorage.setItem('proformaAppData', JSON.stringify(dataToSave));
        }
        return false;
    }
}

// Función para cargar todos los datos
async function loadAllData() {
    let firebaseData = null;
    
    // Intentar cargar desde Firebase primero
    if (isFirebaseEnabled) {
        try {
            const doc = await db.collection('proformaApp').doc('appData').get();
            if (doc.exists) {
                firebaseData = doc.data();
                console.log('📂 Datos cargados desde Firebase:', {
                    company: firebaseData.company?.name || 'Sin nombre',
                    clientes: firebaseData.clients?.length || 0,
                    vendedores: firebaseData.sellers?.length || 0,
                    productos: firebaseData.products?.length || 0,
                    cotizaciones: firebaseData.pdfHistory?.filter(e => e.type === 'cotizacion').length || 0,
                    ventas: firebaseData.pdfHistory?.filter(e => e.type === 'notaventa').length || 0
                });
                
                // Guardar en localStorage como cache
                localStorage.setItem('proformaAppData', JSON.stringify(firebaseData));
                return firebaseData;
            } else {
                console.log('ℹ️ No hay datos en Firebase - buscando en localStorage');
            }
        } catch (error) {
            console.error('❌ Error cargando desde Firebase:', error);
            console.log('⚠️ Intentando cargar desde localStorage');
        }
    }
    
    // Cargar desde localStorage si Firebase no tiene datos o falló
    const localDataStr = localStorage.getItem('proformaAppData');
    if (localDataStr) {
        try {
            const localData = JSON.parse(localDataStr);
            console.log('📂 Datos cargados desde localStorage:', {
                company: localData.company?.name || 'Sin nombre',
                clientes: localData.clients?.length || 0,
                vendedores: localData.sellers?.length || 0,
                productos: localData.products?.length || 0,
                cotizaciones: localData.pdfHistory?.filter(e => e.type === 'cotizacion').length || 0,
                ventas: localData.pdfHistory?.filter(e => e.type === 'notaventa').length || 0
            });
            
            // Si Firebase está habilitado y tiene datos locales, sincronizarlos
            if (isFirebaseEnabled && !firebaseData) {
                console.log('🔄 Sincronizando datos locales con Firebase...');
                await db.collection('proformaApp').doc('appData').set(localData);
                console.log('✅ Datos sincronizados con Firebase');
            }
            
            return localData;
        } catch (e) {
            console.error('❌ Error parseando localStorage:', e);
        }
    }

    console.log('ℹ️ No hay datos guardados - iniciando con valores por defecto');
    return null;
}

// Exponer funciones globalmente
window.initFirebase = initFirebase;
window.saveAllData = saveAllData;
window.loadAllData = loadAllData;
window.isFirebaseEnabled = () => isFirebaseEnabled;
