// ==========================================
// PareFood Backend — Utility Functions
// ==========================================

// Format currency in Rupiah
FUNC.formatIDR = function(amount) {
    return 'Rp ' + NAN(amount).toLocaleString('id-ID');
};

// Generate UUID v4
FUNC.generateId = function() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = (Math.random() * 16) | 0;
        var v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
};

// Deep clone object
FUNC.deepClone = function(obj) {
    return JSON.parse(JSON.stringify(obj));
};

// Validate Indonesian phone number
FUNC.isValidPhone = function(phone) {
    return /^(?:\+62|62|0)[2-9][0-9]{7,12}$/.test(phone);
};

// Normalize phone number to E.164 format
FUNC.normalizePhone = function(phone) {
    if (!phone) return '';
    return phone.replace(/\s/g, '').replace(/^0/, '+62').replace(/^62/, '+62');
};

// Calculate distance between two coordinates (Haversine formula)
FUNC.calculateDistance = function(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// Pagination helper
FUNC.paginate = function(page, size) {
    page = parseInt(page) || 1;
    size = parseInt(size) || 20;
    return {
        page: page,
        size: size,
        offset: (page - 1) * size
    };
};

// Run sequential DB operations with a done(err) callback.
// NOTE: querybuilderpg does not support real transactions, so these
// operations run one-by-one (stopping early on error) instead of ACID.
FUNC.sequence = function(fn, cb) {
    var called = false;
    var done = function(err) {
        if (called) return;
        called = true;
        if (err) console.log('[DB] sequence failed:', err.message || err);
        cb(err || null);
    };
    try {
        fn(done);
    } catch (err) {
        done(err);
    }
};

// Create audit log entry
FUNC.audit = function($, data) {
    const model = {
        id: FUNC.generateId(),
        actor_id: $ && $.user ? $.user.sub : null,
        actor_role: $ && $.user ? $.user.role : 'system',
        entity_type: data.entity_type || 'unknown',
        entity_id: data.entity_id || null,
        action: data.action || 'unknown',
        metadata: data.metadata ? JSON.stringify(data.metadata) : null,
        created_at: new Date()
    };

    DB().insert('audit_logs', model).callback(function(err) {
        if (err) {
            console.log('[AUDIT] Failed to write audit log:', err.message);
        }
    });
};