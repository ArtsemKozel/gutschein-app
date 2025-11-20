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
    const app = document.getElementById('app');
    
    // Statistiken laden
    const stats = await loadStats();
    
    app.innerHTML = `
        <div class="dashboard">
            <h2>Dashboard</h2>
            
            <div class="action-buttons">
                <button onclick="showCreateVoucher()">+ Neuer Gutschein</button>
                <button onclick="showRedeemVoucher()">🔍 Gutschein einlösen</button>
                <button onclick="showVoucherList()">📋 Alle Gutscheine</button>
            </div>
            
            <div class="stats">
                <h3>📊 Statistiken</h3>
                <div class="stats-grid">
                    <div class="stat-card">
                        <span class="stat-label">Aktiv</span>
                        <span class="stat-value">${stats ? stats.active : 0}</span>
                        <span class="stat-amount">${stats ? stats.activeValue.toFixed(2) : '0.00'} €</span>
                    </div>
                    <div class="stat-card">
                        <span class="stat-label">Eingelöst</span>
                        <span class="stat-value">${stats ? stats.redeemed : 0}</span>
                        <span class="stat-amount">${stats ? stats.redeemedValue.toFixed(2) : '0.00'} €</span>
                    </div>
                    <div class="stat-card">
                        <span class="stat-label">Abgelaufen</span>
                        <span class="stat-value">${stats ? stats.expired : 0}</span>
                        <span class="stat-amount">${stats ? stats.expiredValue.toFixed(2) : '0.00'} €</span>
                    </div>
                </div>
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
                <label for="voucher-code">Gutschein-Code eingeben:</label>
                <input 
                    type="text" 
                    id="voucher-code" 
                    placeholder="z.B. GIFT-0001"
                    autocapitalize="characters"
                >
                <button onclick="searchVoucher()">Suchen</button>
            </div>
            
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
                <button onclick="showDashboard()">← Zurück</button>
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
                <button onclick="showDashboard()">← Zurück</button>
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
    `;
}