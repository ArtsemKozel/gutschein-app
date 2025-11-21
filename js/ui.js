// ====================================
// UI-FUNKTIONEN
// ====================================

// App starten wenn Seite geladen
document.addEventListener('DOMContentLoaded', async function() {
    console.log('App startet...');
    
    // Verbindung testen
    const connected = await testConnection();
    
    if (connected) {
        // Zeige Dashboard
        showDashboard();
    } else {
        // Zeige Fehlermeldung
        document.getElementById('app').innerHTML = `
            <div style="color: #8B5A3C; text-align: center; padding: 40px;">
                <h2>⚠️ Verbindungsfehler</h2>
                <p>Kann nicht mit der Datenbank verbinden.</p>
                <p>Prüfe die Browser-Konsole für Details.</p>
            </div>
        `;
    }
});

// Dashboard anzeigen
async function showDashboard() {
    console.log('Zeige Dashboard...');
    
    // Admin-Button anpassen
    updateAdminButton();
    
    app.innerHTML = `
        <div class="dashboard">
            <h2>🎟️ Willkommen</h2>
            
            <div class="action-buttons">
                <button onclick="showCreateVoucher()">➕ Neuer Gutschein</button>
                <button onclick="showRedeemVoucher()">💰 Einlösen</button>
            </div>
            
        </div>
    `;
}

// Gutschein erstellen - Formular
function showCreateVoucher() {
    const app = document.getElementById('app');
    
    app.innerHTML = `
        <div class="create-page">
            <div class="list-header">
                <h2>+ Neuer Gutschein</h2>
                <button onclick="showDashboard()">← Zurück</button>
            </div>
            
            <form id="create-form" onsubmit="handleCreateVoucher(event)">
                <div class="form-group">
                    <label for="voucher-value">Wert (€) *</label>
                    <input 
                        type="number" 
                        id="voucher-value" 
                        min="1" 
                        step="0.01" 
                        required
                        placeholder="z.B. 50"
                    >
                </div>
                
                <div class="form-group">
                    <label for="buyer-name">Käufer-Name (optional)</label>
                    <input 
                        type="text" 
                        id="buyer-name" 
                        placeholder="z.B. Max Mustermann"
                    >
                </div>
                
                <div class="form-group">
                    <label for="buyer-email">Käufer-E-Mail (optional)</label>
                    <input 
                        type="email" 
                        id="buyer-email" 
                        placeholder="z.B. max@example.com"
                    >
                </div>
                
                <div class="form-group">
                    <label for="delivery-method">Versandart</label>
                    <select id="delivery-method">
                        <option value="in_person">Vor Ort</option>
                        <option value="mail">Per Post</option>
                        <option value="email">Per E-Mail</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label for="voucher-notes">Notizen (optional)</label>
                    <textarea 
                        id="voucher-notes" 
                        rows="3" 
                        placeholder="z.B. Geschenk für Geburtstag"
                    ></textarea>
                </div>
                
                <button type="submit" class="create-btn">Gutschein erstellen</button>
            </form>
        </div>
    `;
    
    // Fokus auf Wert-Feld
    document.getElementById('voucher-value').focus();
}

