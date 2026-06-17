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
let storage = null;
let isFirebaseEnabled = false;
const FIREBASE_PRODUCTS_CHUNK_SIZE = 10;
const DOCUMENT_COUNTER_FIELDS = {
    cotizacion: 'currentQuoteNumber',
    notaventa: 'currentSaleNumber',
    notaentrega: 'currentDeliveryNumber'
};
let countersSyncInterval = null;
// Bandera: indica que el localStorage local tenía datos (ventas/gastos) que NO estaban
// en Firestore al cargar. loadData() la usa para forzar un re-guardado y empujar esos
// datos a la nube, de modo que otros dispositivos (celular) puedan verlos.
let pendingFirestoreResync = false;

function initFirebase() {
    try {
        // Inicializar Firebase
        firebase.initializeApp(firebaseConfig);
        db = firebase.firestore();
        storage = firebase.storage();
        isFirebaseEnabled = true;
        return true;
    } catch (error) {
        isFirebaseEnabled = false;
        return false;
    }
}

// Sube una imagen base64 a Firebase Storage y retorna la URL pública.
// Si Firebase no está disponible, retorna la misma imagen base64 como fallback.
async function uploadProductImageToStorage(productId, base64Image) {
    if (!isFirebaseEnabled || !storage) {
        return base64Image;
    }
    try {
        const ref = storage.ref(`product-images/${productId}`);
        await ref.putString(base64Image, 'data_url');
        const url = await ref.getDownloadURL();
        saveProductImageUrlToCache(productId, url);
        return url;
    } catch (error) {
        console.error('Error al subir imagen a Firebase Storage:', error);
        return base64Image;
    }
}

// ==================== CACHE DE IMÁGENES EN BASE64 ====================
// Cache separado del appData para no inflar Firestore ni el localStorage principal.
// Clave: productId (string), Valor: base64 data URL.

const IMAGE_CACHE_KEY = 'proformaImageCache';
// Cache de URLs de Firebase Storage. Permite recuperar la URL original cuando
// product.image ha sido reemplazado por base64 en memoria (hidratación).
const IMAGE_URL_CACHE_KEY = 'proformaImageUrlCache';

function saveProductImageUrlToCache(productId, url) {
    try {
        const cache = JSON.parse(localStorage.getItem(IMAGE_URL_CACHE_KEY) || '{}');
        cache[String(productId)] = url;
        localStorage.setItem(IMAGE_URL_CACHE_KEY, JSON.stringify(cache));
    } catch (e) { /* ignorar errores de cuota */ }
}

function getProductImageUrlFromCache(productId) {
    try {
        const cache = JSON.parse(localStorage.getItem(IMAGE_URL_CACHE_KEY) || '{}');
        return cache[String(productId)] || null;
    } catch (e) {
        return null;
    }
}

function saveProductImageToCache(productId, base64) {
    try {
        const cache = JSON.parse(localStorage.getItem(IMAGE_CACHE_KEY) || '{}');
        cache[String(productId)] = base64;
        localStorage.setItem(IMAGE_CACHE_KEY, JSON.stringify(cache));
    } catch (e) { /* ignorar errores de cuota */ }
}

function getProductImageFromCache(productId) {
    try {
        const cache = JSON.parse(localStorage.getItem(IMAGE_CACHE_KEY) || '{}');
        return cache[String(productId)] || null;
    } catch (e) {
        return null;
    }
}

// Reemplaza URLs de Storage o imágenes vacías con el base64 guardado en el cache local.
// Caso 1: product.image = URL de Storage → guarda URL en URL-cache, reemplaza con base64.
// Caso 2: product.image = '' (URL ya perdida) → intenta restaurar desde el cache de base64.
// Caso 3: product.image ya es base64 → no hace nada.
// Retorna true si algún producto vacío fue restaurado (Firestore necesita actualizarse).
// Operación síncrona — solo usa localStorage.
function hydrateProductImagesFromCache(products) {
    let restoredFromEmpty = false;
    (products || []).forEach(product => {
        if (product.image && product.image.startsWith('http')) {
            // Guardar la URL de Storage antes de sobreescribir con base64
            saveProductImageUrlToCache(product.id, product.image);
            const cached = getProductImageFromCache(product.id);
            if (cached) product.image = cached;
        } else if (!product.image) {
            // Imagen vacía (URL perdida o nunca guardada) — restaurar desde cache de base64
            const cached = getProductImageFromCache(product.id);
            if (cached) {
                product.image = cached;
                restoredFromEmpty = true;
            }
        }
        // Si ya es base64 (data:...), no se toca
    });
    return restoredFromEmpty;
}

