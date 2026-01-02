// ==================== GENERACIÓN DE PDF ====================

// Función para obtener la fecha seleccionada o actual
function getSelectedPdfDate() {
    const dateInput = document.getElementById('pdfDate');
    if (dateInput && dateInput.value) {
        const selectedDate = new Date(dateInput.value + 'T00:00:00');
        return selectedDate.toLocaleDateString('es-BO');
    }
    return new Date().toLocaleDateString('es-BO');
}

// Función para obtener fecha completa con hora
function getSelectedPdfDateTime() {
    const dateInput = document.getElementById('pdfDate');
    if (dateInput && dateInput.value) {
        const selectedDate = new Date(dateInput.value + 'T00:00:00');
        const dateStr = selectedDate.toLocaleDateString('es-BO');
        const timeStr = new Date().toLocaleTimeString('es-BO');
        return `${dateStr}, ${timeStr}`;
    }
    return new Date().toLocaleString('es-BO');
}

async function generatePDF() {
    if (!appData.currentClient) {
        alert('Debe seleccionar un cliente');
        return;
    }
    if (!appData.currentSeller) {
        alert('Debe seleccionar un vendedor');
        return;
    }
    if (appData.currentQuoteItems.length === 0) {
        alert('Debe agregar al menos un producto');
        return;
    }

    saveTerms();
    console.log('generatePDF: company.nit =', appData.company.nit);

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 15;
    let yPos = margin;

    // Logo y Header
    const headerHeight = addPDFHeader(doc, margin, yPos, pageWidth);
    yPos += headerHeight;

    // Tipo de documento y número
    addPDFDocumentInfo(doc, margin, pageWidth);

    // Línea separadora
    doc.setLineWidth(0.5);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 8;

    // Información del cliente
    yPos = addPDFClientInfo(doc, margin, yPos, pageWidth);

    // Información del vendedor
    yPos = addPDFSellerInfo(doc, margin, yPos);

    // Tabla de productos
    yPos = addPDFProductsTable(doc, margin, yPos, pageWidth, pageHeight);

    const pagesAfterTable = doc.internal.getNumberOfPages();
    if (appData.currentQuoteItems.length >= 7 && pagesAfterTable === 1) {
        doc.addPage();
        yPos = margin;
        const newHeaderHeight = addPDFHeader(doc, margin, yPos, pageWidth);
        yPos += newHeaderHeight;
        addPDFDocumentInfo(doc, margin, pageWidth);
        doc.setLineWidth(0.5);
        doc.line(margin, yPos, pageWidth - margin, yPos);
        yPos += 8;
    }

    // Totales
    yPos = addPDFTotals(doc, margin, yPos, pageWidth);

    // Términos y condiciones
    addPDFTerms(doc, margin, yPos, pageWidth, pageHeight);

    // Numeración de páginas
    addPDFPageNumbers(doc, pageWidth, pageHeight);

    // Guardar PDF
    const docTitle = appData.documentType === 'cotizacion' ? 'COTIZACIÓN' : 'NOTA DE VENTA';
    const docNumber = appData.documentType === 'cotizacion' ? appData.currentQuoteNumber : appData.currentSaleNumber;
    const fileName = `${docTitle}_${docNumber}_${appData.currentClient.name.replace(/\s+/g, '_')}.pdf`;
    doc.save(fileName);

    // Guardar en historial ANTES de limpiar (usa currentQuoteItems)
    saveToHistory(fileName);

    // Si es nota de venta, descontar del stock
    if (appData.documentType === 'notaventa') {
        let productsUpdated = 0;
        appData.currentQuoteItems.forEach(item => {
            const product = appData.products.find(p => p.id === item.id);
            if (product) {
                const stockField = appData.selectedSaleCity === 'cochabamba' 
                    ? 'stockCochabamba' 
                    : 'stockSantaCruz';
                const previousStock = product[stockField] || 0;
                product[stockField] = previousStock - item.quantity;
                // Evitar stock negativo
                if (product[stockField] < 0) product[stockField] = 0;
                productsUpdated++;
            }
        });
    }

    // Incrementar número según tipo de documento
    if (appData.documentType === 'cotizacion') {
        appData.currentQuoteNumber++;
    } else {
        appData.currentSaleNumber++;
    }
    
    // Guardar datos (esperar a que termine)
    await saveData();
    
    // Actualizar UI y número de documento
    updateUI();
    updateDocumentNumber();
    
    // Mostrar alerta de éxito
    const successMsg = appData.documentType === 'notaventa' 
        ? 'Nota de venta generada exitosamente. Stock actualizado.' 
        : 'Cotización generada exitosamente.';
    alert(successMsg + ' Use el botón "Nueva Cotización" para limpiar los datos.');
}