// Gutschein erstellen - Handler
async function handleCreateVoucher(event) {
    event.preventDefault();
    
    // Werte auslesen
    const value = parseFloat(document.getElementById('voucher-value').value);
    const buyerName = document.getElementById('buyer-name').value.trim();
    const buyerEmail = document.getElementById('buyer-email').value.trim();
    const deliveryMethod = document.getElementById('delivery-method').value;
    const notes = document.getElementById('voucher-notes').value.trim();
    
    // Validierung
    if (!value || value <= 0) {
        alert('Bitte gültigen Wert eingeben!');
        return;
    }
    
    // Button deaktivieren
    const submitBtn = document.querySelector('.create-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Wird erstellt...';
    
    // Gutschein erstellen
    const result = await createVoucher(value, buyerName, buyerEmail, notes, deliveryMethod);
    
    if (result.success) {
        // Erfolg - zeige Bestätigung
        showVoucherCreated(result.voucher);
    } else {
        alert('Fehler: ' + result.error);
        submitBtn.disabled = false;
        submitBtn.textContent = 'Gutschein erstellen';
    }
}

// Bestätigung nach Erstellung
function showVoucherCreated(voucher) {
    const app = document.getElementById('app');
    
    const expiryDate = new Date(voucher.expires_at).toLocaleDateString('de-DE');
    
    app.innerHTML = `
        <div class="created-page">
            <div class="success-header">
                <h2>✅ Gutschein erstellt!</h2>
            </div>
            
            <div class="voucher-summary">
                <div class="summary-row">
                    <span class="summary-label">Code:</span>
                    <span class="summary-value code-highlight">${voucher.code}</span>
                </div>
                
                <div class="summary-row">
                    <span class="summary-label">Wert:</span>
                    <span class="summary-value">${parseFloat(voucher.original_value).toFixed(2)} €</span>
                </div>
                
                <div class="summary-row">
                    <span class="summary-label">Gültig bis:</span>
                    <span class="summary-value">${expiryDate}</span>
                </div>
                
                ${voucher.buyer_name ? `
                <div class="summary-row">
                    <span class="summary-label">Käufer:</span>
                    <span class="summary-value">${voucher.buyer_name}</span>
                </div>
                ` : ''}
                
                <div class="qr-container" id="qr-code">
                    <!-- QR-Code wird hier generiert -->
                </div>
            </div>
            
            <div class="action-buttons">
                <button onclick="showCreateVoucher()">+ Weiteren Gutschein</button>
                <button onclick="showDashboard()">← Zum Dashboard</button>
            </div>
        </div>
    `;
    
    // QR-Code generieren
    generateQRCode(voucher.code);
}

// QR-Code generieren
function generateQRCode(code) {
    const qrContainer = document.getElementById('qr-code');
    
    if (typeof QRCode !== 'undefined') {
        qrContainer.innerHTML = '';
        new QRCode(qrContainer, {
            text: code,
            width: 150,
            height: 150,
            colorDark: '#8B5A3C',
            colorLight: '#ffffff'
        });
    } else {
        qrContainer.innerHTML = '<p>QR-Code nicht verfügbar</p>';
    }
}

// Gutschein einlösen - Suchseite
function showRedeemVoucher() {
    const app = document.getElementById('app');
    
    app.innerHTML = `
        <div class="redeem-page">
            <div class="list-header">
                <h2>🔍 Gutschein einlösen</h2>
                <button onclick="showDashboard()">← Zurück</button>
            </div>
            
            <div class="search-box">
                <label for="voucher-code-search">Gutschein-Code eingeben:</label>
                <input 
                    type="text" 
                    id="voucher-code-search" 
                    placeholder="z.B. GIFT-0001"
                    onkeypress="if(event.key==='Enter') searchVoucher()"
                >
                <div style="display: flex; gap: 10px; margin-bottom: 15px;">
                    <button onclick="searchVoucher()" style="flex: 1;">🔍 Suchen</button>
                    <button onclick="startQRScanner()" style="flex: 1; background-color: #6B7C59;">📷 QR scannen</button>
                </div>
            </div>

            <!-- Scanner wird hier eingefügt -->
            <div id="qr-scanner-section"></div>
            
            <div id="search-result">
                <!-- Hier erscheint das Ergebnis -->
            </div>
        </div>
    `;
    
    // Fokus auf Eingabefeld
    document.getElementById('voucher-code').focus();
}

// Gutschein suchen
async function searchVoucher() {
    const codeInput = document.getElementById('voucher-code');
    const code = codeInput.value.trim();
    
    if (!code) {
        alert('Bitte Code eingeben!');
        return;
    }
    
    const resultDiv = document.getElementById('search-result');
    resultDiv.innerHTML = '<p>Suche...</p>';
    
    // Gutschein suchen
    const voucher = await findVoucherByCode(code);
    
    if (!voucher) {
        resultDiv.innerHTML = `
            <div class="not-found">
                <p>❌ Kein Gutschein mit Code "${code}" gefunden.</p>
            </div>
        `;
        return;
    }
    
    // Prüfen ob abgelaufen
    const now = new Date();
    const expiryDate = new Date(voucher.expires_at);
    const isExpired = expiryDate < now;
    
    // Status-Anzeige
    let statusHTML = '';
    if (voucher.status === 'redeemed') {
        statusHTML = '<span class="status-redeemed">Bereits eingelöst</span>';
    } else if (isExpired || voucher.status === 'expired') {
        statusHTML = '<span class="status-expired">Abgelaufen</span>';
    } else {
        statusHTML = '<span class="status-active">Aktiv</span>';
    }
    
    // Datum formatieren
    const formattedExpiry = expiryDate.toLocaleDateString('de-DE');
    
    // Kann eingelöst werden?
    const canRedeem = voucher.status === 'active' && !isExpired && voucher.remaining_value > 0;
    
    // Ergebnis anzeigen
    resultDiv.innerHTML = `
        <div class="voucher-details">
            <h3>Gutschein gefunden</h3>
            
            <div class="detail-row">
                <span class="detail-label">Code:</span>
                <span class="detail-value"><strong>${voucher.code}</strong></span>
            </div>
            
            <div class="detail-row">
                <span class="detail-label">Ursprünglicher Wert:</span>
                <span class="detail-value">${parseFloat(voucher.original_value).toFixed(2)} €</span>
            </div>
            
            <div class="detail-row">
                <span class="detail-label">Restwert:</span>
                <span class="detail-value"><strong>${parseFloat(voucher.remaining_value).toFixed(2)} €</strong></span>
            </div>
            
            <div class="detail-row">
                <span class="detail-label">Status:</span>
                <span class="detail-value">${statusHTML}</span>
            </div>
            
            <div class="detail-row">
                <span class="detail-label">Gültig bis:</span>
                <span class="detail-value">${formattedExpiry}</span>
            </div>

            ${parseFloat(voucher.original_value) - parseFloat(voucher.remaining_value) > 0 ? `
            <div class="detail-row">
                <span class="detail-label">Bereits eingelöst:</span>
                <span class="detail-value">${(parseFloat(voucher.original_value) - parseFloat(voucher.remaining_value)).toFixed(2)} €</span>
            </div>
            ` : ''}
            
            ${voucher.redeemed_at ? `
            <div class="detail-row">
                <span class="detail-label">Eingelöst am:</span>
                <span class="detail-value">${new Date(voucher.redeemed_at).toLocaleDateString('de-DE')}</span>
            </div>
            ` : ''}
            
            ${canRedeem ? `
                <div class="redeem-section">
                    <h4>Einlösen:</h4>
                    <div class="redeem-input">
                        <label for="redeem-amount">Betrag (€):</label>
                        <input 
                            type="number" 
                            id="redeem-amount" 
                            value="${voucher.remaining_value}"
                            min="0.01"
                            max="${voucher.remaining_value}"
                            step="0.01"
                        >
                    </div>
                    <div class="redeem-buttons">
                        <button onclick="confirmRedeem('${voucher.id}', ${voucher.remaining_value})">
                            Komplett einlösen (${parseFloat(voucher.remaining_value).toFixed(2)} €)
                        </button>
                        <button class="secondary" onclick="partialRedeem('${voucher.id}')">
                            Teil-Betrag einlösen
                        </button>
                    </div>
                </div>
            ` : `
                <div class="cannot-redeem">
                    <p>⚠️ Dieser Gutschein kann nicht eingelöst werden.</p>
                </div>
            `}
        </div>
    `;
}

// Komplett einlösen
async function confirmRedeem(voucherId, amount) {
    if (!confirm(`Gutschein über ${parseFloat(amount).toFixed(2)} € komplett einlösen?`)) {
        return;
    }
    
    const result = await redeemVoucher(voucherId, amount);
    
    if (result.success) {
        alert('✅ Gutschein erfolgreich eingelöst!');
        showDashboard();
    } else {
        alert('❌ Fehler: ' + result.error);
    }
}

// Teil-Betrag einlösen
async function partialRedeem(voucherId) {
    const amountInput = document.getElementById('redeem-amount');
    const amount = parseFloat(amountInput.value);
    
    if (!amount || amount <= 0) {
        alert('Bitte gültigen Betrag eingeben!');
        return;
    }
    
    if (!confirm(`${amount.toFixed(2)} € einlösen?`)) {
        return;
    }
    
    const result = await redeemVoucher(voucherId, amount);
    
    if (result.success) {
        if (result.fullyRedeemed) {
            alert('✅ Gutschein komplett eingelöst!');
        } else {
            alert(`✅ ${amount.toFixed(2)} € eingelöst!\nRestwert: ${result.newRemaining.toFixed(2)} €`);
        }
        showDashboard();
    } else {
        alert('❌ Fehler: ' + result.error);
    }
}

// Gutschein-Liste anzeigen (klappbare Karten)
async function showVoucherList() {
    const app = document.getElementById('app');
    
    // Lade-Anzeige
    app.innerHTML = `
        <div class="voucher-list">
            <div class="list-header">
                <h2>📋 Alle Gutscheine</h2>
                <button onclick="goBack()">← Zurück</button>
            </div>
            <p>Lädt Gutscheine...</p>
        </div>
    `;
    
    // Gutscheine laden
    const vouchers = await loadAllVouchers();
    
    // Karten erstellen
    let cardsHTML = '';
    
    if (vouchers.length === 0) {
        cardsHTML = '<p>Keine Gutscheine vorhanden.</p>';
    } else {
        for (const voucher of vouchers) {
            // Status-Text und Klasse
            let statusText = '';
            let statusClass = '';
            
            if (voucher.status === 'active') {
                statusText = 'Aktiv';
                statusClass = 'status-active';
            } else if (voucher.status === 'redeemed') {
                statusText = 'Eingelöst';
                statusClass = 'status-redeemed';
            } else if (voucher.status === 'expired') {
                statusText = 'Abgelaufen';
                statusClass = 'status-expired';
            } else if (voucher.status === 'cancelled') {
                statusText = 'Storniert';
                statusClass = 'status-cancelled';
            }
            
            cardsHTML += `
                <div class="voucher-card" onclick="toggleVoucherCard(this, '${voucher.id}')">
                    <div class="card-header">
                        <div class="card-left">
                            <span class="card-arrow">▶</span>
                            <span class="card-code">${voucher.code}</span>
                        </div>
                        <span class="${statusClass}">${statusText}</span>
                    </div>
                    <div class="card-details" id="details-${voucher.id}" style="display: none;">
                        <p>Lädt...</p>
                    </div>
                </div>
            `;
        }
    }
    
    // Inhalt aktualisieren
    app.innerHTML = `
        <div class="voucher-list">
            <div class="list-header">
                <h2>📋 Alle Gutscheine</h2>
                <button onclick="goBack()">← Zurück</button>
            </div>
            <div class="voucher-cards">
                ${cardsHTML}
            </div>
        </div>
    `;
}

// Karte auf-/zuklappen
async function toggleVoucherCard(cardElement, voucherId) {
    const detailsDiv = document.getElementById('details-' + voucherId);
    
    const arrow = cardElement.querySelector('.card-arrow');
    
    // Wenn schon offen, schließen
    if (detailsDiv.style.display === 'block') {
        detailsDiv.style.display = 'none';
        cardElement.classList.remove('expanded');
        arrow.textContent = '▶';
        return;
    }
    
    // Öffnen und Daten laden
    detailsDiv.style.display = 'block';
    cardElement.classList.add('expanded');
    arrow.textContent = '▼';
    
    // Gutschein-Daten laden
    const voucher = await findVoucherByCode(
        cardElement.querySelector('.card-code').textContent
    );
    
    if (!voucher) {
        detailsDiv.innerHTML = '<p>Fehler beim Laden.</p>';
        return;
    }
    
    // Transaktionen laden
    const transactions = await loadVoucherTransactions(voucherId);
    
    // Werte berechnen
    const redeemedAmount = parseFloat(voucher.original_value) - parseFloat(voucher.remaining_value);
    const expiryDate = new Date(voucher.expires_at).toLocaleDateString('de-DE');
    
    // Transaktions-Historie erstellen
    let historyHTML = '';
    if (transactions.length > 0) {
        historyHTML = `
            <div class="transaction-history">
                <strong>Einlösungs-Historie:</strong>
                <ul>
        `;
        
        transactions.forEach(trans => {
            const transDate = new Date(trans.created_at).toLocaleDateString('de-DE');
            const transTime = new Date(trans.created_at).toLocaleTimeString('de-DE', {
                hour: '2-digit',
                minute: '2-digit'
            });
            
            let actionText = '';
            if (trans.action === 'created') {
                actionText = 'Erstellt';
            } else if (trans.action === 'redeemed') {
                actionText = `Komplett eingelöst (${parseFloat(trans.amount).toFixed(2)} €)`;
            } else if (trans.action === 'partial_redeem') {
                actionText = `Teil-Einlösung: ${parseFloat(trans.amount).toFixed(2)} €`;
            }
            
            historyHTML += `
                <li>
                    <span class="trans-date">${transDate} ${transTime}</span>
                    <span class="trans-action">${actionText}</span>
                </li>
            `;
        });
        
        historyHTML += `
                </ul>
            </div>
        `;
    } else {
        historyHTML = '<p class="no-history">Noch keine Einlösungen.</p>';
    }
    
    // Details anzeigen
    detailsDiv.innerHTML = `
        <div class="detail-grid">
            <div class="detail-item">
                <span class="label">Wert:</span>
                <span class="value">${parseFloat(voucher.original_value).toFixed(2)} €</span>
            </div>
            <div class="detail-item">
                <span class="label">Restwert:</span>
                <span class="value">${parseFloat(voucher.remaining_value).toFixed(2)} €</span>
            </div>
            <div class="detail-item">
                <span class="label">Eingelöst:</span>
                <span class="value">${redeemedAmount > 0 ? redeemedAmount.toFixed(2) + ' €' : '-'}</span>
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
        </div>
        ${historyHTML}
        
        ${isAdmin() && voucher.status !== 'cancelled' ? `
        <div class="cancel-voucher-section">
            <button class="cancel-btn" onclick="event.stopPropagation(); confirmCancelVoucher('${voucher.id}', '${voucher.code}')">
                🗑️ Gutschein stornieren
            </button>
        </div>
        ` : ''}
    `;
}

// Statistik-Sektion auf/zuklappen
function toggleStatsSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        section.classList.toggle('expanded');
    }
}

