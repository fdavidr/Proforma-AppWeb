// ==================== GESTIÓN DE PRODUCTOS ====================

function filterProducts(query) {
    const list = document.getElementById('productList');
    list.innerHTML = '';
    
    if (!query) {
        appData.products.forEach(product => {
            addProductToList(product, list);
        });
    } else {
        const filtered = appData.products.filter(p => 
            p.description.toLowerCase().includes(query.toLowerCase()) ||
            (p.code && p.code.toLowerCase().includes(query.toLowerCase()))
        );
        filtered.forEach(product => {
            addProductToList(product, list);
        });
    }
    
    if (list.children.length > 0) {
        list.classList.add('active');
    }
}

function showProductList() {
    filterProducts('');
}

function addProductToList(product, list) {
    const div = document.createElement('div');
    div.className = 'autocomplete-item';
    div.textContent = (product.code ? product.code + ' - ' : '') + product.description;
    div.onclick = () => selectProduct(product);
    list.appendChild(div);
}

function selectProduct(product) {
    appData.currentProduct = product;
    const input = document.getElementById('productSelect');
    input.value = product.description;
    input.classList.add('valid-selection');
    document.getElementById('productList').classList.remove('active');
    document.getElementById('productPrice').value = product.price || 0;
    document.getElementById('productActionBtn').textContent = 'Modificar Producto';
    document.getElementById('productActionBtn').className = 'btn btn-warning';
    updateProductPreview();
}

function handleProductAction() {
    if (appData.currentProduct) {
        document.getElementById('productModalTitle').textContent = 'Modificar Producto';
        document.getElementById('modalProductCode').value = appData.currentProduct.code || '';
        document.getElementById('modalProductDescription').value = appData.currentProduct.description;
        document.getElementById('modalProductPrice').value = appData.currentProduct.price || 0;
        document.getElementById('modalProductCost').value = appData.currentProduct.cost || 0;
        document.getElementById('modalProductStockCochabamba').value = appData.currentProduct.stockCochabamba || 0;
        document.getElementById('modalProductStockSantaCruz').value = appData.currentProduct.stockSantaCruz || 0;
        if (appData.currentProduct.image) {
            document.getElementById('productImagePreview').src = appData.currentProduct.image;
            document.getElementById('productImagePreview').style.display = 'block';
        }
    } else {
        document.getElementById('productModalTitle').textContent = 'Nuevo Producto';
        document.getElementById('modalProductCode').value = '';
        document.getElementById('modalProductDescription').value = '';
        document.getElementById('modalProductPrice').value = 0;
        document.getElementById('modalProductCost').value = 0;
        document.getElementById('modalProductStockCochabamba').value = 0;
        document.getElementById('modalProductStockSantaCruz').value = 0;
        document.getElementById('productImagePreview').style.display = 'none';
    }
    openModal('productModal');
}

function handleProductImageUpload(event) {
    const file = event.target.files[0];
    if (file) {
        // Validar tamaño (máximo 500KB)
        if (file.size > 500000) {
            alert('La imagen es muy grande. Máximo 500KB. Intenta con una imagen más pequeña o comprimida.');
            event.target.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = function(e) {
            // Comprimir imagen antes de guardar
            compressImage(e.target.result, 300, 300, (compressedImage) => {
                document.getElementById('productImagePreview').src = compressedImage;
                document.getElementById('productImagePreview').style.display = 'block';
            });
        };
        reader.readAsDataURL(file);
    }
}

// Función para comprimir imágenes
function compressImage(base64, maxWidth, maxHeight, callback) {
    const img = new Image();
    img.onload = function() {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Calcular nuevas dimensiones manteniendo aspecto
        if (width > height) {
            if (width > maxWidth) {
                height *= maxWidth / width;
                width = maxWidth;
            }
        } else {
            if (height > maxHeight) {
                width *= maxHeight / height;
                height = maxHeight;
            }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Comprimir a JPEG con calidad 0.7 (70%)
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
        callback(compressedBase64);
    };
    img.src = base64;
}

function saveProduct() {
    const description = document.getElementById('modalProductDescription').value.trim();
    if (!description) {
        alert('La descripción es obligatoria');
        return;
    }

    const product = {
        id: appData.currentProduct ? appData.currentProduct.id : Date.now(),
        code: document.getElementById('modalProductCode').value,
        description: description,
        price: parseFloat(document.getElementById('modalProductPrice').value) || 0,
        cost: parseFloat(document.getElementById('modalProductCost').value) || 0,
        stockCochabamba: parseFloat(document.getElementById('modalProductStockCochabamba').value) || 0,
        stockSantaCruz: parseFloat(document.getElementById('modalProductStockSantaCruz').value) || 0,
        stock: 0,
        registrationDate: appData.currentProduct ? appData.currentProduct.registrationDate : new Date().toISOString(),
        image: ''
    };

    const imgPreview = document.getElementById('productImagePreview');
    if (imgPreview.style.display !== 'none') {
        product.image = imgPreview.src;
    }

    if (appData.currentProduct) {
        const index = appData.products.findIndex(p => p.id === appData.currentProduct.id);
        appData.products[index] = product;
    } else {
        appData.products.push(product);
    }

    appData.currentProduct = product;
    saveData();
    selectProduct(product);
    closeModal('productModal');
    
    // Si el modal de inventario está abierto, recargar datos
    const inventoryModal = document.getElementById('inventoryModal');
    if (inventoryModal && inventoryModal.classList.contains('active')) {
        loadInventoryData();
        openModal('inventoryModal');
    }
}

function updateProductPreview() {
    // Función para retroalimentación visual
}

// Exponer funciones globalmente
window.filterProducts = filterProducts;
window.selectProduct = selectProduct;
window.handleProductAction = handleProductAction;
window.handleProductImageUpload = handleProductImageUpload;
window.saveProduct = saveProduct;
window.compressImage = compressImage;
