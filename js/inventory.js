// ==================== GESTIÓN DE INVENTARIO ====================

let selectedInventoryCity = 'cochabamba';

function openInventory() {
    // Seleccionar el primer inventario disponible
    selectedInventoryCity = appData.inventories.length > 0 ? appData.inventories[0].id : 'cochabamba';
    
    // Generar lista de inventarios disponibles
    loadInventoryListInline();
    
    // Generar filtros dinámicos
    generateInventoryFilters();
    
    loadInventoryData();
    document.getElementById('mainContent').style.display = 'none';
    document.getElementById('historySection').style.display = 'none';
    document.getElementById('inventorySection').style.display = 'block';
    document.getElementById('salesSection').style.display = 'none';
    setActiveMenuButton('inventoryBtn');
}

// Actualizar elementos ocultos que el JS interno necesita
function loadInventoryListInline() {
    const countSpan = document.getElementById('inventoryCountInline');
    if (countSpan) countSpan.textContent = appData.inventories.length;
}



// Generar botones de filtro de inventarios dinámicamente
function generateInventoryFilters() {
    const container = document.getElementById('inventoryFilterButtons');
    if (!container) return;

    container.innerHTML = '';

    const select = document.createElement('select');
    select.id = 'inventoryCitySelect';
    select.style.cssText = 'padding: 7px 12px; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 14px; font-weight: 600; color: #2c3e50; background: #fff; cursor: pointer; min-width: 160px; outline: none;';

    appData.inventories.forEach(inventory => {
        const option = document.createElement('option');
        option.value = inventory.id;
        option.textContent = inventory.name;
        if (inventory.id === selectedInventoryCity) option.selected = true;
        select.appendChild(option);
    });

    select.addEventListener('change', () => filterInventoryByCity(select.value));
    container.appendChild(select);
}

function filterInventoryByCity(city) {
    selectedInventoryCity = city;

    // Sincronizar el select si existe
    const select = document.getElementById('inventoryCitySelect');
    if (select) select.value = city;

    loadInventoryData();
}

