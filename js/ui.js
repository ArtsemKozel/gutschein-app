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
    
    const app = document.getElementById('app');
    
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
                    <label for="voucher-template">PDF-Template</label>
                    <select id="voucher-template">
                        <option value="default">Standard (Code-Design)</option>
                        ${loadTemplates().map(t => `
                            <option value="${t.id}">${t.name}</option>
                        `).join('')}
                    </select>
                    <small style="color: #666; display: block; margin-top: 5px;">
                        Wähle ein Template oder nutze das Standard-Design
                    </small>
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
    const templateId = document.getElementById('voucher-template').value;
    
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
        // Wenn Template gewählt: Manuelle Platzierung
        if (templateId !== 'default') {
            showManualPlacement(result.voucher, templateId);
        } else {
            // Standard-Design: Direkt zur Success-Seite
            showVoucherCreated(result.voucher, templateId);
        }
    } else {
        alert('Fehler: ' + result.error);
        submitBtn.disabled = false;
        submitBtn.textContent = 'Gutschein erstellen';
    }
}

// Bestätigung nach Erstellung
function showVoucherCreated(voucher, templateId = 'default') {
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
                <button onclick="previewVoucherPDF(${JSON.stringify(voucher).replace(/"/g, '&quot;')}, '${templateId}')" style="background-color: #6B7C59;">👁️ Vorschau</button>
                <button onclick="generateVoucherPDF(${JSON.stringify(voucher).replace(/"/g, '&quot;')}, '${templateId}')" style="background-color: #A67C52;">📄 Herunterladen</button>
                <button onclick="showCreateVoucher()">+ Weiteren Gutschein</button>
                <button onclick="showDashboard()">← Zum Dashboard</button>
            </div>
        </div>
    `;
    
    // QR-Code generieren (mit kleinem Delay)
    setTimeout(() => {
        generateQRCode(voucher.code);
    }, 200);
}

// QR-Code generieren
function generateQRCode(code) {
    const qrContainer = document.getElementById('qr-code');
    
    if (!qrContainer) {
        console.error('QR-Container nicht gefunden');
        return;
    }
    
    // Prüfen ob QRCode Library geladen ist
    if (typeof QRCode === 'undefined') {
        qrContainer.innerHTML = '<p style="color: red;">QR-Code Library nicht geladen</p>';
        console.error('QRCode library nicht verfügbar');
        return;
    }
    
    try {
        qrContainer.innerHTML = '';
        new QRCode(qrContainer, {
            text: code,
            width: 200,
            height: 200,
            colorDark: "#000000",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H
        });
        console.log('QR-Code erfolgreich erstellt:', code);
    } catch (error) {
        console.error('Fehler beim QR-Code erstellen:', error);
        qrContainer.innerHTML = '<p style="color: red;">Fehler: ' + error.message + '</p>';
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
    const codeInput = document.getElementById('voucher-code-search');
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
async function showVoucherList(filterStatus = 'all', searchTerm = '') {
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

    // Filter und Suche anwenden
    let filteredVouchers = vouchers;

    // Nach Status filtern
    if (filterStatus !== 'all') {
        filteredVouchers = filteredVouchers.filter(v => v.status === filterStatus);
    }

    // Nach Text suchen (Code oder Käufer-Name)
    if (searchTerm.trim() !== '') {
        const term = searchTerm.toLowerCase().trim();
        filteredVouchers = filteredVouchers.filter(v => 
            v.code.toLowerCase().includes(term) ||
            (v.buyer_name && v.buyer_name.toLowerCase().includes(term))
        );
    }

    // Karten erstellen
    let cardsHTML = '';
    
    // Karten erstellen
    if (filteredVouchers.length === 0) {
        if (searchTerm || filterStatus !== 'all') {
            cardsHTML = '<div class="no-results">🔍 Keine Gutscheine gefunden. Versuche andere Filter oder Suchbegriffe.</div>';
        } else {
            cardsHTML = '<div class="no-results">📋 Noch keine Gutscheine vorhanden.</div>';
        }
    } else {
        for (const voucher of filteredVouchers) {
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
            <h2>📋 Alle Gutscheine (${filteredVouchers.length})</h2>
            <div style="display: flex; gap: 10px;">
                <button onclick="exportAllVouchersToCSV()" style="background-color: #A67C52;">📥 CSV Export</button>
                <button onclick="goBack()">← Zurück</button>
            </div>
        </div>
        
        <!-- SUCH- UND FILTER-BOX -->
        <div class="list-search-box">
            <input 
                type="text" 
                id="list-search-input" 
                placeholder="🔍 Suche nach Code oder Käufer-Name..."
                value="${searchTerm}"
                onkeyup="handleListSearch()"
            >
            <div class="filter-buttons-row">
                <button class="${filterStatus === 'all' ? 'active' : ''}" onclick="showVoucherList('all', document.getElementById('list-search-input').value)">
                    Alle
                </button>
                <button class="${filterStatus === 'active' ? 'active' : ''}" onclick="showVoucherList('active', document.getElementById('list-search-input').value)">
                    Aktiv
                </button>
                <button class="${filterStatus === 'redeemed' ? 'active' : ''}" onclick="showVoucherList('redeemed', document.getElementById('list-search-input').value)">
                    Eingelöst
                </button>
                <button class="${filterStatus === 'expired' ? 'active' : ''}" onclick="showVoucherList('expired', document.getElementById('list-search-input').value)">
                    Abgelaufen
                </button>
                <button class="${filterStatus === 'cancelled' ? 'active' : ''}" onclick="showVoucherList('cancelled', document.getElementById('list-search-input').value)">
                    Storniert
                </button>
            </div>

            <!-- SORTIER-BUTTONS (NEU) -->
             <div class="filter-buttons-row" style="margin-top: 10px; border-top: 1px solid #E8D9B6; padding-top: 10px;">
                <button onclick="sortVoucherList('date', document.getElementById('list-search-input').value, getCurrentFilter())">
                     📅 Nach Datum
                </button>
                <button onclick="sortVoucherList('value', document.getElementById('list-search-input').value, getCurrentFilter())">
                    💰 Nach Wert
                </button>
                <button onclick="sortVoucherList('code', document.getElementById('list-search-input').value, getCurrentFilter())">
                    🔢 Nach Code
                </button>
            </div>
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
            <!-- HEADER: Clean mit nur Logout -->
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; flex-wrap: wrap; gap: 10px;">
                <h2>📊 Admin-Dashboard <span class="admin-badge">ADMIN</span></h2>
                <button onclick="adminLogout()" style="background-color: #8B5A3C; padding: 10px 20px; font-size: 20px; border-radius: 8px;" title="Ausloggen">
                    ⏻
                </button>
            </div>
            
            <!-- ========================================= -->
            <!-- BOX 1: AKTIONEN -->
            <!-- ========================================= -->
            <div style="background: #F6EAD2; padding: 25px; border-radius: 8px; margin-bottom: 25px; border: 2px solid #6B7C59;">
                <h3 style="margin: 0 0 20px 0; color: #6B7C59; font-size: 20px;">
                    ⚡ Aktionen
                </h3>
                <div class="action-buttons">
                    <button onclick="showVoucherList()">📋 Alle Gutscheine</button>
                    <button onclick="showTemplateManager()">📑 Templates</button>
                    <button onclick="showCashRegister()">💰 Kassenabschluss</button>
                </div>
            </div>
            
            <!-- BOX 2: STATISTIKEN (KLAPPBAR) -->
            <div class="stats-section" id="box-stats" onclick="toggleStatsSection('box-stats')" style="background: #F6EAD2; padding: 25px; border-radius: 8px; margin-bottom: 25px; border: 2px solid #6B7C59;">
                <div class="stats-header">
                    <div class="stats-title" style="display: flex; align-items: center; gap: 10px;">
                        <span class="stats-arrow">▶</span>
                        <h3 style="margin: 0; color: #6B7C59; font-size: 20px;">📊 Statistiken</h3>
                    </div>
                </div>
                <div class="stats-content" onclick="event.stopPropagation()">
                
                <!-- Zeitraum-Filter -->
                <div class="filter-buttons" style="margin-bottom: 20px;">
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
                            </div>
                            
                            <div class="stat-card">
                                <div class="stat-label">Einlösungsrate</div>
                                <div class="stat-value">${stats.redemptionRate.toFixed(1)} %</div>
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
                            </div>
                            
                            <div class="stat-card">
                                <div class="stat-label">Per Post</div>
                                <div class="stat-value">${stats.deliveryMethods.mail}</div>
                            </div>
                            
                            <div class="stat-card">
                                <div class="stat-label">Per E-Mail</div>
                                <div class="stat-value">${stats.deliveryMethods.email}</div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- KLAPPBAR: KASSENABSCHLUSS -->
                <div class="stats-section" id="stats-redemptions" onclick="toggleStatsSection('stats-redemptions')">
                    <div class="stats-header">
                        <div class="stats-title">
                            <span class="stats-arrow">▶</span>
                            <span>Kassenabschluss / Tägliche Einlösungen</span>
                        </div>
                    </div>
                    <div class="stats-content" onclick="event.stopPropagation()">
                        <div class="redemption-controls">
                            <label style="color: #6B7C59; font-weight: bold; margin-bottom: 5px;">Datum auswählen:</label>

                            <div class="redemption-date-row">
                                <button onclick="event.stopPropagation(); changeRedemptionDate(-1)" style="flex: 0 0 auto; min-width: 40px; padding: 12px 8px; font-size: 20px; background-color: #D7C4A3; border: 2px solid #E8D9B6; border-radius: 8px; cursor: pointer;">
                                ←
                                </button>
                                <input 
                                    type="date" 
                                    id="redemption-date" 
                                    value="${new Date().toISOString().split('T')[0]}"
                                    onclick="event.stopPropagation()"
                                    onchange="loadAndDisplayRedemptions()"
                                    style="flex: 1; padding: 12px; border: 2px solid #E8D9B6; border-radius: 8px; font-size: 16px;"
                                >
                                <button onclick="event.stopPropagation(); changeRedemptionDate(1)" style="flex: 0 0 auto; min-width: 40px; padding: 12px 8px; font-size: 20px; background-color: #D7C4A3; border: 2px solid #E8D9B6; border-radius: 8px; cursor: pointer;">
                                    →
                                </button>
                            </div>

                            <div class="redemption-button-row">
                                <button class="redemption-load-btn" onclick="event.stopPropagation(); loadAndDisplayRedemptions()">
                                    🔄 Laden
                                </button>
                                <button class="redemption-export-btn" onclick="event.stopPropagation(); exportDailyRedemptions()">
                                    📄 Export
                                </button>
                            </div>
                        </div>

                        <div id="redemptions-display">
                            <div class="redemption-hint">Wähle ein Datum und klicke "Laden"</div>
                        </div>
                    </div>
                </div>

                <!-- KLAPPBAR: DIAGRAMME -->
                <div class="stats-section" id="stats-charts" onclick="toggleStatsSection('stats-charts')">
                    <div class="stats-header">
                        <div class="stats-title">
                            <span class="stats-arrow">▶</span>
                            <span>Diagramme</span>
                        </div>
                    </div>
                    <div class="stats-content">
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px;">
                            <div>
                                <h4 style="text-align: center; margin-bottom: 10px;">Status-Verteilung</h4>
                                <canvas id="status-chart"></canvas>
                            </div>
                            <div>
                                <h4 style="text-align: center; margin-bottom: 10px;">Werte-Vergleich</h4>
                                <canvas id="values-chart"></canvas>
                            </div>
                        </div>
                    </div>
                </div>
                </div>
            </div>
            
            <!-- BOX 3: VERWALTUNG (KLAPPBAR) -->
            <div class="stats-section" id="box-verwaltung" onclick="toggleStatsSection('box-verwaltung')" style="background: #F6EAD2; padding: 25px; border-radius: 8px; margin-bottom: 25px; border: 2px solid #6B7C59;">
                <div class="stats-header">
                    <div class="stats-title" style="display: flex; align-items: center; gap: 10px;">
                        <span class="stats-arrow">▶</span>
                        <h3 style="margin: 0; color: #6B7C59; font-size: 20px;">⚙️ Verwaltung</h3>
                    </div>
                </div>
                <div class="stats-content" onclick="event.stopPropagation()">
                <div class="action-buttons">
                    <button onclick="showChangePassword()" style="background-color: #A67C52;">
                        🔑 Passwort ändern
                    </button>
                    <button onclick="createBackup()" style="background-color: #6B7C59;">
                        📦 Backup erstellen
                    </button>
                    <button onclick="showRestoreBackup()" style="background-color: #A67C52;">
                        📥 Backup wiederherstellen
                    </button>
                </div>
            </div>
            </div>
        </div>
    `;
    
    // Diagramme initialisieren
    setTimeout(() => {
        createStatusChart(stats);
        createValuesChart(stats);
    }, 100);
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
    const inputField = document.getElementById('voucher-code-search');
    if (inputField) {
        inputField.value = decodedText;
    }
    
    // Kurz warten und dann automatisch suchen
    setTimeout(() => {
        searchVoucher();
    }, 300);
}

