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
        if (appData.currentProduct.image) {
            document.getElementById('productImagePreview').src = appData.currentProduct.image;
            document.getElementById('productImagePreview').style.display = 'block';
        }
    } else {
        document.getElementById('productModalTitle').textContent = 'Nuevo Producto';
        document.getElementById('modalProductCode').value = '';
        document.getElementById('modalProductDescription').value = '';
        document.getElementById('modalProductPrice').value = 0;
        document.getElementById('productImagePreview').style.display = 'none';
    }
    openModal('productModal');
}

function handleProductImageUpload(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('productImagePreview').src = e.target.result;
            document.getElementById('productImagePreview').style.display = 'block';
        };
        reader.readAsDataURL(file);
    }
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