// CSV-Export für Statistiken (flexibel mit Filter)
function exportStatsToCSV(period = 'all') {
    // Zeitstempel für Dateinamen
    const now = new Date();
    const timestamp = now.toISOString().split('T')[0]; // YYYY-MM-DD
    
    // CSV-Header
    let csv = 'Statistik,Anzahl,Wert (EUR)\n';
    
    // Daten aus den aktuell angezeigten Statistiken holen
    loadStatsFiltered(period).then(stats => {
        // Status-Übersicht
        csv += `Aktive Gutscheine,${stats.active},${stats.activeValue.toFixed(2)}\n`;
        csv += `Eingelöste Gutscheine,${stats.redeemed},${stats.redeemedValue.toFixed(2)}\n`;
        csv += `Abgelaufene Gutscheine,${stats.expired},${stats.expiredValue.toFixed(2)}\n`;
        csv += '\n';
        
        // Kennzahlen
        csv += `Gesamt verkauft,${stats.total},${stats.totalValue.toFixed(2)}\n`;
        csv += `Durchschnittswert pro Gutschein,-,${stats.averageValue.toFixed(2)}\n`;
        csv += `Einlösungsrate (%),${stats.redemptionRate.toFixed(1)},-\n`;
        csv += '\n';
        
        // Versandarten
        csv += 'Versandart,Anzahl,-\n';
        csv += `Vor Ort,${stats.deliveryMethods.in_person},-\n`;
        csv += `Per Post,${stats.deliveryMethods.mail},-\n`;
        csv += `Per E-Mail,${stats.deliveryMethods.email},-\n`;
        
        // Zeitraum-Text für Dateinamen
        let periodText = 'gesamt';
        if (period === '7days') periodText = '7-tage';
        else if (period === 'month') periodText = 'monat';
        else if (period === 'year') periodText = 'jahr';
        
        // CSV-Download auslösen
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', `gutschein-statistiken-${periodText}-${timestamp}.csv`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        console.log('CSV-Export erfolgreich:', periodText);
    });
}

