// ==================== GESTIÓN DE VENTAS ====================

let selectedSalesCity = 'cochabamba';

function openSales() {
    // Si es vendedor, establecer su ciudad automáticamente
    if (appData.userRole === 'vendedor' && appData.loggedSeller) {
        selectedSalesCity = appData.loggedSeller.city;
    } else {
        selectedSalesCity = 'cochabamba';
    }
    
    // Establecer mes actual por defecto
    const today = new Date();
    const currentMonth = today.toISOString().slice(0, 7);
    document.getElementById('salesMonthFilter').value = currentMonth;
    
    filterSalesByMonth();
    openModal('salesModal');
    
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
    document.querySelectorAll('.city-filter-sales').forEach(btn => {
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
        totalCost += saleCost;
        totalPrice += salePrice;

        // Resumen de productos
        const productCount = sale.items ? sale.items.length : 0;
        const productSummary = `${productCount} producto${productCount !== 1 ? 's' : ''}`;

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
            <td>
                <button class="btn btn-delete" onclick="deleteSale(${sale.id})" style="background: #e74c3c; color: white; padding: 6px 12px; font-size: 12px;">Eliminar</button>
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
async function deleteSale(saleId) {
    if (confirm('¿Está seguro de eliminar esta venta?')) {
        appData.pdfHistory = appData.pdfHistory.filter(entry => entry.id !== saleId);
        await saveData();
        filterSalesByMonth();
    }
}

// Exponer funciones globalmente
window.openSales = openSales;
window.filterSalesByCity = filterSalesByCity;
window.filterSalesByMonth = filterSalesByMonth;
window.generateSalesPDF = generateSalesPDF;
window.showAllSales = showAllSales;
window.deleteSale = deleteSale;

function showAllSales() {
    document.getElementById('salesMonthFilter').value = '';
    filterSalesByMonth();
}
