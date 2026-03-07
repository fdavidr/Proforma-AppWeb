// ==================== GESTIÓN DE VENTAS ====================

let selectedSalesCity = 'cochabamba';

// Generar botones de filtro de ciudad dinámicamente
function generateSalesCityFilterButtons() {
    const container = document.getElementById('salesCityFilterButtons');
    if (!container) return;
    
    container.innerHTML = '';
    
    appData.inventories.forEach((inventory, index) => {
        const button = document.createElement('button');
        button.className = 'btn-filter-inventory' + (index === 0 ? ' active' : '');
        button.dataset.city = inventory.id;
        button.onclick = () => filterSalesByCity(inventory.id);
        button.textContent = inventory.name;
        container.appendChild(button);
    });
}

function openSales() {
    // Generar botones de filtro de ciudad
    generateSalesCityFilterButtons();
    
    // Si es vendedor, establecer su ciudad automáticamente
    if (appData.userRole === 'vendedor' && appData.loggedSeller) {
        selectedSalesCity = appData.loggedSeller.city;
    } else {
        selectedSalesCity = appData.inventories.length > 0 ? appData.inventories[0].id : 'cochabamba';
    }
    
    // Establecer mes actual por defecto
    const today = new Date();
    const currentMonth = today.toISOString().slice(0, 7);
    document.getElementById('salesMonthFilter').value = currentMonth;
    
    filterSalesByMonth();
    setActiveMenuButton('salesBtn');
    
    // Mostrar sección de ventas
    document.getElementById('mainContent').style.display = 'none';
    document.getElementById('historySection').style.display = 'none';
    document.getElementById('inventorySection').style.display = 'none';
    document.getElementById('salesSection').style.display = 'block';
    
    // Si es vendedor, bloquear botones de ciudad
    if (appData.userRole === 'vendedor' && appData.loggedSeller) {
        document.querySelectorAll('.city-filter-sales').forEach(btn => {
            btn.disabled = true;
            btn.style.opacity = '0.5';
            btn.style.cursor = 'not-allowed';
            btn.classList.remove('active');
            if (btn.dataset.city === appData.loggedSeller.city) {
                btn.classList.add('active');
            }
        });
    } else {
        // Admin puede cambiar de ciudad
        document.querySelectorAll('.city-filter-sales').forEach(btn => {
            btn.disabled = false;
            btn.style.opacity = '1';
            btn.style.cursor = 'pointer';
        });
    }
}

function filterSalesByCity(city) {
    selectedSalesCity = city;
    
    // Actualizar botones activos
    document.querySelectorAll('#salesCityFilterButtons .btn-filter-inventory').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.city === city) {
            btn.classList.add('active');
        }
    });
    
    filterSalesByMonth();
}

