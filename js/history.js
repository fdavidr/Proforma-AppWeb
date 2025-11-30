// ==================== GESTIÓN DE HISTORIAL ====================

function openHistory() {
    historyPage = 1;
    renderHistory();
    openModal('historyModal');
}

function renderHistory() {
    const tbody = document.getElementById('historyTableBody');
    tbody.innerHTML = '';

    if (appData.pdfHistory.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 30px; color: #7f8c8d;">No hay PDFs generados en el historial</td></tr>';
        updateHistoryPagination();
        return;
    }

    const startIndex = (historyPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageItems = appData.pdfHistory.slice(startIndex, endIndex);

    pageItems.forEach((entry, index) => {
        const tr = document.createElement('tr');
        const globalIndex = startIndex + index + 1;
        const typeLabel = entry.type === 'cotizacion' ? 'Cotización' : 'Nota de Venta';
        
        tr.innerHTML = `
            <td>${globalIndex}</td>
            <td>${typeLabel}</td>
            <td>${entry.number}</td>
            <td>${entry.client.name || entry.client}</td>
            <td>${entry.seller.name || entry.seller}</td>
            <td>Bs ${entry.total.toFixed(2)}</td>
            <td>${entry.date}</td>
            <td>
                <button class="btn btn-primary" onclick="redownloadPDF(${entry.id})" style="padding: 6px 12px; font-size: 12px; margin-right: 5px;">📥 Descargar</button>
                <button class="btn btn-delete" onclick="deleteHistoryEntry(${entry.id})" style="background: #e74c3c; color: white;">Eliminar</button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    updateHistoryPagination();
}

function updateHistoryPagination() {
    const totalPages = Math.ceil(appData.pdfHistory.length / itemsPerPage);
    document.getElementById('pageInfo').textContent = `Página ${historyPage} de ${Math.max(1, totalPages)}`;
    
    document.getElementById('prevPageBtn').disabled = historyPage === 1;
    document.getElementById('nextPageBtn').disabled = historyPage >= totalPages || totalPages === 0;
    
    if (historyPage === 1) {
        document.getElementById('prevPageBtn').style.opacity = '0.5';
        document.getElementById('prevPageBtn').style.cursor = 'not-allowed';
    } else {
        document.getElementById('prevPageBtn').style.opacity = '1';
        document.getElementById('prevPageBtn').style.cursor = 'pointer';
    }
    
    if (historyPage >= totalPages || totalPages === 0) {
        document.getElementById('nextPageBtn').style.opacity = '0.5';
        document.getElementById('nextPageBtn').style.cursor = 'not-allowed';
    } else {
        document.getElementById('nextPageBtn').style.opacity = '1';
        document.getElementById('nextPageBtn').style.cursor = 'pointer';
    }
}

function nextHistoryPage() {
    const totalPages = Math.ceil(appData.pdfHistory.length / itemsPerPage);
    if (historyPage < totalPages) {
        historyPage++;
        renderHistory();
    }
}

function prevHistoryPage() {
    if (historyPage > 1) {
        historyPage--;
        renderHistory();
    }
}

function deleteHistoryEntry(entryId) {
    if (confirm('¿Está seguro de eliminar este registro del historial?')) {
        appData.pdfHistory = appData.pdfHistory.filter(entry => entry.id !== entryId);
        saveData();
        
        // Ajustar página si es necesario
        const totalPages = Math.ceil(appData.pdfHistory.length / itemsPerPage);
        if (historyPage > totalPages && historyPage > 1) {
            historyPage = totalPages;
        }
        
        renderHistory();
    }
}

function redownloadPDF(entryId) {
    const entry = appData.pdfHistory.find(e => e.id === entryId);
    if (!entry) {
        alert('No se encontró el registro en el historial');
        return;
    }

    // Regenerar PDF con los datos guardados
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 10;
    let yPos = margin;

    // Logo y Header
    if (entry.company.logo) {
        try {
            doc.addImage(entry.company.logo, 'PNG', margin, yPos - 10, 30, 30);
        } catch(e) {
            console.log('Error al cargar logo:', e);
        }
    }
    
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.text(entry.company.name, margin + (entry.company.logo ? 35 : 0), yPos + 5);
    
    doc.setFontSize(10);
    doc.setFont(undefined, 'italic');
    doc.text(entry.company.slogan, margin + (entry.company.logo ? 35 : 0), yPos + 12);
    
    yPos += entry.company.logo ? 25 : 0;

    // Tipo de documento y número
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    const docTitle = entry.type === 'cotizacion' ? 'COTIZACIÓN' : 'NOTA DE VENTA';
    doc.text(docTitle, pageWidth - margin, 15, { align: 'right' });
    doc.setFontSize(12);
    doc.text('Nº ' + entry.number, pageWidth - margin, 22, { align: 'right' });
    
    doc.setFontSize(10);
    doc.text('Fecha: ' + entry.date, pageWidth - margin, 29, { align: 'right' });

    // Línea separadora
    doc.setLineWidth(0.5);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 8;

    // Información del cliente
    doc.setFont(undefined, 'bold');
    doc.text('CLIENTE:', margin, yPos);
    doc.setFont(undefined, 'normal');
    doc.text(entry.client.name || entry.client, margin + 25, yPos);
    yPos += 6;

    if (entry.client.company) {
        doc.setFont(undefined, 'bold');
        doc.text('Empresa:', margin, yPos);
        doc.setFont(undefined, 'normal');
        doc.text(entry.client.company, margin + 25, yPos);
        yPos += 6;
    }

    if (entry.client.ci) {
        doc.setFont(undefined, 'bold');
        doc.text('CI/CNIT:', margin, yPos);
        doc.setFont(undefined, 'normal');
        doc.text(entry.client.ci, margin + 25, yPos);
        yPos += 6;
    }

    if (entry.client.phone) {
        doc.setFont(undefined, 'bold');
        doc.text('Teléfono:', margin, yPos);
        doc.setFont(undefined, 'normal');
        doc.text(entry.client.phone, margin + 25, yPos);
        yPos += 6;
    }

    yPos += 3;

    // Información del vendedor
    doc.setFont(undefined, 'bold');
    doc.text('VENDEDOR:', margin, yPos);
    doc.setFont(undefined, 'normal');
    doc.text(entry.seller.name || entry.seller, margin + 25, yPos);
    
    if (entry.seller.phone) {
        doc.text('Tel: ' + entry.seller.phone, margin + 80, yPos);
    }
    yPos += 8;

    // Tabla de productos
    doc.setFont(undefined, 'bold');
    doc.setFillColor(52, 152, 219);
    doc.rect(margin, yPos, pageWidth - 2 * margin, 7, 'FD');
    
    doc.setTextColor(255, 255, 255);
    doc.text('#', margin + 2, yPos + 5);
    doc.text('Código', margin + 8, yPos + 5);
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

    entry.items.forEach((item, index) => {
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
        
        // Imagen del producto
        if (item.product.image) {
            try {
                const imgHeight = 24;
                const imgY = yPos + (rowHeight / 2) - (imgHeight / 2) - 3;
                doc.addImage(item.product.image, 'PNG', margin + 25, imgY, 24, imgHeight);
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
    yPos += 8;

    // Totales
    const totalsX = pageWidth - margin - 60;
    doc.setFont(undefined, 'normal');
    doc.text('Subtotal:', totalsX, yPos);
    doc.text('Bs ' + entry.subtotal.toFixed(2), totalsX + 40, yPos, { align: 'right' });
    yPos += 6;

    doc.text('Descuento:', totalsX, yPos);
    doc.text('Bs ' + entry.totalDiscount.toFixed(2), totalsX + 40, yPos, { align: 'right' });
    yPos += 8;

    doc.setFont(undefined, 'bold');
    doc.setFontSize(12);
    doc.text('TOTAL:', totalsX, yPos);
    doc.text('Bs ' + entry.total.toFixed(2), totalsX + 40, yPos, { align: 'right' });
    yPos += 10;

    // Términos y condiciones
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.text('Términos y Condiciones:', margin, yPos);
    yPos += 6;

    doc.setFont(undefined, 'normal');
    doc.setFontSize(9);
    entry.terms.forEach((term, index) => {
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

    // Numeración de páginas
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.text(`Página ${i} de ${pageCount}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
    }

    // Guardar PDF
    doc.save(entry.fileName);
}

// Exponer funciones globalmente
window.openHistory = openHistory;
window.nextHistoryPage = nextHistoryPage;
window.prevHistoryPage = prevHistoryPage;
window.deleteHistoryEntry = deleteHistoryEntry;
window.redownloadPDF = redownloadPDF;
