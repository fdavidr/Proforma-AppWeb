// ==================== GESTIÓN DE VENTAS ====================

let selectedSalesCity = 'cochabamba';
let salesFiltersInitialized = false;
let selectedSalesProduct = null;
let currentProductSalesResults = [];
let currentMovementsReportSnapshot = null;
let isGeneratingSalesReport = false;

function getDatePartsFromEntry(entry) {
    const raw = (entry && entry.date) ? String(entry.date) : '';
    const datePart = raw.split(',')[0].trim();
    const [day, month, year] = datePart.split('/');
    return { day: day || '', month: month || '', year: year || '', rawDate: datePart };
}

function getEntryDateLocalKey(entry) {
    const { day, month, year } = getDatePartsFromEntry(entry);
    if (!day || !month || !year) return '';
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function getTodayLocalDateKey() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function getSalesDayFilterState() {
    const mode = document.getElementById('salesDayModeFilter')?.value || 'all';
    const dateInput = document.getElementById('salesDayFilterInput');
    const selectedDay = dateInput && dateInput.value ? dateInput.value : '';
    return { mode, selectedDay };
}

function toggleSalesDayFilter() {
    const mode = document.getElementById('salesDayModeFilter')?.value || 'all';
    const dateInput = document.getElementById('salesDayFilterInput');
    if (!dateInput) return;
    if (mode === 'custom') {
        dateInput.style.display = 'block';
        if (!dateInput.value) {
            dateInput.value = getTodayLocalDateKey();
        }
    } else {
        dateInput.style.display = 'none';
        dateInput.value = '';
    }
}

// Convertir fecha string "DD/MM/YYYY, HH:MM:SS" a timestamp
function parseDateStr(dateStr) {
    try {
        const parts = dateStr.split(',');
        const datePart = parts[0].trim();
        const timePart = parts[1] ? parts[1].trim() : '00:00:00';
        const [day, month, year] = datePart.split('/');
        const [hours, minutes, seconds] = timePart.split(':');
        return new Date(
            parseInt(year),
            parseInt(month) - 1,
            parseInt(day),
            parseInt(hours) || 0,
            parseInt(minutes) || 0,
            parseInt(seconds) || 0
        ).getTime();
    } catch (e) {
        return 0;
    }
}

function normalizeSalesText(value) {
    return String(value == null ? '' : value).trim().toLowerCase();
}

function getSaleItemProduct(item) {
    return (item && typeof item === 'object')
        ? (item.product && typeof item.product === 'object' ? item.product : item)
        : {};
}

function getSaleItemQuantity(item) {
    const quantity = Number(item && item.quantity);
    return Number.isFinite(quantity) ? quantity : 0;
}

function getSaleItemSubtotal(item) {
    if (!item || typeof item !== 'object') return null;
    if (item.subtotal !== undefined && item.subtotal !== null && item.subtotal !== '' &&
        Number.isFinite(Number(item.subtotal))) return Number(item.subtotal);
    const quantity = getSaleItemQuantity(item);
    const price = Number(item.price);
    if (!Number.isFinite(price) || !Number.isFinite(quantity)) return null;
    const rawSubtotal = price * quantity;
    if (item.discountAmount !== undefined && item.discountAmount !== null &&
        item.discountAmount !== '' && Number.isFinite(Number(item.discountAmount))) {
        return rawSubtotal - Number(item.discountAmount);
    }
    if (item.discount === undefined || item.discount === null || item.discount === '' ||
        Number(item.discount) === 0) return rawSubtotal;
    const discount = Number(item.discount);
    if (!Number.isFinite(discount)) return null;
    if (item.discountType === '%') {
        return Number.isFinite(discount) ? rawSubtotal - (rawSubtotal * discount / 100) : rawSubtotal;
    }
    if (item.discountType) return rawSubtotal - (discount * quantity);
    return null;
}

function saleItemMatchesSelectedProduct(item, selected) {
    if (!item || !selected) return false;
    const product = getSaleItemProduct(item);
    const itemId = item.id != null ? item.id : product.id;
    const selectedId = selected.id;

    if (selectedId != null && itemId != null) {
        return String(itemId) === String(selectedId);
    }
    if (selected.code && product.code) {
        if (normalizeSalesText(selected.code) === normalizeSalesText(product.code)) return true;
    }
    return Boolean(selected.description && product.description &&
        normalizeSalesText(selected.description) === normalizeSalesText(product.description));
}

function getMatchingSaleItems(sale) {
    if (!selectedSalesProduct || !sale || !Array.isArray(sale.items)) return [];
    return sale.items.filter(item => saleItemMatchesSelectedProduct(item, selectedSalesProduct));
}

function getSelectedProductCandidates() {
    const candidates = new Map();
    const addCandidate = (product) => {
        if (!product || typeof product !== 'object') return;
        const id = product.id;
        const code = product.code || '';
        const description = product.description || product.name || '';
        if (!description && !code && id == null) return;
        const key = id != null ? `id:${String(id)}` : `text:${normalizeSalesText(code)}|${normalizeSalesText(description)}`;
        if (!candidates.has(key)) candidates.set(key, { id, code, description });
    };
    (appData.products || []).forEach(addCandidate);
    (appData.pdfHistory || []).forEach(entry => {
        (entry.items || []).forEach(item => addCandidate(getSaleItemProduct(item)));
    });
    return Array.from(candidates.values());
}

function filterSalesProductSuggestions(query) {
    const list = document.getElementById('salesProductSuggestions');
    if (!list) return;
    list.innerHTML = '';
    const needle = normalizeSalesText(query);
    const candidates = getSelectedProductCandidates().filter(product => {
        if (!needle) return true;
        return normalizeSalesText(product.description).includes(needle) ||
            normalizeSalesText(product.code).includes(needle) ||
            (product.id != null && String(product.id).toLowerCase().includes(needle));
    }).slice(0, 30);
    list.classList.toggle('active', candidates.length > 0);
    candidates.forEach(product => {
        const div = document.createElement('div');
        div.className = 'sales-product-suggestion';
        div.textContent = `${product.code ? product.code + ' - ' : ''}${product.description || 'Producto sin descripción'}${product.id != null ? ` [ID: ${product.id}]` : ''}`;
        div.onclick = () => selectSalesProductFilter(product);
        list.appendChild(div);
    });
}

function handleSalesProductSearchInput(query) {
    if (selectedSalesProduct &&
        normalizeSalesText(query) !== normalizeSalesText(selectedSalesProduct.description || selectedSalesProduct.code || String(selectedSalesProduct.id))) {
        selectedSalesProduct = null;
        currentProductSalesResults = [];
        filterSalesByMonth();
    }
    filterSalesProductSuggestions(query);
}

function selectSalesProductFilter(product) {
    selectedSalesProduct = { id: product.id, code: product.code || '', description: product.description || '' };
    const input = document.getElementById('salesProductFilterInput');
    if (input) input.value = product.description || product.code || String(product.id);
    const list = document.getElementById('salesProductSuggestions');
    if (list) list.classList.remove('active');
    currentProductSalesResults = [];
    filterSalesByMonth();
}

function clearSalesProductFilter() {
    selectedSalesProduct = null;
    const input = document.getElementById('salesProductFilterInput');
    if (input) input.value = '';
    const list = document.getElementById('salesProductSuggestions');
    if (list) list.classList.remove('active');
    currentProductSalesResults = [];
    filterSalesByMonth();
}

function updateSalesProductSummary(sales) {
    const container = document.getElementById('salesProductSummary');
    const exportStatus = document.getElementById('salesProductExportStatus');
    const hasResults = Boolean(selectedSalesProduct && sales && sales.length);
    const summary = { product: null, units: 0, notes: 0, movements: sales ? sales.length : 0, amount: 0, amountReliable: true };
    if (exportStatus) {
        exportStatus.textContent = !selectedSalesProduct
            ? 'Selecciona un producto para consultar sus ventas.'
            : hasResults
                ? `${sales.length} nota${sales.length === 1 ? '' : 's'} coincidente${sales.length === 1 ? '' : 's'}.`
                : 'No hay notas coincidentes para el producto y los filtros seleccionados.';
    }
    if (!container) return summary;
    if (!selectedSalesProduct) {
        container.style.display = 'none';
        container.innerHTML = '';
        return summary;
    }

    let units = 0;
    let amount = 0;
    let amountReliable = true;
    const notes = new Set();
    summary.product = selectedSalesProduct.description || selectedSalesProduct.code || `ID ${selectedSalesProduct.id}`;
    (sales || []).forEach(sale => {
        if (sale.cancelled) return;
        const matchingItems = getMatchingSaleItems(sale);
        if (!matchingItems.length) return;
        notes.add(sale.id);
        matchingItems.forEach(item => {
            units += getSaleItemQuantity(item);
            const subtotal = getSaleItemSubtotal(item);
            if (subtotal == null) amountReliable = false;
            else amount += subtotal;
        });
    });
    summary.units = units;
    summary.notes = notes.size;
    summary.amount = amount;
    summary.amountReliable = amountReliable;

    container.innerHTML = '';
    container.style.display = 'flex';
    const name = selectedSalesProduct.description || selectedSalesProduct.code || `ID ${selectedSalesProduct.id}`;
    const cards = [
        ['Producto', name],
        ['Unidades vendidas', String(units)],
        ['Notas de venta', String(notes.size)],
        ['Movimientos encontrados', String(sales ? sales.length : 0)],
        ['Importe de líneas', amountReliable ? `Bs ${amount.toFixed(2)}` : 'No disponible']
    ];
    cards.forEach(([label, value]) => {
        const card = document.createElement('div');
        card.className = 'sales-product-summary-card';
        const labelEl = document.createElement('div');
        labelEl.style.cssText = 'font-size:12px;color:#666;';
        labelEl.textContent = label;
        const valueEl = document.createElement('div');
        valueEl.style.cssText = 'font-size:16px;font-weight:bold;color:#2c3e50;';
        valueEl.textContent = value;
        card.appendChild(labelEl);
        card.appendChild(valueEl);
        container.appendChild(card);
    });
    return summary;
}

function getProductSalesReportRows() {
    return currentProductSalesResults.map(sale => {
        const matchingItems = getMatchingSaleItems(sale);
        let amount = 0;
        let amountReliable = true;
        matchingItems.forEach(item => {
            const subtotal = getSaleItemSubtotal(item);
            if (subtotal == null) amountReliable = false;
            else amount += subtotal;
        });
        const client = typeof sale.client === 'object' && sale.client
            ? (sale.client.name || sale.client.company)
            : sale.client;
        const clientName = String(client || '').trim();
        return {
            date: sale.date || '',
            number: sale.number == null ? '' : sale.number,
            quantity: matchingItems.reduce((sum, item) => sum + getSaleItemQuantity(item), 0),
            client: clientName || 'Cliente no registrado',
            amount: amountReliable ? amount : null,
            cancelled: sale.cancelled === true
        };
    });
}

function sanitizeReportFilePart(value) {
    return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_')
        .replace(/\s+/g, '_')
        .replace(/[. ]+$/g, '')
        .slice(0, 80) || 'Producto';
}

function getReportDateValue(value) {
    const match = String(value || '').match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:,\s*(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
    if (!match) return String(value || '');
    return new Date(
        Number(match[3]),
        Number(match[2]) - 1,
        Number(match[1]),
        Number(match[4] || 0),
        Number(match[5] || 0),
        Number(match[6] || 0)
    );
}

function generateLegacyProductSalesExcel() {
    if (!selectedSalesProduct) {
        alert('Selecciona un producto antes de descargar el reporte.');
        return;
    }
    if (!currentProductSalesResults.length) {
        alert('No hay notas de venta coincidentes para generar el reporte.');
        return;
    }
    if (!window.XLSX) {
        alert('La librería de Excel no está disponible. Revisa tu conexión a internet e inténtalo nuevamente.');
        return;
    }

    try {
        const reportRows = getProductSalesReportRows();
        if (!reportRows.length) {
            alert('No hay notas de venta coincidentes para generar el reporte.');
            return;
        }
        const validRows = reportRows.filter(row => !row.cancelled);
        const cancelledRows = reportRows.filter(row => row.cancelled);
        const validUnits = validRows.reduce((sum, row) => sum + row.quantity, 0);
        const cancelledUnits = cancelledRows.reduce((sum, row) => sum + row.quantity, 0);
        const validAmountsReliable = validRows.every(row => row.amount !== null);
        const validAmount = validAmountsReliable
            ? Number(validRows.reduce((sum, row) => sum + row.amount, 0).toFixed(2))
            : null;
        const inventory = (appData.inventories || []).find(item => item.id === selectedSalesCity);
        const sellerSelect = document.getElementById('salesSellerFilter');
        const sellerName = appData.userRole === 'vendedor' && appData.loggedSeller
            ? appData.loggedSeller.name
            : (sellerSelect && sellerSelect.value !== 'all' ? sellerSelect.value : 'Todos');
        const year = document.getElementById('salesYearFilter')?.value || '';
        const month = document.getElementById('salesMonthFilter')?.value || '';
        const { mode, selectedDay } = getSalesDayFilterState();
        let period = 'Todos los períodos';
        if (mode === 'today') period = 'Hoy';
        else if (mode === 'custom' && selectedDay) period = selectedDay;
        else if (year && month) period = `${month}/${year}`;
        else if (year) period = year;

        const productName = selectedSalesProduct.description ||
            selectedSalesProduct.code || `ID ${selectedSalesProduct.id}`;
        const generatedAt = new Date();
        const rows = [
            ['CIAM – EQUIPOS DE LIMPIEZA INDUSTRIAL'],
            ['REPORTE DE VENTAS POR PRODUCTO'],
            ['Producto', productName],
            ['Código', selectedSalesProduct.code || 'No registrado'],
            ['Generado', generatedAt.toLocaleString('es-BO')],
            ['Período', period],
            ['Ciudad / sucursal', inventory ? inventory.name : selectedSalesCity],
            ['Vendedor', sellerName],
            [],
            ['N.º', 'Fecha', 'N.º de nota de venta', 'Cantidad', 'Cliente', 'Precio (Bs)', 'Estado'],
            ...reportRows.map((row, index) => [
                index + 1,
                getReportDateValue(row.date),
                row.number,
                row.quantity,
                row.client,
                row.amount == null ? '' : row.amount,
                row.cancelled ? 'ANULADA' : 'VIGENTE'
            ]),
            [],
            ['RESUMEN'],
            ['Total de notas de venta encontradas', reportRows.length],
            ['Notas vigentes', validRows.length],
            ['Unidades vendidas vigentes', validUnits],
            ['Importe de ventas vigentes (Bs)', validAmount == null ? 'No disponible: faltan importes históricos confiables' : validAmount],
            ['Notas anuladas', cancelledRows.length],
            ['Unidades en notas anuladas (no incluidas en ventas efectivas)', cancelledUnits]
        ];
        const worksheet = XLSX.utils.aoa_to_sheet(rows);
        const headerRow = 10;
        const lastDataRow = headerRow + reportRows.length;
        worksheet['!cols'] = [
            { wch: 7 }, { wch: 22 }, { wch: 22 }, { wch: 12 },
            { wch: 34 }, { wch: 18 }, { wch: 14 }
        ];
        worksheet['!merges'] = [
            { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } },
            { s: { r: 1, c: 0 }, e: { r: 1, c: 6 } }
        ];
        worksheet['!autofilter'] = {
            ref: `A${headerRow}:G${lastDataRow}`
        };
        worksheet['!freeze'] = { xSplit: 0, ySplit: headerRow, topLeftCell: `A${headerRow + 1}`, activePane: 'bottomLeft', state: 'frozen' };
        for (let rowIndex = headerRow; rowIndex < lastDataRow; rowIndex++) {
            const dateCell = worksheet[XLSX.utils.encode_cell({ r: rowIndex, c: 1 })];
            if (dateCell) dateCell.z = 'dd/mm/yyyy hh:mm:ss';
            const quantityCell = worksheet[XLSX.utils.encode_cell({ r: rowIndex, c: 3 })];
            if (quantityCell) quantityCell.z = '#,##0.###';
            const amountCell = worksheet[XLSX.utils.encode_cell({ r: rowIndex, c: 5 })];
            if (amountCell && typeof amountCell.v === 'number') amountCell.z = '"Bs" #,##0.00';
        }

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Ventas por producto');
        const datePart = getTodayLocalDateKey();
        const fileName = `CIAM_Reporte_Ventas_${sanitizeReportFilePart(productName)}_${datePart}.xlsx`;
        XLSX.writeFile(workbook, fileName);
    } catch (error) {
        throw error;
    }
}

function generateLegacyProductSalesPDF() {
    if (!selectedSalesProduct) throw new Error('Selecciona un producto antes de generar el reporte.');
    if (!currentProductSalesResults.length) {
        throw new Error('No hay notas de venta coincidentes para generar el reporte.');
    }
    if (!window.jspdf || !window.jspdf.jsPDF) throw new Error('La librería PDF no está disponible.');

    const reportRows = getProductSalesReportRows();
    const validRows = reportRows.filter(row => !row.cancelled);
    const cancelledRows = reportRows.filter(row => row.cancelled);
    const validAmountReliable = validRows.every(row => row.amount !== null);
    const validAmount = validAmountReliable
        ? validRows.reduce((sum, row) => sum + row.amount, 0)
        : null;
    const productName = selectedSalesProduct.description ||
        selectedSalesProduct.code || `ID ${selectedSalesProduct.id}`;
    const inventory = (appData.inventories || []).find(item => item.id === selectedSalesCity);
    const sellerSelect = document.getElementById('salesSellerFilter');
    const sellerName = appData.userRole === 'vendedor' && appData.loggedSeller
        ? appData.loggedSeller.name
        : (sellerSelect && sellerSelect.value !== 'all' ? sellerSelect.value : 'Todos');
    const selectedYear = document.getElementById('salesYearFilter')?.value || '';
    const selectedMonth = document.getElementById('salesMonthFilter')?.value || '';
    const { mode, selectedDay } = getSalesDayFilterState();
    const generatedAt = new Date();
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 12;
    const tableTop = 55;
    const columns = [
        { label: 'N.º', width: 10, align: 'center' },
        { label: 'Fecha', width: 29 },
        { label: 'N.º de nota', width: 28 },
        { label: 'Cantidad', width: 19, align: 'right' },
        { label: 'Cliente', width: 59 },
        { label: 'Precio (Bs)', width: 30, align: 'right' },
        { label: 'Estado', width: 25 }
    ];
    const tableWidth = columns.reduce((sum, column) => sum + column.width, 0);
    const tableX = Math.max(margin, (pageWidth - tableWidth) / 2);

    function drawHeader() {
        doc.setFillColor(52, 73, 94);
        doc.rect(tableX, tableTop, tableWidth, 8, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(255, 255, 255);
        let x = tableX + 1;
        columns.forEach(column => {
            doc.text(column.label, x + (column.align === 'right' ? column.width - 2 : 1), tableTop + 5.3,
                { align: column.align || 'left' });
            x += column.width;
        });
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(52, 73, 94);
    doc.text((appData.company && appData.company.name) || 'CIAM – EQUIPOS DE LIMPIEZA INDUSTRIAL', margin, 16);
    doc.setFontSize(13);
    doc.text('REPORTE DE VENTAS POR PRODUCTO', margin, 24);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(40, 40, 40);
    doc.text(`Producto: ${productName}${selectedSalesProduct.code ? `  |  Código: ${selectedSalesProduct.code}` : ''}`, margin, 32);
    doc.text(`Período: ${getSalesReportPeriodLabel(selectedYear, selectedMonth, mode, selectedDay)}  |  Ciudad: ${(inventory && inventory.name) || selectedSalesCity}  |  Vendedor: ${sellerName}`, margin, 38);
    doc.text(`Generado: ${generatedAt.toLocaleString('es-BO')}`, margin, 44);
    drawHeader();

    let y = tableTop + 13;
    reportRows.forEach((row, index) => {
        const clientLines = doc.splitTextToSize(row.client || 'Cliente no registrado', columns[4].width - 4);
        const rowHeight = Math.max(7, clientLines.length * 3.5 + 2);
        if (y + rowHeight > pageHeight - 23) {
            doc.addPage();
            drawHeader();
            y = tableTop + 13;
        }
        doc.setTextColor(row.cancelled ? 190 : 35, row.cancelled ? 45 : 35, row.cancelled ? 45 : 35);
        const values = [
            String(index + 1),
            row.date,
            String(row.number),
            String(row.quantity),
            clientLines,
            row.amount == null ? 'No disponible' : row.amount.toFixed(2),
            row.cancelled ? 'ANULADA' : 'VIGENTE'
        ];
        let x = tableX + 1;
        values.forEach((value, columnIndex) => {
            const column = columns[columnIndex];
            const text = columnIndex === 4 ? value : String(value);
            doc.text(text, x + (column.align === 'right' ? column.width - 2 : 1), y + 3.5,
                { align: column.align || 'left', maxWidth: column.width - 3 });
            x += column.width;
        });
        doc.setDrawColor(225, 225, 225);
        doc.line(tableX, y + rowHeight, tableX + tableWidth, y + rowHeight);
        y += rowHeight;
    });

    const summaryLines = [
        `Notas encontradas: ${reportRows.length}  |  Vigentes: ${validRows.length}  |  Anuladas: ${cancelledRows.length}`,
        `Unidades vigentes: ${validRows.reduce((sum, row) => sum + row.quantity, 0)}  |  Importe vigente: ${validAmount == null ? 'No disponible por datos históricos incompletos' : `Bs ${validAmount.toFixed(2)}`}`
    ];
    const summaryHeight = summaryLines.length * 5 + 8;
    if (y + summaryHeight > pageHeight - 10) {
        doc.addPage();
        y = margin + 5;
    }
    y += 6;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(52, 73, 94);
    doc.text('RESUMEN', margin, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(30, 30, 30);
    summaryLines.forEach((line, index) => doc.text(line, margin, y + 5 + index * 5));

    const pageCount = doc.internal.getNumberOfPages();
    for (let page = 1; page <= pageCount; page++) {
        doc.setPage(page);
        doc.setFontSize(7);
        doc.setTextColor(130, 130, 130);
        doc.text(`Página ${page} de ${pageCount}`, pageWidth - margin, pageHeight - 7, { align: 'right' });
    }
    doc.save(`Reporte_Ventas_${sanitizeReportFilePart(productName)}_${getTodayLocalDateKey()}.pdf`);
}

function openSalesExportModal() {
    updateSalesExportContext();
    const formatSelect = document.getElementById('salesExportFormat');
    if (formatSelect) formatSelect.value = 'pdf';
    openModal('salesExportModal');
}

function closeSalesExportModal() {
    if (isGeneratingSalesReport) return;
    closeModal('salesExportModal');
}

function updateSalesExportContext() {
    const snapshot = currentMovementsReportSnapshot;
    const operation = document.getElementById('salesExportOperation');
    const filters = document.getElementById('salesExportFilters');
    const results = document.getElementById('salesExportResults');
    const downloadButton = document.getElementById('salesExportDownloadButton');
    if (!snapshot) {
        if (operation) operation.textContent = '—';
        if (filters) filters.textContent = '—';
        if (results) results.textContent = 'Actualiza la vista de Movimientos antes de exportar.';
        if (downloadButton) downloadButton.disabled = true;
        return;
    }
    if (operation) operation.textContent = snapshot.operationLabel;
    if (filters) filters.textContent = snapshot.filterDescription;
    if (results) {
        results.textContent = snapshot.records.length
            ? `${snapshot.records.length} registro(s) en la vista actual.`
            : 'No hay resultados para exportar con los filtros actuales.';
    }
    if (downloadButton) downloadButton.disabled = isGeneratingSalesReport || !snapshot.records.length;
}

function downloadSelectedSalesReport() {
    if (isGeneratingSalesReport) return;
    const format = document.getElementById('salesExportFormat')?.value;
    if (!['pdf', 'excel'].includes(format)) {
        alert('Selecciona un formato de reporte válido.');
        return;
    }

    filterSalesByMonth();
    const snapshot = currentMovementsReportSnapshot;
    if (!snapshot || !snapshot.records.length) {
        updateSalesExportContext();
        alert('No hay resultados para exportar con los filtros actuales.');
        return;
    }
    if (format === 'pdf' && (!window.jspdf || !window.jspdf.jsPDF)) {
        alert('La librería PDF no está disponible. Revisa tu conexión a internet e inténtalo nuevamente.');
        return;
    }
    if (format === 'excel' && !window.XLSX) {
        alert('La librería de Excel no está disponible. Revisa tu conexión a internet e inténtalo nuevamente.');
        return;
    }

    isGeneratingSalesReport = true;
    const button = document.getElementById('salesExportDownloadButton');
    const openButton = document.getElementById('salesExportOpenButton');
    if (button) {
        button.disabled = true;
        button.textContent = 'Generando…';
    }
    if (openButton) openButton.disabled = true;
    try {
        if (format === 'pdf') generateMovementsReportPDF(snapshot);
        else generateMovementsReportExcel(snapshot);
        closeModal('salesExportModal');
    } catch (error) {
        console.error('No se pudo generar el reporte seleccionado.', error);
        alert(error && error.message
            ? error.message
            : 'No se pudo generar el reporte. Inténtalo nuevamente.');
    } finally {
        window.setTimeout(() => {
            isGeneratingSalesReport = false;
            if (button) {
                button.disabled = false;
                button.textContent = 'Descargar';
            }
            if (openButton) openButton.disabled = false;
            updateSalesExportContext();
        }, 500);
    }
}

function getEntrySellerName(entry) {
    if (!entry || !entry.seller) return '';
    if (typeof entry.seller === 'string') return entry.seller;
    return entry.seller.name || '';
}

function entryMatchesSeller(entry, sellerName) {
    return getEntrySellerName(entry) === sellerName;
}

function switchMovimientosTab(tab) {
    // Sincronizar el select desplegable
    const tipoSelect = document.getElementById('movimientosTipoSelect');
    if (tipoSelect && tipoSelect.value !== tab) tipoSelect.value = tab;

    const cotizacionesContent = document.getElementById('cotizacionesContent');
    const salesContent = document.getElementById('salesContent');
    const entregasContent = document.getElementById('entregasContent');
    const gastosContent = document.getElementById('gastosContent');

    if (cotizacionesContent) cotizacionesContent.style.display = tab === 'cotizaciones' ? '' : 'none';
    if (salesContent) salesContent.style.display = tab === 'ventas' ? '' : 'none';
    if (entregasContent) entregasContent.style.display = tab === 'entregas' ? '' : 'none';
    if (gastosContent) gastosContent.style.display = tab === 'gastos' ? '' : 'none';

    filterSalesByMonth();
}

// Generar lista desplegable de filtro de vendedor
function generateSalesSellerFilter() {
    const select = document.getElementById('salesSellerFilter');
    const container = document.getElementById('salesSellerFilterContainer');
    if (!select) return;

    // Para vendedores, ocultar el filtro (solo ven sus propios datos)
    if (appData.userRole === 'vendedor') {
        if (container) container.style.display = 'none';
        return;
    }
    if (container) container.style.display = 'flex';

    const currentValue = select.value;
    select.innerHTML = '<option value="all">Todos</option>';
    const sellers = Array.isArray(appData.sellers) ? appData.sellers : [];
    sellers.forEach(seller => {
        const option = document.createElement('option');
        option.value = seller.name;
        option.textContent = seller.name;
        select.appendChild(option);
    });
    if (currentValue && [...select.options].some(o => o.value === currentValue)) {
        select.value = currentValue;
    }
}

// Generar lista desplegable de filtro de ciudad
function generateSalesCityFilterButtons() {
    const container = document.getElementById('salesCityFilterButtons');
    if (!container) return;

    container.innerHTML = '';

    const select = document.createElement('select');
    select.id = 'salesCitySelect';
    select.style.cssText = 'padding: 7px 12px; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 14px; font-weight: 600; color: #2c3e50; background: #fff; cursor: pointer; min-width: 160px; outline: none;';

    appData.inventories.forEach(inventory => {
        const option = document.createElement('option');
        option.value = inventory.id;
        option.textContent = inventory.name;
        if (inventory.id === selectedSalesCity) option.selected = true;
        select.appendChild(option);
    });

    select.addEventListener('change', () => filterSalesByCity(select.value));
    container.appendChild(select);
}

// Poblar el select de año con los años presentes en los datos
function populateSalesYearFilter() {
    const select = document.getElementById('salesYearFilter');
    if (!select) return;
    const currentValue = select.value;
    const years = new Set();
    const thisYear = String(new Date().getFullYear());
    years.add(thisYear);
    (appData.pdfHistory || []).forEach(entry => {
        const parts = entry.date.split(',')[0].trim().split('/');
        if (parts[2]) years.add(parts[2]);
    });
    (appData.gastos || []).forEach(g => {
        const parts = g.date.split(',')[0].trim().split('/');
        if (parts[2]) years.add(parts[2]);
    });
    select.innerHTML = '<option value="">Todos</option>';
    Array.from(years).sort((a, b) => b - a).forEach(y => {
        const option = document.createElement('option');
        option.value = y;
        option.textContent = y;
        select.appendChild(option);
    });
    select.value = (currentValue && [...select.options].some(o => o.value === currentValue)) ? currentValue : thisYear;
}

function openSales() {
    // Los vendedores siempre quedan limitados a su ciudad; en admin se conserva el filtro elegido.
    if (appData.userRole === 'vendedor' && appData.loggedSeller) {
        selectedSalesCity = appData.loggedSeller.city;
    } else if (!salesFiltersInitialized ||
        !appData.inventories.some(inventory => inventory.id === selectedSalesCity)) {
        selectedSalesCity = appData.inventories.length > 0 ? appData.inventories[0].id : 'cochabamba';
    }

    // Generar lista desplegable de ciudad y vendedor
    generateSalesCityFilterButtons();
    generateSalesSellerFilter();

    // Poblar el select de año y aplicar el período actual solo la primera vez.
    populateSalesYearFilter();
    if (!salesFiltersInitialized) {
        const today = new Date();
        document.getElementById('salesYearFilter').value = String(today.getFullYear());
        document.getElementById('salesMonthFilter').value = String(today.getMonth() + 1).padStart(2, '0');
        salesFiltersInitialized = true;
    }

    setActiveMenuButton('salesBtn');

    // Mostrar sección de ventas
    document.getElementById('mainContent').style.display = 'none';
    document.getElementById('estadisticasSection').style.display = 'none';
    document.getElementById('inventorySection').style.display = 'none';
    document.getElementById('salesSection').style.display = 'block';

    // Activar pestaña de cotizaciones por defecto
    switchMovimientosTab('cotizaciones');

    // Si es vendedor, deshabilitar el select de ciudad
    const citySelect = document.getElementById('salesCitySelect');
    if (citySelect) {
        if (appData.userRole === 'vendedor' && appData.loggedSeller) {
            citySelect.value = appData.loggedSeller.city;
            citySelect.disabled = true;
            citySelect.style.opacity = '0.5';
            citySelect.style.cursor = 'not-allowed';
        } else {
            citySelect.disabled = false;
            citySelect.style.opacity = '1';
            citySelect.style.cursor = 'pointer';
        }
    }
}

function renderCotizacionesTable(cotizaciones) {
    const tbody = document.getElementById('cotizacionesTableBody');
    if (!tbody) return;
    if (!cotizaciones || cotizaciones.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:30px; color:#7f8c8d;">No hay cotizaciones en este período</td></tr>';
        return;
    }
    tbody.innerHTML = '';
    cotizaciones.forEach((entry, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${index + 1}</td>
            <td>${entry.number}</td>
            <td>${entry.client.name || entry.client}</td>
            <td>${entry.seller.name || entry.seller}</td>
            <td style="color:#27ae60;">Bs ${(entry.total || 0).toFixed(2)}</td>
            <td>${entry.date}</td>
            <td style="white-space:nowrap;">
                <button class="btn-action-icon btn-action-primary" onclick="redownloadPDF(${entry.id})" title="Descargar PDF">📄</button>
                <button class="btn-action-icon btn-action-danger" onclick="deleteHistoryEntry(${entry.id})" title="Eliminar">🗑️</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function renderEntregasTable(entregas) {
    const tbody = document.getElementById('entregasTableBody');
    if (!tbody) return;
    if (!entregas || entregas.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:30px; color:#7f8c8d;">No hay notas de entrega en este período</td></tr>';
        return;
    }
    tbody.innerHTML = '';
    entregas.forEach((entry, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${index + 1}</td>
            <td>${entry.number}</td>
            <td>${entry.client.name || entry.client}</td>
            <td>${entry.seller.name || entry.seller}</td>
            <td>${entry.date}</td>
            <td style="white-space:nowrap;">
                <button class="btn-action-icon btn-action-primary" onclick="redownloadPDF(${entry.id})" title="Descargar PDF">📄</button>
                <button class="btn-action-icon btn-action-danger" onclick="deleteHistoryEntry(${entry.id})" title="Eliminar">🗑️</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function filterSalesByCity(city) {
    selectedSalesCity = city;
    const select = document.getElementById('salesCitySelect');
    if (select) select.value = city;
    filterSalesByMonth();
}

function filterSalesByMonth() {
    const selectedYear = document.getElementById('salesYearFilter').value;
    const selectedMonthVal = document.getElementById('salesMonthFilter').value;
    const tbody = document.getElementById('salesTableBody');
    tbody.innerHTML = '';
    const productColumnHeader = document.getElementById('thSalesProductColumn');
    if (productColumnHeader) productColumnHeader.textContent = selectedSalesProduct ? 'Cantidad del producto' : 'Productos';
    const isVendedor = appData.userRole === 'vendedor';
    const { mode, selectedDay } = getSalesDayFilterState();

    function matchesDate(entry) {
        const dateKey = getEntryDateLocalKey(entry);
        if (!dateKey) return false;

        if (selectedYear) {
            const { year } = getDatePartsFromEntry(entry);
            if (year !== selectedYear) return false;
        }

        if (selectedMonthVal) {
            const { month } = getDatePartsFromEntry(entry);
            if ((month || '').padStart(2, '0') !== selectedMonthVal) return false;
        }

        if (mode === 'today') {
            return dateKey === getTodayLocalDateKey();
        }

        if (mode === 'custom' && selectedDay) {
            return dateKey === selectedDay;
        }

        return true;
    }

    function matchesMonth(entry) {
        return matchesDate(entry);
    }

    function matchesCityAndSeller(entry) {
        if (entry.city !== selectedSalesCity) return false;
        if (isVendedor && appData.loggedSeller) {
            return entryMatchesSeller(entry, appData.loggedSeller.name);
        }
        const sellerFilter = document.getElementById('salesSellerFilter');
        if (sellerFilter && sellerFilter.value !== 'all') {
            return entryMatchesSeller(entry, sellerFilter.value);
        }
        return true;
    }

    const filteredCotizaciones = appData.pdfHistory
        .filter(e => e.type === 'cotizacion' && matchesCityAndSeller(e) && matchesMonth(e))
        .sort((a, b) => parseDateStr(b.date) - parseDateStr(a.date));
    renderCotizacionesTable(filteredCotizaciones);

    const filteredEntregas = appData.pdfHistory
        .filter(e => e.type === 'notaentrega' && matchesCityAndSeller(e) && matchesMonth(e))
        .sort((a, b) => parseDateStr(b.date) - parseDateStr(a.date));
    renderEntregasTable(filteredEntregas);

    const allGastos = Array.isArray(appData.gastos) ? appData.gastos : [];
    let filteredGastos = allGastos.filter(g => g.city === selectedSalesCity);
    if (appData.userRole === 'vendedor' && appData.loggedSeller) {
        filteredGastos = filteredGastos.filter(g => g.seller === appData.loggedSeller.name);
    } else {
        const sellerFilter = document.getElementById('salesSellerFilter');
        if (sellerFilter && sellerFilter.value !== 'all') {
            filteredGastos = filteredGastos.filter(g => g.seller === sellerFilter.value);
        }
    }
    filteredGastos = filteredGastos.filter(g => matchesDate(g));
    const totalGastos = filteredGastos.reduce((sum, g) => sum + (g.amount || 0), 0);

    let sales = appData.pdfHistory.filter(entry => {
        if (entry.type !== 'notaventa' || entry.city !== selectedSalesCity) return false;
        if (!matchesDate(entry)) return false;
        if (isVendedor && appData.loggedSeller) {
            if (!entryMatchesSeller(entry, appData.loggedSeller.name)) return false;
        } else {
            const sellerFilter = document.getElementById('salesSellerFilter');
            if (sellerFilter && sellerFilter.value !== 'all') {
                if (!entryMatchesSeller(entry, sellerFilter.value)) return false;
            }
        }
        return !selectedSalesProduct || getMatchingSaleItems(entry).length > 0;
    });

    let salesReportRows = [];
    if (sales.length === 0) {
        currentProductSalesResults = [];
        const cols = isVendedor ? 9 : 11;
        tbody.innerHTML = `<tr><td colspan="${cols}" style="text-align: center; padding: 30px; color: #7f8c8d;">${mode === 'all' ? 'No hay ventas registradas' : 'No hay ventas registradas para esta fecha.'}</td></tr>`;
        const productSummary = updateSalesProductSummary([]);
        updateSalesTotals([], [0, 0, totalGastos]);
        renderGastosTable(filteredGastos);
        currentMovementsReportSnapshot = createCurrentMovementsReportSnapshot({
            cotizaciones: filteredCotizaciones,
            salesRows: salesReportRows,
            entregas: filteredEntregas,
            gastos: filteredGastos,
            productSummary,
            totals: { cost: 0, price: 0, expenses: totalGastos }
        });
        updateSalesExportContext();
        return;
    }

    const filteredSales = sales.slice().sort((a, b) => {
        const dateDifference = parseDateStr(b.date) - parseDateStr(a.date);
        if (Number.isFinite(dateDifference) && dateDifference !== 0) return dateDifference;
        const numberDifference = String(b.number == null ? '' : b.number)
            .localeCompare(String(a.number == null ? '' : a.number), undefined, { numeric: true });
        if (numberDifference !== 0) return numberDifference;
        return String(b.id == null ? '' : b.id).localeCompare(String(a.id == null ? '' : a.id), undefined, { numeric: true });
    });
    currentProductSalesResults = selectedSalesProduct ? filteredSales : [];
    const productSummary = updateSalesProductSummary(filteredSales);

    if (filteredSales.length === 0) {
        const cols = isVendedor ? 9 : 11;
        tbody.innerHTML = `<tr><td colspan="${cols}" style="text-align: center; padding: 30px; color: #7f8c8d;">No hay ventas en el período seleccionado</td></tr>`;
        const emptyProductSummary = updateSalesProductSummary([]);
        updateSalesTotals([], [0, 0, totalGastos]);
        renderGastosTable(filteredGastos);
        currentMovementsReportSnapshot = createCurrentMovementsReportSnapshot({
            cotizaciones: filteredCotizaciones,
            salesRows: salesReportRows,
            entregas: filteredEntregas,
            gastos: filteredGastos,
            productSummary: emptyProductSummary,
            totals: { cost: 0, price: 0, expenses: totalGastos }
        });
        updateSalesExportContext();
        return;
    }

    let totalCost = 0;
    let totalPrice = 0;
    let totalEfectivo = 0;
    let totalTransferencia = 0;
    let totalCheque = 0;
    let totalSinMetodo = 0;

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
            const pm = (sale.paymentMethod || '').toUpperCase();
            if (pm === 'EFECTIVO') totalEfectivo += salePrice;
            else if (pm === 'TRANSFERENCIA BANCARIA') totalTransferencia += salePrice;
            else if (pm === 'CHEQUE') totalCheque += salePrice;
            else totalSinMetodo += salePrice;
        }

        // Resumen de productos
        const productCount = sale.items ? sale.items.length : 0;
        const productSummary = `${productCount} producto${productCount !== 1 ? 's' : ''}`;
        const selectedProductQuantity = getMatchingSaleItems(sale).reduce((sum, item) => sum + getSaleItemQuantity(item), 0);
        salesReportRows.push({
            number: sale.number == null ? '' : sale.number,
            client: getMovementReportClient(sale),
            seller: getMovementReportSeller(sale),
            productCount,
            productQuantity: selectedProductQuantity,
            cost: saleCost,
            price: Number(salePrice) || 0,
            profit,
            paymentMethod: sale.paymentMethod || '—',
            date: sale.date || '',
            cancelled: sale.cancelled === true,
            status: sale.cancelled === true ? 'ANULADA' : sale.invoiced === true ? 'FACTURADA' : 'VIGENTE'
        });

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

        // Agregar clase visual si está anulada
        if (isCancelled) {
            tr.classList.add('cancelled-sale');
        }

        const paymentBadge = sale.paymentMethod ? `<span style="font-size:11px; padding:2px 6px; border-radius:10px; background:#ecf0f1; color:#555;">${sale.paymentMethod}</span>` : '<span style="color:#bbb; font-size:11px;">—</span>';

        tr.innerHTML = `
            <td>${index + 1}</td>
            <td>${sale.number}</td>
            <td>${sale.client.name || sale.client}</td>
            <td>${sale.seller.name || sale.seller}</td>
            <td>${selectedSalesProduct ? selectedProductQuantity : productSummary}</td>
            <td style="color: #e74c3c;${isVendedor ? ' display:none;' : ''}">Bs ${saleCost.toFixed(2)}</td>
            <td style="color: #27ae60;">Bs ${salePrice.toFixed(2)}</td>
            <td style="color: ${profit >= 0 ? '#3498db' : '#e74c3c'}; font-weight: bold;${isVendedor ? ' display:none;' : ''}">Bs ${profit.toFixed(2)}</td>
            <td style="white-space:nowrap;">${paymentBadge}</td>
            <td>${sale.date}</td>
            <td style="white-space: nowrap;">
                <div class="actions-menu-container">
                    <button class="btn-menu-toggle" onclick="toggleActionsMenu(event, ${sale.id})" title="Acciones">☰</button>
                    <div class="actions-dropdown" id="menu-${sale.id}">
                        <button class="view-pdf" onclick="openSalesDetail(${sale.id}); closeActionsMenu(${sale.id})">
                            🔎 Ver detalle
                        </button>
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

    // Gastos ya calculados al inicio — renderizar y actualizar totales
    renderGastosTable(filteredGastos);
    updateSalesTotals(filteredSales, [totalCost, totalPrice, totalGastos]);
    currentMovementsReportSnapshot = createCurrentMovementsReportSnapshot({
        cotizaciones: filteredCotizaciones,
        salesRows: salesReportRows,
        entregas: filteredEntregas,
        gastos: filteredGastos,
        productSummary,
        totals: { cost: totalCost, price: totalPrice, expenses: totalGastos }
    });
    updateSalesExportContext();
}

function renderGastosTable(gastos) {
    const tbody = document.getElementById('gastosTableBody');
    if (!tbody) return;

    if (!gastos || gastos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" style="text-align:center; padding:30px; color:#7f8c8d;">No hay gastos en este período</td></tr>';
        return;
    }

    tbody.innerHTML = '';
    gastos.forEach((g, index) => {
        const cityName = (appData.inventories.find(i => i.id === g.city) || {}).name || g.city || '';
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${index + 1}</td>
            <td>${g.concept}</td>
            <td>${g.category}</td>
            <td style="color:#e67e22; font-weight:bold;">Bs ${(g.amount || 0).toFixed(2)}</td>
            <td>${cityName}</td>
            <td>${g.seller || '—'}</td>
            <td>${g.date}</td>
            <td>${g.paymentMethod || '—'}</td>
            <td>${g.notes || '-'}</td>
            <td><button onclick="deleteGasto(${g.id})" style="background:none; border:1px solid #e74c3c; color:#e74c3c; border-radius:4px; padding:3px 8px; cursor:pointer; font-size:12px;">🗑 Eliminar</button></td>
        `;
        tbody.appendChild(tr);
    });
}

function updateSalesTotals(sales, totals) {
    const [totalCost, totalPrice, totalGastos] = totals;
    const gananciaLiquida = (totalPrice || 0) - (totalCost || 0) - (totalGastos || 0);

    const costEl = document.getElementById('totalCostSales');
    const priceEl = document.getElementById('totalPriceSales');
    const gastosEl = document.getElementById('totalGastosSales');
    const gananciaEl = document.getElementById('gananciaLiquidaSales');

    if (costEl) costEl.textContent = `Bs ${(totalCost || 0).toFixed(2)}`;
    if (priceEl) priceEl.textContent = `Bs ${(totalPrice || 0).toFixed(2)}`;
    if (gastosEl) gastosEl.textContent = `Bs ${(totalGastos || 0).toFixed(2)}`;
    if (gananciaEl) {
        gananciaEl.textContent = `Bs ${gananciaLiquida.toFixed(2)}`;
        gananciaEl.style.color = gananciaLiquida >= 0 ? '#3498db' : '#e74c3c';
    }
}

function getMovementReportClient(entry) {
    const client = entry && entry.client;
    if (client && typeof client === 'object') return client.name || client.company || 'Cliente no registrado';
    return String(client || '').trim() || 'Cliente no registrado';
}

function getMovementReportSeller(entry) {
    const seller = entry && entry.seller;
    if (seller && typeof seller === 'object') return seller.name || '—';
    return String(seller || '').trim() || '—';
}

function getCurrentMovementFilterDescription(operation) {
    const year = document.getElementById('salesYearFilter')?.value || 'Todos';
    const monthSelect = document.getElementById('salesMonthFilter');
    const month = monthSelect && monthSelect.value
        ? monthSelect.options[monthSelect.selectedIndex].text
        : 'Todos';
    const { mode, selectedDay } = getSalesDayFilterState();
    const day = mode === 'today' ? 'Hoy' : mode === 'custom' ? (selectedDay || 'Sin fecha') : 'Todos';
    const seller = appData.userRole === 'vendedor' && appData.loggedSeller
        ? appData.loggedSeller.name
        : (document.getElementById('salesSellerFilter')?.value || 'all') === 'all'
            ? 'Todos'
            : document.getElementById('salesSellerFilter').value;
    const inventory = (appData.inventories || []).find(item => item.id === selectedSalesCity);
    const product = operation === 'ventas' && selectedSalesProduct
        ? (selectedSalesProduct.description || selectedSalesProduct.code || `ID ${selectedSalesProduct.id}`)
        : 'Sin selección';
    return {
        city: inventory ? inventory.name : selectedSalesCity,
        seller,
        product,
        year,
        month,
        day,
        description: `Sucursal: ${inventory ? inventory.name : selectedSalesCity} | Vendedor: ${seller} | Año: ${year} | Mes: ${month} | Día: ${day}${operation === 'ventas' && selectedSalesProduct ? ` | Producto: ${product}` : ''}`
    };
}

function createCurrentMovementsReportSnapshot(data) {
    const operationSelect = document.getElementById('movimientosTipoSelect');
    const operation = operationSelect ? operationSelect.value : 'ventas';
    const operationLabels = {
        cotizaciones: 'Cotizaciones',
        ventas: 'Notas de Venta',
        entregas: 'Notas de Entrega',
        gastos: 'Gastos'
    };
    const filters = getCurrentMovementFilterDescription(operation);
    const productIsActive = operation === 'ventas' && Boolean(selectedSalesProduct);
    const productRows = productIsActive ? getProductSalesReportRows() : [];
    const productSummary = data.productSummary || {
        product: productIsActive ? filters.product : null,
        units: 0,
        notes: 0,
        movements: data.salesRows.length,
        amount: 0,
        amountReliable: true
    };
    const operationRecords = {
        cotizaciones: data.cotizaciones.map(entry => ({
            number: entry.number == null ? '' : entry.number,
            client: getMovementReportClient(entry),
            seller: getMovementReportSeller(entry),
            total: Number(entry.total) || 0,
            date: entry.date || ''
        })),
        ventas: data.salesRows.map((row, index) => ({
            ...row,
            productLineAmount: productRows[index] ? productRows[index].amount : null,
            productLineAmountReliable: productRows[index] ? productRows[index].amount !== null : false
        })),
        entregas: data.entregas.map(entry => ({
            number: entry.number == null ? '' : entry.number,
            client: getMovementReportClient(entry),
            seller: getMovementReportSeller(entry),
            date: entry.date || ''
        })),
        gastos: data.gastos.map(entry => ({
            concept: entry.concept || '',
            category: entry.category || '',
            amount: Number(entry.amount) || 0,
            city: filters.city,
            seller: entry.seller || '—',
            date: entry.date || '',
            paymentMethod: entry.paymentMethod || '—',
            notes: entry.notes || ''
        }))
    };
    const records = operationRecords[operation] || [];
    const validSales = operationRecords.ventas.filter(row => !row.cancelled);
    const cancelledSales = operationRecords.ventas.filter(row => row.cancelled);
    let summary;
    if (operation === 'ventas') {
        summary = [
            ['Notas encontradas', operationRecords.ventas.length],
            ['Notas vigentes', validSales.length],
            ['Notas anuladas', cancelledSales.length],
            ['Costo total (cálculo de pantalla; catálogo actual)', Number(data.totals.cost.toFixed(2))],
            ['Importe total de notas vigentes', Number(data.totals.price.toFixed(2))],
            ['Gastos filtrados', Number(data.totals.expenses.toFixed(2))],
            ['Ganancia líquida (cálculo de pantalla)', Number((data.totals.price - data.totals.cost - data.totals.expenses).toFixed(2))],
            ['Nota', 'El costo usa el costo actual del catálogo, igual que la pantalla; no se presenta como costo histórico confirmado.']
        ];
        if (productIsActive) {
            summary.push(
                ['Producto', productSummary.product || filters.product],
                ['Notas con producto (incluye anuladas)', productSummary.movements],
                ['Notas vigentes con producto', productSummary.notes],
                ['Unidades vigentes del producto', productSummary.units],
                ['Importe vigente de líneas del producto', productSummary.amountReliable ? Number(productSummary.amount.toFixed(2)) : 'No disponible: datos históricos incompletos']
            );
        }
    } else if (operation === 'cotizaciones') {
        summary = [['Cotizaciones encontradas', records.length], ['Total de cotizaciones (Bs)', Number(records.reduce((sum, row) => sum + row.total, 0).toFixed(2))]];
    } else if (operation === 'entregas') {
        summary = [['Notas de entrega encontradas', records.length]];
    } else {
        summary = [['Gastos encontrados', records.length], ['Total de gastos (Bs)', Number(records.reduce((sum, row) => sum + row.amount, 0).toFixed(2))]];
    }

    return {
        operation,
        operationLabel: operationLabels[operation] || operationLabels.ventas,
        city: filters.city,
        filters,
        filterDescription: filters.description,
        records,
        summary,
        product: productIsActive ? { ...selectedSalesProduct } : null,
        generatedAt: new Date().toISOString()
    };
}

function getMovementsReportTable(snapshot) {
    const records = snapshot.records;
    if (snapshot.operation === 'cotizaciones') {
        return {
            columns: [
                { label: 'N.º', format: 'number' }, { label: 'N.º documento' }, { label: 'Cliente' },
                { label: 'Vendedor' }, { label: 'Total (Bs)', format: 'currency' }, { label: 'Fecha', format: 'date' }
            ],
            rows: records.map((row, index) => [index + 1, row.number, row.client, row.seller, row.total, row.date])
        };
    }
    if (snapshot.operation === 'entregas') {
        return {
            columns: [
                { label: 'N.º', format: 'number' }, { label: 'N.º documento' }, { label: 'Cliente' },
                { label: 'Vendedor' }, { label: 'Fecha', format: 'date' }
            ],
            rows: records.map((row, index) => [index + 1, row.number, row.client, row.seller, row.date])
        };
    }
    if (snapshot.operation === 'gastos') {
        return {
            columns: [
                { label: 'N.º', format: 'number' }, { label: 'Concepto' }, { label: 'Categoría' },
                { label: 'Monto (Bs)', format: 'currency' }, { label: 'Ciudad' }, { label: 'Vendedor' },
                { label: 'Fecha', format: 'date' }, { label: 'Método de pago' }, { label: 'Notas' }
            ],
            rows: records.map((row, index) => [index + 1, row.concept, row.category, row.amount, row.city, row.seller, row.date, row.paymentMethod, row.notes])
        };
    }
    const isProductView = Boolean(snapshot.product);
    const columns = [
        { label: 'N.º', format: 'number' }, { label: 'N.º nota de venta' }, { label: 'Cliente' },
        { label: 'Vendedor' }, { label: isProductView ? 'Cantidad del producto' : 'Productos', format: 'number' }
    ];
    if (isProductView) columns.push({ label: 'Importe líneas producto (Bs)', format: 'currency' });
    columns.push(
        { label: 'Total nota (Bs)', format: 'currency' },
        { label: 'Costo catálogo actual (Bs)', format: 'currency' },
        { label: 'Ganancia según pantalla (Bs)', format: 'currency' },
        { label: 'Método de pago' },
        { label: 'Fecha', format: 'date' },
        { label: 'Estado' }
    );
    return {
        columns,
        rows: records.map((row, index) => {
            const values = [index + 1, row.number, row.client, row.seller, isProductView ? row.productQuantity : row.productCount];
            if (isProductView) values.push(row.productLineAmountReliable ? row.productLineAmount : 'No disponible');
            values.push(row.price, row.cost, row.profit, row.paymentMethod, row.date, row.status);
            return values;
        })
    };
}

function generateMovementsReportExcel(snapshot) {
    if (!window.XLSX) throw new Error('La librería de Excel no está disponible.');
    const table = getMovementsReportTable(snapshot);
    const generatedAt = new Date(snapshot.generatedAt);
    const rows = [
        ['CIAM – EQUIPOS DE LIMPIEZA INDUSTRIAL'],
        [`REPORTE DE ${snapshot.operationLabel.toUpperCase()}`],
        ['Generado', generatedAt.toLocaleString('es-BO')],
        ['Filtros', snapshot.filterDescription],
        [],
        ...snapshot.summary.map(([label, value]) => [label, value]),
        [],
        table.columns.map(column => column.label),
        ...table.rows
    ];
    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    const headerRow = snapshot.summary.length + 6;
    const lastRow = headerRow + table.rows.length;
    worksheet['!cols'] = table.columns.map(column => ({ wch: Math.max(12, Math.min(34, column.label.length + 5)) }));
    if (table.rows.length) {
        worksheet['!autofilter'] = { ref: `${XLSX.utils.encode_col(0)}${headerRow + 1}:${XLSX.utils.encode_col(table.columns.length - 1)}${lastRow + 1}` };
        worksheet['!freeze'] = { xSplit: 0, ySplit: headerRow + 1, topLeftCell: `A${headerRow + 2}`, activePane: 'bottomLeft', state: 'frozen' };
        table.rows.forEach((row, rowIndex) => {
            table.columns.forEach((column, columnIndex) => {
                const cell = worksheet[XLSX.utils.encode_cell({ r: headerRow + rowIndex + 1, c: columnIndex })];
                if (!cell) return;
                if (column.format === 'date') {
                    const dateValue = getReportDateValue(cell.v);
                    if (dateValue instanceof Date && Number.isFinite(dateValue.getTime())) {
                        cell.v = dateValue;
                        cell.t = 'd';
                        cell.z = 'dd/mm/yyyy hh:mm:ss';
                    }
                } else if (column.format === 'currency' && typeof cell.v === 'number') {
                    cell.z = '"Bs" #,##0.00';
                } else if (column.format === 'number' && typeof cell.v === 'number') {
                    cell.z = '#,##0.###';
                }
            });
        });
    }
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Movimientos');
    XLSX.writeFile(workbook, `CIAM_Movimientos_${sanitizeReportFilePart(snapshot.operationLabel)}_${getTodayLocalDateKey()}.xlsx`);
}

function generateMovementsReportPDF(snapshot) {
    if (!window.jspdf || !window.jspdf.jsPDF) throw new Error('La librería PDF no está disponible.');
    const table = getMovementsReportTable(snapshot);
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 10;
    const widths = table.columns.map(column => Math.max(15, (pageWidth - margin * 2) / table.columns.length));
    const tableWidth = widths.reduce((sum, width) => sum + width, 0);

    function drawTableHeader(y) {
        doc.setFillColor(52, 73, 94);
        doc.rect(margin, y, tableWidth, 8, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(255, 255, 255);
        let x = margin + 1;
        table.columns.forEach((column, index) => {
            doc.text(column.label, x, y + 5.2, { maxWidth: widths[index] - 2 });
            x += widths[index];
        });
        doc.setTextColor(30, 30, 30);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
    }

    let contentY = 13;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(52, 73, 94);
    doc.setFontSize(14);
    doc.text('CIAM – EQUIPOS DE LIMPIEZA INDUSTRIAL', margin, contentY);
    contentY += 8;
    doc.setFontSize(12);
    doc.text(`REPORTE DE ${snapshot.operationLabel.toUpperCase()}`, margin, contentY);
    contentY += 7;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(40, 40, 40);
    doc.setFontSize(8);
    doc.text(`Generado: ${new Date(snapshot.generatedAt).toLocaleString('es-BO')}`, margin, contentY);
    contentY += 5;
    const filterLines = doc.splitTextToSize(`Filtros: ${snapshot.filterDescription}`, pageWidth - margin * 2);
    doc.text(filterLines, margin, contentY);
    contentY += filterLines.length * 4;
    snapshot.summary.forEach(([label, value]) => {
        const summaryLines = doc.splitTextToSize(`${label}: ${value}`, pageWidth - margin * 2);
        doc.text(summaryLines, margin, contentY);
        contentY += summaryLines.length * 4;
    });
    const headerY = contentY + 2;
    if (headerY > pageHeight - 20) {
        doc.addPage();
        contentY = margin;
    }
    drawTableHeader(headerY <= pageHeight - 20 ? headerY : margin);
    let y = (headerY <= pageHeight - 20 ? headerY : margin) + 12;

    table.rows.forEach(row => {
        const cells = row.map((value, index) => {
            if (table.columns[index].format === 'currency' && typeof value === 'number') return `Bs ${value.toFixed(2)}`;
            return String(value == null ? '' : value);
        });
        const lines = cells.map((value, index) => doc.splitTextToSize(value, widths[index] - 2));
        const rowHeight = Math.max(7, ...lines.map(value => value.length * 3.2 + 2));
        if (y + rowHeight > pageHeight - 10) {
            doc.addPage();
            drawTableHeader(margin);
            y = margin + 12;
        }
        let x = margin + 1;
        lines.forEach((value, index) => {
            doc.text(value, x, y + 3.5, { maxWidth: widths[index] - 2 });
            x += widths[index];
        });
        doc.setDrawColor(225, 225, 225);
        doc.line(margin, y + rowHeight, margin + tableWidth, y + rowHeight);
        y += rowHeight;
    });

    const pageCount = doc.internal.getNumberOfPages();
    for (let page = 1; page <= pageCount; page++) {
        doc.setPage(page);
        doc.setFontSize(7);
        doc.setTextColor(130, 130, 130);
        doc.text(`Página ${page} de ${pageCount}`, pageWidth - margin, pageHeight - 5, { align: 'right' });
    }
    doc.save(`CIAM_Movimientos_${sanitizeReportFilePart(snapshot.operationLabel)}_${getTodayLocalDateKey()}.pdf`);
}

function getLegacyGeneralSalesReportData(selectedYear, selectedMonthVal, mode, selectedDay, isVendedor) {
    const sales = (appData.pdfHistory || []).filter(entry => {
        if (entry.type !== 'notaventa') return false;
        if (entry.city !== selectedSalesCity) return false;
        if (isVendedor && !(entry.seller && entry.seller.name === appData.loggedSeller.name)) return false;

        const { year, month } = getDatePartsFromEntry(entry);
        if (selectedYear && year !== selectedYear) return false;
        if (selectedMonthVal && (month || '').padStart(2, '0') !== selectedMonthVal) return false;
        if (mode === 'today' && getEntryDateLocalKey(entry) !== getTodayLocalDateKey()) return false;
        if (mode === 'custom' && selectedDay && getEntryDateLocalKey(entry) !== selectedDay) return false;
        return true;
    }).sort((a, b) => parseDateStr(b.date) - parseDateStr(a.date));

    const allGastos = Array.isArray(appData.gastos) ? appData.gastos : [];
    const filteredGastos = isVendedor ? [] : allGastos.filter(g => {
        if (g.city !== selectedSalesCity) return false;
        const { year, month } = getDatePartsFromEntry(g);
        if (selectedYear && year !== selectedYear) return false;
        if (selectedMonthVal && (month || '').padStart(2, '0') !== selectedMonthVal) return false;
        if (mode === 'today' && getEntryDateLocalKey(g) !== getTodayLocalDateKey()) return false;
        if (mode === 'custom' && selectedDay && getEntryDateLocalKey(g) !== selectedDay) return false;
        return true;
    });

    return { sales, filteredGastos };
}

function generateLegacySalesExcel() {
    if (!window.XLSX) throw new Error('La librería de Excel no está disponible.');

    const selectedYear = document.getElementById('salesYearFilter').value;
    const selectedMonthVal = document.getElementById('salesMonthFilter').value;
    const { mode, selectedDay } = getSalesDayFilterState();
    const isVendedor = appData.userRole === 'vendedor' && appData.loggedSeller;
    const { sales, filteredGastos } = getLegacyGeneralSalesReportData(
        selectedYear,
        selectedMonthVal,
        mode,
        selectedDay,
        isVendedor
    );
    if (!sales.length && !filteredGastos.length) {
        throw new Error('No hay movimientos disponibles para los filtros seleccionados.');
    }

    const inventory = (appData.inventories || []).find(item => item.id === selectedSalesCity);
    const cityName = inventory ? inventory.name : selectedSalesCity;
    const summaryRows = [];
    const salesCostValues = [];
    const salesRows = sales.map((sale, index) => {
        let saleCost = 0;
        (Array.isArray(sale.items) ? sale.items : []).forEach(item => {
            const product = (appData.products || []).find(p => p.id === item.id);
            if (product && product.cost) saleCost += product.cost * item.quantity;
        });
        salesCostValues.push(saleCost);
        const client = typeof sale.client === 'object' && sale.client
            ? (sale.client.name || sale.client.company || '')
            : (sale.client || '');
        const seller = typeof sale.seller === 'object' && sale.seller
            ? sale.seller.name || ''
            : (sale.seller || '');
        return [
            index + 1,
            sale.number == null ? '' : sale.number,
            client,
            seller,
            Array.isArray(sale.items) ? sale.items.length : 0,
            Number(saleCost.toFixed(2)),
            Number(sale.total || 0),
            getReportDateValue(sale.date),
            sale.cancelled ? 'ANULADA' : sale.invoiced ? 'FACTURADA' : 'VENDIDO'
        ];
    });

    let totalCost = 0;
    let totalPrice = 0;
    let validSalesCount = 0;
    let cancelledSalesCount = 0;
    let invoicedSalesCount = 0;
    const paymentSummary = { efectivo: 0, qr: 0, cheque: 0 };
    sales.forEach((sale, index) => {
        if (sale.cancelled) {
            cancelledSalesCount++;
            return;
        }
        validSalesCount++;
        if (sale.invoiced) invoicedSalesCount++;
        totalCost += salesCostValues[index];
        const price = Number(sale.total || 0);
        totalPrice += price;
        const paymentMethod = (sale.paymentMethod || '').trim().toUpperCase();
        if (paymentMethod.includes('EFECTIVO')) paymentSummary.efectivo += price;
        else if (paymentMethod.includes('QR') || paymentMethod.includes('TRANSFERENCIA')) paymentSummary.qr += price;
        else if (paymentMethod.includes('CHEQUE')) paymentSummary.cheque += price;
    });
    const totalExpenses = filteredGastos.reduce((sum, gasto) => sum + (Number(gasto.amount) || 0), 0);
    summaryRows.push(
        ['CIAM – EQUIPOS DE LIMPIEZA INDUSTRIAL'],
        ['REPORTE GENERAL DE MOVIMIENTOS DE VENTA'],
        ['Ciudad / sucursal', cityName],
        ['Período', getSalesReportPeriodLabel(selectedYear, selectedMonthVal, mode, selectedDay)],
        ['Vendedor', isVendedor ? appData.loggedSeller.name : 'Todos'],
        ['Generado', new Date().toLocaleString('es-BO')],
        [],
        ['Resumen de ventas'],
        ['Total de notas', sales.length],
        ['Ventas válidas', validSalesCount],
        ['Facturadas', invoicedSalesCount],
        ['Anuladas', cancelledSalesCount],
        ['Costo total (ventas válidas)', Number(totalCost.toFixed(2))],
        ['Ingreso total (ventas válidas)', Number(totalPrice.toFixed(2))],
        ['Efectivo', Number(paymentSummary.efectivo.toFixed(2))],
        ['QR / Transferencia', Number(paymentSummary.qr.toFixed(2))],
        ['Cheque', Number(paymentSummary.cheque.toFixed(2))],
        ['Total gastos', Number(totalExpenses.toFixed(2))],
        ['Ganancia líquida', Number((totalPrice - totalCost - totalExpenses).toFixed(2))]
    );

    const workbook = XLSX.utils.book_new();
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
    summarySheet['!cols'] = [{ wch: 38 }, { wch: 36 }];
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumen');

    const salesSheet = XLSX.utils.aoa_to_sheet([
        ['N.º', 'N.º de venta', 'Cliente', 'Vendedor', 'Productos', 'Costo (Bs)', 'Precio (Bs)', 'Fecha', 'Estado'],
        ...salesRows
    ]);
    salesSheet['!cols'] = [
        { wch: 8 }, { wch: 18 }, { wch: 32 }, { wch: 24 }, { wch: 12 },
        { wch: 16 }, { wch: 16 }, { wch: 22 }, { wch: 14 }
    ];
    if (salesRows.length) {
        salesSheet['!autofilter'] = { ref: `A1:I${salesRows.length + 1}` };
        salesSheet['!freeze'] = { xSplit: 0, ySplit: 1, topLeftCell: 'A2', activePane: 'bottomLeft', state: 'frozen' };
        for (let rowIndex = 1; rowIndex <= salesRows.length; rowIndex++) {
            const dateCell = salesSheet[XLSX.utils.encode_cell({ r: rowIndex, c: 7 })];
            if (dateCell) dateCell.z = 'dd/mm/yyyy hh:mm:ss';
            [5, 6].forEach(column => {
                const amountCell = salesSheet[XLSX.utils.encode_cell({ r: rowIndex, c: column })];
                if (amountCell) amountCell.z = '"Bs" #,##0.00';
            });
        }
    }
    XLSX.utils.book_append_sheet(workbook, salesSheet, 'Ventas');

    const gastosRows = filteredGastos.map((gasto, index) => [
        index + 1,
        gasto.concept || '',
        gasto.category || '',
        Number(gasto.amount || 0),
        gasto.date || '',
        gasto.paymentMethod || '',
        gasto.notes || ''
    ]);
    const gastosSheet = XLSX.utils.aoa_to_sheet([
        ['N.º', 'Concepto', 'Categoría', 'Monto (Bs)', 'Fecha', 'Método de pago', 'Notas'],
        ...gastosRows
    ]);
    gastosSheet['!cols'] = [{ wch: 8 }, { wch: 34 }, { wch: 22 }, { wch: 16 }, { wch: 22 }, { wch: 22 }, { wch: 40 }];
    if (gastosRows.length) {
        gastosSheet['!autofilter'] = { ref: `A1:G${gastosRows.length + 1}` };
        gastosSheet['!freeze'] = { xSplit: 0, ySplit: 1, topLeftCell: 'A2', activePane: 'bottomLeft', state: 'frozen' };
        for (let rowIndex = 1; rowIndex <= gastosRows.length; rowIndex++) {
            const amountCell = gastosSheet[XLSX.utils.encode_cell({ r: rowIndex, c: 3 })];
            if (amountCell) amountCell.z = '"Bs" #,##0.00';
        }
    }
    XLSX.utils.book_append_sheet(workbook, gastosSheet, 'Gastos');

    const datePart = getTodayLocalDateKey();
    XLSX.writeFile(workbook, `Reporte_Ventas_${sanitizeReportFilePart(cityName)}_${datePart}.xlsx`);
}

function getSalesReportPeriodLabel(selectedYear, selectedMonthVal, mode, selectedDay) {
    if (mode === 'today') return 'Hoy';
    if (mode === 'custom' && selectedDay) return selectedDay;
    if (selectedMonthVal && selectedYear) return `${selectedMonthVal}/${selectedYear}`;
    if (selectedYear) return selectedYear;
    return 'Todos los movimientos';
}

function generateLegacySalesPDF() {
    const selectedYear = document.getElementById('salesYearFilter').value;
    const selectedMonthVal = document.getElementById('salesMonthFilter').value;
    const { mode, selectedDay } = getSalesDayFilterState();
    const dayModeLabel = mode === 'today' ? 'hoy' : mode === 'custom' && selectedDay ? selectedDay : 'todos';

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
    doc.text(appData.company.name.toUpperCase(), margin + 35, yPos + 8);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text((appData.company.slogan || '').toUpperCase(), margin + 35, yPos + 15);
    
    if (appData.company.nit) {
        doc.text(`NIT: ${appData.company.nit.toUpperCase()}`, margin + 35, yPos + 21);
    }

    yPos += 40;
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    const inventory = appData.inventories.find(inv => inv.id === selectedSalesCity);
    const cityTitle = inventory ? inventory.name.toUpperCase() : selectedSalesCity.toUpperCase();
    doc.text(`REPORTE DE VENTAS - ${cityTitle}`, pageWidth / 2, yPos, { align: 'center' });

    yPos += 8;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    let periodoText = 'Todos los movimientos';
    if (mode === 'today') {
        periodoText = `Día: ${new Date().toLocaleDateString('es-ES')}`;
    } else if (mode === 'custom' && selectedDay) {
        const dateObj = new Date(`${selectedDay}T00:00:00`);
        periodoText = `Día: ${dateObj.toLocaleDateString('es-ES')}`;
    } else if (selectedMonthVal && selectedYear) {
        periodoText = `${monthNames[parseInt(selectedMonthVal) - 1]} ${selectedYear}`;
    } else if (selectedYear) {
        periodoText = `Año ${selectedYear}`;
    }
    doc.text(`Período: ${periodoText}`, pageWidth / 2, yPos, { align: 'center' });

    const isVendedor = appData.userRole === 'vendedor' && appData.loggedSeller;
    const { sales, filteredGastos } = getLegacyGeneralSalesReportData(
        selectedYear,
        selectedMonthVal,
        mode,
        selectedDay,
        isVendedor
    );

    // Calcular totales (solo ventas NO anuladas)
    let totalCost = 0;
    let totalPrice = 0;
    let validSalesCount = 0;
    let cancelledSalesCount = 0;
    let invoicedSalesCount = 0;
    
    sales.forEach(sale => {
        const isCancelled = sale.cancelled === true;
        const isInvoiced = sale.invoiced === true;
        
        if (isCancelled) {
            cancelledSalesCount++;
        } else {
            validSalesCount++;
            if (isInvoiced) {
                invoicedSalesCount++;
            }
        }
        
        // Solo sumar al total si NO está anulada
        if (!isCancelled) {
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
        }
    });

    const balance = totalPrice - totalCost;

    const paymentSummary = {
        efectivo: 0,
        qr: 0,
        cheque: 0,
    };

    sales.forEach(sale => {
        if (sale.cancelled) return;
        const paymentValue = Number(sale.total || 0);
        const pm = (sale.paymentMethod || '').trim().toUpperCase();
        if (pm.includes('EFECTIVO')) paymentSummary.efectivo += paymentValue;
        else if (pm.includes('QR') || pm.includes('TRANSFERENCIA')) paymentSummary.qr += paymentValue;
        else if (pm.includes('CHEQUE')) paymentSummary.cheque += paymentValue;
    });

    const totalGastos = filteredGastos.reduce((sum, g) => sum + (g.amount || 0), 0);
    const gananciaLiquida = totalPrice - totalCost - totalGastos;

    // Resumen de estados
    yPos += 10;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const summaryText = `Ventas Válidas: ${validSalesCount} | Facturadas: ${invoicedSalesCount} | Anuladas: ${cancelledSalesCount} | Total: ${sales.length}`;
    doc.text(summaryText, pageWidth / 2, yPos, { align: 'center' });

    yPos += 10;
    const paymentSummaryTotal = paymentSummary.efectivo + paymentSummary.qr + paymentSummary.cheque;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('RESUMEN POR MÉTODO DE PAGO', margin, yPos);
    yPos += 8;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const paymentRows = [
        ['Efectivo', paymentSummary.efectivo],
        ['QR', paymentSummary.qr],
        ['Cheque', paymentSummary.cheque],
        ['TOTAL', paymentSummaryTotal]
    ];
    paymentRows.forEach(([label, value]) => {
        const valueText = `Bs ${Number(value || 0).toFixed(2)}`;
        const rowText = `${label}: ${valueText}`;
        doc.text(rowText, margin + 2, yPos);
        yPos += 7;
    });

    // Totales en recuadros (4 cajas)
    yPos += 8;
    const boxWidth = 42;
    const boxHeight = 18;
    const spacing = 4;
    const totalBoxesWidth = (boxWidth * 4) + (spacing * 3);
    const startX = (pageWidth - totalBoxesWidth) / 2;

    // Costo Total
    doc.setFillColor(231, 76, 60);
    doc.rect(startX, yPos, boxWidth, boxHeight, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('COSTO TOTAL', startX + boxWidth / 2, yPos + 6, { align: 'center' });
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`Bs ${totalCost.toFixed(2)}`, startX + boxWidth / 2, yPos + 13, { align: 'center' });

    // Ingreso Total
    doc.setFillColor(39, 174, 96);
    doc.rect(startX + boxWidth + spacing, yPos, boxWidth, boxHeight, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('INGRESO TOTAL', startX + boxWidth + spacing + boxWidth / 2, yPos + 6, { align: 'center' });
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`Bs ${totalPrice.toFixed(2)}`, startX + boxWidth + spacing + boxWidth / 2, yPos + 13, { align: 'center' });

    // Total Gastos
    doc.setFillColor(230, 126, 34);
    doc.rect(startX + (boxWidth + spacing) * 2, yPos, boxWidth, boxHeight, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('TOTAL GASTOS', startX + (boxWidth + spacing) * 2 + boxWidth / 2, yPos + 6, { align: 'center' });
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`Bs ${totalGastos.toFixed(2)}`, startX + (boxWidth + spacing) * 2 + boxWidth / 2, yPos + 13, { align: 'center' });

    // Ganancia Líquida
    doc.setFillColor(52, 152, 219);
    doc.rect(startX + (boxWidth + spacing) * 3, yPos, boxWidth, boxHeight, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('GANANCIA LÍQUIDA', startX + (boxWidth + spacing) * 3 + boxWidth / 2, yPos + 6, { align: 'center' });
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`Bs ${gananciaLiquida.toFixed(2)}`, startX + (boxWidth + spacing) * 3 + boxWidth / 2, yPos + 13, { align: 'center' });

    // Tabla de ventas
    yPos += boxHeight + 12;
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');

    // Encabezado de tabla
    doc.setFillColor(52, 73, 94);
    doc.rect(margin, yPos, pageWidth - 2 * margin, 8, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    
    const colWidths = {
        num: 8,
        sale: 18,
        client: 38,
        vendor: 30,
        products: 12,
        cost: 22,
        price: 22,
        date: 20,
        status: 20
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
    xPos += colWidths.date;
    doc.text('Estado', xPos, yPos + 5);

    yPos += 10;
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);

    // Ventas
    sales.forEach((sale, index) => {
        if (yPos > pageHeight - 30) {
            doc.addPage();
            yPos = margin + 10;
            
            // Repetir encabezado en nueva página
            doc.setFillColor(52, 73, 94);
            doc.rect(margin, yPos - 8, pageWidth - 2 * margin, 8, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(8);
            doc.setFont('helvetica', 'bold');
            
            let xPosHeader = margin + 2;
            doc.text('#', xPosHeader, yPos - 3);
            xPosHeader += colWidths.num;
            doc.text('Nº Venta', xPosHeader, yPos - 3);
            xPosHeader += colWidths.sale;
            doc.text('Cliente', xPosHeader, yPos - 3);
            xPosHeader += colWidths.client;
            doc.text('Vendedor', xPosHeader, yPos - 3);
            xPosHeader += colWidths.vendor;
            doc.text('Prods', xPosHeader, yPos - 3);
            xPosHeader += colWidths.products;
            doc.text('Costo', xPosHeader, yPos - 3);
            xPosHeader += colWidths.cost;
            doc.text('Precio', xPosHeader, yPos - 3);
            xPosHeader += colWidths.price;
            doc.text('Fecha', xPosHeader, yPos - 3);
            xPosHeader += colWidths.date;
            doc.text('Estado', xPosHeader, yPos - 3);
            
            yPos += 2;
            doc.setTextColor(0, 0, 0);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7);
        }

        // Calcular costo de esta venta
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
        const isCancelled = sale.cancelled === true;
        const isInvoiced = sale.invoiced === true;
        
        // Determinar estado
        let statusText = 'Vendido';
        if (isCancelled) {
            statusText = 'ANULADO';
            doc.setTextColor(231, 76, 60); // Rojo para anulado
        } else if (isInvoiced) {
            statusText = 'Facturado';
            doc.setTextColor(46, 204, 113); // Verde para facturado
        } else {
            doc.setTextColor(0, 0, 0); // Negro normal
        }

        xPos = margin + 2;
        doc.text(`${index + 1}`, xPos, yPos);
        xPos += colWidths.num;
        doc.text(sale.number.toString(), xPos, yPos);
        xPos += colWidths.sale;
        
        const clientName = (sale.client.name || sale.client).toUpperCase();
        const clientDisplay = clientName.length > 22 ? clientName.substring(0, 22) + '..' : clientName;
        doc.text(clientDisplay, xPos, yPos);
        xPos += colWidths.client;
        
        const vendorName = (sale.seller.name || sale.seller).toUpperCase();
        const vendorDisplay = vendorName.length > 18 ? vendorName.substring(0, 18) + '..' : vendorName;
        doc.text(vendorDisplay, xPos, yPos);
        xPos += colWidths.vendor;
        
        doc.text(productCount.toString(), xPos + 3, yPos);
        xPos += colWidths.products;
        
        doc.text(`Bs ${saleCost.toFixed(2)}`, xPos, yPos);
        xPos += colWidths.cost;
        
        doc.text(`Bs ${salePrice.toFixed(2)}`, xPos, yPos);
        xPos += colWidths.price;
        
        const datePart = sale.date.split(',')[0].trim();
        doc.text(datePart, xPos, yPos);
        xPos += colWidths.date;
        
        doc.setFont('helvetica', 'bold');
        doc.text(statusText, xPos, yPos);
        doc.setFont('helvetica', 'normal');

        yPos += 6;

        // Línea separadora sutil
        doc.setDrawColor(230, 230, 230);
        doc.setLineWidth(0.1);
        doc.line(margin, yPos - 1, pageWidth - margin, yPos - 1);
        
        doc.setTextColor(0, 0, 0); // Resetear color
    });

    // Resumen final
    yPos += 8;
    if (yPos > pageHeight - 45) {
        doc.addPage();
        yPos = margin;
    }

    doc.setDrawColor(52, 73, 94);
    doc.setLineWidth(0.5);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(52, 73, 94);
    doc.text('RESUMEN DEL PERÍODO', margin, yPos);
    
    yPos += 8;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    
    doc.text(`Total de Ventas Registradas:`, margin, yPos);
    doc.text(`${sales.length}`, pageWidth - margin - 30, yPos);
    yPos += 6;
    
    doc.text(`Ventas Válidas:`, margin + 5, yPos);
    doc.text(`${validSalesCount}`, pageWidth - margin - 30, yPos);
    yPos += 5;
    
    doc.setTextColor(46, 204, 113);
    doc.text(`• Facturadas:`, margin + 10, yPos);
    doc.text(`${invoicedSalesCount}`, pageWidth - margin - 30, yPos);
    yPos += 5;
    
    doc.setTextColor(0, 0, 0);
    doc.text(`• Sin facturar:`, margin + 10, yPos);
    doc.text(`${validSalesCount - invoicedSalesCount}`, pageWidth - margin - 30, yPos);
    yPos += 6;
    
    doc.setTextColor(231, 76, 60);
    doc.text(`Ventas Anuladas:`, margin + 5, yPos);
    doc.text(`${cancelledSalesCount}`, pageWidth - margin - 30, yPos);
    
    yPos += 8;
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.3);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 6;
    
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.text(`Costo Total (ventas válidas):`, margin, yPos);
    doc.setTextColor(231, 76, 60);
    doc.text(`Bs ${totalCost.toFixed(2)}`, pageWidth - margin - 30, yPos);
    yPos += 6;
    
    doc.setTextColor(0, 0, 0);
    doc.text(`Ingreso Total (ventas válidas):`, margin, yPos);
    doc.setTextColor(39, 174, 96);
    doc.text(`Bs ${totalPrice.toFixed(2)}`, pageWidth - margin - 30, yPos);
    yPos += 6;

    doc.setTextColor(0, 0, 0);
    doc.text(`Total Gastos:`, margin, yPos);
    doc.setTextColor(230, 126, 34);
    doc.text(`Bs ${totalGastos.toFixed(2)}`, pageWidth - margin - 30, yPos);
    yPos += 6;
    
    doc.setTextColor(0, 0, 0);
    doc.text(`Ganancia Líquida:`, margin, yPos);
    doc.setTextColor(52, 152, 219);
    doc.setFontSize(11);
    doc.text(`Bs ${gananciaLiquida.toFixed(2)}`, pageWidth - margin - 30, yPos);

    // Tabla de gastos del período
    if (filteredGastos.length > 0) {
        yPos += 14;
        if (yPos > pageHeight - 50) { doc.addPage(); yPos = margin; }

        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(52, 73, 94);
        doc.text('GASTOS DEL PERÍODO', margin, yPos);
        yPos += 6;

        doc.setFillColor(230, 126, 34);
        doc.rect(margin, yPos, pageWidth - 2 * margin, 8, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(8);
        doc.text('Concepto', margin + 2, yPos + 5);
        doc.text('Categoría', margin + 65, yPos + 5);
        doc.text('Monto', margin + 110, yPos + 5);
        doc.text('Fecha', margin + 140, yPos + 5);
        yPos += 10;
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);

        filteredGastos.forEach(g => {
            if (yPos > pageHeight - 25) { doc.addPage(); yPos = margin + 10; }
            const conceptDisp = g.concept.length > 38 ? g.concept.substring(0, 38) + '..' : g.concept;
            doc.text(conceptDisp, margin + 2, yPos);
            doc.text(g.category, margin + 65, yPos);
            doc.setTextColor(230, 126, 34);
            doc.text(`Bs ${(g.amount || 0).toFixed(2)}`, margin + 110, yPos);
            doc.setTextColor(0, 0, 0);
            doc.text(g.date.split(',')[0].trim(), margin + 140, yPos);
            yPos += 6;
            doc.setDrawColor(230, 230, 230);
            doc.setLineWidth(0.1);
            doc.line(margin, yPos - 1, pageWidth - margin, yPos - 1);
        });
    }

    // Pie de página
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(7);
        doc.setTextColor(150, 150, 150);
        doc.setFont('helvetica', 'normal');
        doc.text(`Página ${i} de ${pageCount}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
        doc.text(`Generado: ${new Date().toLocaleString('es-BO')}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
    }

    // Guardar PDF
    const cityName = inventory ? inventory.name : selectedSalesCity;
    const safeDatePart = mode === 'custom' && selectedDay ? selectedDay.replace(/-/g, '') : (selectedYear ? `${selectedYear}${selectedMonthVal || '00'}` : 'Todos');
    const fileName = `Reporte_Ventas_${cityName}_${safeDatePart}.pdf`;
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
        const { jsPDF, GState: JsPDFGState } = window.jspdf;
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
        doc.setFontSize(11);
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
                // Imagen no disponible
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

    // ===== MARCA DE AGUA (dibujada AL FINAL para quedar ENCIMA de imágenes y contenido) =====
    if (sale.cancelled === true || sale.invoiced === true) {
        const wmText = sale.cancelled === true ? 'ANULADO' : 'FACTURADO';
        const wmColorR = sale.cancelled === true ? 220 : 30;
        const wmColorG = sale.cancelled === true ? 30 : 160;
        const wmColorB = 30;
        const totalPages = doc.internal.getNumberOfPages();
        for (let p = 1; p <= totalPages; p++) {
            doc.setPage(p);
            doc.saveGraphicsState();
            try {
                const gState = new JsPDFGState({ opacity: 0.3 });
                doc.setGState(gState);
            } catch (e) { /* GState no disponible */ }
            doc.setTextColor(wmColorR, wmColorG, wmColorB);
            doc.setFontSize(70);
            doc.setFont(undefined, 'bold');
            doc.text(wmText, pageWidth / 2 + 20, pageHeight / 2, { align: 'center', angle: 45 });
            doc.restoreGraphicsState();
            doc.setTextColor(0, 0, 0);
        }
    }

    doc.save(`Nota_Venta_${sale.number}.pdf`);
    
    } catch (error) {
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

function openSalesDetail(saleId) {
    const sale = (appData.pdfHistory || []).find(entry => String(entry.id) === String(saleId));
    if (!sale) {
        alert('No se encontró la nota de venta');
        return;
    }
    const client = typeof sale.client === 'object' ? sale.client : { name: sale.client };
    const seller = typeof sale.seller === 'object' ? sale.seller : { name: sale.seller };
    const cityName = (appData.inventories.find(inv => inv.id === sale.city) || {}).name || sale.city || '—';

    document.getElementById('salesDetailTitle').textContent = `Nota de venta N.º ${sale.number || '—'}`;
    const status = document.getElementById('salesDetailStatus');
    status.innerHTML = '';
    if (sale.cancelled) {
        const badge = document.createElement('span');
        badge.style.cssText = 'display:inline-block;padding:5px 9px;border-radius:12px;background:#fdeaea;color:#c0392b;font-weight:bold;font-size:12px;';
        badge.textContent = 'ANULADA';
        status.appendChild(badge);
    }

    const info = document.getElementById('salesDetailInfo');
    info.innerHTML = '';
    const fields = [
        ['Fecha', sale.date || '—'],
        ['Cliente', client.name || client.company || '—'],
        ['Vendedor', seller.name || '—'],
        ['Ciudad / sucursal', cityName],
        ['Estado', sale.cancelled ? 'Anulada' : (sale.invoiced ? 'Facturada' : 'Válida')],
        ['Método de pago', sale.paymentMethod || '—'],
        ['Observaciones', sale.terms && Array.isArray(sale.terms) ? sale.terms.join(' · ') : '—']
    ];
    fields.forEach(([label, value]) => {
        const wrapper = document.createElement('div');
        const strong = document.createElement('strong');
        strong.textContent = `${label}: `;
        wrapper.appendChild(strong);
        wrapper.appendChild(document.createTextNode(String(value)));
        info.appendChild(wrapper);
    });

    const tbody = document.getElementById('salesDetailItems');
    tbody.innerHTML = '';
    const items = Array.isArray(sale.items) ? sale.items : [];
    items.forEach(item => {
        const product = getSaleItemProduct(item);
        const quantity = getSaleItemQuantity(item);
        const lineSubtotal = getSaleItemSubtotal(item);
        const price = Number(item.price);
        const unitPrice = Number.isFinite(price)
            ? price
            : (quantity && lineSubtotal != null ? lineSubtotal / quantity : 0);
        const tr = document.createElement('tr');
        [
            product.description || product.name || 'Producto sin descripción',
            product.code || '—',
            String(quantity),
            `Bs ${unitPrice.toFixed(2)}`,
            lineSubtotal == null ? 'No disponible' : `Bs ${lineSubtotal.toFixed(2)}`
        ].forEach(value => {
            const td = document.createElement('td');
            td.textContent = String(value);
            tr.appendChild(td);
        });
        tbody.appendChild(tr);
    });
    if (!items.length) {
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = 5;
        td.style.textAlign = 'center';
        td.textContent = 'No hay productos registrados en esta nota.';
        tr.appendChild(td);
        tbody.appendChild(tr);
    }

    const subtotal = Number(sale.subtotal);
    const discount = Number(sale.totalDiscount);
    const total = Number(sale.total);
    const totals = document.getElementById('salesDetailTotals');
    totals.innerHTML = '';
    const totalLines = [
        ['Subtotal', Number.isFinite(subtotal) ? subtotal : null],
        ['Descuentos', Number.isFinite(discount) ? discount : null],
        ['Total', Number.isFinite(total) ? total : null]
    ];
    totalLines.forEach(([label, value]) => {
        const line = document.createElement('div');
        const strong = document.createElement('strong');
        strong.textContent = `${label}: `;
        line.appendChild(strong);
        line.appendChild(document.createTextNode(value == null ? 'No disponible' : `Bs ${value.toFixed(2)}`));
        totals.appendChild(line);
    });
    openModal('salesDetailModal');
}

function closeSalesDetail() {
    closeModal('salesDetailModal');
}

function closeActionsMenu(saleId) {
    const menu = document.getElementById(`menu-${saleId}`);
    if (menu) {
        menu.classList.remove('show');
    }
}

// Cerrar menús al hacer clic fuera
document.addEventListener('click', function(event) {
    if (!event.target.closest('#salesProductFilterContainer')) {
        const suggestions = document.getElementById('salesProductSuggestions');
        if (suggestions) suggestions.classList.remove('active');
    }
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
window.openSalesExportModal = openSalesExportModal;
window.closeSalesExportModal = closeSalesExportModal;
window.updateSalesExportContext = updateSalesExportContext;
window.downloadSelectedSalesReport = downloadSelectedSalesReport;
window.showAllSales = showAllSales;
window.toggleSaleCancellation = toggleSaleCancellation;
window.viewSalePDF = viewSalePDF;
window.toggleActionsMenu = toggleActionsMenu;
window.closeActionsMenu = closeActionsMenu;
window.toggleInvoiced = toggleInvoiced;
window.switchMovimientosTab = switchMovimientosTab;
window.renderGastosTable = renderGastosTable;
window.renderCotizacionesTable = renderCotizacionesTable;
window.renderEntregasTable = renderEntregasTable;
window.filterSalesProductSuggestions = filterSalesProductSuggestions;
window.handleSalesProductSearchInput = handleSalesProductSearchInput;
window.selectSalesProductFilter = selectSalesProductFilter;
window.clearSalesProductFilter = clearSalesProductFilter;
window.openSalesDetail = openSalesDetail;
window.closeSalesDetail = closeSalesDetail;

function showAllSales() {
    document.getElementById('salesYearFilter').value = '';
    document.getElementById('salesMonthFilter').value = '';
    const dayMode = document.getElementById('salesDayModeFilter');
    if (dayMode) dayMode.value = 'all';
    toggleSalesDayFilter();
    clearSalesProductFilter();
}