function loadInventoryData() {
    const tbody = document.getElementById('inventoryTableBody');
    tbody.innerHTML = '';

    let totalCost = 0;
    let totalPrice = 0;

    appData.products.forEach((product, index) => {
        const stock = product.stock && product.stock[selectedInventoryCity] 
            ? product.stock[selectedInventoryCity]
            : 0;
        const cost = product.cost || 0;
        const price = product.price || 0;
        const costTotal = stock * cost;
        const priceTotal = stock * price;

        totalCost += costTotal;
        totalPrice += priceTotal;

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${index + 1}</td>
            <td style="width: 60px;">
                ${product.image ? `<img src="${product.image}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px;">` : '—'}
            </td>
            <td>
                <input type="text" class="inventory-inline-input inventory-code" placeholder="Código">
            </td>
            <td>
                <input type="text" class="inventory-inline-input inventory-description" placeholder="Descripción" required>
            </td>
            <td>
                <input type="number" class="inventory-inline-input inventory-stock" min="0" step="0.01">
            </td>
            <td>
                <input type="number" class="inventory-inline-input inventory-cost" min="0" step="0.01">
            </td>
            <td>
                <input type="number" class="inventory-inline-input inventory-price" min="0" step="0.01">
            </td>
            <td>Bs ${costTotal.toFixed(2)}</td>
            <td>Bs ${priceTotal.toFixed(2)}</td>
            <td style="white-space: nowrap;">
                <button class="btn-action-icon btn-action-success" onclick="saveInventoryRowChanges(${index}, this)" title="Guardar cambios">💾</button>
                <button class="btn-action-icon btn-action-danger" onclick="deleteProductFromInventory(${index})" title="Eliminar">🗑️</button>
            </td>
        `;

        row.querySelector('.inventory-code').value = product.code || '';
        row.querySelector('.inventory-description').value = product.description || '';
        row.querySelector('.inventory-stock').value = stock.toFixed(2);
        row.querySelector('.inventory-cost').value = cost.toFixed(2);
        row.querySelector('.inventory-price').value = price.toFixed(2);

        // Agregar listeners para detectar cambios
        const saveButton = row.querySelector('.btn-action-success');
        const inputs = row.querySelectorAll('.inventory-inline-input');
        
        inputs.forEach(input => {
            input.addEventListener('input', () => {
                if (saveButton && !saveButton.classList.contains('btn-action-modified')) {
                    saveButton.classList.add('btn-action-modified');
                    saveButton.title = '¡Hay cambios sin guardar!';
                }
            });
        });

        tbody.appendChild(row);
    });

    // Actualizar totales
    document.getElementById('totalCostInventory').textContent = `Bs ${totalCost.toFixed(2)}`;
    document.getElementById('totalPriceInventory').textContent = `Bs ${totalPrice.toFixed(2)}`;
}

async function saveInventoryRowChanges(index, buttonElement) {
    const row = buttonElement.closest('tr');
    const product = appData.products[index];

    if (!row || !product) {
        return;
    }

    const code = row.querySelector('.inventory-code').value.trim();
    const description = row.querySelector('.inventory-description').value.trim();
    const stockValue = parseFloat(row.querySelector('.inventory-stock').value);
    const costValue = parseFloat(row.querySelector('.inventory-cost').value);
    const priceValue = parseFloat(row.querySelector('.inventory-price').value);

    if (!description) {
        alert('La descripción es obligatoria');
        return;
    }

    const stock = Math.max(0, isNaN(stockValue) ? 0 : stockValue);
    const cost = Math.max(0, isNaN(costValue) ? 0 : costValue);
    const price = Math.max(0, isNaN(priceValue) ? 0 : priceValue);

    product.code = code;
    product.description = description;
    product.cost = cost;
    product.price = price;

    // Asegurar que existe el objeto stock
    if (!product.stock) {
        product.stock = {};
    }
    
    // Actualizar el stock del inventario seleccionado
    product.stock[selectedInventoryCity] = stock;

    if (appData.currentProduct && appData.currentProduct.id === product.id) {
        appData.currentProduct = product;
    }

    buttonElement.disabled = true;
    const previousText = buttonElement.textContent;
    buttonElement.textContent = '⏳';

    // Remover clase de modificado
    buttonElement.classList.remove('btn-action-modified');
    buttonElement.title = 'Guardando...';

    let saveOk = false;
    try {
        await saveData();
        saveOk = true;
    } catch (error) {
        console.error('Error al guardar cambios del inventario:', error);
    }

    // Siempre recargar la tabla para reflejar el estado real de appData en memoria
    loadInventoryData();

    if (!saveOk) {
        alert('No se pudo guardar los cambios en la nube. Los datos se conservan localmente y se sincronizarán en la próxima sesión.');
    }
}

function deleteProductFromInventory(index) {
    const product = appData.products[index];
    if (confirm(`¿Eliminar el producto "${product.description}"?`)) {
        appData.products.splice(index, 1);
        saveData();
        loadInventoryData();
    }
}

function generateInventoryPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    let yPos = margin;

    // Header - Logo y datos de empresa
    if (appData.company.logo) {
        try {
            doc.addImage(appData.company.logo, 'JPEG', margin, yPos, 30, 30);
        } catch (e) {
            // Logo no disponible
        }
    }

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(appData.company.name, margin + 35, yPos + 8);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(appData.company.slogan || '', margin + 35, yPos + 15);
    
    if (appData.company.nit) {
        doc.text(`NIT: ${appData.company.nit}`, margin + 35, yPos + 21);
    }

    // Título del documento
    yPos += 40;
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    const cityTitle = selectedInventoryCity === 'cochabamba' ? 'COCHABAMBA' : 'SANTA CRUZ';
    doc.text(`INVENTARIO DE PRODUCTOS - ${cityTitle}`, pageWidth / 2, yPos, { align: 'center' });

    // Fecha
    yPos += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const fecha = new Date().toLocaleDateString('es-ES', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
    doc.text(`Fecha: ${fecha}`, pageWidth / 2, yPos, { align: 'center' });

    // Calcular totales
    let totalCost = 0;
    let totalPrice = 0;
    appData.products.forEach(product => {
        const stock = selectedInventoryCity === 'cochabamba' 
            ? (product.stockCochabamba || 0) 
            : (product.stockSantaCruz || 0);
        const cost = product.cost || 0;
        const price = product.price || 0;
        totalCost += stock * cost;
        totalPrice += stock * price;
    });

    // Totales en recuadros
    yPos += 12;
    const boxWidth = 80;
    const boxHeight = 20;
    const centerX = pageWidth / 2;

    // Cuadro de costo total
    doc.setFillColor(231, 76, 60);
    doc.rect(centerX - boxWidth - 5, yPos, boxWidth, boxHeight, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.text('COSTO TOTAL INVENTARIO', centerX - boxWidth / 2 - 5, yPos + 7, { align: 'center' });
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`Bs ${totalCost.toFixed(2)}`, centerX - boxWidth / 2 - 5, yPos + 15, { align: 'center' });

    // Cuadro de precio total
    doc.setFillColor(39, 174, 96);
    doc.rect(centerX + 5, yPos, boxWidth, boxHeight, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('PRECIO TOTAL INVENTARIO', centerX + boxWidth / 2 + 5, yPos + 7, { align: 'center' });
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`Bs ${totalPrice.toFixed(2)}`, centerX + boxWidth / 2 + 5, yPos + 15, { align: 'center' });

    // Tabla de productos
    yPos += boxHeight + 10;
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');

    // Encabezado de tabla
    doc.setFillColor(112, 55, 205);
    doc.rect(margin, yPos, pageWidth - 2 * margin, 8, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    
    const colWidths = {
        code: 18,
        desc: 45,
        stock: 18,
        cost: 22,
        price: 22,
        costTotal: 26,
        priceTotal: 26
    };

    let xPos = margin + 2;
    doc.text('Código', xPos, yPos + 5);
    xPos += colWidths.code;
    doc.text('Descripción', xPos, yPos + 5);
    xPos += colWidths.desc;
    doc.text('Stock', xPos, yPos + 5);
    xPos += colWidths.stock;
    doc.text('Costo U.', xPos, yPos + 5);
    xPos += colWidths.cost;
    doc.text('Precio U.', xPos, yPos + 5);
    xPos += colWidths.price;
    doc.text('Costo Tot.', xPos, yPos + 5);
    xPos += colWidths.costTotal;
    doc.text('Precio Tot.', xPos, yPos + 5);

    yPos += 10;
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);

    // Productos
    appData.products.forEach((product, index) => {
        if (yPos > pageHeight - 30) {
            doc.addPage();
            yPos = margin;
        }

        const stock = selectedInventoryCity === 'cochabamba' 
            ? (product.stockCochabamba || 0) 
            : (product.stockSantaCruz || 0);
        const cost = product.cost || 0;
        const price = product.price || 0;
        const costTotal = stock * cost;
        const priceTotal = stock * price;

        xPos = margin + 2;
        doc.text(product.code || '—', xPos, yPos);
        xPos += colWidths.code;
        
        const description = product.description;
        if (description.length > 22) {
            doc.text(description.substring(0, 22) + '...', xPos, yPos);
        } else {
            doc.text(description, xPos, yPos);
        }
        xPos += colWidths.desc;
        
        doc.text(stock.toFixed(2), xPos, yPos);
        xPos += colWidths.stock;
        doc.text(cost.toFixed(2), xPos, yPos);
        xPos += colWidths.cost;
        doc.text(price.toFixed(2), xPos, yPos);
        xPos += colWidths.price;
        doc.text(costTotal.toFixed(2), xPos, yPos);
        xPos += colWidths.costTotal;
        doc.text(priceTotal.toFixed(2), xPos, yPos);

        yPos += 7;

        // Línea separadora
        if (index < appData.products.length - 1) {
            doc.setDrawColor(220, 220, 220);
            doc.line(margin, yPos - 2, pageWidth - margin, yPos - 2);
        }
    });

    // Guardar PDF
    const cityName = selectedInventoryCity === 'cochabamba' ? 'Cochabamba' : 'SantaCruz';
    const fileName = `Inventario_${cityName}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
}

// Exponer funciones globalmente
window.openInventory = openInventory;
window.filterInventoryByCity = filterInventoryByCity;
window.loadInventoryData = loadInventoryData;
window.saveInventoryRowChanges = saveInventoryRowChanges;
window.deleteProductFromInventory = deleteProductFromInventory;
window.generateInventoryPDF = generateInventoryPDF;