function filterSalesByMonth() {
    const selectedMonth = document.getElementById('salesMonthFilter').value;
    const tbody = document.getElementById('salesTableBody');
    tbody.innerHTML = '';

    // Filtrar solo notas de venta y por ciudad
    const sales = appData.pdfHistory.filter(entry => 
        entry.type === 'notaventa' && entry.city === selectedSalesCity
    );

    if (sales.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; padding: 30px; color: #7f8c8d;">No hay ventas registradas</td></tr>';
        updateSalesTotals([], []);
        return;
    }

    // Filtrar por mes si hay selección
    let filteredSales = sales;
    if (selectedMonth) {
        filteredSales = sales.filter(sale => {
            // Extraer solo la fecha de la cadena "DD/MM/YYYY, HH:MM:SS" o "DD/MM/YYYY"
            const datePart = sale.date.split(',')[0].trim(); // Obtener solo DD/MM/YYYY
            const [day, month, year] = datePart.split('/');
            const saleDate = `${year}-${month.padStart(2, '0')}`; // Formato YYYY-MM
            return saleDate === selectedMonth;
        });
    }

    if (filteredSales.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; padding: 30px; color: #7f8c8d;">No hay ventas en el mes seleccionado</td></tr>';
        updateSalesTotals([], []);
        return;
    }

    // Ordenar por fecha (más recientes primero)
    filteredSales.sort((a, b) => {
        // Convertir fecha string "DD/MM/YYYY, HH:MM:SS" a timestamp
        const parseDate = (dateStr) => {
            try {
                const parts = dateStr.split(',');
                const datePart = parts[0].trim(); // DD/MM/YYYY
                const timePart = parts[1] ? parts[1].trim() : '00:00:00'; // HH:MM:SS
                
                const [day, month, year] = datePart.split('/');
                const [hours, minutes, seconds] = timePart.split(':');
                
                // Crear objeto Date con los valores parseados
                return new Date(
                    parseInt(year),
                    parseInt(month) - 1, // Los meses en JS van de 0-11
                    parseInt(day),
                    parseInt(hours) || 0,
                    parseInt(minutes) || 0,
                    parseInt(seconds) || 0
                ).getTime();
            } catch (e) {
                return 0;
            }
        };
        
        return parseDate(b.date) - parseDate(a.date); // Orden descendente (más reciente primero)
    });

    let totalCost = 0;
    let totalPrice = 0;

    filteredSales.forEach((sale, index) => {
        const tr = document.createElement('tr');
        
        // Calcular costo y precio de esta venta
        let saleCost = 0;
        let salePrice = sale.total || 0;
        
        // Calcular costo basado en los productos de la venta
        if (sale.items && Array.isArray(sale.items)) {
            sale.items.forEach(item => {
                const product = appData.products.find(p => p.id === item.id);
                if (product && product.cost) {
                    saleCost += (product.cost * item.quantity);
                }
            });
        }
        
        const profit = salePrice - saleCost;
        
        // Solo sumar a los totales si NO está anulada
        if (!sale.cancelled) {
            totalCost += saleCost;
            totalPrice += salePrice;
        }

        // Resumen de productos
        const productCount = sale.items ? sale.items.length : 0;
        const productSummary = `${productCount} producto${productCount !== 1 ? 's' : ''}`;

        // Determinar si está anulada
        const isCancelled = sale.cancelled === true;
        const cancelButtonIcon = isCancelled ? '✅' : '❌';
        const cancelButtonText = isCancelled ? 'Validar' : 'Anular';
        const cancelButtonClass = isCancelled ? 'toggle-cancel validated' : 'toggle-cancel';
        
        // Determinar si está facturada
        const isInvoiced = sale.invoiced === true;
        const invoiceButtonIcon = isInvoiced ? '✓' : '📄';
        const invoiceButtonText = isInvoiced ? 'Facturado' : 'Marcar Facturado';
        const invoiceButtonClass = isInvoiced ? 'mark-invoiced invoiced' : 'mark-invoiced';

        tr.innerHTML = `
            <td>${index + 1}</td>
            <td>${sale.number}</td>
            <td>${sale.client.name || sale.client}</td>
            <td>${sale.seller.name || sale.seller}</td>
            <td>${productSummary}</td>
            <td style="color: #e74c3c;">Bs ${saleCost.toFixed(2)}</td>
            <td style="color: #27ae60;">Bs ${salePrice.toFixed(2)}</td>
            <td style="color: ${profit >= 0 ? '#3498db' : '#e74c3c'}; font-weight: bold;">Bs ${profit.toFixed(2)}</td>
            <td>${sale.date}</td>
            <td style="white-space: nowrap;">
                <div class="actions-menu-container">
                    <button class="btn-menu-toggle" onclick="toggleActionsMenu(event, ${sale.id})" title="Acciones">☰</button>
                    <div class="actions-dropdown" id="menu-${sale.id}">
                        <button class="view-pdf" onclick="viewSalePDF(${sale.id}); closeActionsMenu(${sale.id})">
                            👁️ Ver PDF
                        </button>
                        <button class="${cancelButtonClass}" onclick="toggleSaleCancellation(${sale.id}); closeActionsMenu(${sale.id})">
                            ${cancelButtonIcon} ${cancelButtonText}
                        </button>
                        <button class="${invoiceButtonClass}" onclick="toggleInvoiced(${sale.id}); closeActionsMenu(${sale.id})">
                            ${invoiceButtonIcon} ${invoiceButtonText}
                        </button>
                    </div>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });

    updateSalesTotals(filteredSales, [totalCost, totalPrice]);
}

function updateSalesTotals(sales, totals) {
    const [totalCost, totalPrice] = totals;
    const balance = totalPrice - totalCost;

    document.getElementById('totalCostSales').textContent = `Bs ${(totalCost || 0).toFixed(2)}`;
    document.getElementById('totalPriceSales').textContent = `Bs ${(totalPrice || 0).toFixed(2)}`;
    document.getElementById('balanceSales').textContent = `Bs ${(balance || 0).toFixed(2)}`;
    
    // Cambiar color del balance según sea positivo o negativo
    const balanceElement = document.getElementById('balanceSales');
    if (balance >= 0) {
        balanceElement.style.color = '#3498db';
    } else {
        balanceElement.style.color = '#e74c3c';
    }
}

function generateSalesPDF() {
    const selectedMonth = document.getElementById('salesMonthFilter').value;
    if (!selectedMonth) {
        alert('Seleccione un mes para generar el reporte');
        return;
    }

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
    const cityTitle = selectedSalesCity === 'cochabamba' ? 'COCHABAMBA' : 'SANTA CRUZ';
    doc.text(`REPORTE DE VENTAS - ${cityTitle}`, pageWidth / 2, yPos, { align: 'center' });

    // Mes seleccionado
    yPos += 8;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    const [year, month] = selectedMonth.split('-');
    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const monthName = monthNames[parseInt(month) - 1];
    doc.text(`Período: ${monthName} ${year}`, pageWidth / 2, yPos, { align: 'center' });

    // Filtrar ventas del mes y ciudad
    const sales = appData.pdfHistory.filter(entry => {
        if (entry.type !== 'notaventa') return false;
        if (entry.city !== selectedSalesCity) return false;
        const datePart = entry.date.split(',')[0].trim();
        const [day, month, year] = datePart.split('/');
        const saleDate = `${year}-${month.padStart(2, '0')}`;
        return saleDate === selectedMonth;
    });

    // Calcular totales
    let totalCost = 0;
    let totalPrice = 0;
    
    sales.forEach(sale => {
        let saleCost = 0;
        if (sale.items && Array.isArray(sale.items)) {
            sale.items.forEach(item => {
                const product = appData.products.find(p => p.id === item.id);
                if (product && product.cost) {
                    saleCost += (product.cost * item.quantity);
                }
            });
        }
        totalCost += saleCost;
        totalPrice += (sale.total || 0);
    });

    const balance = totalPrice - totalCost;

    // Totales en recuadros
    yPos += 12;
    const boxWidth = 55;
    const boxHeight = 18;
    const spacing = 5;
    const totalBoxesWidth = (boxWidth * 3) + (spacing * 2);
    const startX = (pageWidth - totalBoxesWidth) / 2;

    // Cuadro de costo total
    doc.setFillColor(231, 76, 60);
    doc.rect(startX, yPos, boxWidth, boxHeight, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.text('COSTO TOTAL', startX + boxWidth / 2, yPos + 6, { align: 'center' });
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`Bs ${totalCost.toFixed(2)}`, startX + boxWidth / 2, yPos + 13, { align: 'center' });

    // Cuadro de precio total
    doc.setFillColor(39, 174, 96);
    doc.rect(startX + boxWidth + spacing, yPos, boxWidth, boxHeight, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('PRECIO TOTAL', startX + boxWidth + spacing + boxWidth / 2, yPos + 6, { align: 'center' });
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`Bs ${totalPrice.toFixed(2)}`, startX + boxWidth + spacing + boxWidth / 2, yPos + 13, { align: 'center' });

    // Cuadro de balance
    doc.setFillColor(52, 152, 219);
    doc.rect(startX + (boxWidth + spacing) * 2, yPos, boxWidth, boxHeight, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('BALANCE', startX + (boxWidth + spacing) * 2 + boxWidth / 2, yPos + 6, { align: 'center' });
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`Bs ${balance.toFixed(2)}`, startX + (boxWidth + spacing) * 2 + boxWidth / 2, yPos + 13, { align: 'center' });

    // Tabla de ventas
    yPos += boxHeight + 12;
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');

    // Encabezado de tabla
    doc.setFillColor(112, 55, 205);
    doc.rect(margin, yPos, pageWidth - 2 * margin, 8, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    
    const colWidths = {
        num: 12,
        sale: 28,
        client: 50,
        vendor: 35,
        products: 20,
        cost: 28,
        price: 28,
        date: 28
    };

    let xPos = margin + 2;
    doc.text('#', xPos, yPos + 5);
    xPos += colWidths.num;
    doc.text('Nº Venta', xPos, yPos + 5);
    xPos += colWidths.sale;
    doc.text('Cliente', xPos, yPos + 5);
    xPos += colWidths.client;
    doc.text('Vendedor', xPos, yPos + 5);
    xPos += colWidths.vendor;
    doc.text('Prods', xPos, yPos + 5);
    xPos += colWidths.products;
    doc.text('Costo', xPos, yPos + 5);
    xPos += colWidths.cost;
    doc.text('Precio', xPos, yPos + 5);
    xPos += colWidths.price;
    doc.text('Fecha', xPos, yPos + 5);

    yPos += 10;
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);

    // Ventas
    sales.forEach((sale, index) => {
        if (yPos > pageHeight - 30) {
            doc.addPage();
            yPos = margin;
        }

        let saleCost = 0;
        if (sale.items && Array.isArray(sale.items)) {
            sale.items.forEach(item => {
                const product = appData.products.find(p => p.id === item.id);
                if (product && product.cost) {
                    saleCost += (product.cost * item.quantity);
                }
            });
        }
        
        const salePrice = sale.total || 0;
        const productCount = sale.items ? sale.items.length : 0;

        xPos = margin + 2;
        doc.text(`${index + 1}`, xPos, yPos);
        xPos += colWidths.num;
        doc.text(sale.number.toString(), xPos, yPos);
        xPos += colWidths.sale;
        
        const clientName = sale.client.name || sale.client;
        doc.text(clientName.length > 25 ? clientName.substring(0, 25) + '...' : clientName, xPos, yPos);
        xPos += colWidths.client;
        
        const vendorName = sale.seller.name || sale.seller;
        doc.text(vendorName.length > 18 ? vendorName.substring(0, 18) + '...' : vendorName, xPos, yPos);
        xPos += colWidths.vendor;
        
        doc.text(productCount.toString(), xPos, yPos);
        xPos += colWidths.products;
        xPos += colWidths.price;
        doc.text(sale.date, xPos, yPos);

        yPos += 7;

        // Línea separadora
        if (index < sales.length - 1) {
            doc.setDrawColor(220, 220, 220);
            doc.line(margin, yPos - 2, pageWidth - margin, yPos - 2);
        }
    });

    // Resumen final
    yPos += 10;
    if (yPos > pageHeight - 40) {
        doc.addPage();
        yPos = margin;
    }

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`Total de Ventas: ${sales.length}`, margin, yPos);
    yPos += 7;
    doc.text(`Costo Total: Bs ${totalCost.toFixed(2)}`, margin, yPos);
    yPos += 7;
    doc.text(`Ingreso Total: Bs ${totalPrice.toFixed(2)}`, margin, yPos);
    yPos += 7;
    doc.text(`Ganancia Neta: Bs ${balance.toFixed(2)}`, margin, yPos);

    // Guardar PDF
    const cityName = selectedSalesCity === 'cochabamba' ? 'Cochabamba' : 'SantaCruz';
    const fileName = `Reporte_Ventas_${cityName}_${monthName}_${year}.pdf`;
    doc.save(fileName);
}

// Función para eliminar una venta
async function toggleSaleCancellation(saleId) {
    // Buscar la venta
    const sale = appData.pdfHistory.find(entry => entry.id === saleId);
    if (!sale) {
        alert('No se encontró la venta');
        return;
    }
    
    const isCancelled = sale.cancelled === true;
    
    if (isCancelled) {
        // VALIDAR (restaurar) la venta
        if (confirm('¿Está seguro de validar (restaurar) esta venta? Se descontará nuevamente el stock de los productos.')) {
            // Descontar stock de los productos según la ciudad de la venta
            if (sale.items && Array.isArray(sale.items)) {
                sale.items.forEach(item => {
                    const product = appData.products.find(p => p.id === item.id);
                    if (product && product.stock) {
                        // Descontar stock del inventario correspondiente
                        const currentStock = product.stock[sale.city] || 0;
                        product.stock[sale.city] = Math.max(0, currentStock - item.quantity);
                    }
                });
            }
            
            // Marcar como NO anulada
            sale.cancelled = false;
            await saveData();
            filterSalesByMonth();
        }
    } else {
        // ANULAR la venta
        if (confirm('¿Está seguro de anular esta venta? Se repondrá el stock de los productos.')) {
            // Reponer stock de los productos según la ciudad de la venta
            if (sale.items && Array.isArray(sale.items)) {
                sale.items.forEach(item => {
                    const product = appData.products.find(p => p.id === item.id);
                    if (product && product.stock) {
                        // Reponer stock del inventario correspondiente
                        const currentStock = product.stock[sale.city] || 0;
                        product.stock[sale.city] = currentStock + item.quantity;
                    }
                });
            }
            
            // Marcar como anulada
            sale.cancelled = true;
            await saveData();
            filterSalesByMonth();
        }
    }
}

// Función para ver el PDF de una venta
function viewSalePDF(saleId) {
    try {
        const sale = appData.pdfHistory.find(e => e.id === saleId);
        if (!sale) {
            alert('No se encontró la venta');
            return;
        }

        const company = sale.company || {};
        const client = typeof sale.client === 'object' ? sale.client : { name: sale.client };
        const seller = typeof sale.seller === 'object' ? sale.seller : { name: sale.seller };
        const items = Array.isArray(sale.items) ? sale.items : [];

        // Regenerar PDF con los datos guardados
        const { jsPDF } = window.jspdf;
        if (!jsPDF) {
            alert('Error: jsPDF no está cargado');
            return;
        }
        
        const doc = new jsPDF();
    
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 10;
    let yPos = margin;
    const docTitle = 'NOTA DE VENTA';

    // Header
    doc.setTextColor(0, 0, 0);
    if (company.logo) {
        try {
            doc.addImage(company.logo, 'PNG', margin, yPos - 4, 30, 30);
        } catch (e) {}
    }

    const infoX = margin + (company.logo ? 35 : 0);
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.text((company.name || '').toUpperCase(), infoX, yPos + 6);

    doc.setFontSize(10);
    doc.setFont(undefined, 'italic');
    doc.text((company.slogan || '').toUpperCase(), infoX, yPos + 13);

    if (company.nit) {
        doc.setFont(undefined, 'normal');
        doc.text('NIT: ' + company.nit.toUpperCase(), infoX, yPos + 20);
    }

    let headerHeight = company.logo ? (company.nit ? 30 : 28) : (company.nit ? 24 : 12);
    yPos += headerHeight;

    // Tipo de documento y número
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text(docTitle, pageWidth - margin, 20, { align: 'right' });
    doc.setFontSize(12);
    doc.text('Nº ' + sale.number, pageWidth - margin, 27, { align: 'right' });
    doc.setFontSize(10);
    doc.text('Fecha: ' + sale.date, pageWidth - margin, 34, { align: 'right' });

    // Ciudad
    if (sale.city) {
        const inventory = appData.inventories.find(inv => inv.id === sale.city);
        const cityName = inventory ? inventory.name.toUpperCase() : sale.city.toUpperCase();
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text(cityName, pageWidth - margin, 41, { align: 'right' });
    }

    // Línea separadora
    doc.setLineWidth(0.5);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 8;

    // Cliente
    doc.setFont(undefined, 'bold');
    doc.text('CLIENTE:', margin, yPos);
    doc.setFont(undefined, 'normal');
    doc.text((client.name || '').toUpperCase(), margin + 25, yPos);
    
    if (client.ci) {
        doc.setFont(undefined, 'bold');
        const ciNitText = 'CI/NIT: ';
        const ciValue = client.ci.toUpperCase();
        const ciNitWidth = doc.getTextWidth(ciNitText);
        doc.text(ciNitText, pageWidth - margin - doc.getTextWidth(ciValue) - ciNitWidth, yPos);
        doc.setFont(undefined, 'normal');
        doc.text(ciValue, pageWidth - margin, yPos, { align: 'right' });
    }
    yPos += 6;

    if (client.company) {
        doc.setFont(undefined, 'bold');
        doc.text('Empresa:', margin, yPos);
        doc.setFont(undefined, 'normal');
        doc.text(client.company.toUpperCase(), margin + 25, yPos);
        yPos += 6;
    }

    if (client.phone) {
        doc.setFont(undefined, 'bold');
        doc.text('Teléfono:', margin, yPos);
        doc.setFont(undefined, 'normal');
        doc.text(client.phone.toUpperCase(), margin + 25, yPos);
        yPos += 6;
    }

    yPos += 3;

    // Vendedor
    doc.setFont(undefined, 'bold');
    doc.text('VENDEDOR:', margin, yPos);
    doc.setFont(undefined, 'normal');
    doc.text((seller.name || '').toUpperCase(), margin + 25, yPos);
    if (seller.phone) {
        doc.text('Tel: ' + seller.phone.toUpperCase(), margin + 80, yPos);
    }
    yPos += 8;

    // Tabla de productos
    doc.setFont(undefined, 'bold');
    doc.setFillColor(112, 55, 205);
    doc.rect(margin, yPos, pageWidth - 2 * margin, 7, 'FD');
    
    doc.setTextColor(255, 255, 255);
    doc.text('#', margin + 2, yPos + 5);
    doc.text('Código', margin + 8, yPos + 5);
    doc.text('IMG', margin + 26, yPos + 5);
    doc.text('Descripción', margin + 52, yPos + 5);
    doc.text('Cant.', margin + 108, yPos + 5);
    doc.text('P.Unit.', margin + 122, yPos + 5);
    doc.text('Desc.', margin + 147, yPos + 5);
    doc.text('Subtotal', pageWidth - margin - 2, yPos + 5, { align: 'right' });
    
    yPos += 10;
    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, 'normal');

    const tableLeft = margin;
    const tableRight = pageWidth - margin;
    let subtotal = 0;
    let totalDiscount = 0;

    items.forEach((item, idx) => {
        if (yPos > pageHeight - 50) {
            doc.addPage();
            yPos = margin + 20;
        }

        const itemSubtotal = item.price * item.quantity;
        const itemDiscount = item.discountType === '%' ? 
            (itemSubtotal * item.discount / 100) : 
            item.discount;
        const itemTotal = itemSubtotal - itemDiscount;

        subtotal += itemSubtotal;
        totalDiscount += itemDiscount;

        // Acceder a los datos del producto (puede estar en item.product o directamente en item)
        const product = item.product || item;
        const productCode = (product.code || '').toUpperCase();
        const productDescription = (product.description || '').toUpperCase();
        const productImage = product.image || null;

        // Procesar descripción con splitTextToSize
        const descLines = doc.splitTextToSize(productDescription, 56);
        const rowHeight = Math.max(10, descLines.length * 5, productImage ? 28 : 10);
        const textYCenter = yPos + (rowHeight / 2);

        // Número y código
        doc.text(String(idx + 1), margin + 2, textYCenter);
        doc.text(productCode || '-', margin + 8, textYCenter);

        // Imagen del producto
        if (productImage) {
            try {
                const imgHeight = 24;
                const imgY = yPos + (rowHeight / 2) - (imgHeight / 2) - 2;
                doc.addImage(productImage, 'PNG', margin + 26, imgY, 24, imgHeight);
            } catch (e) {
                console.log('Error al cargar imagen:', e);
            }
        }

        // Descripción (centrada verticalmente)
        const descHeight = descLines.length * 5;
        const descYStart = yPos + (rowHeight / 2) - (descHeight / 2) + 2;
        doc.text(descLines, margin + 52, descYStart);

        // Cantidad, precio, descuento y total
        doc.text(String(item.quantity), margin + 108, textYCenter);
        doc.text(`Bs ${item.price.toFixed(2)}`, margin + 122, textYCenter);
        
        const discountText = item.discountType === '%' ? 
            `${item.discount}%` : 
            `Bs ${item.discount.toFixed(2)}`;
        doc.text(discountText, margin + 147, textYCenter);
        doc.text(`Bs ${itemTotal.toFixed(2)}`, pageWidth - margin - 2, textYCenter, { align: 'right' });

        // Líneas de la tabla
        doc.setDrawColor(200, 200, 200);
        doc.line(tableLeft, yPos + rowHeight, tableRight, yPos + rowHeight);
        doc.line(tableLeft, yPos, tableLeft, yPos + rowHeight);
        doc.line(tableRight, yPos, tableRight, yPos + rowHeight);
        
        // Líneas verticales entre columnas
        doc.line(margin + 6, yPos, margin + 6, yPos + rowHeight);
        doc.line(margin + 25, yPos, margin + 25, yPos + rowHeight);
        doc.line(margin + 51, yPos, margin + 51, yPos + rowHeight);
        doc.line(margin + 107, yPos, margin + 107, yPos + rowHeight);
        doc.line(margin + 120, yPos, margin + 120, yPos + rowHeight);
        doc.line(margin + 145, yPos, margin + 145, yPos + rowHeight);
        doc.line(margin + 160, yPos, margin + 160, yPos + rowHeight);

        yPos += rowHeight;
    });

    // Borde final de la tabla
    doc.setDrawColor(0, 0, 0);
    doc.line(tableLeft, yPos, tableRight, yPos);

    // Totales
    yPos += 8;

    const totalsX = pageWidth - margin - 50;
    doc.setFont(undefined, 'normal');
    doc.setFontSize(10);
    doc.text('Subtotal:', totalsX, yPos);
    doc.text(`Bs ${subtotal.toFixed(2)}`, pageWidth - margin - 2, yPos, { align: 'right' });
    yPos += 6;

    doc.text('Descuento:', totalsX, yPos);
    doc.text(`Bs ${totalDiscount.toFixed(2)}`, pageWidth - margin - 2, yPos, { align: 'right' });
    yPos += 8;

    doc.setFont(undefined, 'bold');
    doc.setFontSize(12);
    doc.text('TOTAL:', totalsX, yPos);
    doc.text(`Bs ${sale.total.toFixed(2)}`, pageWidth - margin - 2, yPos, { align: 'right' });

    // Términos y condiciones
    if (sale.terms && sale.terms.length > 0) {
        yPos += 12;
        doc.setFontSize(10);
        doc.setFont(undefined, 'bold');
        doc.text('Términos y Condiciones:', margin, yPos);
        yPos += 6;

        doc.setFont(undefined, 'normal');
        doc.setFontSize(9);
        sale.terms.forEach((term, idx) => {
            if (term && term.trim()) {
                doc.text(`${idx + 1}. ${term}`, margin + 3, yPos);
                yPos += 5;
            }
        });
    }

    // Si la venta está anulada, agregar sello de "ANULADO"
    if (sale.cancelled === true) {
        // Guardar configuración actual
        const currentFontSize = doc.internal.getFontSize();
        
        // Configurar color rojo con transparencia simulada
        doc.setTextColor(255, 200, 200);
        
        // Configurar fuente grande y negrita
        doc.setFontSize(70);
        doc.setFont(undefined, 'bold');
        
        // Calcular centro de la página
        const centerX = pageWidth / 2;
        const centerY = pageHeight / 2;
        
        // Dibujar texto rotado
        const textWidth = doc.getTextWidth('ANULADO');
        
        // Rotar el contexto y dibujar
        doc.text('ANULADO', centerX, centerY, {
            align: 'center',
            angle: 45
        });
        
        // Restaurar color negro
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(currentFontSize);
    }
    
    // Si la venta está facturada, agregar sello de "FACTURADO"
    if (sale.invoiced === true) {
        // Guardar configuración actual
        const currentFontSize = doc.internal.getFontSize();
        
        // Configurar color verde con transparencia simulada
        doc.setTextColor(200, 255, 200);
        
        // Configurar fuente grande y negrita
        doc.setFontSize(70);
        doc.setFont(undefined, 'bold');
        
        // Calcular centro de la página
        const centerX = pageWidth / 2;
        const centerY = pageHeight / 2;
        
        // Dibujar texto rotado
        const textWidth = doc.getTextWidth('FACTURADO');
        
        // Rotar el contexto y dibujar
        doc.text('FACTURADO', centerX, centerY, {
            align: 'center',
            angle: 45
        });
        
        // Restaurar color negro
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(currentFontSize);
    }

    doc.save(`Nota_Venta_${sale.number}.pdf`);
    
    } catch (error) {
        console.error('Error al generar PDF de venta:', error);
        alert('Error al generar el PDF: ' + error.message);
    }
}

// ==================== FUNCIONES MENU DESPLEGABLE ====================
function toggleActionsMenu(event, saleId) {
    event.stopPropagation();
    
    // Cerrar todos los demás menús
    document.querySelectorAll('.actions-dropdown').forEach(menu => {
        if (menu.id !== `menu-${saleId}`) {
            menu.classList.remove('show');
        }
    });
    
    // Toggle del menú actual
    const menu = document.getElementById(`menu-${saleId}`);
    if (menu) {
        menu.classList.toggle('show');
    }
}

function closeActionsMenu(saleId) {
    const menu = document.getElementById(`menu-${saleId}`);
    if (menu) {
        menu.classList.remove('show');
    }
}

// Cerrar menús al hacer clic fuera
document.addEventListener('click', function(event) {
    if (!event.target.closest('.actions-menu-container')) {
        document.querySelectorAll('.actions-dropdown').forEach(menu => {
            menu.classList.remove('show');
        });
    }
});

// Función para marcar/desmarcar como facturado
async function toggleInvoiced(saleId) {
    const sale = appData.pdfHistory.find(entry => entry.id === saleId);
    if (!sale) {
        alert('No se encontró la venta');
        return;
    }
    
    const isInvoiced = sale.invoiced === true;
    
    if (isInvoiced) {
        if (confirm('¿Desmarcar esta venta como facturada?')) {
            sale.invoiced = false;
            await saveData();
            filterSalesByMonth();
        }
    } else {
        if (confirm('¿Marcar esta venta como facturada?')) {
            sale.invoiced = true;
            await saveData();
            filterSalesByMonth();
        }
    }
}

// Exponer funciones globalmente
window.openSales = openSales;
window.filterSalesByCity = filterSalesByCity;
window.filterSalesByMonth = filterSalesByMonth;
window.generateSalesPDF = generateSalesPDF;
window.showAllSales = showAllSales;
window.toggleSaleCancellation = toggleSaleCancellation;
window.viewSalePDF = viewSalePDF;
window.toggleActionsMenu = toggleActionsMenu;
window.closeActionsMenu = closeActionsMenu;
window.toggleInvoiced = toggleInvoiced;

function showAllSales() {
    document.getElementById('salesMonthFilter').value = '';
    filterSalesByMonth();
}