// ==================== FUNCIONES DE BASE DE DATOS ====================

function createLocalCachePayload(data) {
    return {
        ...data,
        products: (data.products || []).map(product => ({
            ...product,
            // Conservar URLs de Storage; solo eliminar base64 para reducir tamaño del cache
            image: (product.image && product.image.startsWith('data:')) ? '' : (product.image || '')
        })),
        pdfHistory: (data.pdfHistory || []).slice(0, 150)
    };
}

function saveLocalCacheSafe(data) {
    try {
        localStorage.setItem('proformaAppData', JSON.stringify(data));
        return true;
    } catch (error) {
        if (error.name === 'QuotaExceededError') {
            try {
                const compactData = createLocalCachePayload(data);
                localStorage.setItem('proformaAppData', JSON.stringify(compactData));
                return true;
            } catch (compactError) {
                return false;
            }
        }

        return false;
    }
}

async function saveProductsInChunks(products) {
    if (!isFirebaseEnabled) {
        return false;
    }

    const productsCollection = db.collection('proformaProducts');
    const chunks = [];

    // Guardar la imagen tal como está (base64 o URL). Las imágenes base64 comprimidas
    // son ~15-40KB; con chunks de 10 productos el documento queda muy por debajo del
    // límite de 1MB de Firestore. Esto garantiza que CUALQUIER navegador cargue la imagen
    // directamente de Firestore sin depender de Firebase Storage ni de localStorage.
    const productsForStorage = products.map(p => ({ ...p, image: p.image || '' }));

    for (let i = 0; i < productsForStorage.length; i += FIREBASE_PRODUCTS_CHUNK_SIZE) {
        chunks.push(productsForStorage.slice(i, i + FIREBASE_PRODUCTS_CHUNK_SIZE));
    }

    const existingChunksSnapshot = await productsCollection.get();
    const existingChunkIds = existingChunksSnapshot.docs.map(doc => doc.id);

    for (let index = 0; index < chunks.length; index++) {
        await productsCollection.doc(`chunk_${index}`).set({
            index,
            items: chunks[index],
            updatedAt: new Date().toISOString()
        });
    }

    const validChunkIds = new Set(chunks.map((_, index) => `chunk_${index}`));
    for (const chunkId of existingChunkIds) {
        if (!validChunkIds.has(chunkId)) {
            await productsCollection.doc(chunkId).delete();
        }
    }

    return true;
}

async function loadProductsFromChunks() {
    if (!isFirebaseEnabled) {
        return [];
    }

    const snapshot = await db.collection('proformaProducts').orderBy('index').get();
    if (snapshot.empty) {
        return [];
    }

    const products = [];
    snapshot.forEach(doc => {
        const chunkData = doc.data();
        if (Array.isArray(chunkData.items)) {
            products.push(...chunkData.items);
        }
    });

    return products;
}

async function reserveDocumentNumber(documentType, cityId) {
    let counterField;
    let localCurrent;

    if (documentType === 'notaventa' && cityId && cityId !== 'cochabamba') {
        counterField = `currentSaleNumber_${cityId}`;
        localCurrent = (appData.currentSaleNumbers && appData.currentSaleNumbers[cityId]) || 100000;
    } else {
        counterField = DOCUMENT_COUNTER_FIELDS[documentType];
        if (!counterField) return null;
        localCurrent = appData[counterField] || 100000;
    }

    if (!isFirebaseEnabled) {
        return {
            number: localCurrent,
            next: localCurrent + 1,
            source: 'local'
        };
    }

    try {
        const appDocRef = db.collection('proformaApp').doc('appData');
        const result = await db.runTransaction(async transaction => {
            const snapshot = await transaction.get(appDocRef);
            const existingData = snapshot.exists ? snapshot.data() : {};
            const currentNumber = existingData[counterField] || localCurrent;
            const nextNumber = currentNumber + 1;

            transaction.set(appDocRef, {
                [counterField]: nextNumber,
                lastUpdated: new Date().toISOString()
            }, { merge: true });

            return {
                number: currentNumber,
                next: nextNumber,
                source: 'firebase'
            };
        });

        return result;
    } catch (error) {
        return {
            number: localCurrent,
            next: localCurrent + 1,
            source: 'fallback'
        };
    }
}

