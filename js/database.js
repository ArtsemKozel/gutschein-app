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
    
    // ALLE Felder abrufen (auch delivery_method)
    const { data, error } = await supabase
        .from('vouchers')
        .select('*');
    
    if (error) {
        console.error('Fehler bei Statistiken:', error.message);
        return null;
    }
    
    // Basis-Statistiken berechnen
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
    
    // NEU: Erweiterte Statistiken berechnen
    const totalValue = data.reduce((sum, v) => sum + parseFloat(v.original_value), 0);
    const averageValue = data.length > 0 ? totalValue / data.length : 0;
    const redemptionRate = data.length > 0 ? (stats.redeemed / data.length) * 100 : 0;
    
    // NEU: Versandarten zählen
    const deliveryMethods = {
        in_person: 0,
        mail: 0,
        email: 0
    };
    
    data.forEach(voucher => {
        if (voucher.delivery_method === 'in_person') deliveryMethods.in_person++;
        else if (voucher.delivery_method === 'mail') deliveryMethods.mail++;
        else if (voucher.delivery_method === 'email') deliveryMethods.email++;
    });
    
    // Erweiterte Stats hinzufügen
    stats.totalValue = totalValue;
    stats.averageValue = averageValue;
    stats.redemptionRate = redemptionRate;
    stats.deliveryMethods = deliveryMethods;
    
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

// Statistiken mit Zeitraum-Filter laden
async function loadStatsFiltered(period = 'all') {
    console.log('Lade gefilterte Statistiken:', period);
    
    // ALLE Gutscheine abrufen
    const { data, error } = await supabase
        .from('vouchers')
        .select('*');
    
    if (error) {
        console.error('Fehler bei Statistiken:', error.message);
        return null;
    }
    
    // Zeitraum berechnen
    const now = new Date();
    let startDate = null;
    
    if (period === '7days') {
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
    } else if (period === 'month') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (period === 'year') {
        startDate = new Date(now.getFullYear(), 0, 1);
    }
    // 'all' = kein Filter (startDate bleibt null)
    
    // Daten filtern nach created_at
    let filteredData = data;
    if (startDate) {
        filteredData = data.filter(v => new Date(v.created_at) >= startDate);
    }
    
    // Statistiken berechnen (wie vorher)
    const stats = {
        total: filteredData.length,
        active: 0,
        activeValue: 0,
        redeemed: 0,
        redeemedValue: 0,
        expired: 0,
        expiredValue: 0
    };
    
    filteredData.forEach(voucher => {
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
    
    // Erweiterte Statistiken
    const totalValue = filteredData.reduce((sum, v) => sum + parseFloat(v.original_value), 0);
    const averageValue = filteredData.length > 0 ? totalValue / filteredData.length : 0;
    const redemptionRate = filteredData.length > 0 ? (stats.redeemed / filteredData.length) * 100 : 0;
    
    // Versandarten zählen
    const deliveryMethods = {
        in_person: 0,
        mail: 0,
        email: 0
    };
    
    filteredData.forEach(voucher => {
        if (voucher.delivery_method === 'in_person') deliveryMethods.in_person++;
        else if (voucher.delivery_method === 'mail') deliveryMethods.mail++;
        else if (voucher.delivery_method === 'email') deliveryMethods.email++;
    });
    
    // Erweiterte Stats hinzufügen
    stats.totalValue = totalValue;
    stats.averageValue = averageValue;
    stats.redemptionRate = redemptionRate;
    stats.deliveryMethods = deliveryMethods;
    stats.period = period; // Aktueller Filter merken
    
    console.log('Gefilterte Statistiken:', stats);
    return stats;
}

// Gutschein stornieren (nur Admin)
async function cancelVoucher(voucherId, reason) {
    console.log('Storniere Gutschein:', voucherId);
    
    // Gutschein laden
    const { data: voucher, error: fetchError } = await supabase
        .from('vouchers')
        .select('*')
        .eq('id', voucherId)
        .single();
    
    if (fetchError) {
        console.error('Fehler beim Laden:', fetchError.message);
        return { success: false, error: 'Gutschein nicht gefunden' };
    }
    
    // Prüfen ob bereits storniert
    if (voucher.status === 'cancelled') {
        return { success: false, error: 'Bereits storniert' };
    }
    
    // Status auf 'cancelled' setzen
    const { error: updateError } = await supabase
        .from('vouchers')
        .update({
            status: 'cancelled'
        })
        .eq('id', voucherId);
    
    if (updateError) {
        console.error('Fehler beim Stornieren:', updateError.message);
        return { success: false, error: 'Fehler beim Speichern' };
    }
    
    // Transaktion loggen
    await supabase
        .from('voucher_transactions')
        .insert({
            voucher_id: voucherId,
            action: 'cancelled',
            amount: 0,
            remaining_value_after: voucher.remaining_value,
            notes: reason || 'Von Admin storniert'
        });
    
    console.log('Stornierung erfolgreich!');
    return { success: true };
}

// Einlösungen für ein bestimmtes Datum laden
async function loadRedemptionsByDate(date) {
    console.log('Lade Einlösungen für:', date);
    
    // Start und Ende des Tages
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    const startISO = startOfDay.toISOString();
    const endISO = endOfDay.toISOString();
    
    // Transaktionen laden
    const { data, error } = await supabase
        .from('voucher_transactions')
        .select(`
            *,
            vouchers (code, original_value, buyer_name)
        `)
        .gte('created_at', startISO)
        .lte('created_at', endISO)
        .in('action', ['redeemed', 'partial_redeem'])
        .order('created_at', { ascending: false });
    
    if (error) {
        console.error('Fehler beim Laden:', error.message);
        return null;
    }
    
    // Gesamtsumme berechnen
    const totalAmount = data.reduce((sum, t) => sum + parseFloat(t.amount), 0);
    
    return {
        transactions: data,
        totalAmount: totalAmount,
        count: data.length,
        date: date
    };
}