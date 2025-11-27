// ===========================
// APP.JS - STATE & LOGIC
// ===========================

// Admin-Status prüfen
function isAdmin() {
    return localStorage.getItem('admin_logged_in') === 'true';
}

// Zurück-Navigation
function goBack() {
    const previousView = sessionStorage.getItem('previousView');
    if (previousView === 'adminDashboard') {
        showAdminDashboard();
    } else {
        showDashboard();
    }
}

// Admin-Button Handler
function handleAdminButton() {
    if (isAdmin()) {
        showAdminDashboard();
    } else {
        showAdminLogin();
    }
}

// Admin Logout
function adminLogout() {
    localStorage.removeItem('admin_logged_in');
    showDashboard();
}

// Admin Login prüfen
function checkAdminPassword() {
    const password = document.getElementById('admin-password').value;
    const correctPassword = 'admin123';
    
    if (password === correctPassword) {
        localStorage.setItem('admin_logged_in', 'true');
        showAdminDashboard();
    } else {
        alert('Falsches Passwort!');
    }
}

// Gutschein-Typ Felder togglen
function toggleVoucherTypeFields() {
    const type = document.getElementById('voucher-type').value;
    const paperDelivery = document.getElementById('paper-delivery-group');
    const templateGroup = document.getElementById('template-group');
    
    if (type === 'paper') {
        paperDelivery.style.display = 'block';
        if (templateGroup) templateGroup.style.display = 'none';
    } else if (type === 'digital') {
        paperDelivery.style.display = 'none';
        if (templateGroup) {
            templateGroup.style.display = 'block';
            loadTemplatesIntoDropdown();
        }
    } else {
        paperDelivery.style.display = 'none';
        if (templateGroup) templateGroup.style.display = 'none';
    }
}

// Käufer-Felder togglen
function toggleBuyerFields() {
    const fields = document.getElementById('buyer-fields');
    if (fields.style.display === 'none') {
        fields.style.display = 'block';
    } else {
        fields.style.display = 'none';
    }
}

// Templates lazy loading
async function loadTemplatesIntoDropdown() {
    const select = document.getElementById('voucher-template');
    if (!select || select.dataset.loaded === 'true') return;
    
    const templates = await loadTemplates();
    templates.forEach(t => {
        const option = document.createElement('option');
        option.value = t.id;
        option.textContent = t.name;
        select.appendChild(option);
    });
    select.dataset.loaded = 'true';
}