// ====================================
// ADMIN-SYSTEM
// ====================================

// Admin-Passwort (später in Supabase auslagern)
const ADMIN_PASSWORD = '0103'; // ÄNDERE DIES!

// Admin-Status prüfen
function isAdmin() {
    return sessionStorage.getItem('isAdmin') === 'true';
}

// Intelligente Zurück-Funktion
function goBack() {
    if (isAdmin()) {
        showAdminDashboard();
    } else {
        showDashboard();
    }
}

// Admin-Button Text aktualisieren
function updateAdminButton() {
    const btn = document.getElementById('admin-btn');
    if (btn) {
        if (isAdmin()) {
            btn.innerHTML = '👤 ADMIN';
            btn.style.backgroundColor = '#A67C52';
        } else {
            btn.innerHTML = '🔐 Admin';
            btn.style.backgroundColor = '#6B7C59';
        }
    }
}

// Admin-Button Klick
function handleAdminButton() {
    if (isAdmin()) {
        // Wenn schon eingeloggt → Admin-Dashboard anzeigen
        showAdminDashboard();
    } else {
        // Wenn nicht eingeloggt → Login anzeigen
        showAdminLogin();
    }
}

// Admin-Login anzeigen
function showAdminLogin() {
    app.innerHTML = `
        <div class="login-page">
            <h2>🔐 Admin-Login</h2>
            <div class="login-box">
                <div id="login-error" style="display: none;" class="login-error">
                    ❌ Falsches Passwort!
                </div>
                <input 
                    type="password" 
                    id="admin-password" 
                    placeholder="Passwort eingeben"
                    onkeypress="if(event.key==='Enter') checkAdminPassword()"
                >
                <button onclick="checkAdminPassword()">🔓 Anmelden</button>
            </div>
            <div style="margin-top: 20px;">
                <button onclick="showDashboard()" style="background-color: #6B7C59;">
                    ← Abbrechen
                </button>
            </div>
        </div>
    `;
    
    // Fokus auf Input-Feld
    setTimeout(() => {
        document.getElementById('admin-password').focus();
    }, 100);
}

