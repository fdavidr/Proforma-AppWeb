// ==================== GESTIÓN DE COTIZACIONES ====================

function setDocumentType(type) {
    appData.documentType = type;
    document.querySelectorAll('.type-toggle .btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    loadTerms();
}

function loadTerms() {
    const terms = appData.terms[appData.documentType];
    for (let i = 0; i < 4; i++) {
        document.getElementById('term' + (i + 1)).value = terms[i] || '';
    }
}

function saveTerms() {
    const terms = [];
    for (let i = 1; i <= 4; i++) {
        terms.push(document.getElementById('term' + i).value);
    }
    appData.terms[appData.documentType] = terms;
    saveData();
}

function addProductToQuote() {
    if (!appData.currentProduct) {
        alert('Seleccione un producto');
        return;
    }

    // Asegurar que el array existe
    if (!Array.isArray(appData.currentQuoteItems)) {
        appData.currentQuoteItems = [];
    }

    const quantity = parseFloat(document.getElementById('productQuantity').value) || 1;
    const price = parseFloat(document.getElementById('productPrice').value) || 0;
    const discount = parseFloat(document.getElementById('productDiscount').value) || 0;
    const discountType = document.getElementById('discountType').value;

    let discountAmount = 0;
    if (discountType === '%') {
        discountAmount = (price * quantity * discount) / 100;
    } else {
        discountAmount = discount;
    }

    const subtotal = (price * quantity) - discountAmount;

    const item = {
        id: Date.now(),
        product: appData.currentProduct,
        quantity: quantity,
        price: price,
        discount: discount,
        discountType: discountType,
        discountAmount: discountAmount,
        subtotal: subtotal
    };

    appData.currentQuoteItems.push(item);
    renderQuoteItems();
    calculateTotals();

    // Resetear formulario
    document.getElementById('productSelect').value = '';
    document.getElementById('productSelect').classList.remove('valid-selection');
    document.getElementById('productQuantity').value = 1;
    document.getElementById('productDiscount').value = 0;
    document.getElementById('productPrice').value = 0;
    appData.currentProduct = null;
    document.getElementById('productActionBtn').textContent = 'Nuevo Producto';
    document.getElementById('productActionBtn').className = 'btn btn-warning';
}

function renderQuoteItems() {
    const tbody = document.getElementById('productsTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';

    // Asegurar que el array existe
    if (!Array.isArray(appData.currentQuoteItems)) {
        appData.currentQuoteItems = [];
        return;
    }

    appData.currentQuoteItems.forEach((item, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><img src="${item.product.image || 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'25\' height=\'25\'%3E%3Crect fill=\'%23ecf0f1\' width=\'25\' height=\'25\'/%3E%3C/svg%3E'}" class="product-image" alt=""></td>
            <td>${index + 1}</td>
            <td>${item.product.code || '-'}</td>
            <td>${item.product.description}</td>
            <td>${item.quantity}</td>
            <td>Bs ${item.price.toFixed(2)}</td>
            <td>${item.discount} ${item.discountType}</td>
            <td>Bs ${item.subtotal.toFixed(2)}</td>
            <td><button class="btn btn-delete" onclick="removeQuoteItem(${item.id})">Eliminar</button></td>
        `;
        tbody.appendChild(tr);
    });
}

function removeQuoteItem(itemId) {
    appData.currentQuoteItems = appData.currentQuoteItems.filter(item => item.id !== itemId);
    renderQuoteItems();
    calculateTotals();
}

function calculateTotals() {
    let subtotal = 0;
    let totalDiscount = 0;

    // Asegurar que el array existe
    if (Array.isArray(appData.currentQuoteItems)) {
        appData.currentQuoteItems.forEach(item => {
            subtotal += item.price * item.quantity;
            totalDiscount += item.discountAmount;
        });
    }

    const total = subtotal - totalDiscount;

    const subtotalAmount = document.getElementById('subtotalAmount');
    const discountAmountElem = document.getElementById('discountAmount');
    const totalAmount = document.getElementById('totalAmount');
    
    if (subtotalAmount) subtotalAmount.textContent = 'Bs ' + subtotal.toFixed(2);
    if (discountAmountElem) discountAmountElem.textContent = 'Bs ' + totalDiscount.toFixed(2);
    if (totalAmount) totalAmount.textContent = 'Bs ' + total.toFixed(2);
}

function newQuote() {
    if (confirm('¿Desea crear una nueva cotización? Se perderán los datos actuales no guardados.')) {
        appData.currentClient = null;
        appData.currentSeller = null;
        appData.currentProduct = null;
        appData.currentQuoteItems = [];

        document.getElementById('clientSelect').value = '';
        document.getElementById('clientSelect').classList.remove('valid-selection');
        document.getElementById('clientActionBtn').textContent = 'Agregar Cliente';
        document.getElementById('clientActionBtn').className = 'btn btn-success';

        document.getElementById('sellerSelect').value = '';
        document.getElementById('sellerSelect').classList.remove('valid-selection');
        document.getElementById('sellerActionBtn').textContent = 'Agregar Vendedor';
        document.getElementById('sellerActionBtn').className = 'btn btn-success';

        document.getElementById('productSelect').value = '';
        document.getElementById('productSelect').classList.remove('valid-selection');
        document.getElementById('productQuantity').value = 1;
        document.getElementById('productDiscount').value = 0;
        document.getElementById('productPrice').value = 0;
        document.getElementById('productActionBtn').textContent = 'Nuevo Producto';
        document.getElementById('productActionBtn').className = 'btn btn-warning';

        renderQuoteItems();
        calculateTotals();
    }
}

// Exponer funciones globalmente
window.setDocumentType = setDocumentType;
window.addProductToQuote = addProductToQuote;
window.removeQuoteItem = removeQuoteItem;
window.newQuote = newQuote;
