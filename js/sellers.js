// ==================== GESTIÓN DE VENDEDORES ====================

function filterSellers(query) {
    const list = document.getElementById('sellerList');
    list.innerHTML = '';
    
    if (!query) {
        appData.sellers.forEach(seller => {
            addSellerToList(seller, list);
        });
    } else {
        const filtered = appData.sellers.filter(s => 
            s.name.toLowerCase().includes(query.toLowerCase())
        );
        filtered.forEach(seller => {
            addSellerToList(seller, list);
        });
    }
    
    if (list.children.length > 0) {
        list.classList.add('active');
    }
}

function showSellerList() {
    filterSellers('');
}

function addSellerToList(seller, list) {
    const div = document.createElement('div');
    div.className = 'autocomplete-item';
    div.textContent = seller.name + (seller.phone ? ' - ' + seller.phone : '');
    div.onclick = () => selectSeller(seller);
    list.appendChild(div);
}

function selectSeller(seller) {
    appData.currentSeller = seller;
    const input = document.getElementById('sellerSelect');
    input.value = seller.name;
    input.classList.add('valid-selection');
    document.getElementById('sellerList').classList.remove('active');
    document.getElementById('sellerActionBtn').textContent = 'Editar Vendedor';
    document.getElementById('sellerActionBtn').className = 'btn btn-warning';
}

function handleSellerAction() {
    if (appData.currentSeller) {
        document.getElementById('sellerModalTitle').textContent = 'Editar Vendedor';
        document.getElementById('modalSellerName').value = appData.currentSeller.name;
        document.getElementById('modalSellerPhone').value = appData.currentSeller.phone || '';
    } else {
        document.getElementById('sellerModalTitle').textContent = 'Agregar Vendedor';
        document.getElementById('modalSellerName').value = '';
        document.getElementById('modalSellerPhone').value = '';
    }
    openModal('sellerModal');
}

function saveSeller() {
    const name = document.getElementById('modalSellerName').value.trim();
    if (!name) {
        alert('El nombre es obligatorio');
        return;
    }

    const seller = {
        id: appData.currentSeller ? appData.currentSeller.id : Date.now(),
        name: name,
        phone: document.getElementById('modalSellerPhone').value
    };

    if (appData.currentSeller) {
        const index = appData.sellers.findIndex(s => s.id === appData.currentSeller.id);
        appData.sellers[index] = seller;
    } else {
        appData.sellers.push(seller);
    }

    appData.currentSeller = seller;
    saveData();
    selectSeller(seller);
    closeModal('sellerModal');
}

// Exponer funciones globalmente
window.filterSellers = filterSellers;
window.selectSeller = selectSeller;
window.handleSellerAction = handleSellerAction;
window.saveSeller = saveSeller;