// Scan-Fehler (ignorieren, passiert ständig)
function onScanError(error) {
    // Nicht loggen - zu viele Meldungen
}

// ====================================
// EINFACHER PDF-GUTSCHEIN
// ====================================

// QR-Code als Data URL generieren (mit qrcode.js Library)
async function generateQRCodeDataURL(code) {
    return new Promise((resolve) => {
        // Temporäres Container-Element erstellen
        const tempDiv = document.createElement('div');
        tempDiv.style.display = 'none';
        document.body.appendChild(tempDiv);
        
        // QR-Code generieren
        new QRCode(tempDiv, {
            text: code,
            width: 300,
            height: 300,
            colorDark: "#000000",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H
        });
        
        // Kurz warten bis Canvas erstellt ist
        setTimeout(() => {
            const canvas = tempDiv.querySelector('canvas');
            if (canvas) {
                const dataUrl = canvas.toDataURL('image/png');
                document.body.removeChild(tempDiv);
                resolve(dataUrl);
            } else {
                console.error('Canvas nicht gefunden');
                document.body.removeChild(tempDiv);
                resolve(null);
            }
        }, 100);
    });
}

async function generateSimplePDF(voucher) {
    try {
        const { PDFDocument, rgb, StandardFonts } = PDFLib;
        
        // Neues PDF erstellen
        const pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage([595, 842]); // A4
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
        
        const { width, height } = page.getSize();
        
        // Farben definieren (Restaurant-Palette)
        const olivGreen = rgb(0.42, 0.49, 0.35);
        const beige = rgb(0.91, 0.85, 0.71);
        const brown = rgb(0.54, 0.35, 0.24);
        const darkBrown = rgb(0.44, 0.28, 0.19);
        const lightBeige = rgb(0.96, 0.92, 0.82);
        
        // HINTERGRUND - Beige Box
        page.drawRectangle({
            x: 40,
            y: height - 700,
            width: width - 80,
            height: 600,
            color: lightBeige,
        });
        
        // OBERE DEKORATIVE LINIE
        page.drawRectangle({
            x: 40,
            y: height - 110,
            width: width - 80,
            height: 4,
            color: olivGreen,
        });
        
        // RESTAURANT NAME
        page.drawText('My Heart Beats Vegan', {
            x: width / 2 - 105,
            y: height - 80,
            size: 20,
            font: fontBold,
            color: olivGreen,
        });
        
        // GESCHENKGUTSCHEIN - großer Titel
        page.drawRectangle({
            x: 80,
            y: height - 180,
            width: width - 160,
            height: 60,
            color: olivGreen,
        });
        
        page.drawText('GESCHENKGUTSCHEIN', {
            x: width / 2 - 130,
            y: height - 160,
            size: 28,
            font: fontBold,
            color: rgb(1, 1, 1),
        });
        
        // WERT - Großer Betrag
        const valueText = `${parseFloat(voucher.original_value).toFixed(2)} €`;
        page.drawText(valueText, {
            x: width / 2 - 70,
            y: height - 250,
            size: 56,
            font: fontBold,
            color: brown,
        });
        
        // DETAILS BOX
        const detailsY = height - 320;
        
        // Gutschein-Code
        page.drawText('Gutschein-Code:', {
            x: 100,
            y: detailsY,
            size: 12,
            font: font,
            color: darkBrown,
        });
        
        page.drawText(voucher.code, {
            x: 100,
            y: detailsY - 25,
            size: 22,
            font: fontBold,
            color: rgb(0, 0, 0),
        });
        
        // Gültig bis
        const expiryDate = new Date(voucher.expires_at).toLocaleDateString('de-DE');
        page.drawText('Gültig bis:', {
            x: 100,
            y: detailsY - 60,
            size: 12,
            font: font,
            color: darkBrown,
        });
        
        page.drawText(expiryDate, {
            x: 100,
            y: detailsY - 80,
            size: 16,
            font: fontBold,
            color: rgb(0, 0, 0),
        });
        
        // Käufer-Name (falls vorhanden)
        if (voucher.buyer_name) {
            page.drawText('Für:', {
                x: 100,
                y: detailsY - 115,
                size: 12,
                font: font,
                color: darkBrown,
            });
            
            page.drawText(voucher.buyer_name, {
                x: 100,
                y: detailsY - 135,
                size: 14,
                font: fontBold,
                color: rgb(0, 0, 0),
            });
        }
        
        // QR-CODE BOX (rechts)
        page.drawRectangle({
            x: width - 200,
            y: height - 480,
            width: 150,
            height: 150,
            color: rgb(1, 1, 1),
            borderColor: olivGreen,
            borderWidth: 3,
        });
        
        // QR-Code hinzufügen
        const qrContainer = document.getElementById('qr-code');
        const qrCanvas = qrContainer ? qrContainer.querySelector('canvas') : null;
        
        if (qrCanvas) {
            try {
                const qrDataUrl = qrCanvas.toDataURL('image/png');
                const qrImageBytes = await fetch(qrDataUrl).then(res => res.arrayBuffer());
                const qrPdfImage = await pdfDoc.embedPng(qrImageBytes);
                
                page.drawImage(qrPdfImage, {
                    x: width - 192,
                    y: height - 472,
                    width: 134,
                    height: 134,
                });
            } catch (error) {
                console.log('QR-Code konnte nicht ins PDF eingefügt werden:', error);
            }
        }
        
        // QR-Code Label
        page.drawText('Zum Einlösen scannen', {
            x: width - 192,
            y: height - 495,
            size: 9,
            font: font,
            color: darkBrown,
        });
        
        // UNTERE DEKORATIVE LINIE
        page.drawRectangle({
            x: 40,
            y: 120,
            width: width - 80,
            height: 3,
            color: olivGreen,
        });
        
        // FUSSZEILE
        page.drawText('Einlösbar im Restaurant My Heart Beats Vegan', {
            x: width / 2 - 150,
            y: 90,
            size: 11,
            font: font,
            color: darkBrown,
        });
        
        page.drawText('Nicht mit anderen Aktionen kombinierbar • Keine Barauszahlung möglich', {
            x: width / 2 - 180,
            y: 70,
            size: 9,
            font: font,
            color: rgb(0.5, 0.5, 0.5),
        });
        
        // PDF als Blob speichern
        const pdfBytes = await pdfDoc.save();
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        
        // Download auslösen
        const link = document.createElement('a');
        link.href = url;
        link.download = `Gutschein-${voucher.code}.pdf`;
        link.click();
        
        console.log('PDF erfolgreich erstellt!');
        
    } catch (error) {
        console.error('Fehler beim PDF-Erstellen:', error);
        alert('PDF konnte nicht erstellt werden: ' + error.message);
    }
}

// Such-Handler für Gutschein-Liste (mit Delay für bessere Performance)
let searchTimeout;
function handleListSearch() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        const searchInput = document.getElementById('list-search-input');
        if (searchInput) {
            // Aktuellen Filter beibehalten
            const activeButton = document.querySelector('.filter-buttons-row button.active');
            const currentFilter = activeButton ? activeButton.textContent.trim().toLowerCase() : 'all';
            
            // Filter-Mapping
            const filterMap = {
                'alle': 'all',
                'aktiv': 'active',
                'eingelöst': 'redeemed',
                'abgelaufen': 'expired',
                'storniert': 'cancelled'
            };
            
            showVoucherList(filterMap[currentFilter] || 'all', searchInput.value);
        }
    }, 300); // 300ms Delay nach letztem Tastendruck
}

// ====================================
// CSV-EXPORT ALLER GUTSCHEINE
// ====================================