// ==================== FUNCIONES AUXILIARES DE PDF ====================

function addPDFHeader(doc, margin, yPos, pageWidth) {
    doc.setTextColor(0, 0, 0);
    if (appData.company.logo) {
        try {
            doc.addImage(appData.company.logo, 'PNG', margin, yPos - 4, 30, 30);
        } catch (e) {
            // Logo no disponible
        }
    }
    
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    const infoX = margin + (appData.company.logo ? 35 : 0);
    doc.text(appData.company.name, infoX, yPos + 6);
    
    doc.setFontSize(10);
    doc.setFont(undefined, 'italic');
    doc.text(appData.company.slogan || '', infoX, yPos + 13);

    if (appData.company.nit) {
        doc.setFont(undefined, 'normal');
        const nitText = 'NIT: ' + appData.company.nit;
        doc.setTextColor(0, 0, 0);
        doc.text(nitText, infoX, yPos + 20);
    }

    let headerHeight = 12;
    if (appData.company.logo) {
        // Logo + name + slogan (+ optional NIT)
        headerHeight = appData.company.nit ? 30 : 28;
    } else if (appData.company.nit) {
        // No logo but has NIT
        headerHeight = 24;
    }

    return headerHeight;
}

function addPDFDocumentInfo(doc, margin, pageWidth) {
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    const docTitle = appData.documentType === 'cotizacion' ? 'COTIZACIÓN' : 'NOTA DE VENTA';
    doc.text(docTitle, pageWidth - margin, 20, { align: 'right' });
    doc.setFontSize(12);
    const docNumber = appData.documentType === 'cotizacion' ? appData.currentQuoteNumber : appData.currentSaleNumber;
    doc.text('Nº ' + docNumber, pageWidth - margin, 27, { align: 'right' });
    
    doc.setFontSize(10);
    doc.text('Fecha: ' + getSelectedPdfDate(), pageWidth - margin, 34, { align: 'right' });
}

function addPDFClientInfo(doc, margin, yPos, pageWidth) {
    doc.setFont(undefined, 'bold');
    doc.text('CLIENTE:', margin, yPos);
    doc.setFont(undefined, 'normal');
    doc.text(appData.currentClient.name, margin + 25, yPos);
    
    // CI/NIT en la misma fila, alineado a la derecha
    if (appData.currentClient.ci) {
        doc.setFont(undefined, 'bold');
        const ciNitText = 'CI/NIT: ';
        const ciNitWidth = doc.getTextWidth(ciNitText);
        doc.text(ciNitText, pageWidth - margin - doc.getTextWidth(appData.currentClient.ci) - ciNitWidth, yPos);
        doc.setFont(undefined, 'normal');
        doc.text(appData.currentClient.ci, pageWidth - margin, yPos, { align: 'right' });
    }
    
    yPos += 6;

    if (appData.currentClient.company) {
        doc.setFont(undefined, 'bold');
        doc.text('Empresa:', margin, yPos);
        doc.setFont(undefined, 'normal');
        doc.text(appData.currentClient.company, margin + 25, yPos);
        yPos += 6;
    }

    if (appData.currentClient.phone) {
        doc.setFont(undefined, 'bold');
        doc.text('Teléfono:', margin, yPos);
        doc.setFont(undefined, 'normal');
        doc.text(appData.currentClient.phone, margin + 25, yPos);
        yPos += 6;
    }

    return yPos + 3;
}