async function syncDocumentCounters() {
    if (!isFirebaseEnabled) {
        return false;
    }

    try {
        const doc = await db.collection('proformaApp').doc('appData').get();
        if (!doc.exists) {
            return false;
        }

        const data = doc.data();
        let hasChanges = false;

        Object.values(DOCUMENT_COUNTER_FIELDS).forEach(field => {
            if (typeof data[field] === 'number' && data[field] > (appData[field] || 0)) {
                appData[field] = data[field];
                hasChanges = true;
            }
        });

        // Sync per-city sale numbers
        if (data.currentSaleNumbers && typeof data.currentSaleNumbers === 'object') {
            if (!appData.currentSaleNumbers) appData.currentSaleNumbers = {};
            Object.entries(data.currentSaleNumbers).forEach(([cid, num]) => {
                if (typeof num === 'number' && num > (appData.currentSaleNumbers[cid] || 0)) {
                    appData.currentSaleNumbers[cid] = num;
                    hasChanges = true;
                }
            });
        }

        if (hasChanges && typeof updateDocumentNumber === 'function') {
            updateDocumentNumber();
        }

        return hasChanges;
    } catch (error) {
        return false;
    }
}

function startCountersSync() {
    if (countersSyncInterval) {
        clearInterval(countersSyncInterval);
    }

    syncDocumentCounters();
    syncMovementsFromFirestore();
    countersSyncInterval = setInterval(() => {
        syncDocumentCounters();
        syncMovementsFromFirestore();
    }, 30000); // sync movimientos cada 30 segundos como fallback al onSnapshot
}

function stopCountersSync() {
    if (countersSyncInterval) {
        clearInterval(countersSyncInterval);
        countersSyncInterval = null;
    }
}

// ==================== SINCRONIZACIÓN EN TIEMPO REAL DEL HISTORIAL ====================
let historyUnsubscribe = null;
let isSavingNow = false; // flag para ignorar el snapshot que dispara el propio guardado

function startHistorySync() {
    if (!isFirebaseEnabled || !db) return;
    if (historyUnsubscribe) historyUnsubscribe();

    historyUnsubscribe = db.collection('proformaApp').doc('appData')
        .onSnapshot(snapshot => {
            // Ignorar el disparo inmediato causado por el propio guardado de este navegador
            if (isSavingNow) return;
            if (!snapshot.exists) return;

            const remoteData = snapshot.data();
            const remoteHistory = remoteData.pdfHistory || [];
            const remoteGastos = remoteData.gastos || [];
            const remoteClients = remoteData.clients || [];

            // Fusionar historial remoto con el local (sin perder entradas de ninguno)
            const mergedMap = new Map();
            remoteHistory.forEach(e => mergedMap.set(e.id, e));
            (appData.pdfHistory || []).forEach(e => mergedMap.set(e.id, e));
            const merged = Array.from(mergedMap.values()).sort((a, b) => b.id - a.id);

            // Fusionar gastos: agregar del remoto los que no existen localmente
            const localGastoIds = new Set((appData.gastos || []).map(g => g.id));
            const newRemoteGastos = remoteGastos.filter(g => !localGastoIds.has(g.id));
            const mergedGastos = [...(appData.gastos || []), ...newRemoteGastos]
                .sort((a, b) => b.id - a.id);

            // Fusionar clientes: agregar del remoto los que no existen localmente
            const localClientIds = new Set((appData.clients || []).map(c => c.id));
            const newRemoteClients = remoteClients.filter(c => !localClientIds.has(c.id));
            const mergedClients = [...(appData.clients || []), ...newRemoteClients];

            const historyChanged = merged.length !== (appData.pdfHistory || []).length ||
                (merged.length > 0 && (appData.pdfHistory || []).length > 0 &&
                 merged[0].id !== appData.pdfHistory[0].id);
            const gastosChanged = newRemoteGastos.length > 0;
            const clientsChanged = newRemoteClients.length > 0;

            if (historyChanged || gastosChanged) {
                appData.pdfHistory = merged;
                appData.gastos = mergedGastos;
                // Refrescar la sección de movimientos si está visible
                const salesSection = document.getElementById('salesSection');
                if (salesSection && salesSection.style.display !== 'none') {
                    if (typeof filterSalesByMonth === 'function') filterSalesByMonth();
                }
            }

            if (clientsChanged) {
                appData.clients = mergedClients;
            }
        }, error => {
            // Error en listener — reintentar la suscripción automáticamente
            if (historyUnsubscribe) { historyUnsubscribe(); historyUnsubscribe = null; }
            setTimeout(() => startHistorySync(), 5000);
        });
}