// Passwort prüfen
function checkAdminPassword() {
    const input = document.getElementById('admin-password').value;
    const errorDiv = document.getElementById('login-error');
    
    if (input === ADMIN_PASSWORD) {
        // Login erfolgreich
        sessionStorage.setItem('isAdmin', 'true');
        showAdminDashboard();
    } else {
        // Falsches Passwort
        errorDiv.style.display = 'block';
        document.getElementById('admin-password').value = '';
        document.getElementById('admin-password').focus();
    }
}

// Admin ausloggen
function adminLogout() {
    sessionStorage.removeItem('isAdmin');
    showDashboard();
}

// Admin-Dashboard anzeigen
async function showAdminDashboard(period = 'all') {
    if (!isAdmin()) {
        showAdminLogin();
        return;
    }
    
    console.log('Zeige Admin-Dashboard...');
    
    // Admin-Button aktualisieren
    updateAdminButton();
    
    const stats = await loadStatsFiltered(period);
    
    app.innerHTML = `
        <div class="dashboard">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2>📊 Admin-Dashboard <span class="admin-badge">ADMIN</span></h2>
                <button onclick="adminLogout()" style="background-color: #8B5A3C;">
                    🚪 Ausloggen
                </button>
            </div>
            
            <div class="action-buttons">
                <button onclick="showVoucherList()">📋 Alle Gutscheine</button>
            </div>
            
            <!-- NEU: ZEITRAUM-FILTER -->
            <div class="filter-buttons">
                <button class="${period === '7days' ? 'active' : ''}" onclick="showAdminDashboard('7days')">
                    📅 Letzte 7 Tage
                </button>
                <button class="${period === 'month' ? 'active' : ''}" onclick="showAdminDashboard('month')">
                    📅 Dieser Monat
                </button>
                <button class="${period === 'year' ? 'active' : ''}" onclick="showAdminDashboard('year')">
                    📅 Dieses Jahr
                </button>
                <button class="${period === 'all' ? 'active' : ''}" onclick="showAdminDashboard('all')">
                    📅 Gesamt
                </button>
            </div>
            
            <!-- KLAPPBAR: STATUS-ÜBERSICHT -->
            <div class="stats-section" id="stats-status" onclick="toggleStatsSection('stats-status')">
                <div class="stats-header">
                    <div class="stats-title">
                        <span class="stats-arrow">▶</span>
                        <span>Status-Übersicht</span>
                    </div>
                </div>
                <div class="stats-content">
                    <div class="stats-grid">
                        <div class="stat-card">
                            <div class="stat-label">Aktiv</div>
                            <div class="stat-value">${stats.active}</div>
                            <div class="stat-amount">${stats.activeValue.toFixed(2)} €</div>
                        </div>
                        
                        <div class="stat-card">
                            <div class="stat-label">Eingelöst</div>
                            <div class="stat-value">${stats.redeemed}</div>
                            <div class="stat-amount">${stats.redeemedValue.toFixed(2)} €</div>
                        </div>
                        
                        <div class="stat-card">
                            <div class="stat-label">Abgelaufen</div>
                            <div class="stat-value">${stats.expired}</div>
                            <div class="stat-amount">${stats.expiredValue.toFixed(2)} €</div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- KLAPPBAR: KENNZAHLEN -->
            <div class="stats-section" id="stats-metrics" onclick="toggleStatsSection('stats-metrics')">
                <div class="stats-header">
                    <div class="stats-title">
                        <span class="stats-arrow">▶</span>
                        <span>Kennzahlen</span>
                    </div>
                </div>
                <div class="stats-content">
                    <div class="stats-grid">
                        <div class="stat-card">
                            <div class="stat-label">Gesamt verkauft</div>
                            <div class="stat-value">${stats.total}</div>
                            <div class="stat-amount">${stats.totalValue.toFixed(2)} €</div>
                        </div>
                        
                        <div class="stat-card">
                            <div class="stat-label">Durchschnittswert</div>
                            <div class="stat-value">${stats.averageValue.toFixed(2)} €</div>
                            <div class="stat-amount">pro Gutschein</div>
                        </div>
                        
                        <div class="stat-card">
                            <div class="stat-label">Einlösungsrate</div>
                            <div class="stat-value">${stats.redemptionRate.toFixed(1)}%</div>
                            <div class="stat-amount">${stats.redeemed} von ${stats.total}</div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- KLAPPBAR: VERSANDARTEN -->
            <div class="stats-section" id="stats-delivery" onclick="toggleStatsSection('stats-delivery')">
                <div class="stats-header">
                    <div class="stats-title">
                        <span class="stats-arrow">▶</span>
                        <span>Versandarten</span>
                    </div>
                </div>
                <div class="stats-content">
                    <div class="stats-grid">
                        <div class="stat-card">
                            <div class="stat-label">Vor Ort</div>
                            <div class="stat-value">${stats.deliveryMethods.in_person}</div>
                            <div class="stat-amount">verkauft</div>
                        </div>
                        
                        <div class="stat-card">
                            <div class="stat-label">Per Post</div>
                            <div class="stat-value">${stats.deliveryMethods.mail}</div>
                            <div class="stat-amount">verkauft</div>
                        </div>
                        
                        <div class="stat-card">
                            <div class="stat-label">Per E-Mail</div>
                            <div class="stat-value">${stats.deliveryMethods.email}</div>
                            <div class="stat-amount">verkauft</div>
                        </div>
                    </div>
                </div>
            </div>
            <!-- KLAPPBAR: DIAGRAMME -->
            <div class="stats-section" id="stats-charts" onclick="toggleStatsSection('stats-charts')">
                <div class="stats-header">
                    <div class="stats-title">
                        <span class="stats-arrow">▶</span>
                        <span>Visuelle Diagramme</span>
                    </div>
                </div>
                <div class="stats-content">
                    <div class="charts-grid">
                        <div class="chart-container">
                            <h4>📊 Status-Verteilung</h4>
                            <div class="chart-wrapper">
                                <canvas id="statusPieChart"></canvas>
                            </div>
                        </div>
            
                        <div class="chart-container">
                            <h4>📊 Versandarten</h4>
                            <div class="chart-wrapper">
                                <canvas id="deliveryBarChart"></canvas>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <!-- CSV-EXPORT -->
                <div class="export-button">
                    <button onclick="exportStatsToCSV('${period}')">📥 Statistiken als CSV exportieren</button>
                </div>
        </div>
   `;
    
    // Diagramme rendern
    renderCharts(stats);
}