function addPDFSellerInfo(doc, margin, yPos) {
    doc.setFont(undefined, 'bold');
    doc.text('VENDEDOR:', margin, yPos);
    doc.setFont(undefined, 'normal');
    doc.text(appData.currentSeller.name, margin + 25, yPos);
    
    if (appData.currentSeller.phone) {
        doc.text('Tel: ' + appData.currentSeller.phone, margin + 80, yPos);
    }
    
    return yPos + 8;
}

function addPDFProductsTable(doc, margin, yPos, pageWidth, pageHeight) {
    // Header de la tabla
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

    const tableLeft = margin;
    const tableRight = pageWidth - margin;

    // Filas de productos
    appData.currentQuoteItems.forEach((item, index) => {
        if (yPos > pageHeight - 50) {
            doc.addPage();
            yPos = margin;
        }

        // Calcular altura de la fila primero
        const description = doc.splitTextToSize(item.product.description, 56);
        const rowHeight = Math.max(7, description.length * 5, item.product.image ? 26 : 7);
        const textYCenter = yPos + (rowHeight / 2); // Centro vertical de la fila

        // Textos centrados verticalmente
        doc.text((index + 1).toString(), margin + 2, textYCenter);
        doc.text(item.product.code || '-', margin + 8, textYCenter);
        
        // Imagen del producto en su propia columna
        if (item.product.image) {
            try {
                const imgHeight = 24;
                const imgY = yPos + (rowHeight / 2) - (imgHeight / 2) - 3;
                doc.addImage(item.product.image, 'PNG', margin + 26, imgY, 24, imgHeight);
            } catch(e) {
                console.log('Error al cargar imagen del producto:', e);
            }
        }
        
        // Descripción centrada verticalmente
        const descHeight = description.length * 5;
        const descYCenter = yPos + (rowHeight / 2) - (descHeight / 2) + 2;
        doc.text(description, margin + 52, descYCenter);
        
        doc.text(item.quantity.toString(), margin + 108, textYCenter);
        doc.text('Bs ' + item.price.toFixed(2), margin + 122, textYCenter);
        doc.text(item.discount + ' ' + item.discountType, margin + 147, textYCenter);
        doc.text('Bs ' + item.subtotal.toFixed(2), pageWidth - margin - 2, textYCenter, { align: 'right' });
        
        // Bordes de la fila
        doc.setDrawColor(200, 200, 200);
        doc.line(tableLeft, yPos + rowHeight - 3, tableRight, yPos + rowHeight - 3);
        doc.line(tableLeft, yPos - 3, tableLeft, yPos + rowHeight - 3);
        doc.line(tableRight, yPos - 3, tableRight, yPos + rowHeight - 3);
        
        // Líneas verticales entre columnas
        doc.line(margin + 6, yPos - 3, margin + 6, yPos + rowHeight - 3);
        doc.line(margin + 25, yPos - 3, margin + 25, yPos + rowHeight - 3);
        doc.line(margin + 51, yPos - 3, margin + 51, yPos + rowHeight - 3); // Línea después de IMG
        doc.line(margin + 107, yPos - 3, margin + 107, yPos + rowHeight - 3);
        doc.line(margin + 120, yPos - 3, margin + 120, yPos + rowHeight - 3);
        doc.line(margin + 145, yPos - 3, margin + 145, yPos + rowHeight - 3);
        doc.line(margin + 160, yPos - 3, margin + 160, yPos + rowHeight - 3);
        
        yPos += rowHeight;
    });

    // Borde inferior de la tabla
    doc.setDrawColor(0, 0, 0);
    doc.line(tableLeft, yPos - 3, tableRight, yPos - 3);

    yPos += 5;
    doc.line(margin, yPos, pageWidth - margin, yPos);
    
    return yPos + 8;
}