function stopHistorySync() {
    if (historyUnsubscribe) {
        historyUnsubscribe();
        historyUnsubscribe = null;
    }
}

// ==================== SYNC PERIÓDICO DE MOVIMIENTOS (FALLBACK) ====================
// Complementa al onSnapshot: re-fusiona desde Firestore cada 30 s para capturar
// cualquier actualización que se haya perdido (p.ej. si la conexión cayó brevemente).
async function syncMovementsFromFirestore() {
    if (!isFirebaseEnabled || !db || isSavingNow) return;
    try {
        const doc = await db.collection('proformaApp').doc('appData').get();
        if (!doc.exists) return;
        const remoteData = doc.data();

        // Merge pdfHistory
        const remoteHistory = remoteData.pdfHistory || [];
        const histMap = new Map();
        remoteHistory.forEach(e => histMap.set(e.id, e));
        (appData.pdfHistory || []).forEach(e => histMap.set(e.id, e));
        const mergedHistory = Array.from(histMap.values()).sort((a, b) => b.id - a.id);

        // Merge gastos
        const remoteGastos = remoteData.gastos || [];
        const gastMap = new Map();
        remoteGastos.forEach(g => gastMap.set(g.id, g));
        (appData.gastos || []).forEach(g => gastMap.set(g.id, g));
        const mergedGastos = Array.from(gastMap.values()).sort((a, b) => b.id - a.id);

        // Merge clientes
        const remoteClients = remoteData.clients || [];
        const cliMap = new Map();
        remoteClients.forEach(c => cliMap.set(c.id, c));
        (appData.clients || []).forEach(c => cliMap.set(c.id, c));
        const mergedClients = Array.from(cliMap.values());

        const histChanged = mergedHistory.length !== (appData.pdfHistory || []).length;
        const gastChanged = mergedGastos.length !== (appData.gastos || []).length;
        const cliChanged  = mergedClients.length  !== (appData.clients  || []).length;

        if (histChanged || gastChanged) {
            appData.pdfHistory = mergedHistory;
            appData.gastos     = mergedGastos;
            const salesSection = document.getElementById('salesSection');
            if (salesSection && salesSection.style.display !== 'none') {
                if (typeof filterSalesByMonth === 'function') filterSalesByMonth();
            }
        }
        if (cliChanged) {
            appData.clients = mergedClients;
        }
    } catch (e) {
        // Ignorar errores de red silenciosamente
    }
}

// Elimina las imágenes base64 de los productos dentro de los items del historial
// Y el logo de la empresa de cada entrada — el logo se guarda una sola vez en el
// documento principal (company.logo). Esto es crítico para mantenerse bajo el límite
// de 1MB de Firestore: con 50+ entradas un logo de 80KB = 4MB solo en logos.
function stripImagesFromHistoryItems(historyArray) {
    return (historyArray || []).map(entry => ({
        ...entry,
        // Quitar logo de cada entrada: el logo actual siempre está en appData.company.logo
        company: entry.company ? { ...entry.company, logo: '' } : entry.company,
        items: (entry.items || []).map(item => ({
            ...item,
            product: item.product ? {
                ...item.product,
                image: (item.product.image && item.product.image.startsWith('data:')) ? '' : (item.product.image || '')
            } : item.product
        }))
    }));
}