// Diagramme rendern
function renderCharts(stats) {
    // Warte kurz, damit DOM geladen ist
    setTimeout(() => {
        // Alte Chart-Instanzen zerstören (falls vorhanden)
        Chart.getChart('statusPieChart')?.destroy();
        Chart.getChart('deliveryBarChart')?.destroy();
        
        // TORTENDIAGRAMM: Status-Verteilung
        const pieCanvas = document.getElementById('statusPieChart');
        if (pieCanvas) {
            new Chart(pieCanvas, {
                type: 'pie',
                data: {
                    labels: ['Aktiv', 'Eingelöst', 'Abgelaufen'],
                    datasets: [{
                        data: [stats.active, stats.redeemed, stats.expired],
                        backgroundColor: [
                            '#6B7C59', // Aktiv (Olivgrün)
                            '#A67C52', // Eingelöst (Braun)
                            '#8B5A3C'  // Abgelaufen (Dunkelbraun)
                        ],
                        borderWidth: 2,
                        borderColor: '#fff'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                padding: 15,
                                font: {
                                    size: 14
                                }
                            }
                        }
                    }
                }
            });
        }
        
        // BALKENDIAGRAMM: Versandarten
        const barCanvas = document.getElementById('deliveryBarChart');
        if (barCanvas) {
            new Chart(barCanvas, {
                type: 'bar',
                data: {
                    labels: ['Vor Ort', 'Per Post', 'Per E-Mail'],
                    datasets: [{
                        label: 'Anzahl Gutscheine',
                        data: [
                            stats.deliveryMethods.in_person,
                            stats.deliveryMethods.mail,
                            stats.deliveryMethods.email
                        ],
                        backgroundColor: [
                            '#6B7C59', // Olivgrün
                            '#A67C52', // Braun
                            '#D7C4A3'  // Beige
                        ],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                stepSize: 1
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            display: false
                        }
                    }
                }
            });
        }
    }, 100);
}