async function exportAllVouchersToCSV() {
    console.log('Exportiere alle Gutscheine...');
    
    // Alle Gutscheine laden
    const vouchers = await loadAllVouchers();
    
    if (vouchers.length === 0) {
        alert('Keine Gutscheine zum Exportieren vorhanden.');
        return;
    }
    
    // CSV-Header
    let csv = 'Code,Status,Original-Wert (EUR),Restwert (EUR),Eingelöst (EUR),Käufer,E-Mail,Versandart,Erstellt am,Gültig bis,Eingelöst am,Notizen\n';
    
    // Daten hinzufügen
    vouchers.forEach(v => {
        const createdDate = new Date(v.created_at).toLocaleDateString('de-DE');
        const expiryDate = new Date(v.expires_at).toLocaleDateString('de-DE');
        const redeemedDate = v.redeemed_at ? new Date(v.redeemed_at).toLocaleDateString('de-DE') : '-';
        
        const originalValue = parseFloat(v.original_value).toFixed(2);
        const remainingValue = parseFloat(v.remaining_value).toFixed(2);
        const redeemedValue = (originalValue - remainingValue).toFixed(2);
        
        // Status auf Deutsch
        let statusDE = v.status;
        if (v.status === 'active') statusDE = 'Aktiv';
        else if (v.status === 'redeemed') statusDE = 'Eingelöst';
        else if (v.status === 'expired') statusDE = 'Abgelaufen';
        else if (v.status === 'cancelled') statusDE = 'Storniert';
        
        // Versandart auf Deutsch
        let deliveryDE = v.delivery_method || '-';
        if (v.delivery_method === 'in_person') deliveryDE = 'Vor Ort';
        else if (v.delivery_method === 'mail') deliveryDE = 'Per Post';
        else if (v.delivery_method === 'email') deliveryDE = 'Per E-Mail';
        
        // CSV-Zeile erstellen (Kommas in Texten escapen)
        const escapeCsv = (text) => {
            if (!text) return '-';
            text = String(text).replace(/"/g, '""'); // Doppelte Anführungszeichen escapen
            if (text.includes(',') || text.includes('"') || text.includes('\n')) {
                return `"${text}"`;
            }
            return text;
        };
        
        csv += `${v.code},${statusDE},${originalValue},${remainingValue},${redeemedValue},`;
        csv += `${escapeCsv(v.buyer_name)},${escapeCsv(v.buyer_email)},${deliveryDE},`;
        csv += `${createdDate},${expiryDate},${redeemedDate},${escapeCsv(v.notes)}\n`;
    });
    
    // Download auslösen
    const timestamp = new Date().toISOString().split('T')[0];
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `alle-gutscheine-${timestamp}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    console.log(`${vouchers.length} Gutscheine exportiert!`);
}

// ====================================
// TÄGLICHE EINLÖSUNGEN (KASSENABSCHLUSS)
// ====================================

// Einlösungen laden und anzeigen
async function loadAndDisplayRedemptions() {
    const dateInput = document.getElementById('redemption-date');
    const displayDiv = document.getElementById('redemptions-display');
    
    if (!dateInput || !displayDiv) return;
    
    const selectedDate = dateInput.value;
    
    // Lade-Anzeige
    displayDiv.innerHTML = '<p style="text-align: center; color: #888;">Lädt...</p>';
    
    // Daten laden
    const result = await loadRedemptionsByDate(selectedDate);
    
    if (!result) {
        displayDiv.innerHTML = '<p style="text-align: center; color: red;">Fehler beim Laden</p>';
        return;
    }
    
    // Anzeigen
    if (result.count === 0) {
        displayDiv.innerHTML = `
            <div style="text-align: center; padding: 30px; color: #888;">
                📅 Keine Einlösungen am ${new Date(selectedDate).toLocaleDateString('de-DE')}
            </div>
        `;
        return;
    }
    
    // Liste erstellen
    let html = `
        <!-- GESAMTSUMME -->
        <div style="background-color: #6B7C59; color: white; padding: 20px; border-radius: 10px; margin-top: 20px; margin-bottom: 20px; text-align: center;">
            <div style="font-size: 14px; margin-bottom: 5px;">Kassenabschluss</div>
            <div style="font-size: 36px; font-weight: bold;">${result.totalAmount.toFixed(2)} €</div>
            <div style="font-size: 14px; margin-top: 5px;">${result.count} Einlösungen</div>
        </div>
        
        <!-- TABELLE -->
        <div style="background-color: white; border-radius: 10px; overflow-x: auto; -webkit-overflow-scrolling: touch;">
            <table style="min-width: 600px; width: 100%; border-collapse: collapse;">
                <thead>
                    <tr style="background-color: #D7C4A3;">
                        <th style="padding: 12px; text-align: left; color: #8B5A3C;">Uhrzeit</th>
                        <th style="padding: 12px; text-align: left; color: #8B5A3C;">Code</th>
                        <th style="padding: 12px; text-align: left; color: #8B5A3C;">Käufer</th>
                        <th style="padding: 12px; text-align: left; color: #8B5A3C;">Art</th>
                        <th style="padding: 12px; text-align: right; color: #8B5A3C;">Betrag</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    result.transactions.forEach(t => {
        const time = new Date(t.created_at).toLocaleTimeString('de-DE', {
            hour: '2-digit',
            minute: '2-digit'
        });
        const isPartial = t.action === 'partial_redeem';
        const buyerName = t.vouchers.buyer_name || '-';
        
        html += `
            <tr style="border-bottom: 1px solid #E8D9B6;">
                <td style="padding: 12px;">${time}</td>
                <td style="padding: 12px; font-weight: bold;">${t.vouchers.code}</td>
                <td style="padding: 12px;">${buyerName}</td>
                <td style="padding: 12px;">${isPartial ? '📊 Teilweise' : '✅ Komplett'}</td>
                <td style="padding: 12px; text-align: right; font-weight: bold;">${parseFloat(t.amount).toFixed(2)} €</td>
            </tr>
        `;
    });
    
    html += `
                </tbody>
            </table>
        </div>
    `;
    
    displayDiv.innerHTML = html;
}

// Datum um X Tage ändern (z.B. -1 für gestern, +1 für morgen)
function changeRedemptionDate(days) {
    const dateInput = document.getElementById('redemption-date');
    if (!dateInput) return;
    
    // Aktuelles Datum holen
    const currentDate = new Date(dateInput.value);
    
    // Tage addieren/subtrahieren
    currentDate.setDate(currentDate.getDate() + days);
    
    // Neues Datum setzen (Format: YYYY-MM-DD)
    dateInput.value = currentDate.toISOString().split('T')[0];
    
    // Daten automatisch laden
    loadAndDisplayRedemptions();
}

// CSV-Export der Tages-Einlösungen
async function exportDailyRedemptions() {
    const dateInput = document.getElementById('redemption-date');
    if (!dateInput) return;
    
    const selectedDate = dateInput.value;
    const result = await loadRedemptionsByDate(selectedDate);
    
    if (!result || result.count === 0) {
        alert('Keine Einlösungen zum Exportieren vorhanden.');
        return;
    }
    
    // CSV erstellen
    let csv = 'Uhrzeit,Code,Käufer,Art,Betrag (EUR)\n';
    
    result.transactions.forEach(t => {
        const time = new Date(t.created_at).toLocaleTimeString('de-DE');
        const isPartial = t.action === 'partial_redeem';
        const buyerName = t.vouchers.buyer_name || '-';
        const type = isPartial ? 'Teilweise' : 'Komplett';
        
        csv += `${time},${t.vouchers.code},${buyerName},${type},${parseFloat(t.amount).toFixed(2)}\n`;
    });
    
    csv += `\nGESAMT:,,,${result.totalAmount.toFixed(2)}\n`;
    
    // Download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `kassenabschluss-${selectedDate}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// ====================================
// SORTIERUNG FÜR GUTSCHEIN-LISTE
// ====================================

// Aktuellen Filter ermitteln
function getCurrentFilter() {
    const activeButton = document.querySelector('.filter-buttons-row button.active');
    if (!activeButton) return 'all';
    
    const text = activeButton.textContent.trim().toLowerCase();
    const filterMap = {
        'alle': 'all',
        'aktiv': 'active',
        'eingelöst': 'redeemed',
        'abgelaufen': 'expired',
        'storniert': 'cancelled'
    };
    
    return filterMap[text] || 'all';
}

// Gutschein-Liste sortieren
async function sortVoucherList(sortBy, searchTerm, filterStatus) {
    console.log('Sortiere nach:', sortBy);
    
    const app = document.getElementById('app');
    
    // Lade-Anzeige
    app.innerHTML = `
        <div class="voucher-list">
            <div class="list-header">
                <h2>📋 Alle Gutscheine</h2>
                <button onclick="goBack()">← Zurück</button>
            </div>
            <p style="text-align: center; padding: 40px;">Lädt...</p>
        </div>
    `;
    
    // Gutscheine laden
    const vouchers = await loadAllVouchers();
    
    // Filter anwenden
    let filteredVouchers = vouchers;
    
    if (filterStatus !== 'all') {
        filteredVouchers = filteredVouchers.filter(v => v.status === filterStatus);
    }
    
    if (searchTerm.trim() !== '') {
        const term = searchTerm.toLowerCase().trim();
        filteredVouchers = filteredVouchers.filter(v => 
            v.code.toLowerCase().includes(term) ||
            (v.buyer_name && v.buyer_name.toLowerCase().includes(term))
        );
    }
    
    // SORTIEREN
    if (sortBy === 'date') {
        // Nach Datum (neueste zuerst)
        filteredVouchers.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    } else if (sortBy === 'value') {
        // Nach Wert (höchste zuerst)
        filteredVouchers.sort((a, b) => parseFloat(b.original_value) - parseFloat(a.original_value));
    } else if (sortBy === 'code') {
        // Nach Code (alphabetisch)
        filteredVouchers.sort((a, b) => a.code.localeCompare(b.code));
    }
    
    // Karten erstellen
    let cardsHTML = '';
    
    if (filteredVouchers.length === 0) {
        if (searchTerm || filterStatus !== 'all') {
            cardsHTML = '<div class="no-results">🔍 Keine Gutscheine gefunden. Versuche andere Filter oder Suchbegriffe.</div>';
        } else {
            cardsHTML = '<div class="no-results">📋 Noch keine Gutscheine vorhanden.</div>';
        }
    } else {
        for (const voucher of filteredVouchers) {
            const createdDate = new Date(voucher.created_at).toLocaleDateString('de-DE');
            const expiryDate = new Date(voucher.expires_at).toLocaleDateString('de-DE');
            
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
                <div class="voucher-card" id="voucher-${voucher.id}" onclick="toggleVoucherCard('${voucher.id}')">
                    <div class="voucher-card-header">
                        <div class="voucher-code">${voucher.code}</div>
                        <span class="${statusClass}">${statusText}</span>
                    </div>
                    <div class="voucher-card-info">
                        <div>Wert: ${parseFloat(voucher.original_value).toFixed(2)} €</div>
                        <div>Erstellt: ${createdDate}</div>
                    </div>
                </div>
            `;
        }
    }
    
    // Inhalt aktualisieren
    app.innerHTML = `
        <div class="voucher-list">
            <div class="list-header">
                <h2>📋 Alle Gutscheine (${filteredVouchers.length})</h2>
                <div style="display: flex; gap: 10px;">
                    <button onclick="exportAllVouchersToCSV()" style="background-color: #A67C52;">📥 CSV Export</button>
                    <button onclick="goBack()">← Zurück</button>
                </div>
            </div>
            
            <div class="list-search-box">
                <input 
                    type="text" 
                    id="list-search-input" 
                    placeholder="🔍 Suche nach Code oder Käufer-Name..."
                    value="${searchTerm}"
                    onkeyup="handleListSearch()"
                >
                <!-- STATUS FILTER -->
                <div class="filter-buttons-row">
                    <button class="${filterStatus === 'all' ? 'active' : ''}" onclick="showVoucherList('all', document.getElementById('list-search-input').value)">
                        Alle
                    </button>
                    <button class="${filterStatus === 'active' ? 'active' : ''}" onclick="showVoucherList('active', document.getElementById('list-search-input').value)">
                        Aktiv
                    </button>
                    <button class="${filterStatus === 'redeemed' ? 'active' : ''}" onclick="showVoucherList('redeemed', document.getElementById('list-search-input').value)">
                        Eingelöst
                    </button>
                    <button class="${filterStatus === 'expired' ? 'active' : ''}" onclick="showVoucherList('expired', document.getElementById('list-search-input').value)">
                        Abgelaufen
                    </button>
                    <button class="${filterStatus === 'cancelled' ? 'active' : ''}" onclick="showVoucherList('cancelled', document.getElementById('list-search-input').value)">
                        Storniert
                    </button>
                </div>
                
                <!-- SORTIER-BUTTONS -->
                <div class="filter-buttons-row" style="margin-top: 10px; border-top: 1px solid #E8D9B6; padding-top: 10px;">
                    <button onclick="sortVoucherList('date', document.getElementById('list-search-input').value, getCurrentFilter())">
                        📅 Nach Datum
                    </button>
                    <button onclick="sortVoucherList('value', document.getElementById('list-search-input').value, getCurrentFilter())">
                        💰 Nach Wert
                    </button>
                    <button onclick="sortVoucherList('code', document.getElementById('list-search-input').value, getCurrentFilter())">
                        🔢 Nach Code
                    </button>
                </div>
            </div>
            
            <div class="voucher-cards">
                ${cardsHTML}
            </div>
        </div>
    `;
}

// ====================================
// ADMIN-PASSWORT ÄNDERN
// ====================================

function showChangePassword() {
    const app = document.getElementById('app');
    
    app.innerHTML = `
        <div class="dashboard">
            <div class="list-header">
                <h2>🔑 Passwort ändern</h2>
                <button onclick="showAdminDashboard()">← Zurück</button>
            </div>
            
            <div style="background-color: white; padding: 30px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); max-width: 500px; margin: 20px auto;">
                
                <div class="form-group">
                    <label for="current-password">Aktuelles Passwort:</label>
                    <input 
                        type="password" 
                        id="current-password" 
                        placeholder="Aktuelles Passwort eingeben"
                    >
                </div>
                
                <div class="form-group">
                    <label for="new-password">Neues Passwort:</label>
                    <input 
                        type="password" 
                        id="new-password" 
                        placeholder="Neues Passwort eingeben"
                    >
                </div>
                
                <div class="form-group">
                    <label for="confirm-password">Neues Passwort bestätigen:</label>
                    <input 
                        type="password" 
                        id="confirm-password" 
                        placeholder="Neues Passwort wiederholen"
                    >
                </div>
                
                <div style="background-color: #F6EAD2; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                    <strong>⚠️ Wichtig:</strong>
                    <ul style="margin: 10px 0 0 20px; color: #6B7C59;">
                        <li>Mindestens 6 Zeichen</li>
                        <li>Merke dir das neue Passwort gut!</li>
                    </ul>
                </div>
                
                <div class="action-buttons">
                    <button onclick="changeAdminPassword()">✅ Passwort ändern</button>
                    <button onclick="showAdminDashboard()">❌ Abbrechen</button>
                </div>
            </div>
        </div>
    `;
}

function changeAdminPassword() {
    const currentPassword = document.getElementById('current-password').value;
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    
    if (!currentPassword || !newPassword || !confirmPassword) {
        alert('⚠️ Bitte alle Felder ausfüllen!');
        return;
    }
    
    // Aktuelles PIN aus loggedInUser holen
    const loggedInUserStr = localStorage.getItem('loggedInUser');
    if (!loggedInUserStr) {
        alert('❌ Fehler: Kein Admin eingeloggt!');
        return;
    }
    
    const loggedInUser = JSON.parse(loggedInUserStr);
    const storedPin = loggedInUser.pin || '1234';
    
    if (currentPassword !== storedPin) {
        alert('❌ Aktuelles Passwort ist falsch!');
        return;
    }
    
    if (newPassword !== confirmPassword) {
        alert('⚠️ Die neuen Passwörter stimmen nicht überein!');
        return;
    }
    
    if (newPassword.length < 4) {
        alert('⚠️ Das neue Passwort muss mindestens 4 Zeichen lang sein!');
        return;
    }
    
    if (newPassword === currentPassword) {
        alert('⚠️ Das neue Passwort muss sich vom aktuellen unterscheiden!');
        return;
    }
    
    const confirmed = confirm('🔐 Passwort wirklich ändern?');
    
    if (!confirmed) return;
    
    // Neues PIN speichern
    loggedInUser.pin = newPassword;
    localStorage.setItem('loggedInUser', JSON.stringify(loggedInUser));
    
    alert('✅ Passwort erfolgreich geändert!');
    showAdminDashboard();
}

// ====================================
// TEMPLATE-VERWALTUNG
// ====================================

// Template-Manager anzeigen
function showTemplateManager() {
    if (!isAdmin()) {
        showAdminLogin();
        return;
    }
    
    console.log('Zeige Template-Manager...');
    
    // Templates aus localStorage laden
    const templates = loadTemplates();
    
    const app = document.getElementById('app');
    
    app.innerHTML = `
        <div class="template-manager">
            <div class="list-header">
                <h2>📑 Template-Verwaltung</h2>
                <button onclick="showAdminDashboard()">← Zurück</button>
            </div>
            
            <div class="action-buttons">
                <button onclick="showCreateTemplate()">➕ Neues Template</button>
            </div>
            
            <div class="template-list">
                ${templates.length === 0 ? `
                    <div style="text-align: center; padding: 40px; color: #8B5A3C;">
                        <p>Noch keine Templates vorhanden.</p>
                        <p>Erstelle dein erstes Template!</p>
                    </div>
                ` : templates.map(template => `
                    <div class="template-card">
                        <div class="template-info">
                            <h3>${template.name}</h3>
                            <p style="font-size: 14px; color: #666;">
                                Format: ${template.width} x ${template.height} px
                            </p>
                        </div>
                        <div class="template-actions">
                            <button onclick="editTemplate('${template.id}')" style="background-color: #A67C52;">
                                ✏️ Bearbeiten
                            </button>
                            <button onclick="deleteTemplate('${template.id}')" style="background-color: #8B5A3C;">
                                🗑️ Löschen
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

// Templates aus localStorage laden
function loadTemplates() {
    const stored = localStorage.getItem('voucherTemplates');
    return stored ? JSON.parse(stored) : [];
}

// Templates in localStorage speichern
function saveTemplates(templates) {
    localStorage.setItem('voucherTemplates', JSON.stringify(templates));
}

// Neues Template erstellen - Formular anzeigen
function showCreateTemplate() {
    const app = document.getElementById('app');
    
    app.innerHTML = `
        <div class="create-template">
            <div class="list-header">
                <h2>➕ Neues Template</h2>
                <button onclick="showTemplateManager()">← Zurück</button>
            </div>
            
            <form id="template-form" onsubmit="handleTemplateUpload(event)">
                <div class="form-group">
                    <label for="template-name">Template-Name *</label>
                    <input 
                        type="text" 
                        id="template-name" 
                        required
                        placeholder="z.B. Geburtstag, Weihnachten, Ostern"
                    >
                </div>
                
                <div class="form-group">
                    <label for="template-pdf">PDF-Template hochladen *</label>
                    <input 
                        type="file" 
                        id="template-pdf" 
                        accept=".pdf"
                        required
                    >
                    <small style="color: #666; display: block; margin-top: 5px;">
                        Unterstützte Formate: A4, A5, A6 oder individuell
                    </small>
                </div>
                
                <div class="form-actions">
                    <button type="submit">Weiter zur Konfiguration →</button>
                    <button type="button" onclick="showTemplateManager()" style="background-color: #8B5A3C;">
                        Abbrechen
                    </button>
                </div>
            </form>
        </div>
    `;
}

// Template hochladen und verarbeiten
async function handleTemplateUpload(event) {
    event.preventDefault();
    
    const nameInput = document.getElementById('template-name');
    const pdfInput = document.getElementById('template-pdf');
    
    const templateName = nameInput.value.trim();
    const pdfFile = pdfInput.files[0];
    
    if (!pdfFile) {
        alert('Bitte wähle eine PDF-Datei aus.');
        return;
    }
    
    try {
        console.log('Lade PDF-Template...');
        
        // PDF als ArrayBuffer laden
        const arrayBuffer = await pdfFile.arrayBuffer();
        
        // PDF mit pdf-lib öffnen um Größe zu ermitteln
        const { PDFDocument } = PDFLib;
        const pdfDoc = await PDFDocument.load(arrayBuffer);
        const firstPage = pdfDoc.getPages()[0];
        const { width, height } = firstPage.getSize();
        
        console.log('PDF-Größe:', width, 'x', height);
        
        // PDF als Base64 speichern
        const base64 = await fileToBase64(pdfFile);
        
        // Temporäres Template-Objekt erstellen
        const template = {
            id: 'temp-' + Date.now(),
            name: templateName,
            pdfData: base64,
            width: width,
            height: height,
            fields: {
                code: { x: 100, y: height - 300, fontSize: 22 },
                value: { x: 100, y: height - 250, fontSize: 56 },
                expiryDate: { x: 100, y: height - 400, fontSize: 16 },
                qrCode: { x: width - 200, y: height - 480, size: 150 }
            }
        };
        
        // Zur Konfiguration weiterleiten
        showTemplateConfiguration(template);
        
    } catch (error) {
        console.error('Fehler beim Laden des PDFs:', error);
        alert('Fehler beim Laden des PDFs: ' + error.message);
    }
}

// Datei in Base64 konvertieren
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// Template-Konfiguration anzeigen (Drag & Drop)
function showTemplateConfiguration(template) {
    const app = document.getElementById('app');
    
    app.innerHTML = `
        <div class="template-config">
            <div class="list-header">
                <h2>⚙️ Template konfigurieren: ${template.name}</h2>
                <button onclick="showTemplateManager()">← Abbrechen</button>
            </div>
            
            <p style="margin-bottom: 20px; color: #666;">
                <strong>📱 Ziehe die Felder an die gewünschte Position auf dem Template.</strong><br>
                Klicke auf ein Feld um die Größe anzupassen.
            </p>
            
            <!-- PDF Canvas Container -->
            <div style="position: relative; margin: 20px auto; max-width: 800px; border: 2px solid #6B7C59; background: white;">
                <canvas id="pdf-canvas" style="display: block; width: 100%;"></canvas>
                
                <!-- Draggable Felder -->
                <div id="field-code" class="draggable-field" style="position: absolute; left: ${template.fields.code.x}px; top: ${template.fields.code.y}px; cursor: move; background: rgba(107, 124, 89, 0.7); color: white; padding: 5px 10px; border-radius: 4px; font-size: ${template.fields.code.fontSize}px; touch-action: none; display: flex; align-items: center; justify-content: center; text-align: center;">
                    📌 CODE
                </div>
                
                <div id="field-value" class="draggable-field" style="position: absolute; left: ${template.fields.value.x}px; top: ${template.fields.value.y}px; cursor: move; background: rgba(139, 90, 60, 0.7); color: white; padding: 5px 10px; border-radius: 4px; font-size: ${template.fields.value.fontSize}px; touch-action: none; display: flex; align-items: center; justify-content: center; text-align: center;">
                    💰 WERT
                </div>
                
                <div id="field-expiry" class="draggable-field" style="position: absolute; left: ${template.fields.expiryDate.x}px; top: ${template.fields.expiryDate.y}px; cursor: move; background: rgba(107, 124, 89, 0.7); color: white; padding: 5px 10px; border-radius: 4px; font-size: ${template.fields.expiryDate.fontSize}px; touch-action: none; display: flex; align-items: center; justify-content: center; text-align: center;">
                    📅 DATUM
                </div>
                
                <div id="field-qr" class="draggable-field" style="position: absolute; left: ${template.fields.qrCode.x}px; top: ${template.fields.qrCode.y}px; cursor: move; background: rgba(139, 90, 60, 0.7); color: white; padding: 5px; border-radius: 4px; width: ${template.fields.qrCode.size}px; height: ${template.fields.qrCode.size}px; display: flex; align-items: center; justify-content: center; touch-action: none;">
                    📱 QR
                </div>
            </div>
            
            <!-- Größen-Steuerung -->
            <div id="size-controls" style="margin: 20px auto; max-width: 800px; padding: 20px; background: #F6EAD2; border-radius: 8px; display: none;">
                <h3 id="selected-field-name" style="margin-bottom: 15px;">Feld ausgewählt</h3>
                <div style="display: flex; gap: 20px; align-items: center;">
                    <div>
                        <label>Schriftgröße / Größe:</label>
                        <input type="range" id="size-slider" min="8" max="72" value="14" style="width: 200px;">
                        <span id="size-value">14</span>px
                    </div>
                    <button onclick="deselectField()" style="background-color: #8B5A3C; padding: 8px 16px;">
                        ✓ Fertig
                    </button>
                </div>
            </div>
            
            <!-- Speichern-Button -->
            <div style="display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; margin: 30px 0;">
                <button onclick="testTemplatePreview()" style="background-color: #6B7C59; font-size: 18px; padding: 15px 40px;">
                    📋 Test-Vorschau
                </button>
                <button onclick="saveTemplateWithPositions()" style="font-size: 18px; padding: 15px 40px;">
                    💾 Template speichern
                </button>
                <button onclick="showTemplateManager()" style="background-color: #8B5A3C; padding: 15px 40px;">
                    Abbrechen
                </button>
            </div>
        </div>
    `;
    
    // PDF rendern
    renderPDFOnCanvas(template.pdfData, template.width, template.height);
    
    // Drag & Drop initialisieren
    initDragAndDrop(template);
    
    // Template global speichern für späteres Speichern
    window.currentTemplate = template;
}

// PDF auf Canvas rendern
async function renderPDFOnCanvas(pdfDataUrl, width, height) {
    try {
        const canvas = document.getElementById('pdf-canvas');
        const ctx = canvas.getContext('2d');
        
        // Canvas-Größe setzen
        canvas.width = width;
        canvas.height = height;
        
        // PDF als Image laden
        const img = new Image();
        img.onload = function() {
            ctx.drawImage(img, 0, 0, width, height);
        };
        img.src = pdfDataUrl;
        
    } catch (error) {
        console.error('Fehler beim Rendern:', error);
    }
}

// Drag & Drop initialisieren
function initDragAndDrop(template) {
    const fields = ['code', 'value', 'expiry', 'qr'];
    
    fields.forEach(fieldName => {
        const element = document.getElementById(`field-${fieldName}`);
        if (!element) return;
        
        // Resize-Handle hinzufügen
        const resizeHandle = document.createElement('div');
        resizeHandle.className = 'resize-handle';
        resizeHandle.style.cssText = 'position: absolute; right: -5px; bottom: -5px; width: 15px; height: 15px; background: white; border: 2px solid #6B7C59; cursor: nwse-resize; border-radius: 50%; display: none;';
        element.appendChild(resizeHandle);
        
        // Resize-Handle bei Hover zeigen
        element.addEventListener('mouseenter', () => resizeHandle.style.display = 'block');
        element.addEventListener('mouseleave', () => {
            if (!element.classList.contains('resizing')) {
                resizeHandle.style.display = 'none';
            }
        });
        element.addEventListener('touchstart', () => resizeHandle.style.display = 'block');
        
        let isDragging = false;
        let isResizing = false;
        let startX, startY, initialLeft, initialTop, initialWidth, initialHeight, initialFontSize;
        
        // RESIZE - Mouse Events
        resizeHandle.addEventListener('mousedown', function(e) {
            isResizing = true;
            element.classList.add('resizing');
            startX = e.clientX;
            startY = e.clientY;
            
            if (fieldName === 'qr') {
                initialWidth = element.offsetWidth;
            } else {
                initialFontSize = parseInt(element.style.fontSize);
            }
            
            e.stopPropagation();
            e.preventDefault();
        });
        
        // RESIZE - Touch Events
        resizeHandle.addEventListener('touchstart', function(e) {
            isResizing = true;
            element.classList.add('resizing');
            const touch = e.touches[0];
            startX = touch.clientX;
            startY = touch.clientY;
            
            if (fieldName === 'qr') {
                initialWidth = element.offsetWidth;
            } else {
                initialFontSize = parseInt(element.style.fontSize);
            }
            
            e.stopPropagation();
            e.preventDefault();
        });
        
        // DRAG - Mouse Events
        element.addEventListener('mousedown', function(e) {
            if (e.target === resizeHandle) return;
            
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            initialLeft = element.offsetLeft;
            initialTop = element.offsetTop;
            element.style.zIndex = 1000;
            e.preventDefault();
        });
        
        // DRAG - Touch Events
        element.addEventListener('touchstart', function(e) {
            if (e.target === resizeHandle) return;
            
            isDragging = true;
            const touch = e.touches[0];
            startX = touch.clientX;
            startY = touch.clientY;
            initialLeft = element.offsetLeft;
            initialTop = element.offsetTop;
            element.style.zIndex = 1000;
            e.preventDefault();
        });
        
        // MOVE - Mouse
        document.addEventListener('mousemove', function(e) {
            if (isResizing) {
                const deltaX = e.clientX - startX;
                
                if (fieldName === 'qr') {
                    const newSize = Math.max(50, Math.min(300, initialWidth + deltaX));
                    element.style.width = newSize + 'px';
                    element.style.height = newSize + 'px';
                } else {
                    const newFontSize = Math.max(8, Math.min(72, initialFontSize + Math.floor(deltaX / 3)));
                    element.style.fontSize = newFontSize + 'px';
                }
            }
            
            if (isDragging) {
                const deltaX = e.clientX - startX;
                const deltaY = e.clientY - startY;
                
                element.style.left = (initialLeft + deltaX) + 'px';
                element.style.top = (initialTop + deltaY) + 'px';
            }
        });
        
        // MOVE - Touch
        document.addEventListener('touchmove', function(e) {
            const touch = e.touches[0];
            
            if (isResizing) {
                const deltaX = touch.clientX - startX;
                
                if (fieldName === 'qr') {
                    const newSize = Math.max(50, Math.min(300, initialWidth + deltaX));
                    element.style.width = newSize + 'px';
                    element.style.height = newSize + 'px';
                } else {
                    const newFontSize = Math.max(8, Math.min(72, initialFontSize + Math.floor(deltaX / 3)));
                    element.style.fontSize = newFontSize + 'px';
                }
                e.preventDefault();
            }
            
            if (isDragging) {
                const deltaX = touch.clientX - startX;
                const deltaY = touch.clientY - startY;
                
                element.style.left = (initialLeft + deltaX) + 'px';
                element.style.top = (initialTop + deltaY) + 'px';
                e.preventDefault();
            }
        });
        
        // END - Mouse & Touch
        document.addEventListener('mouseup', function() {
            if (isDragging) {
                isDragging = false;
                element.style.zIndex = 10;
            }
            if (isResizing) {
                isResizing = false;
                element.classList.remove('resizing');
                resizeHandle.style.display = 'none';
            }
        });
        
        document.addEventListener('touchend', function() {
            if (isDragging) {
                isDragging = false;
                element.style.zIndex = 10;
            }
            if (isResizing) {
                isResizing = false;
                element.classList.remove('resizing');
                resizeHandle.style.display = 'none';
            }
        });
    });
}

// Feld zum Größe-Ändern auswählen
let selectedField = null;

function selectFieldForSizing(fieldName) {
    selectedField = fieldName;
    const element = document.getElementById(`field-${fieldName}`);
    const controls = document.getElementById('size-controls');
    const nameDisplay = document.getElementById('selected-field-name');
    const slider = document.getElementById('size-slider');
    const valueDisplay = document.getElementById('size-value');
    
    // Feldnamen anzeigen
    const names = {
        'code': '📌 Gutschein-Code',
        'value': '💰 Wert',
        'expiry': '📅 Gültigkeitsdatum',
        'qr': '📱 QR-Code'
    };
    
    nameDisplay.textContent = names[fieldName];
    
    // Aktuelle Größe
    let currentSize;
    if (fieldName === 'qr') {
        currentSize = parseInt(element.style.width);
        slider.min = 50;
        slider.max = 300;
    } else {
        currentSize = parseInt(element.style.fontSize);
        slider.min = 8;
        slider.max = 72;
    }
    
    slider.value = currentSize;
    valueDisplay.textContent = currentSize;
    
    // Slider Event
    slider.oninput = function() {
        const newSize = this.value;
        valueDisplay.textContent = newSize;
        
        if (fieldName === 'qr') {
            element.style.width = newSize + 'px';
            element.style.height = newSize + 'px';
        } else {
            element.style.fontSize = newSize + 'px';
        }
    };
    
    controls.style.display = 'block';
    
    // Highlight
    document.querySelectorAll('.draggable-field').forEach(f => f.style.outline = '');
    element.style.outline = '3px solid #6B7C59';
}

function deselectField() {
    selectedField = null;
    document.getElementById('size-controls').style.display = 'none';
    document.querySelectorAll('.draggable-field').forEach(f => f.style.outline = '');
}

// Template mit aktuellen Positionen speichern
function saveTemplateWithPositions() {
    const template = window.currentTemplate;
    
    if (!template) {
        alert('Fehler: Template-Daten nicht gefunden');
        return;
    }
    
    // Canvas und Skalierung ermitteln
    const canvas = document.getElementById('pdf-canvas');
    const displayWidth = canvas.offsetWidth;
    const displayHeight = canvas.offsetHeight;
    const actualWidth = template.width;
    const actualHeight = template.height;
    
    const scaleX = actualWidth / displayWidth;
    const scaleY = actualHeight / displayHeight;
    
    console.log('Skalierung:', scaleX, scaleY);
    console.log('Display:', displayWidth, 'x', displayHeight);
    console.log('Actual:', actualWidth, 'x', actualHeight);
    
    // Aktuelle Positionen auslesen und umrechnen
    const codeEl = document.getElementById('field-code');
    const valueEl = document.getElementById('field-value');
    const expiryEl = document.getElementById('field-expiry');
    const qrEl = document.getElementById('field-qr');
    
    // Positionen speichern (in PDF-Pixeln)
    template.fields = {
        code: {
            x: Math.round(parseInt(codeEl.style.left) * scaleX),
            y: Math.round(parseInt(codeEl.style.top) * scaleY),
            fontSize: Math.round(parseInt(codeEl.style.fontSize) * scaleX)
        },
        value: {
            x: Math.round(parseInt(valueEl.style.left) * scaleX),
            y: Math.round(parseInt(valueEl.style.top) * scaleY),
            fontSize: Math.round(parseInt(valueEl.style.fontSize) * scaleX)
        },
        expiryDate: {
            x: Math.round(parseInt(expiryEl.style.left) * scaleX),
            y: Math.round(parseInt(expiryEl.style.top) * scaleY),
            fontSize: Math.round(parseInt(expiryEl.style.fontSize) * scaleX)
        },
        qrCode: {
            x: Math.round(parseInt(qrEl.style.left) * scaleX),
            y: Math.round(parseInt(qrEl.style.top) * scaleY),
            size: Math.round(parseInt(qrEl.style.width) * scaleX)
        }
    };
    
    console.log('Gespeicherte Felder:', template.fields);
    
    // Eindeutige ID generieren (falls noch temp)
    if (template.id.startsWith('temp-')) {
        template.id = 'template-' + Date.now();
    }
    
    // Templates laden
    const templates = loadTemplates();
    
    // Prüfen ob Template schon existiert (beim Bearbeiten)
    const existingIndex = templates.findIndex(t => t.id === template.id);
    
    if (existingIndex >= 0) {
        // Update
        templates[existingIndex] = template;
    } else {
        // Neu hinzufügen
        templates.push(template);
    }
    
    // Speichern
    saveTemplates(templates);
    
    console.log('Template gespeichert:', template);
    
    alert('✅ Template "' + template.name + '" erfolgreich gespeichert!');
    
    // Zurück zum Template-Manager
    showTemplateManager();
}

// Template bearbeiten
function editTemplate(templateId) {
    const templates = loadTemplates();
    const template = templates.find(t => t.id === templateId);
    
    if (!template) {
        alert('Template nicht gefunden');
        return;
    }
    
    // Zur Konfiguration
    showTemplateConfiguration(template);
}

// Template löschen
function deleteTemplate(templateId) {
    if (!confirm('Template wirklich löschen?')) {
        return;
    }
    
    let templates = loadTemplates();
    templates = templates.filter(t => t.id !== templateId);
    
    saveTemplates(templates);
    
    alert('✅ Template gelöscht');
    
    // Liste neu laden
    showTemplateManager();
}

// ====================================
// PDF MIT TEMPLATE GENERIEREN
// ====================================

// Haupt-Funktion: PDF generieren (Template oder Standard)
async function generateVoucherPDF(voucher, templateId = 'default') {
    console.log('Generiere PDF mit Template:', templateId);
    
    if (templateId === 'default') {
        // Standard-Design verwenden
        await generateSimplePDF(voucher);
    } else {
        // Template verwenden
        await generatePDFWithTemplate(voucher, templateId);
    }
}

// PDF mit Template erstellen
async function generatePDFWithTemplate(voucher, templateId) {
    try {
        console.log('Lade Template:', templateId);
        
        // Template laden
        const templates = loadTemplates();
        const template = templates.find(t => t.id === templateId);
        
        if (!template) {
            alert('Template nicht gefunden! Verwende Standard-Design.');
            await generateSimplePDF(voucher);
            return;
        }
        
        const { PDFDocument, rgb, StandardFonts } = PDFLib;
        
        // Template-PDF laden
        const base64Data = template.pdfData.split(',')[1];
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        
        const pdfDoc = await PDFDocument.load(bytes);
        const page = pdfDoc.getPages()[0];
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
        
        const { width, height } = page.getSize();
        
        console.log('Template geladen, Größe:', width, 'x', height);
        
        // GUTSCHEIN-CODE einfügen
        page.drawText(voucher.code, {
            x: template.fields.code.x,
            y: height - template.fields.code.y, // Y-Koordinate umrechnen (PDF = unten 0)
            size: template.fields.code.fontSize,
            font: fontBold,
            color: rgb(0, 0, 0),
        });
        
        // WERT einfügen
        const valueText = `${parseFloat(voucher.original_value).toFixed(2)} €`;
        page.drawText(valueText, {
            x: template.fields.value.x,
            y: height - template.fields.value.y,
            size: template.fields.value.fontSize,
            font: fontBold,
            color: rgb(0, 0, 0),
        });
        
        // GÜLTIGKEITSDATUM einfügen
        const expiryDate = new Date(voucher.expires_at).toLocaleDateString('de-DE');
        page.drawText(expiryDate, {
            x: template.fields.expiryDate.x,
            y: height - template.fields.expiryDate.y,
            size: template.fields.expiryDate.fontSize,
            font: font,
            color: rgb(0, 0, 0),
        });
        
        // QR-CODE einfügen
        const qrContainer = document.getElementById('qr-code');
        const qrCanvas = qrContainer ? qrContainer.querySelector('canvas') : null;
        
        if (qrCanvas) {
            try {
                const qrDataUrl = qrCanvas.toDataURL('image/png');
                const qrImageBytes = await fetch(qrDataUrl).then(res => res.arrayBuffer());
                const qrPdfImage = await pdfDoc.embedPng(qrImageBytes);
                
                const qrSize = template.fields.qrCode.size;
                
                page.drawImage(qrPdfImage, {
                    x: template.fields.qrCode.x,
                    y: height - template.fields.qrCode.y - qrSize, // Y anpassen
                    width: qrSize,
                    height: qrSize,
                });
                
                console.log('QR-Code eingefügt');
            } catch (error) {
                console.log('QR-Code konnte nicht eingefügt werden:', error);
            }
        }
        
        // PDF speichern und downloaden
        const pdfBytes = await pdfDoc.save();
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `Gutschein-${voucher.code}.pdf`;
        link.click();
        
        console.log('PDF mit Template erfolgreich erstellt!');
        
    } catch (error) {
        console.error('Fehler beim PDF-Erstellen mit Template:', error);
        alert('Fehler beim PDF-Erstellen. Versuche Standard-Design...');
        await generateSimplePDF(voucher);
    }
}

// PDF Vorschau anzeigen
async function previewVoucherPDF(voucher, templateId = 'default') {
    console.log('Zeige PDF-Vorschau...');
    
    try {
        // PDF generieren (aber nicht downloaden)
        const pdfBlob = await generatePDFBlob(voucher, templateId);
        
        if (!pdfBlob) {
            alert('Fehler beim Erstellen der Vorschau');
            return;
        }
        
        // URL für Blob erstellen
        const url = URL.createObjectURL(pdfBlob);
        
        // Modal/Overlay anzeigen
        const modal = document.createElement('div');
        modal.id = 'pdf-preview-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            z-index: 9999;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 20px;
        `;
        
        modal.innerHTML = `
            <div style="background: white; border-radius: 8px; max-width: 900px; width: 100%; max-height: 90vh; display: flex; flex-direction: column;">
                <div style="padding: 20px; border-bottom: 2px solid #6B7C59; display: flex; justify-content: space-between; align-items: center;">
                    <h2 style="margin: 0;">📄 PDF-Vorschau: ${voucher.code}</h2>
                    <button onclick="closePDFPreview()" style="background-color: #8B5A3C; padding: 10px 20px;">✕ Schließen</button>
                </div>
                <div style="flex: 1; overflow: auto; padding: 20px;">
                    <embed src="${url}" type="application/pdf" width="100%" height="600px" />
                </div>
                <div style="padding: 20px; border-top: 2px solid #6B7C59; display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
                    <button onclick="generateVoucherPDF(${JSON.stringify(voucher).replace(/"/g, '&quot;')}, '${templateId}'); closePDFPreview();" style="background-color: #A67C52; padding: 12px 30px;">
                        📥 Jetzt herunterladen
                    </button>
                    <button onclick="closePDFPreview()" style="background-color: #8B5A3C; padding: 12px 30px;">
                        Schließen
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Schließen bei Klick auf Hintergrund
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                closePDFPreview();
            }
        });
        
    } catch (error) {
        console.error('Fehler bei Vorschau:', error);
        alert('Fehler beim Erstellen der Vorschau: ' + error.message);
    }
}

// Vorschau schließen
function closePDFPreview() {
    const modal = document.getElementById('pdf-preview-modal');
    if (modal) {
        modal.remove();
    }
}

// PDF als Blob generieren (ohne Download)
async function generatePDFBlob(voucher, templateId = 'default') {
    try {
        if (templateId === 'default') {
            return await generateSimplePDFBlob(voucher);
        } else {
            return await generatePDFWithTemplateBlob(voucher, templateId);
        }
    } catch (error) {
        console.error('Fehler beim PDF-Blob erstellen:', error);
        return null;
    }
}

// Standard-PDF als Blob (ohne Download)
async function generateSimplePDFBlob(voucher) {
    // Kopiere die Logik von generateSimplePDF, aber return blob statt download
    const { PDFDocument, rgb, StandardFonts } = PDFLib;
    
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    
    const { width, height } = page.getSize();
    
    // Farben
    const olivGreen = rgb(0.42, 0.49, 0.35);
    const beige = rgb(0.91, 0.85, 0.71);
    const brown = rgb(0.54, 0.35, 0.24);
    const darkBrown = rgb(0.44, 0.28, 0.19);
    const lightBeige = rgb(0.96, 0.92, 0.82);
    
    // Hintergrund
    page.drawRectangle({
        x: 40,
        y: height - 700,
        width: width - 80,
        height: 600,
        color: lightBeige,
    });
    
    // Obere Linie
    page.drawRectangle({
        x: 40,
        y: height - 110,
        width: width - 80,
        height: 4,
        color: olivGreen,
    });
    
    // Restaurant Name
    page.drawText('My Heart Beats Vegan', {
        x: width / 2 - 105,
        y: height - 80,
        size: 20,
        font: fontBold,
        color: olivGreen,
    });
    
    // Titel
    page.drawRectangle({
        x: 80,
        y: height - 180,
        width: width - 160,
        height: 60,
        color: olivGreen,
    });
    
    page.drawText('GESCHENKGUTSCHEIN', {
        x: width / 2 - 130,
        y: height - 160,
        size: 28,
        font: fontBold,
        color: rgb(1, 1, 1),
    });
    
    // Wert
    const valueText = `${parseFloat(voucher.original_value).toFixed(2)} €`;
    page.drawText(valueText, {
        x: width / 2 - 70,
        y: height - 250,
        size: 56,
        font: fontBold,
        color: brown,
    });
    
    // Code
    page.drawText('Gutschein-Code:', {
        x: 100,
        y: height - 320,
        size: 12,
        font: font,
        color: darkBrown,
    });
    
    page.drawText(voucher.code, {
        x: 100,
        y: height - 345,
        size: 22,
        font: fontBold,
        color: rgb(0, 0, 0),
    });
    
    // Gültig bis
    const expiryDate = new Date(voucher.expires_at).toLocaleDateString('de-DE');
    page.drawText('Gültig bis:', {
        x: 100,
        y: height - 380,
        size: 12,
        font: font,
        color: darkBrown,
    });
    
    page.drawText(expiryDate, {
        x: 100,
        y: height - 400,
        size: 16,
        font: fontBold,
        color: rgb(0, 0, 0),
    });
    
    // QR-Code
    const qrContainer = document.getElementById('qr-code');
    const qrCanvas = qrContainer ? qrContainer.querySelector('canvas') : null;
    
    if (qrCanvas) {
        try {
            const qrDataUrl = qrCanvas.toDataURL('image/png');
            const qrImageBytes = await fetch(qrDataUrl).then(res => res.arrayBuffer());
            const qrPdfImage = await pdfDoc.embedPng(qrImageBytes);
            
            page.drawImage(qrPdfImage, {
                x: width - 192,
                y: height - 472,
                width: 134,
                height: 134,
            });
        } catch (error) {
            console.log('QR-Code konnte nicht eingefügt werden:', error);
        }
    }
    
    // Footer
    page.drawRectangle({
        x: 40,
        y: 120,
        width: width - 80,
        height: 3,
        color: olivGreen,
    });
    
    page.drawText('Einlösbar im Restaurant My Heart Beats Vegan', {
        x: width / 2 - 150,
        y: 90,
        size: 11,
        font: font,
        color: darkBrown,
    });
    
    page.drawText('Nicht mit anderen Aktionen kombinierbar • Keine Barauszahlung möglich', {
        x: width / 2 - 180,
        y: 70,
        size: 9,
        font: font,
        color: rgb(0.5, 0.5, 0.5),
    });
    
    const pdfBytes = await pdfDoc.save();
    return new Blob([pdfBytes], { type: 'application/pdf' });
}

// Template-PDF als Blob (ohne Download)
async function generatePDFWithTemplateBlob(voucher, templateId) {
    const templates = loadTemplates();
    const template = templates.find(t => t.id === templateId);
    
    if (!template) {
        return await generateSimplePDFBlob(voucher);
    }
    
    const { PDFDocument, rgb, StandardFonts } = PDFLib;
    
    // Template laden
    const base64Data = template.pdfData.split(',')[1];
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    
    const pdfDoc = await PDFDocument.load(bytes);
    const page = pdfDoc.getPages()[0];
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    
    const { width, height } = page.getSize();
    
    // Code einfügen (ZENTRIERT)
    const codeText = voucher.code;
    const codeWidth = font.widthOfTextAtSize(codeText, template.fields.code.fontSize);
    page.drawText(codeText, {
        x: template.fields.code.x - (codeWidth / 2),
        y: height - template.fields.code.y,
        size: template.fields.code.fontSize,
        font: fontBold,
        color: rgb(0, 0, 0),
    });

    // Wert einfügen (ZENTRIERT)
    const valueText = `${parseFloat(voucher.original_value).toFixed(2)} €`;
    const valueWidth = fontBold.widthOfTextAtSize(valueText, template.fields.value.fontSize);
    page.drawText(valueText, {
        x: template.fields.value.x - (valueWidth / 2),
        y: height - template.fields.value.y,
        size: template.fields.value.fontSize,
        font: fontBold,
        color: rgb(0, 0, 0),
    });

    // Datum einfügen (ZENTRIERT)
    const expiryDate = new Date(voucher.expires_at).toLocaleDateString('de-DE');
    const dateWidth = font.widthOfTextAtSize(expiryDate, template.fields.expiryDate.fontSize);
    page.drawText(expiryDate, {
        x: template.fields.expiryDate.x - (dateWidth / 2),
        y: height - template.fields.expiryDate.y,
        size: template.fields.expiryDate.fontSize,
        font: font,
        color: rgb(0, 0, 0),
    });
    
    // QR-Code
    const qrContainer = document.getElementById('qr-code');
    const qrCanvas = qrContainer ? qrContainer.querySelector('canvas') : null;
    
    if (qrCanvas) {
        try {
            const qrDataUrl = qrCanvas.toDataURL('image/png');
            const qrImageBytes = await fetch(qrDataUrl).then(res => res.arrayBuffer());
            const qrPdfImage = await pdfDoc.embedPng(qrImageBytes);
            
            const qrSize = template.fields.qrCode.size;
            
            page.drawImage(qrPdfImage, {
                x: template.fields.qrCode.x,
                y: height - template.fields.qrCode.y - qrSize,
                width: qrSize,
                height: qrSize,
            });
        } catch (error) {
            console.log('QR-Code konnte nicht eingefügt werden:', error);
        }
    }
    
    const pdfBytes = await pdfDoc.save();
    return new Blob([pdfBytes], { type: 'application/pdf' });
}

// ====================================
// TEMPLATE TEST-VORSCHAU
// ====================================

// Test-Vorschau mit Beispiel-Daten
async function testTemplatePreview() {
    console.log('Erstelle Test-Vorschau...');
    
    const template = window.currentTemplate;
    
    if (!template) {
        alert('Fehler: Template-Daten nicht gefunden');
        return;
    }
    
    // Aktuelle Positionen temporär speichern
    const canvas = document.getElementById('pdf-canvas');
    const displayWidth = canvas.offsetWidth;
    const displayHeight = canvas.offsetHeight;
    const actualWidth = template.width;
    const actualHeight = template.height;
    
    const scaleX = actualWidth / displayWidth;
    const scaleY = actualHeight / displayHeight;
    
    const codeEl = document.getElementById('field-code');
    const valueEl = document.getElementById('field-value');
    const expiryEl = document.getElementById('field-expiry');
    const qrEl = document.getElementById('field-qr');
    
    // Temporäres Template mit aktuellen Positionen
    const testTemplate = {
        ...template,
        fields: {
            code: {
                x: Math.round(parseInt(codeEl.style.left) * scaleX),
                y: Math.round(parseInt(codeEl.style.top) * scaleY),
                fontSize: Math.round(parseInt(codeEl.style.fontSize) * scaleX)
            },
            value: {
                x: Math.round(parseInt(valueEl.style.left) * scaleX),
                y: Math.round(parseInt(valueEl.style.top) * scaleY),
                fontSize: Math.round(parseInt(valueEl.style.fontSize) * scaleX)
            },
            expiryDate: {
                x: Math.round(parseInt(expiryEl.style.left) * scaleX),
                y: Math.round(parseInt(expiryEl.style.top) * scaleY),
                fontSize: Math.round(parseInt(expiryEl.style.fontSize) * scaleX)
            },
            qrCode: {
                x: Math.round(parseInt(qrEl.style.left) * scaleX),
                y: Math.round(parseInt(qrEl.style.top) * scaleY),
                size: Math.round(parseInt(qrEl.style.width) * scaleX)
            }
        }
    };
    
    // Test-Gutschein erstellen
    const testVoucher = {
        code: 'GIFT-0001',
        original_value: 50.00,
        expires_at: new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000).toISOString() // 2 Jahre
    };
    
    // Test-QR-Code generieren
    const tempQRContainer = document.createElement('div');
    tempQRContainer.id = 'temp-qr-code';
    tempQRContainer.style.display = 'none';
    document.body.appendChild(tempQRContainer);
    
    // QR-Code erstellen
    new QRCode(tempQRContainer, {
        text: testVoucher.code,
        width: 200,
        height: 200,
        colorDark: "#000000",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H
    });
    
    // Kurz warten bis QR-Code gerendert ist
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // PDF generieren
    try {
        const pdfBlob = await generateTestPDFWithTemplate(testVoucher, testTemplate, tempQRContainer);
        
        if (!pdfBlob) {
            alert('Fehler beim Erstellen der Test-Vorschau');
            return;
        }
        
        // URL für Blob erstellen
        const url = URL.createObjectURL(pdfBlob);
        
        // Modal/Overlay anzeigen
        const modal = document.createElement('div');
        modal.id = 'test-preview-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            z-index: 9999;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 20px;
        `;
        
        modal.innerHTML = `
            <div style="background: white; border-radius: 8px; max-width: 900px; width: 100%; max-height: 90vh; display: flex; flex-direction: column;">
                <div style="padding: 20px; border-bottom: 2px solid #6B7C59; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
                    <h2 style="margin: 0;">📋 Test-Vorschau: ${template.name}</h2>
                    <button onclick="closeTestPreview()" style="background-color: #8B5A3C; padding: 10px 20px;">✕ Schließen</button>
                </div>
                <div style="flex: 1; overflow: auto; padding: 20px;">
                    <p style="color: #666; margin-bottom: 15px;">
                        <strong>Test-Daten:</strong> GIFT-0001 • 50,00 € • Gültig bis: ${new Date(testVoucher.expires_at).toLocaleDateString('de-DE')}
                    </p>
                    <embed src="${url}" type="application/pdf" width="100%" height="600px" />
                </div>
                <div style="padding: 20px; border-top: 2px solid #6B7C59; display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
                    <button onclick="closeTestPreview()" style="background-color: #6B7C59; padding: 12px 30px;">
                        ← Zurück zur Konfiguration
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Schließen bei Klick auf Hintergrund
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                closeTestPreview();
            }
        });
        
        // Temp QR-Container aufräumen
        tempQRContainer.remove();
        
    } catch (error) {
        console.error('Fehler bei Test-Vorschau:', error);
        alert('Fehler beim Erstellen der Test-Vorschau: ' + error.message);
        tempQRContainer.remove();
    }
}

// Test-Vorschau schließen
function closeTestPreview() {
    const modal = document.getElementById('test-preview-modal');
    if (modal) {
        modal.remove();
    }
}

// Test-PDF mit Template generieren
async function generateTestPDFWithTemplate(voucher, template, qrContainer) {
    try {
        const { PDFDocument, rgb, StandardFonts } = PDFLib;
        
        // Template laden
        const base64Data = template.pdfData.split(',')[1];
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        
        const pdfDoc = await PDFDocument.load(bytes);
        const page = pdfDoc.getPages()[0];
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
        
        const { width, height } = page.getSize();
        
        console.log('Test-PDF:', template.fields);
        
        // Code einfügen (ZENTRIERT)
        const codeText = voucher.code;
        const codeWidth = font.widthOfTextAtSize(codeText, template.fields.code.fontSize);
        page.drawText(codeText, {
            x: template.fields.code.x - (codeWidth / 2),
            y: height - template.fields.code.y,
            size: template.fields.code.fontSize,
            font: fontBold,
            color: rgb(0, 0, 0),
        });

        // Wert einfügen (ZENTRIERT)
        const valueText = `${parseFloat(voucher.original_value).toFixed(2)} €`;
        const valueWidth = fontBold.widthOfTextAtSize(valueText, template.fields.value.fontSize);
        page.drawText(valueText, {
            x: template.fields.value.x - (valueWidth / 2),
            y: height - template.fields.value.y,
            size: template.fields.value.fontSize,
            font: fontBold,
            color: rgb(0, 0, 0),
        });

        // Datum einfügen (ZENTRIERT)
        const expiryDate = new Date(voucher.expires_at).toLocaleDateString('de-DE');
        const dateWidth = font.widthOfTextAtSize(expiryDate, template.fields.expiryDate.fontSize);
        page.drawText(expiryDate, {
            x: template.fields.expiryDate.x - (dateWidth / 2),
            y: height - template.fields.expiryDate.y,
            size: template.fields.expiryDate.fontSize,
            font: font,
            color: rgb(0, 0, 0),
        });
        
        // QR-Code einfügen
        const qrCanvas = qrContainer ? qrContainer.querySelector('canvas') : null;
        
        if (qrCanvas) {
            try {
                const qrDataUrl = qrCanvas.toDataURL('image/png');
                const qrImageBytes = await fetch(qrDataUrl).then(res => res.arrayBuffer());
                const qrPdfImage = await pdfDoc.embedPng(qrImageBytes);
                
                const qrSize = template.fields.qrCode.size;
                
                page.drawImage(qrPdfImage, {
                    x: template.fields.qrCode.x,
                    y: height - template.fields.qrCode.y - qrSize,
                    width: qrSize,
                    height: qrSize,
                });
            } catch (error) {
                console.log('QR-Code konnte nicht eingefügt werden:', error);
            }
        }
        
        const pdfBytes = await pdfDoc.save();
        return new Blob([pdfBytes], { type: 'application/pdf' });
        
    } catch (error) {
        console.error('Fehler beim Test-PDF:', error);
        throw error;
    }
}

// ====================================
// MANUELLE PLATZIERUNG
// ====================================

// Manuelle Platzierung mit echten Voucher-Daten
function showManualPlacement(voucher, templateId) {
    console.log('Zeige manuelle Platzierung für:', voucher.code);
    
    // Template laden
    const templates = loadTemplates();
    const template = templates.find(t => t.id === templateId);
    
    if (!template) {
        alert('Template nicht gefunden! Verwende Standard-Design.');
        showVoucherCreated(voucher, 'default');
        return;
    }
    
    const app = document.getElementById('app');
    
    app.innerHTML = `
        <div class="manual-placement">
            <div class="list-header">
                <h2>📍 Gutschein platzieren: ${voucher.code}</h2>
            </div>
            
            <p style="margin-bottom: 20px; color: #666; text-align: center;">
                <strong>Ziehe die Felder an die gewünschte Position auf dem Gutschein.</strong><br>
                Die Daten sind bereits ausgefüllt - du siehst genau wie es aussieht!
            </p>
            
            <!-- PDF Canvas Container -->
            <div style="position: relative; margin: 20px auto; max-width: 800px; border: 2px solid #6B7C59; background: white;">
                <canvas id="pdf-canvas" style="display: block; width: 100%;"></canvas>
                
                <!-- Draggable Felder mit ECHTEN Daten -->
                <div id="field-code" class="draggable-field" style="position: absolute; left: ${template.fields.code.x}px; top: ${template.fields.code.y}px; cursor: move; background: rgba(107, 124, 89, 0.7); color: white; padding: 5px 10px; border-radius: 4px; font-size: ${template.fields.code.fontSize}px; touch-action: none; display: flex; align-items: center; justify-content: center; text-align: center;">
                    ${voucher.code}
                </div>
                
                <div id="field-value" class="draggable-field" style="position: absolute; left: ${template.fields.value.x}px; top: ${template.fields.value.y}px; cursor: move; background: rgba(139, 90, 60, 0.7); color: white; padding: 5px 10px; border-radius: 4px; font-size: ${template.fields.value.fontSize}px; touch-action: none; display: flex; align-items: center; justify-content: center; text-align: center;">
                    ${parseFloat(voucher.original_value).toFixed(2)} €
                </div>
                
                <div id="field-expiry" class="draggable-field" style="position: absolute; left: ${template.fields.expiryDate.x}px; top: ${template.fields.expiryDate.y}px; cursor: move; background: rgba(107, 124, 89, 0.7); color: white; padding: 5px 10px; border-radius: 4px; font-size: ${template.fields.expiryDate.fontSize}px; touch-action: none; display: flex; align-items: center; justify-content: center; text-align: center;">
                    ${new Date(voucher.expires_at).toLocaleDateString('de-DE')}
                </div>
                
                <div id="field-qr" class="draggable-field" style="position: absolute; left: ${template.fields.qrCode.x}px; top: ${template.fields.qrCode.y}px; cursor: move; background: rgba(139, 90, 60, 0.7); color: white; padding: 5px; border-radius: 4px; width: ${template.fields.qrCode.size}px; height: ${template.fields.qrCode.size}px; display: flex; align-items: center; justify-content: center; touch-action: none;">
                    📱 QR
                </div>
            </div>
            
            <!-- Buttons -->
            <div style="display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; margin: 30px 0;">
                <button onclick="previewManualPDF()" style="background-color: #6B7C59; font-size: 18px; padding: 15px 40px;">
                    👁️ Vorschau
                </button>
                <button onclick="downloadManualPDF()" style="background-color: #A67C52; font-size: 18px; padding: 15px 40px;">
                    📥 Herunterladen
                </button>
                <button onclick="showDashboard()" style="background-color: #8B5A3C; padding: 15px 40px;">
                    Abbrechen
                </button>
            </div>
        </div>
    `;
    
    // PDF rendern
    renderPDFOnCanvas(template.pdfData, template.width, template.height);
    
    // QR-Code generieren
    setTimeout(() => {
        const qrContainer = document.createElement('div');
        qrContainer.id = 'manual-qr-code';
        qrContainer.style.display = 'none';
        document.body.appendChild(qrContainer);
        
        new QRCode(qrContainer, {
            text: voucher.code,
            width: 200,
            height: 200,
            colorDark: "#000000",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H
        });
    }, 200);
    
    // Drag & Drop initialisieren
    initDragAndDrop(template);
    
    // Daten global speichern
    window.currentVoucher = voucher;
    window.currentTemplate = template;
}

// Vorschau für manuell platzierten Gutschein
async function previewManualPDF() {
    const voucher = window.currentVoucher;
    const template = window.currentTemplate;
    
    if (!voucher || !template) {
        alert('Fehler: Daten nicht gefunden');
        return;
    }
    
    try {
        // Aktuelle Positionen auslesen
        const positions = getManualFieldPositions();
        
        // PDF generieren
        const pdfBlob = await generateManualPDF(voucher, template, positions, false);
        
        if (!pdfBlob) {
            alert('Fehler beim Erstellen der Vorschau');
            return;
        }
        
        // Vorschau anzeigen
        const url = URL.createObjectURL(pdfBlob);
        
        const modal = document.createElement('div');
        modal.id = 'manual-preview-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            z-index: 9999;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 20px;
        `;
        
        modal.innerHTML = `
            <div style="background: white; border-radius: 8px; max-width: 900px; width: 100%; max-height: 90vh; display: flex; flex-direction: column;">
                <div style="padding: 20px; border-bottom: 2px solid #6B7C59; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
                    <h2 style="margin: 0;">👁️ Vorschau: ${voucher.code}</h2>
                    <button onclick="closeManualPreview()" style="background-color: #8B5A3C; padding: 10px 20px;">✕ Schließen</button>
                </div>
                <div style="flex: 1; overflow: auto; padding: 20px;">
                    <embed src="${url}" type="application/pdf" width="100%" height="600px" />
                </div>
                <div style="padding: 20px; border-top: 2px solid #6B7C59; display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
                    <button onclick="downloadManualPDF(); closeManualPreview();" style="background-color: #A67C52; padding: 12px 30px;">
                        📥 Jetzt herunterladen
                    </button>
                    <button onclick="closeManualPreview()" style="background-color: #8B5A3C; padding: 12px 30px;">
                        ← Zurück zur Platzierung
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                closeManualPreview();
            }
        });
        
    } catch (error) {
        console.error('Fehler bei Vorschau:', error);
        alert('Fehler beim Erstellen der Vorschau: ' + error.message);
    }
}

// Vorschau schließen
function closeManualPreview() {
    const modal = document.getElementById('manual-preview-modal');
    if (modal) {
        modal.remove();
    }
}

// Download für manuell platzierten Gutschein
async function downloadManualPDF() {
    const voucher = window.currentVoucher;
    const template = window.currentTemplate;
    
    if (!voucher || !template) {
        alert('Fehler: Daten nicht gefunden');
        return;
    }
    
    try {
        // Aktuelle Positionen auslesen
        const positions = getManualFieldPositions();
        
        // PDF generieren und downloaden
        const pdfBlob = await generateManualPDF(voucher, template, positions, true);
        
        if (pdfBlob) {
            const url = URL.createObjectURL(pdfBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `Gutschein-${voucher.code}.pdf`;
            link.click();
            
            // Erfolg anzeigen
            alert('✅ Gutschein erfolgreich heruntergeladen!');
            
            // Zum Dashboard
            showDashboard();
        }
        
    } catch (error) {
        console.error('Fehler beim Download:', error);
        alert('Fehler beim Download: ' + error.message);
    }
}

// Aktuelle Feld-Positionen auslesen
function getManualFieldPositions() {
    const template = window.currentTemplate;
    const canvas = document.getElementById('pdf-canvas');
    const displayWidth = canvas.offsetWidth;
    const displayHeight = canvas.offsetHeight;
    const actualWidth = template.width;
    const actualHeight = template.height;
    
    const scaleX = actualWidth / displayWidth;
    const scaleY = actualHeight / displayHeight;
    
    const codeEl = document.getElementById('field-code');
    const valueEl = document.getElementById('field-value');
    const expiryEl = document.getElementById('field-expiry');
    const qrEl = document.getElementById('field-qr');
    
    return {
        code: {
            x: Math.round(parseInt(codeEl.style.left) * scaleX),
            y: Math.round(parseInt(codeEl.style.top) * scaleY),
            width: Math.round(codeEl.offsetWidth * scaleX),
            height: Math.round(codeEl.offsetHeight * scaleY),
            fontSize: Math.round(parseInt(codeEl.style.fontSize) * scaleX)
        },
        value: {
            x: Math.round(parseInt(valueEl.style.left) * scaleX),
            y: Math.round(parseInt(valueEl.style.top) * scaleY),
            width: Math.round(valueEl.offsetWidth * scaleX),
            height: Math.round(valueEl.offsetHeight * scaleY),
            fontSize: Math.round(parseInt(valueEl.style.fontSize) * scaleX)
        },
        expiryDate: {
            x: Math.round(parseInt(expiryEl.style.left) * scaleX),
            y: Math.round(parseInt(expiryEl.style.top) * scaleY),
            width: Math.round(expiryEl.offsetWidth * scaleX),
            height: Math.round(expiryEl.offsetHeight * scaleY),
            fontSize: Math.round(parseInt(expiryEl.style.fontSize) * scaleX)
        },
        qrCode: {
            x: Math.round(parseInt(qrEl.style.left) * scaleX),
            y: Math.round(parseInt(qrEl.style.top) * scaleY),
            size: Math.round(parseInt(qrEl.style.width) * scaleX)
        }
    };
}

// PDF mit manuellen Positionen generieren
async function generateManualPDF(voucher, template, positions, download = false) {
    try {
        const { PDFDocument, rgb, StandardFonts } = PDFLib;
        
        // Template laden
        const base64Data = template.pdfData.split(',')[1];
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        
        const pdfDoc = await PDFDocument.load(bytes);
        const page = pdfDoc.getPages()[0];
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
        
        const { width, height } = page.getSize();
        
        // Code einfügen (ZENTRIERT in Feld-Mitte)
        const codeText = voucher.code;
        const codeWidth = fontBold.widthOfTextAtSize(codeText, positions.code.fontSize);
        const codeCenterX = positions.code.x + (positions.code.width / 2);
        const codeCenterY = positions.code.y + (positions.code.height / 2);
        page.drawText(codeText, {
            x: codeCenterX - (codeWidth / 2),
            y: height - codeCenterY - (positions.code.fontSize / 2),
            size: positions.code.fontSize,
            font: fontBold,
            color: rgb(0, 0, 0),
        });

        // Wert einfügen (ZENTRIERT in Feld-Mitte)
        const valueText = `${parseFloat(voucher.original_value).toFixed(2)} €`;
        const valueWidth = fontBold.widthOfTextAtSize(valueText, positions.value.fontSize);
        const valueCenterX = positions.value.x + (positions.value.width / 2);
        const valueCenterY = positions.value.y + (positions.value.height / 2);
        page.drawText(valueText, {
            x: valueCenterX - (valueWidth / 2),
            y: height - valueCenterY - (positions.value.fontSize / 2),
            size: positions.value.fontSize,
            font: fontBold,
            color: rgb(0, 0, 0),
        });

        // Datum einfügen (ZENTRIERT in Feld-Mitte)
        const expiryDate = new Date(voucher.expires_at).toLocaleDateString('de-DE');
        const dateWidth = font.widthOfTextAtSize(expiryDate, positions.expiryDate.fontSize);
        const dateCenterX = positions.expiryDate.x + (positions.expiryDate.width / 2);
        const dateCenterY = positions.expiryDate.y + (positions.expiryDate.height / 2);
        page.drawText(expiryDate, {
            x: dateCenterX - (dateWidth / 2),
            y: height - dateCenterY - (positions.expiryDate.fontSize / 2),
            size: positions.expiryDate.fontSize,
            font: font,
            color: rgb(0, 0, 0),
        });
        
        // QR-Code einfügen
        const qrContainer = document.getElementById('manual-qr-code');
        const qrCanvas = qrContainer ? qrContainer.querySelector('canvas') : null;
        
        if (qrCanvas) {
            try {
                const qrDataUrl = qrCanvas.toDataURL('image/png');
                const qrImageBytes = await fetch(qrDataUrl).then(res => res.arrayBuffer());
                const qrPdfImage = await pdfDoc.embedPng(qrImageBytes);
                
                page.drawImage(qrPdfImage, {
                    x: positions.qrCode.x,
                    y: height - positions.qrCode.y - positions.qrCode.size,
                    width: positions.qrCode.size,
                    height: positions.qrCode.size,
                });
            } catch (error) {
                console.log('QR-Code konnte nicht eingefügt werden:', error);
            }
        }
        
        const pdfBytes = await pdfDoc.save();
        return new Blob([pdfBytes], { type: 'application/pdf' });
        
    } catch (error) {
        console.error('Fehler beim PDF erstellen:', error);
        throw error;
    }
}

// ====================================
// BACKUP-SYSTEM
// ====================================

// Backup erstellen und downloaden
async function createBackup() {
    if (!isAdmin()) {
        alert('Nur Admins können Backups erstellen');
        return;
    }
    
    try {
        console.log('Erstelle Backup...');
        
        // Alle Gutscheine laden
        const vouchers = await loadAllVouchers();
        
        // Alle Transaktionen laden
        const { data: transactions, error: txError } = await supabase
            .from('voucher_transactions')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (txError) {
            console.error('Fehler beim Laden der Transaktionen:', txError);
        }
        
        // Templates laden
        const templates = loadTemplates();
        
        // Backup-Objekt erstellen
        const backup = {
            version: '1.0',
            created_at: new Date().toISOString(),
            created_by: 'Admin',
            data: {
                vouchers: vouchers || [],
                transactions: transactions || [],
                templates: templates || []
            },
            stats: {
                total_vouchers: vouchers ? vouchers.length : 0,
                total_transactions: transactions ? transactions.length : 0,
                total_templates: templates ? templates.length : 0
            }
        };
        
        console.log('Backup erstellt:', backup.stats);
        
        // Als JSON-Datei downloaden
        const jsonString = JSON.stringify(backup, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const filename = `gutschein-backup-${new Date().toISOString().split('T')[0]}.json`;
        
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        
        alert(`✅ Backup erfolgreich erstellt!\n\nDatei: ${filename}\n\nGutscheine: ${backup.stats.total_vouchers}\nTransaktionen: ${backup.stats.total_transactions}\nTemplates: ${backup.stats.total_templates}`);
        
    } catch (error) {
        console.error('Fehler beim Backup:', error);
        alert('❌ Fehler beim Erstellen des Backups: ' + error.message);
    }
}

// Backup wiederherstellen - Formular anzeigen
function showRestoreBackup() {
    if (!isAdmin()) {
        alert('Nur Admins können Backups wiederherstellen');
        return;
    }
    
    const app = document.getElementById('app');
    
    app.innerHTML = `
        <div class="restore-backup">
            <div class="list-header">
                <h2>📥 Backup wiederherstellen</h2>
                <button onclick="showAdminDashboard()">← Zurück</button>
            </div>
            
            <div style="max-width: 600px; margin: 40px auto; padding: 30px; background: #F6EAD2; border-radius: 8px;">
                <p style="margin-bottom: 20px; color: #8B5A3C; font-weight: bold;">
                    ⚠️ WARNUNG
                </p>
                <p style="margin-bottom: 20px;">
                    Das Wiederherstellen eines Backups überschreibt:
                </p>
                <ul style="margin-bottom: 20px; padding-left: 20px;">
                    <li>Alle Templates (localStorage)</li>
                </ul>
                <p style="margin-bottom: 20px;">
                    <strong>Gutscheine in der Datenbank werden NICHT überschrieben</strong> (aus Sicherheitsgründen).
                </p>
                <p style="margin-bottom: 30px; color: #666; font-size: 14px;">
                    Tipp: Erstelle erst ein aktuelles Backup, bevor du ein altes wiederherstellst!
                </p>
                
                <div class="form-group">
                    <label for="backup-file">Backup-Datei auswählen</label>
                    <input 
                        type="file" 
                        id="backup-file" 
                        accept=".json"
                    >
                </div>
                
                <div style="display: flex; gap: 10px; justify-content: center; margin-top: 30px; flex-wrap: wrap;">
                    <button onclick="restoreBackup()" style="background-color: #A67C52; padding: 15px 30px;">
                        📥 Jetzt wiederherstellen
                    </button>
                    <button onclick="showAdminDashboard()" style="background-color: #8B5A3C; padding: 15px 30px;">
                        Abbrechen
                    </button>
                </div>
            </div>
        </div>
    `;
}

// Backup wiederherstellen - Ausführen
async function restoreBackup() {
    const fileInput = document.getElementById('backup-file');
    const file = fileInput.files[0];
    
    if (!file) {
        alert('Bitte wähle eine Backup-Datei aus');
        return;
    }
    
    // Sicherheitsabfrage
    if (!confirm('⚠️ ACHTUNG!\n\nDie aktuellen Templates werden überschrieben.\n\nMöchtest du wirklich fortfahren?')) {
        return;
    }
    
    try {
        console.log('Lade Backup...');
        
        // Datei lesen
        const fileContent = await file.text();
        const backup = JSON.parse(fileContent);
        
        console.log('Backup geladen:', backup);
        
        // Validierung
        if (!backup.version || !backup.data) {
            throw new Error('Ungültiges Backup-Format');
        }
        
        // Templates wiederherstellen
        if (backup.data.templates && backup.data.templates.length > 0) {
            saveTemplates(backup.data.templates);
            console.log('Templates wiederhergestellt:', backup.data.templates.length);
        }
        
        // Info: Gutscheine werden NICHT wiederhergestellt (zu gefährlich)
        alert(`✅ Backup erfolgreich wiederhergestellt!\n\nTemplates: ${backup.data.templates ? backup.data.templates.length : 0}\n\nHINWEIS: Gutscheine wurden aus Sicherheitsgründen nicht wiederhergestellt.`);
        
        // Zurück zum Dashboard
        showAdminDashboard();
        
    } catch (error) {
        console.error('Fehler beim Wiederherstellen:', error);
        alert('❌ Fehler beim Wiederherstellen des Backups:\n\n' + error.message + '\n\nBitte prüfe ob die Datei ein gültiges Backup ist.');
    }
}

// Diagramme erstellen
function createStatusChart(stats) {
    const canvas = document.getElementById('status-chart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    if (window.statusChartInstance) {
        window.statusChartInstance.destroy();
    }
    
    window.statusChartInstance = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ['Aktiv', 'Eingelöst', 'Abgelaufen'],
            datasets: [{
                data: [stats.active, stats.redeemed, stats.expired],
                backgroundColor: ['#6B7C59', '#A67C52', '#8B5A3C']
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

function createValuesChart(stats) {
    const canvas = document.getElementById('values-chart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    if (window.valuesChartInstance) {
        window.valuesChartInstance.destroy();
    }
    
    window.valuesChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Aktiv', 'Eingelöst', 'Abgelaufen'],
            datasets: [{
                label: 'Wert in €',
                data: [stats.activeValue, stats.redeemedValue, stats.expiredValue],
                backgroundColor: ['#6B7C59', '#A67C52', '#8B5A3C']
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}