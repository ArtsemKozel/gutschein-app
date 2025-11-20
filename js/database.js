// ====================================
// DATENBANK-FUNKTIONEN
// ====================================

// Verbindung testen
async function testConnection() {
    console.log('Teste Verbindung zu Supabase...');
    
    try {
        // Versuche den Counter zu lesen
        const { data, error } = await supabase
            .from('voucher_counter')
            .select('current_number')
            .eq('id', 1)
            .single();
        
        if (error) {
            console.error('Fehler bei Verbindung:', error.message);
            return false;
        }
        
        console.log('Verbindung erfolgreich!');
        console.log('Aktueller Counter:', data.current_number);
        return true;
        
    } catch (err) {
        console.error('Verbindungsfehler:', err);
        return false;
    }
}

// Alle Gutscheine laden
async function loadAllVouchers() {
    console.log('Lade alle Gutscheine...');
    
    const { data, error } = await supabase
        .from('vouchers')
        .select('*')
        .order('created_at', { ascending: false });
    
    if (error) {
        console.error('Fehler beim Laden:', error.message);
        return [];
    }
    
    console.log('Gutscheine geladen:', data.length);
    return data;
}

// Statistiken laden
async function loadStats() {
    console.log('Lade Statistiken...');
    
    const { data, error } = await supabase
        .from('vouchers')
        .select('status, original_value, remaining_value');
    
    if (error) {
        console.error('Fehler bei Statistiken:', error.message);
        return null;
    }
    
    // Statistiken berechnen
    const stats = {
        total: data.length,
        active: 0,
        activeValue: 0,
        redeemed: 0,
        redeemedValue: 0,
        expired: 0,
        expiredValue: 0
    };
    
    data.forEach(voucher => {
        if (voucher.status === 'active') {
            stats.active++;
            stats.activeValue += parseFloat(voucher.remaining_value);
        } else if (voucher.status === 'redeemed') {
            stats.redeemed++;
            stats.redeemedValue += parseFloat(voucher.original_value);
        } else if (voucher.status === 'expired') {
            stats.expired++;
            stats.expiredValue += parseFloat(voucher.original_value);
        }
    });
    
    console.log('Statistiken:', stats);
    return stats;
}

// Gutschein per Code suchen
async function findVoucherByCode(code) {
    console.log('Suche Gutschein:', code);
    
    const { data, error } = await supabase
        .from('vouchers')
        .select('*')
        .eq('code', code.toUpperCase().trim())
        .single();
    
    if (error) {
        console.error('Gutschein nicht gefunden:', error.message);
        return null;
    }
    
    console.log('Gutschein gefunden:', data);
    return data;
}

// Gutschein einlösen (voll oder teilweise)
async function redeemVoucher(voucherId, amount) {
    console.log('Löse ein:', voucherId, 'Betrag:', amount);
    
    // Erst aktuellen Gutschein laden
    const { data: voucher, error: fetchError } = await supabase
        .from('vouchers')
        .select('*')
        .eq('id', voucherId)
        .single();
    
    if (fetchError) {
        console.error('Fehler beim Laden:', fetchError.message);
        return { success: false, error: 'Gutschein nicht gefunden' };
    }
    
    // Prüfen ob genug Restwert da ist
    const currentRemaining = parseFloat(voucher.remaining_value);
    const redeemAmount = parseFloat(amount);
    
    if (redeemAmount > currentRemaining) {
        return { success: false, error: 'Betrag zu hoch' };
    }
    
    // Neuen Restwert berechnen
    const newRemaining = currentRemaining - redeemAmount;
    
    // Status bestimmen
    let newStatus = 'active';
    let redeemedAt = null;
    
    if (newRemaining <= 0) {
        newStatus = 'redeemed';
        redeemedAt = new Date().toISOString();
    }
    
    // Gutschein aktualisieren
    const { error: updateError } = await supabase
        .from('vouchers')
        .update({
            remaining_value: newRemaining,
            status: newStatus,
            redeemed_at: redeemedAt
        })
        .eq('id', voucherId);
    
    if (updateError) {
        console.error('Fehler beim Einlösen:', updateError.message);
        return { success: false, error: 'Fehler beim Speichern' };
    }
    
    // Transaktion loggen (Audit)
    await supabase
        .from('voucher_transactions')
        .insert({
            voucher_id: voucherId,
            action: newRemaining <= 0 ? 'redeemed' : 'partial_redeem',
            amount: redeemAmount,
            remaining_value_after: newRemaining,
            notes: 'Eingelöst über App'
        });
    
    console.log('Einlösung erfolgreich!');
    return { 
        success: true, 
        newRemaining: newRemaining,
        fullyRedeemed: newRemaining <= 0
    };
}

// Transaktionen für einen Gutschein laden
async function loadVoucherTransactions(voucherId) {
    console.log('Lade Transaktionen für:', voucherId);
    
    const { data, error } = await supabase
        .from('voucher_transactions')
        .select('*')
        .eq('voucher_id', voucherId)
        .order('created_at', { ascending: false });
    
    if (error) {
        console.error('Fehler beim Laden der Transaktionen:', error.message);
        return [];
    }
    
    return data;
}

// Nächste Gutschein-Nummer holen
async function getNextVoucherNumber() {
    console.log('Hole nächste Gutschein-Nummer...');
    
    // Aktuelle Nummer lesen
    const { data, error } = await supabase
        .from('voucher_counter')
        .select('current_number')
        .eq('id', 1)
        .single();
    
    if (error) {
        console.error('Fehler beim Lesen des Counters:', error.message);
        return null;
    }
    
    const nextNumber = data.current_number + 1;
    
    // Counter erhöhen
    const { error: updateError } = await supabase
        .from('voucher_counter')
        .update({ current_number: nextNumber })
        .eq('id', 1);
    
    if (updateError) {
        console.error('Fehler beim Aktualisieren des Counters:', updateError.message);
        return null;
    }
    
    console.log('Nächste Nummer:', nextNumber);
    return nextNumber;
}

// Gutschein-Code generieren (GIFT-0001 Format)
function generateVoucherCode(number) {
    return 'GIFT-' + String(number).padStart(4, '0');
}

// Neuen Gutschein erstellen
async function createVoucher(value, buyerName, buyerEmail, notes, deliveryMethod) {
    console.log('Erstelle neuen Gutschein...');
    
    // Nächste Nummer holen
    const nextNumber = await getNextVoucherNumber();
    if (!nextNumber) {
        return { success: false, error: 'Konnte keine Nummer generieren' };
    }
    
    // Code generieren
    const code = generateVoucherCode(nextNumber);
    
    // Ablaufdatum: 2 Jahre ab heute
    const expiryDate = new Date();
    expiryDate.setFullYear(expiryDate.getFullYear() + 2);
    
    // Gutschein speichern
    const { data, error } = await supabase
        .from('vouchers')
        .insert({
            code: code,
            original_value: value,
            remaining_value: value,
            status: 'active',
            expires_at: expiryDate.toISOString(),
            buyer_name: buyerName || null,
            buyer_email: buyerEmail || null,
            notes: notes || null,
            delivery_method: deliveryMethod || null
        })
        .select()
        .single();
    
    if (error) {
        console.error('Fehler beim Erstellen:', error.message);
        return { success: false, error: error.message };
    }
    
    // Transaktion loggen
    await supabase
        .from('voucher_transactions')
        .insert({
            voucher_id: data.id,
            action: 'created',
            amount: value,
            remaining_value_after: value,
            notes: 'Gutschein erstellt'
        });
    
    console.log('Gutschein erstellt:', code);
    return { success: true, voucher: data };
}