// Gutschein stornieren (nur Admin)
async function confirmCancelVoucher(voucherId, voucherCode) {
    // Sicherheitsabfrage
    const reason = prompt(`Gutschein ${voucherCode} wirklich stornieren?\n\nGrund (optional):`);
    
    // Abgebrochen
    if (reason === null) {
        return;
    }
    
    // Stornieren
    const result = await cancelVoucher(voucherId, reason || 'Ohne Angabe von Gründen');
    
    if (result.success) {
        alert('✅ Gutschein erfolgreich storniert!');
        // Gutschein-Liste neu laden
        showVoucherList();
    } else {
        alert('❌ Fehler: ' + result.error);
    }
}

// ====================================
// QR-CODE SCANNER
// ====================================

let html5QrcodeScanner = null;

// Scanner starten
function startQRScanner() {
    const scannerDiv = document.getElementById('qr-scanner-section');
    
    scannerDiv.innerHTML = `
        <div class="scanner-container">
            <h3>📷 QR-Code scannen</h3>
            <div id="qr-reader"></div>
            <div class="scanner-info">
                📱 Richte die Kamera auf den QR-Code
            </div>
            <div class="scanner-buttons">
                <button onclick="stopQRScanner()">❌ Abbrechen</button>
            </div>
        </div>
    `;
    
    // Scanner initialisieren
    html5QrcodeScanner = new Html5Qrcode("qr-reader");
    
    html5QrcodeScanner.start(
        { facingMode: "environment" }, // Rückkamera bevorzugen
        {
            fps: 10,
            qrbox: { width: 250, height: 250 }
        },
        onScanSuccess,
        onScanError
    ).catch(err => {
        console.error('Scanner-Start-Fehler:', err);
        alert('Kamera konnte nicht gestartet werden. Stelle sicher, dass du den Kamera-Zugriff erlaubt hast.');
    });
}

// Scanner stoppen
function stopQRScanner() {
    if (html5QrcodeScanner) {
        html5QrcodeScanner.stop().then(() => {
            html5QrcodeScanner = null;
            document.getElementById('qr-scanner-section').innerHTML = '';
        }).catch(err => {
            console.error('Fehler beim Stoppen:', err);
        });
    }
}

// Erfolgreicher Scan
function onScanSuccess(decodedText) {
    console.log('QR-Code gescannt:', decodedText);
    
    // Scanner stoppen
    stopQRScanner();
    
    // Code ins Suchfeld eintragen
    document.getElementById('voucher-code-search').value = decodedText;
    
    // Automatisch suchen
    searchVoucher();
}

// Scan-Fehler (ignorieren, passiert ständig)
function onScanError(error) {
    // Nicht loggen - zu viele Meldungen
}