// Gutschein erstellen Handler
async function handleCreateVoucher(event) {
    event.preventDefault();
    
    const value = parseFloat(document.getElementById('voucher-value').value);
    const buyerName = document.getElementById('buyer-name').value.trim();
    const buyerEmail = document.getElementById('buyer-email').value.trim();
    const notes = document.getElementById('voucher-notes').value.trim();
    const templateId = document.getElementById('voucher-template').value;
    const voucherType = document.getElementById('voucher-type').value;
    const paperDelivery = voucherType === 'paper' ? document.getElementById('paper-delivery').value : null;
    const manualCode = document.getElementById('voucher-code')?.value.trim() || null;
    
    if (!value || value <= 0) {
        alert('Bitte gültigen Wert eingeben!');
        return;
    }
    
    const submitBtn = document.querySelector('.create-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Wird erstellt...';
    
    const result = await createVoucher(value, buyerName, buyerEmail, notes, voucherType, paperDelivery, manualCode);
    
    if (result.success) {
        if (voucherType === 'paper') {
            showPaperVoucherCreated(result.voucher);
        } else {
            showVoucherCreated(result.voucher, templateId);
        }
    } else {
        alert('Fehler: ' + result.error);
        submitBtn.disabled = false;
        submitBtn.textContent = '✅ Gutschein erstellen';
    }
}

// Gutschein suchen
async function searchVoucher() {
    const code = document.getElementById('redeem-code').value.trim().toUpperCase();
    
    if (!code) {
        alert('Bitte Code eingeben!');
        return;
    }
    
    const voucher = await findVoucherByCode(code);
    
    if (!voucher) {
        document.getElementById('voucher-result').innerHTML = `
            <div class="error-message">
                ❌ Gutschein nicht gefunden!
            </div>
        `;
        return;
    }
    
    if (voucher.status === 'cancelled') {
        document.getElementById('voucher-result').innerHTML = `
            <div class="error-message">
                🚫 Dieser Gutschein wurde storniert
            </div>
        `;
        return;
    }
    
    if (voucher.status === 'expired') {
        document.getElementById('voucher-result').innerHTML = `
            <div class="error-message">
                ⏰ Dieser Gutschein ist abgelaufen
            </div>
        `;
        return;
    }
    
    if (voucher.status === 'redeemed') {
        document.getElementById('voucher-result').innerHTML = `
            <div class="error-message">
                ✅ Dieser Gutschein wurde bereits vollständig eingelöst
            </div>
        `;
        return;
    }
    
    const expiryDate = new Date(voucher.expires_at).toLocaleDateString('de-DE');
    const canPartialRedeem = parseFloat(voucher.remaining_value) > 0;
    
    document.getElementById('voucher-result').innerHTML = `
        <div class="voucher-info">
            <h3>✅ Gutschein gefunden!</h3>
            <div class="info-grid">
                <div class="info-item">
                    <span class="label">Code:</span>
                    <span class="value">${voucher.code}</span>
                </div>
                <div class="info-item">
                    <span class="label">Originalwert:</span>
                    <span class="value">${parseFloat(voucher.original_value).toFixed(2)} €</span>
                </div>
                <div class="info-item">
                    <span class="label">Verfügbar:</span>
                    <span class="value highlight">${parseFloat(voucher.remaining_value).toFixed(2)} €</span>
                </div>
                <div class="info-item">
                    <span class="label">Gültig bis:</span>
                    <span class="value">${expiryDate}</span>
                </div>
            </div>
            <div class="action-buttons">
                <button onclick="confirmRedeem('${voucher.id}', ${voucher.remaining_value})" class="primary-btn">
                    💰 Vollständig einlösen (${parseFloat(voucher.remaining_value).toFixed(2)} €)
                </button>
                ${canPartialRedeem ? `<button onclick="partialRedeem('${voucher.id}')" class="secondary-btn">📊 Teilweise einlösen</button>` : ''}
            </div>
        </div>
    `;
}

// Vollständige Einlösung bestätigen
async function confirmRedeem(voucherId, amount) {
    if (!confirm(`Gutschein vollständig einlösen (${parseFloat(amount).toFixed(2)} €)?`)) {
        return;
    }
    
    const result = await redeemVoucher(voucherId, amount);
    
    if (result.success) {
        alert('✅ Gutschein erfolgreich eingelöst!');
        showRedeemVoucher();
    } else {
        alert('Fehler: ' + result.error);
    }
}

// Teilweise Einlösung
async function partialRedeem(voucherId) {
    const voucher = await findVoucherById(voucherId);
    if (!voucher) return;
    
    const amount = prompt(`Wie viel einlösen? (max. ${parseFloat(voucher.remaining_value).toFixed(2)} €)`);
    
    if (!amount || isNaN(amount)) {
        alert('Ungültiger Betrag!');
        return;
    }
    
    const amountNum = parseFloat(amount);
    
    if (amountNum <= 0 || amountNum > parseFloat(voucher.remaining_value)) {
        alert('Ungültiger Betrag!');
        return;
    }
    
    const result = await redeemVoucher(voucherId, amountNum);
    
    if (result.success) {
        alert(`✅ ${amountNum.toFixed(2)} € erfolgreich eingelöst!`);
        showRedeemVoucher();
    } else {
        alert('Fehler: ' + result.error);
    }
}

// Gutschein stornieren
async function confirmCancelVoucher(voucherId, voucherCode) {
    if (!confirm(`Gutschein ${voucherCode} wirklich stornieren?`)) {
        return;
    }
    
    const result = await cancelVoucher(voucherId);
    
    if (result.success) {
        alert('✅ Gutschein storniert');
        showVoucherList('all', '');
    } else {
        alert('Fehler: ' + result.error);
    }
}

// Gutschein-Karte togglen
async function toggleVoucherCard(cardElement, voucherId) {
    const detailsDiv = document.getElementById('details-' + voucherId);
    const arrow = cardElement.querySelector('.card-arrow');
    
    if (detailsDiv.style.display === 'block') {
        detailsDiv.style.display = 'none';
        cardElement.classList.remove('expanded');
        arrow.textContent = '▶';
        return;
    }
    
    detailsDiv.style.display = 'block';
    cardElement.classList.add('expanded');
    arrow.textContent = '▼';
    
    const voucher = await findVoucherById(voucherId);
    if (!voucher) {
        detailsDiv.innerHTML = '<p>Fehler beim Laden.</p>';
        return;
    }
    
    const transactions = await loadVoucherTransactions(voucherId);
    const redeemedAmount = parseFloat(voucher.original_value) - parseFloat(voucher.remaining_value);
    const expiryDate = new Date(voucher.expires_at).toLocaleDateString('de-DE');
    
    let historyHTML = '';
    if (transactions.length > 0) {
        historyHTML = `
            <div class="transaction-history">
                <strong>Einlösungs-Historie:</strong>
                <ul>
        `;
        for (const t of transactions) {
            const date = new Date(t.created_at).toLocaleDateString('de-DE');
            const time = new Date(t.created_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
            const isPartial = t.action === 'partial_redeem';
            historyHTML += `<li>${date} ${time}: ${isPartial ? '📊 Teilweise' : '✅ Komplett'} - ${parseFloat(t.amount).toFixed(2)} €</li>`;
        }
        historyHTML += `
                </ul>
            </div>
        `;
    }
    
    detailsDiv.innerHTML = `
        <div class="detail-item">
            <span class="label">Wert:</span>
            <span class="value">${parseFloat(voucher.original_value).toFixed(2)} €</span>
        </div>
        <div class="detail-item">
            <span class="label">Eingelöst:</span>
            <span class="value">${redeemedAmount.toFixed(2)} €</span>
        </div>
        <div class="detail-item">
            <span class="label">Verfügbar:</span>
            <span class="value">${parseFloat(voucher.remaining_value).toFixed(2)} €</span>
        </div>
        <div class="detail-item">
            <span class="label">Gültig bis:</span>
            <span class="value">${expiryDate}</span>
        </div>
        ${voucher.buyer_name ? `
        <div class="detail-item">
            <span class="label">Käufer:</span>
            <span class="value">${voucher.buyer_name}</span>
        </div>
        ` : ''}
        ${historyHTML}
        ${isAdmin() && voucher.status === 'active' ? `
        <button onclick="confirmCancelVoucher('${voucher.id}', '${voucher.code}')" style="background-color: #8B5A3C; margin-top: 15px;">
            🚫 Gutschein stornieren
        </button>
        ` : ''}
    `;
}

// Statistik-Sektion togglen
function toggleStatsSection(sectionId) {
    const section = document.getElementById(sectionId);
    const allSections = document.querySelectorAll('.stats-section');
    
    allSections.forEach(s => {
        if (s.id === sectionId) {
            s.classList.toggle('expanded');
        } else {
            s.classList.remove('expanded');
        }
    });
}

// Stats zu CSV exportieren
function exportStatsToCSV(period = 'all') {
    loadStatsFiltered(period).then(stats => {
        let csv = 'Kategorie,Wert,Prozent\n';
        csv += `Gesamt,${stats.total},-\n`;
        csv += `Aktiv,${stats.active},-\n`;
        csv += `Eingelöst,${stats.redeemed},${stats.redemptionRate}%\n`;
        csv += `Abgelaufen,${stats.expired},-\n`;
        csv += `\n`;
        csv += `Gesamtwert,${stats.totalValue.toFixed(2)} €,-\n`;
        csv += `Eingelöster Wert,${stats.redeemedValue.toFixed(2)} €,-\n`;
        csv += `Aktiver Wert,${stats.activeValue.toFixed(2)} €,-\n`;
        csv += `Durchschnittswert,${stats.averageValue.toFixed(2)} €,-\n`;
        csv += `\n`;
        csv += `Vor Ort (Papier),${stats.deliveryMethods.paper_vor_ort},-\n`;
        csv += `Per Post (Papier),${stats.deliveryMethods.paper_post},-\n`;
        csv += `Digital,${stats.deliveryMethods.digital},-\n`;
        
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `gutschein-statistiken-${period}.csv`;
        a.click();
    });
}

// QR-Scanner starten
function startQRScanner() {
    const html5QrCode = new Html5Qrcode("qr-reader");
    html5QrCode.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: 250 },
        onScanSuccess,
        onScanError
    ).catch(err => {
        console.error('Kamera-Fehler:', err);
        alert('Kamera konnte nicht gestartet werden');
    });
}

// QR-Scanner stoppen
function stopQRScanner() {
    const html5QrCode = new Html5Qrcode("qr-reader");
    html5QrCode.stop().then(() => {
        console.log('Scanner gestoppt');
    }).catch(err => {
        console.error('Stop-Fehler:', err);
    });
}

// QR-Scan Erfolg
function onScanSuccess(decodedText) {
    stopQRScanner();
    document.getElementById('redeem-code').value = decodedText;
    searchVoucher();
}

// QR-Scan Fehler (ignorieren)
function onScanError(error) {
    // Ignorieren - normale Scanner-Fehler
}