function addPDFTotals(doc, margin, yPos, pageWidth) {
    const subtotal = appData.currentQuoteItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const totalDiscount = appData.currentQuoteItems.reduce((sum, item) => sum + item.discountAmount, 0);
    const total = subtotal - totalDiscount;

    const totalsX = pageWidth - margin - 60;
    doc.setFont(undefined, 'normal');
    doc.text('Subtotal:', totalsX, yPos);
    doc.text('Bs ' + subtotal.toFixed(2), totalsX + 40, yPos, { align: 'right' });
    yPos += 6;

    doc.text('Descuento:', totalsX, yPos);
    doc.text('Bs ' + totalDiscount.toFixed(2), totalsX + 40, yPos, { align: 'right' });
    yPos += 8;

    doc.setFont(undefined, 'bold');
    doc.setFontSize(12);
    doc.text('TOTAL:', totalsX, yPos);
    doc.text('Bs ' + total.toFixed(2), totalsX + 40, yPos, { align: 'right' });
    
    return yPos + 10;
}

function addPDFTerms(doc, margin, yPos, pageWidth, pageHeight) {
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.text('Términos y Condiciones:', margin, yPos);
    yPos += 6;

    doc.setFont(undefined, 'normal');
    doc.setFontSize(9);
    const terms = appData.terms[appData.documentType];
    terms.forEach((term, index) => {
        if (term.trim()) {
            const termText = `${index + 1}. ${term}`;
            const lines = doc.splitTextToSize(termText, pageWidth - 2 * margin);
            lines.forEach(line => {
                if (yPos > pageHeight - 20) {
                    doc.addPage();
                    yPos = margin;
                }
                doc.text(line, margin, yPos);
                yPos += 5;
            });
        }
    });
}

function addPDFPageNumbers(doc, pageWidth, pageHeight) {
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.text(`Página ${i} de ${pageCount}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
    }
}

function saveToHistory(fileName) {
    const subtotal = appData.currentQuoteItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const totalDiscount = appData.currentQuoteItems.reduce((sum, item) => sum + item.discountAmount, 0);
    const total = subtotal - totalDiscount;

    const historyEntry = {
        id: Date.now(),
        type: appData.documentType,
        number: appData.documentType === 'cotizacion' ? appData.currentQuoteNumber : appData.currentSaleNumber,
        city: appData.documentType === 'notaventa' ? appData.selectedSaleCity : appData.selectedSaleCity,
        client: JSON.parse(JSON.stringify({
            name: appData.currentClient.name,
            phone: appData.currentClient.phone || '',
            ci: appData.currentClient.ci || '',
            company: appData.currentClient.company || ''
        })),
        seller: JSON.parse(JSON.stringify({
            name: appData.currentSeller.name,
            phone: appData.currentSeller.phone || ''
        })),
        items: JSON.parse(JSON.stringify(appData.currentQuoteItems)),
        subtotal: subtotal,
        totalDiscount: totalDiscount,
        total: total,
        date: getSelectedPdfDateTime(),
        terms: JSON.parse(JSON.stringify(appData.terms[appData.documentType])),
        company: JSON.parse(JSON.stringify({
            name: appData.company.name,
            slogan: appData.company.slogan,
            nit: appData.company.nit || '',
            logo: appData.company.logo
        })),
        fileName: fileName
    };
    
    appData.pdfHistory.unshift(historyEntry);
    
    // Limitar historial a últimas 10 cotizaciones
    const cotizaciones = appData.pdfHistory.filter(entry => entry.type === 'cotizacion');
    if (cotizaciones.length > 10) {
        // Encontrar y eliminar la cotización más antigua
        const oldestCotizacion = cotizaciones[cotizaciones.length - 1];
        const indexToRemove = appData.pdfHistory.findIndex(entry => entry.id === oldestCotizacion.id);
        if (indexToRemove !== -1) {
            appData.pdfHistory.splice(indexToRemove, 1);
        }
    }
}

// Exponer funciones globalmente para eventos onclick
window.generatePDF = generatePDF;