// Función para guardar todos los datos de la aplicación
async function saveAllData(appData) {
    // Mantener todas las cotizaciones, ventas y entregas sin límite
    let limitedHistory = stripImagesFromHistoryItems(
        (appData.pdfHistory || []).sort((a, b) => b.id - a.id)
    );
    
    const dataToSave = {
        company: { ...appData.company },
        inventories: appData.inventories || [],
        clients: appData.clients || [],
        sellers: appData.sellers || [],
        products: appData.products || [],
        pdfHistory: limitedHistory,
        gastos: appData.gastos || [],
        currentQuoteNumber: appData.currentQuoteNumber,
        currentSaleNumber: appData.currentSaleNumber,
        currentSaleNumbers: appData.currentSaleNumbers || {},
        currentDeliveryNumber: appData.currentDeliveryNumber,
        terms: appData.terms,
        documentType: appData.documentType,
        productsUpdatedAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
    };

    // Intentar guardar en Firebase primero
    if (isFirebaseEnabled) {
        try {
            await saveProductsInChunks(dataToSave.products || []);

            const firebasePayload = {
                ...dataToSave,
                products: [],
                productsStorage: 'chunks',
                productsCount: (dataToSave.products || []).length,
                // Campo dedicado que SOLO se actualiza cuando los productos se guardan
                // exitosamente en chunks. `lastUpdated` lo sobreescribe reserveDocumentNumber
                // cada vez que se crea un documento, invalidando la comparación de timestamps.
                productsUpdatedAt: dataToSave.lastUpdated
            };

            const appDocRef = db.collection('proformaApp').doc('appData');
            isSavingNow = true;
            await db.runTransaction(async transaction => {
                const snapshot = await transaction.get(appDocRef);
                const existingData = snapshot.exists ? snapshot.data() : {};

                // Merge pdfHistory: combinar entradas del servidor con las locales para evitar
                // que guardados concurrentes de dos vendedores se sobreescriban entre sí.
                const existingHistory = existingData.pdfHistory || [];
                const localHistory = firebasePayload.pdfHistory || [];
                const mergedMap = new Map();
                // Primero las del servidor, luego las locales (las locales tienen prioridad
                // para reflejar cambios recientes como anulaciones o facturado)
                existingHistory.forEach(entry => mergedMap.set(entry.id, entry));
                localHistory.forEach(entry => mergedMap.set(entry.id, entry));
                let mergedHistory = Array.from(mergedMap.values()).sort((a, b) => b.id - a.id);
                // Limpiar logos/imágenes base64 del historial COMPLETO (incluidas las
                // entradas que solo existían en el servidor). Esto garantiza que el
                // documento se mantenga por debajo del límite de 1MB de Firestore aunque
                // antes se hubieran guardado entradas con logos pesados.
                firebasePayload.pdfHistory = stripImagesFromHistoryItems(mergedHistory);

                // Merge gastos: combinar TODOS los gastos del servidor con los locales,
                // igual que pdfHistory. Los locales tienen prioridad (preservan ediciones).
                // El enfoque anterior (filtrar por id > newestLocalId) perdía gastos de
                // otros navegadores cuando su timestamp era anterior al más reciente local.
                const existingGastos = existingData.gastos || [];
                const localGastos = firebasePayload.gastos || [];
                const mergedGastosMap = new Map();
                existingGastos.forEach(g => mergedGastosMap.set(g.id, g));
                localGastos.forEach(g => mergedGastosMap.set(g.id, g)); // local tiene prioridad
                firebasePayload.gastos = Array.from(mergedGastosMap.values())
                    .sort((a, b) => b.id - a.id);

                // Merge clients: combinar clientes del servidor con los locales para evitar
                // que guardados concurrentes de dos navegadores se sobreescriban entre sí.
                // Los locales tienen prioridad (preservan ediciones recientes).
                const existingClients = existingData.clients || [];
                const localClients = firebasePayload.clients || [];
                const mergedClientsMap = new Map();
                existingClients.forEach(c => mergedClientsMap.set(c.id, c));
                localClients.forEach(c => mergedClientsMap.set(c.id, c));
                firebasePayload.clients = Array.from(mergedClientsMap.values());

                firebasePayload.currentQuoteNumber = Math.max(
                    firebasePayload.currentQuoteNumber || 100000,
                    existingData.currentQuoteNumber || 100000
                );
                firebasePayload.currentSaleNumber = Math.max(
                    firebasePayload.currentSaleNumber || 100000,
                    existingData.currentSaleNumber || 100000
                );
                firebasePayload.currentDeliveryNumber = Math.max(
                    firebasePayload.currentDeliveryNumber || 100000,
                    existingData.currentDeliveryNumber || 100000
                );

                // Merge per-city sale numbers
                const localCityNums = firebasePayload.currentSaleNumbers || {};
                const existingCityNums = existingData.currentSaleNumbers || {};
                const mergedCityNums = {};
                new Set([...Object.keys(localCityNums), ...Object.keys(existingCityNums)]).forEach(cid => {
                    mergedCityNums[cid] = Math.max(localCityNums[cid] || 100000, existingCityNums[cid] || 100000);
                });
                firebasePayload.currentSaleNumbers = mergedCityNums;

                transaction.set(appDocRef, firebasePayload, { merge: true });
            });
            isSavingNow = false;

            appData.currentQuoteNumber = firebasePayload.currentQuoteNumber;
            appData.currentSaleNumber = firebasePayload.currentSaleNumber;
            appData.currentDeliveryNumber = firebasePayload.currentDeliveryNumber;
            appData.currentSaleNumbers = firebasePayload.currentSaleNumbers || {};
            // Sincronizar historial y gastos fusionados de vuelta al estado local
            appData.pdfHistory = firebasePayload.pdfHistory;
            dataToSave.pdfHistory = firebasePayload.pdfHistory;
            appData.gastos = firebasePayload.gastos;
            dataToSave.gastos = firebasePayload.gastos;
            // Sincronizar clientes fusionados de vuelta al estado local
            appData.clients = firebasePayload.clients;
            dataToSave.clients = firebasePayload.clients;
            // Sincronizar productsUpdatedAt para que localStorage lo tenga
            dataToSave.productsUpdatedAt = firebasePayload.productsUpdatedAt;

            // Guardar cache local sin bloquear si hay límite de espacio
            saveLocalCacheSafe(dataToSave);
            return true;
        } catch (error) {
            isSavingNow = false;
            // Fallo en Firebase — guardar solo en localStorage como respaldo
        }
    }

    // Guardar en localStorage (si Firebase falla o no está disponible)
    try {
        if (saveLocalCacheSafe(dataToSave)) {
            return true;
        }

        throw new Error('No se pudo guardar en localStorage');
    } catch (error) {
        if (error.name === 'QuotaExceededError') {
            alert('Espacio de almacenamiento lleno. Eliminando datos antiguos...');
            // Reducir ventas y entregas si hay problemas de espacio
            const ventas = appData.pdfHistory.filter(entry => entry.type === 'notaventa')
                .sort((a, b) => b.id - a.id)
                .slice(0, 50); // Solo mantener 50 ventas más recientes
            const entregas = appData.pdfHistory.filter(entry => entry.type === 'notaentrega')
                .sort((a, b) => b.id - a.id)
                .slice(0, 30); // Solo mantener 30 entregas más recientes
            dataToSave.pdfHistory = [...limitedCotizaciones, ...ventas, ...entregas].sort((a, b) => b.id - a.id);
            saveLocalCacheSafe(dataToSave);
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

                if (firebaseData.productsStorage === 'chunks') {
                    const chunksProducts = await loadProductsFromChunks();
                    const firebaseUpdatedAt = firebaseData.productsUpdatedAt || '';

                    // Cargar productos de localStorage para comparar
                    let localProducts = [];
                    let localUpdatedAt = '';
                    try {
                        const localStr = localStorage.getItem('proformaAppData');
                        if (localStr) {
                            const localData = JSON.parse(localStr);
                            localProducts = localData.products || [];
                            localUpdatedAt = localData.productsUpdatedAt || localData.lastUpdated || '';
                        }
                    } catch (e) { /* ignorar */ }

                    if (localProducts.length > 0 && chunksProducts.length > 0) {
                        if (firebaseUpdatedAt > localUpdatedAt) {
                            // Firebase fue actualizado desde OTRO dispositivo—usar sus productos.
                            // Agregar también productos que solo existan en localStorage
                            // (aún no sincronizados) y restaurar imágenes locales.
                            const chunkMap = new Map(chunksProducts.map(p => [p.id, p]));
                            const localMap = new Map(localProducts.map(p => [p.id, p]));
                            const onlyLocal = localProducts.filter(p => !chunkMap.has(p.id));
                            // Restaurar imágenes de localStorage a los productos de Firebase
                            const merged = chunksProducts.map(p => {
                                const lp = localMap.get(p.id);
                                return lp && lp.image ? { ...p, image: lp.image } : p;
                            });
                            firebaseData.products = [...merged, ...onlyLocal];
                        } else {
                            // localStorage es igual o más reciente → este dispositivo guardó de último.
                            // Agregar productos que solo existan en Firebase (de otro dispositivo).
                            const localMap = new Map(localProducts.map(p => [p.id, p]));
                            const onlyInFirebase = chunksProducts.filter(p => !localMap.has(p.id));
                            firebaseData.products = [...localProducts, ...onlyInFirebase];
                        }
                    } else if (localProducts.length > 0) {
                        firebaseData.products = localProducts;
                    } else {
                        firebaseData.products = chunksProducts;
                    }
                } else {
                    firebaseData.products = firebaseData.products || [];
                }

                // Fusionar con localStorage para recuperar ventas que fallaron al guardarse en Firebase
                const localStr = localStorage.getItem('proformaAppData');
                if (localStr) {
                    try {
                        const localData = JSON.parse(localStr);
                        const localHistory = localData.pdfHistory || [];
                        const fbHistory = firebaseData.pdfHistory || [];
                        if (localHistory.length > fbHistory.length ||
                            (localHistory.length > 0 && fbHistory.length > 0 &&
                             localHistory[0].id > fbHistory[0].id)) {
                            // localStorage tiene entradas más recientes → fusionar
                            const mergedMap = new Map();
                            fbHistory.forEach(e => mergedMap.set(e.id, e));
                            localHistory.forEach(e => mergedMap.set(e.id, e));
                            firebaseData.pdfHistory = Array.from(mergedMap.values())
                                .sort((a, b) => b.id - a.id);
                            // Hay ventas locales que faltan en Firestore → reenviar a la nube
                            pendingFirestoreResync = true;
                        }

                        // Fusionar gastos del localStorage que no estén en Firestore
                        const localGastos = localData.gastos || [];
                        const fbGastos = firebaseData.gastos || [];
                        const fbGastoIds = new Set(fbGastos.map(g => g.id));
                        const missingGastos = localGastos.filter(g => !fbGastoIds.has(g.id));
                        if (missingGastos.length > 0) {
                            const gMap = new Map();
                            fbGastos.forEach(g => gMap.set(g.id, g));
                            localGastos.forEach(g => gMap.set(g.id, g));
                            firebaseData.gastos = Array.from(gMap.values()).sort((a, b) => b.id - a.id);
                            pendingFirestoreResync = true;
                        }

                        // Fusionar clientes del localStorage que no estén en Firestore
                        const localClients = localData.clients || [];
                        const fbClients = firebaseData.clients || [];
                        const fbClientIds = new Set(fbClients.map(c => c.id));
                        const missingClients = localClients.filter(c => !fbClientIds.has(c.id));
                        if (missingClients.length > 0) {
                            const cMap = new Map();
                            fbClients.forEach(c => cMap.set(c.id, c));
                            localClients.forEach(c => cMap.set(c.id, c));
                            firebaseData.clients = Array.from(cMap.values());
                            pendingFirestoreResync = true;
                        }
                    } catch (e) { /* ignorar errores de parseo */ }
                }

                // Guardar en localStorage como cache (sin romper la carga por límites)
                saveLocalCacheSafe(firebaseData);
                return firebaseData;
            } else {
                // No hay datos en Firebase
            }
        } catch (error) {
            // Error cargando desde Firebase — intentar localStorage
        }
    }
    
    // Cargar desde localStorage si Firebase no tiene datos o falló
    const localDataStr = localStorage.getItem('proformaAppData');
    if (localDataStr) {
        try {
            const localData = JSON.parse(localDataStr);
            
            return localData;
        } catch (e) {
            // Error parseando localStorage
        }
    }

    return null;
}

// Exponer funciones globalmente
window.initFirebase = initFirebase;
window.saveAllData = saveAllData;
window.loadAllData = loadAllData;
window.isFirebaseEnabled = () => isFirebaseEnabled;
window.reserveDocumentNumber = reserveDocumentNumber;
window.syncDocumentCounters = syncDocumentCounters;
window.startCountersSync = startCountersSync;
window.stopCountersSync = stopCountersSync;
window.startHistorySync = startHistorySync;
window.stopHistorySync = stopHistorySync;
window.syncMovementsFromFirestore = syncMovementsFromFirestore;
window.needsFirestoreResync = () => pendingFirestoreResync;
window.clearFirestoreResyncFlag = () => { pendingFirestoreResync = false; };
window.uploadProductImageToStorage = uploadProductImageToStorage;
window.saveProductImageToCache = saveProductImageToCache;
window.getProductImageFromCache = getProductImageFromCache;
window.hydrateProductImagesFromCache = hydrateProductImagesFromCache;
