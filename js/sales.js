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

    // Ordenar por fecha (más recientes primero)
    filteredSales.sort((a, b) => {
        // Usar el ID que es timestamp para ordenar (más confiable que parsear fecha)
        return b.id - a.id; // Orden descendente (más reciente primero)
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
            <td style="display: flex; gap: 5px;">
                <button class="btn btn-primary" onclick="viewSalePDF(${sale.id})" style="background: #3498db; color: white; padding: 6px 12px; font-size: 12px;">Ver PDF</button>
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
    if (confirm('¿Está seguro de eliminar esta venta? Se repondrá el stock de los productos.')) {
        // Buscar la venta a eliminar
        const sale = appData.pdfHistory.find(entry => entry.id === saleId);
        if (!sale) {
            alert('No se encontró la venta');
            return;
        }
        
        // Reponer stock de los productos según la ciudad de la venta
        if (sale.items && Array.isArray(sale.items)) {
            sale.items.forEach(item => {
                const product = appData.products.find(p => p.id === item.id);
                if (product) {
                    // Reponer stock según la ciudad
                    if (sale.city === 'cochabamba') {
                        product.stockCochabamba = (product.stockCochabamba || 0) + item.quantity;
                    } else if (sale.city === 'santacruz') {
                        product.stockSantaCruz = (product.stockSantaCruz || 0) + item.quantity;
                    }
                }
            });
        }
        
        // Eliminar la venta del historial
        appData.pdfHistory = appData.pdfHistory.filter(entry => entry.id !== saleId);
        await saveData();
        filterSalesByMonth();
    }
}

// Función para ver el PDF de una venta
function viewSalePDF(saleId) {
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
    doc.text(company.name || '', infoX, yPos + 6);

    doc.setFontSize(10);
    doc.setFont(undefined, 'italic');
    doc.text(company.slogan || '', infoX, yPos + 13);

    if (company.nit) {
        doc.setFont(undefined, 'normal');
        doc.text('NIT: ' + company.nit, infoX, yPos + 20);
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
    const cityName = sale.city === 'cochabamba' ? 'COCHABAMBA' : 'SANTA CRUZ';
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text(cityName, pageWidth - margin, 41, { align: 'right' });

    // Línea separadora
    doc.setLineWidth(0.5);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 8;

    // Cliente
    doc.setFont(undefined, 'bold');
    doc.text('CLIENTE:', margin, yPos);
    doc.setFont(undefined, 'normal');
    doc.text(client.name || '', margin + 25, yPos);
    
    if (client.ci) {
        doc.setFont(undefined, 'bold');
        const ciNitText = 'CI/NIT: ';
        const ciNitWidth = doc.getTextWidth(ciNitText);
        doc.text(ciNitText, pageWidth - margin - doc.getTextWidth(client.ci) - ciNitWidth, yPos);
        doc.setFont(undefined, 'normal');
        doc.text(client.ci, pageWidth - margin, yPos, { align: 'right' });
    }
    yPos += 6;

    if (client.company) {
        doc.setFont(undefined, 'bold');
        doc.text('Empresa:', margin, yPos);
        doc.setFont(undefined, 'normal');
        doc.text(client.company, margin + 25, yPos);
        yPos += 6;
    }

    if (client.phone) {
        doc.setFont(undefined, 'bold');
        doc.text('Teléfono:', margin, yPos);
        doc.setFont(undefined, 'normal');
        doc.text(client.phone, margin + 25, yPos);
        yPos += 6;
    }

    yPos += 3;

    // Vendedor
    doc.setFont(undefined, 'bold');
    doc.text('VENDEDOR:', margin, yPos);
    doc.setFont(undefined, 'normal');
    doc.text(seller.name || '', margin + 25, yPos);
    if (seller.phone) {
        doc.text('Tel: ' + seller.phone, margin + 80, yPos);
    }
    yPos += 8;

    // Tabla de productos
    doc.setFont(undefined, 'bold');
    doc.setFillColor(112, 55, 205);
    doc.rect(margin, yPos, pageWidth - 2 * margin, 7, 'FD');
    
    doc.setTextColor(255, 255, 255);
    doc.text('#', margin + 2, yPos + 5);
    doc.text('Código', margin + 8, yPos + 5);
    doc.text('IMG', margin + 28, yPos + 5);
    doc.text('Descripción', margin + 52, yPos + 5);
    doc.text('Cant.', margin + 108, yPos + 5);
    doc.text('P.Unit.', margin + 122, yPos + 5);
    doc.text('Desc.', margin + 147, yPos + 5);
    doc.text('Subtotal', pageWidth - margin - 2, yPos + 5, { align: 'right' });
    
    yPos += 10;
    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, 'normal');

    let subtotal = 0;
    let totalDiscount = 0;

    items.forEach((item, idx) => {
        if (yPos > pageHeight - 40) {
            doc.addPage();
            yPos = margin;
        }

        const itemSubtotal = item.price * item.quantity;
        const itemDiscount = item.discountType === '%' ? 
            (itemSubtotal * item.discount / 100) : 
            item.discount;
        const itemTotal = itemSubtotal - itemDiscount;

        subtotal += itemSubtotal;
        totalDiscount += itemDiscount;

        doc.text(String(idx + 1), margin + 2, yPos);
        doc.text(item.code || '-', margin + 8, yPos);

        if (item.image) {
            try {
                doc.addImage(item.image, 'PNG', margin + 28, yPos - 3, 8, 8);
            } catch (e) {}
        }

        const desc = item.description.length > 40 ? item.description.substring(0, 40) + '...' : item.description;
        doc.text(desc, margin + 40, yPos);
        doc.text(String(item.quantity), margin + 108, yPos);
        doc.text(`Bs ${item.price.toFixed(2)}`, margin + 122, yPos);
        
        const discountText = item.discountType === '%' ? 
            `${item.discount}%` : 
            `Bs ${item.discount.toFixed(2)}`;
        doc.text(discountText, margin + 147, yPos);
        doc.text(`Bs ${itemTotal.toFixed(2)}`, pageWidth - margin - 2, yPos, { align: 'right' });

        yPos += 10;
    });

    // Totales
    yPos += 5;
    doc.setLineWidth(0.3);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 7;

    const totalsX = pageWidth - margin - 50;
    doc.setFont(undefined, 'normal');
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

    doc.save(`Nota_Venta_${sale.number}.pdf`);
}

// Exponer funciones globalmente
window.openSales = openSales;
window.filterSalesByCity = filterSalesByCity;
window.filterSalesByMonth = filterSalesByMonth;
window.generateSalesPDF = generateSalesPDF;
window.showAllSales = showAllSales;
window.deleteSale = deleteSale;
window.viewSalePDF = viewSalePDF;

function showAllSales() {
    document.getElementById('salesMonthFilter').value = '';
    filterSalesByMonth();
}
