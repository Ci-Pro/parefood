// ==========================================
// PareFood Backend — Finance Schemas
// MerchantFinance / DriverFinance / AdminFinance
// ==========================================

// ------------------------------------------------------------------
// MERCHANT FINANCE
// ------------------------------------------------------------------
NEWSCHEMA('MerchantFinance', function(schema) {

    // Earnings overview for my merchant
    schema.action('overview', {
        name: 'Merchant earnings',
        action: function($) {
            loadMyMerchant($, function(err, merchant) {
                if (err) return $.invalid(404, 'Merchant profile not found');

                DB().query("SELECT COALESCE(SUM(gross_amount), 0) AS gross, COALESCE(SUM(net_amount), 0) AS net FROM merchant_earnings WHERE merchant_id = '" + merchant.id + "'").callback(function(err, totals) {
                    if (err) return $.invalid(500, 'Failed to fetch earnings');

                    DB().query("SELECT status, COALESCE(SUM(net_amount), 0) AS net FROM merchant_earnings WHERE merchant_id = '" + merchant.id + "' GROUP BY status").callback(function(err, byStatus) {
                        if (err) return $.invalid(500, 'Failed to fetch earnings');

                        var breakdown = { PENDING: 0, CLEARED: 0, PAID: 0 };
                        (byStatus || []).forEach(function(r) { breakdown[r.status] = Number(r.net); });

                        DB().find('merchant_earnings')
                            .fields('id,order_id,gross_amount,adjustments,net_amount,status,created_at')
                            .where('merchant_id', merchant.id)
                            .sort('created_at', true)
                            .take(20)
                            .callback(function(err, rows) {
                                if (err) return $.invalid(500, 'Failed to fetch earnings');

                                var earnings = rows || [];
                                var orderIds = earnings.map(function(e) { return e.order_id; });

                                DB().query("SELECT id, order_number FROM orders WHERE id IN ('" + orderIds.join("','") + "')").callback(function(err, orders) {
                                    var orderMap = {};
                                    (orders || []).forEach(function(o) { orderMap[o.id] = o; });

                                    var rowsOut = earnings.map(function(e) {
                                        return {
                                            id: e.id,
                                            order_id: e.order_id,
                                            order_number: orderMap[e.order_id] ? orderMap[e.order_id].order_number : null,
                                            gross_amount: Number(e.gross_amount),
                                            adjustments: Number(e.adjustments),
                                            net_amount: Number(e.net_amount),
                                            status: e.status,
                                            created_at: e.created_at
                                        };
                                    });

                                    $.callback({
                                        summary: {
                                            gross: Number((totals[0] && totals[0].gross) || 0),
                                            net: Number((totals[0] && totals[0].net) || 0),
                                            pending: breakdown.PENDING,
                                            cleared: breakdown.CLEARED,
                                            paid: breakdown.PAID
                                        },
                                        earnings: rowsOut
                                    });
                                });
                            });
                    });
                });
            });
        }
    });

    // Settlements for my merchant
    schema.action('settlements', {
        name: 'Merchant settlements',
        action: function($) {
            loadMyMerchant($, function(err, merchant) {
                if (err) return $.invalid(404, 'Merchant profile not found');

                DB().find('settlements')
                    .fields('id,settlement_number,period_start,period_end,gross,adjustments,fees,net,status,approved_at,paid_at,created_at')
                    .where('party_type', 'merchant')
                    .where('party_id', merchant.id)
                    .sort('created_at', true)
                    .take(50)
                    .callback(function(err, rows) {
                        if (err) return $.invalid(500, 'Failed to fetch settlements');
                        $.callback({ settlements: rows || [] });
                    });
            });
        }
    });
});

// ------------------------------------------------------------------
// DRIVER FINANCE
// ------------------------------------------------------------------
NEWSCHEMA('DriverFinance', function(schema) {

    // Earnings overview for my driver profile
    schema.action('overview', {
        name: 'Driver earnings',
        action: function($) {
            loadMyDriver($, function(err, driver) {
                if (err) return $.invalid(404, 'Driver profile not found');

                DB().query("SELECT COALESCE(SUM(gross_amount), 0) AS gross, COALESCE(SUM(net_amount), 0) AS net FROM driver_earnings WHERE driver_id = '" + $.user.sub + "'").callback(function(err, totals) {
                    if (err) return $.invalid(500, 'Failed to fetch earnings');

                    DB().query("SELECT status, COALESCE(SUM(net_amount), 0) AS net FROM driver_earnings WHERE driver_id = '" + $.user.sub + "' GROUP BY status").callback(function(err, byStatus) {
                        if (err) return $.invalid(500, 'Failed to fetch earnings');

                        var breakdown = { PENDING: 0, CLEARED: 0, PAID: 0 };
                        (byStatus || []).forEach(function(r) { breakdown[r.status] = Number(r.net); });

                        DB().find('driver_earnings')
                            .fields('id,order_id,gross_amount,adjustments,net_amount,status,created_at')
                            .where('driver_id', $.user.sub)
                            .sort('created_at', true)
                            .take(20)
                            .callback(function(err, rows) {
                                if (err) return $.invalid(500, 'Failed to fetch earnings');

                                var earnings = rows || [];
                                var orderIds = earnings.map(function(e) { return e.order_id; });

                                DB().query("SELECT id, order_number FROM orders WHERE id IN ('" + orderIds.join("','") + "')").callback(function(err, orders) {
                                    var orderMap = {};
                                    (orders || []).forEach(function(o) { orderMap[o.id] = o; });

                                    var rowsOut = earnings.map(function(e) {
                                        return {
                                            id: e.id,
                                            order_id: e.order_id,
                                            order_number: orderMap[e.order_id] ? orderMap[e.order_id].order_number : null,
                                            gross_amount: Number(e.gross_amount),
                                            adjustments: Number(e.adjustments),
                                            net_amount: Number(e.net_amount),
                                            status: e.status,
                                            created_at: e.created_at
                                        };
                                    });

                                    $.callback({
                                        summary: {
                                            gross: Number(totals[0].gross),
                                            net: Number(totals[0].net),
                                            pending: breakdown.PENDING,
                                            cleared: breakdown.CLEARED,
                                            paid: breakdown.PAID
                                        },
                                        earnings: rowsOut
                                    });
                                });
                            });
                    });
                });
            });
        }
    });

    // Settlements for my driver profile
    schema.action('settlements', {
        name: 'Driver settlements',
        action: function($) {
            loadMyDriver($, function(err, driver) {
                if (err) return $.invalid(404, 'Driver profile not found');

                DB().find('settlements')
                    .fields('id,settlement_number,period_start,period_end,gross,adjustments,fees,net,status,approved_at,paid_at,created_at')
                    .where('party_type', 'driver')
                    .where('party_id', driver.id)
                    .sort('created_at', true)
                    .take(50)
                    .callback(function(err, rows) {
                        if (err) return $.invalid(500, 'Failed to fetch settlements');
                        $.callback({ settlements: rows || [] });
                    });
            });
        }
    });
});

// ------------------------------------------------------------------
// ADMIN FINANCE
// ------------------------------------------------------------------
NEWSCHEMA('AdminFinance', function(schema) {

    // Platform finance overview & pending settlement queue
    schema.action('overview', {
        name: 'Platform finance',
        action: function($) {
            DB().query("SELECT COALESCE(SUM(gross_amount), 0) AS gross, COALESCE(SUM(net_amount), 0) AS net FROM platform_earnings").callback(function(err, platform) {
                if (err) return $.invalid(500, 'Failed to fetch platform earnings');

                DB().query("SELECT status, COUNT(*) AS count FROM settlements GROUP BY status").callback(function(err, settlementStatus) {
                    if (err) return $.invalid(500, 'Failed to fetch settlements');

                    DB().query("SELECT COALESCE(SUM(net_amount), 0) AS net FROM merchant_earnings WHERE status = 'PENDING'").callback(function(err, merchantPending) {
                        if (err) return $.invalid(500, 'Failed to fetch merchant earnings');

                        DB().query("SELECT COALESCE(SUM(net_amount), 0) AS net FROM driver_earnings WHERE status = 'PENDING'").callback(function(err, driverPending) {
                            if (err) return $.invalid(500, 'Failed to fetch driver earnings');

                            var statusMap = {};
                            (settlementStatus || []).forEach(function(r) { statusMap[r.status] = Number(r.count); });

                            $.callback({
                                platform: {
                                    gross: Number(platform[0].gross),
                                    net: Number(platform[0].net)
                                },
                                pending: {
                                    merchant: Number(merchantPending[0].net),
                                    driver: Number(driverPending[0].net)
                                },
                                settlements: {
                                    pending: statusMap.PENDING || 0,
                                    approved: statusMap.APPROVED || 0,
                                    paid: statusMap.PAID || 0
                                }
                            });
                        });
                    });
                });
            });
        }
    });

    // List all settlements
    schema.action('settlements', {
        name: 'List settlements',
        query: 'status:String,page:Number,size:Number',
        action: function($, model) {
            var page = parseInt(model.page) || 1;
            var size = parseInt(model.size) || 50;
            var offset = (page - 1) * size;

            var builder = DB().find('settlements');
            if (model.status) builder.where('status', model.status.toUpperCase());
            builder.sort('created_at', true);
            builder.take(size);
            builder.skip(offset);
            builder.callback(function(err, rows) {
                if (err) return $.invalid(500, 'Failed to fetch settlements');
                $.callback({ settlements: rows || [], pagination: { page: page, size: size } });
            });
        }
    });

    // Generate a settlement from pending earnings in a period
    schema.action('createSettlement', {
        name: 'Create settlement',
        input: '*party_type:String,*party_id:UID,*period_start:String,*period_end:String,notes:String',
        action: function($, model) {
            if (['merchant', 'driver'].indexOf(model.party_type) === -1) {
                return $.invalid(400, 'Invalid party type');
            }

            var dateRe = /^\d{4}-\d{2}-\d{2}$/;
            if (!dateRe.test(model.period_start) || !dateRe.test(model.period_end)) {
                return $.invalid(400, 'Invalid period format (YYYY-MM-DD)');
            }

            var from = model.period_start + 'T00:00:00.000Z';
            var to = model.period_end + 'T23:59:59.999Z';

            var table = model.party_type === 'merchant' ? 'merchant_earnings' : 'driver_earnings';
            var column = model.party_type === 'merchant' ? 'merchant_id' : 'driver_id';

            DB().query("SELECT COALESCE(SUM(net_amount), 0) AS net FROM " + table + " WHERE " + column + " = '" + model.party_id + "' AND status = 'PENDING' AND created_at BETWEEN '" + from + "' AND '" + to + "'").callback(function(err, rows) {
                if (err) return $.invalid(500, 'Failed to calculate settlement');

                var net = Number(rows[0].net || 0);
                if (net <= 0) return $.invalid(400, 'No pending earnings in the period');

                var settlementId = FUNC.generateId();
                var number = 'STL-' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '-' + Math.floor(Math.random() * 999999).toString().padStart(6, '0');
                var now = new Date();

                FUNC.sequence(function(done) {
                    DB().insert('settlements', {
                        id: settlementId,
                        settlement_number: number,
                        party_type: model.party_type,
                        party_id: model.party_id,
                        period_start: from,
                        period_end: to,
                        gross: net,
                        adjustments: 0,
                        fees: 0,
                        net: net,
                        status: 'PENDING',
                        notes: model.notes || null,
                        created_at: now,
                        updated_at: now
                    }).callback(function(err) {
                        if (err) return done(err);

                        DB().update(table, {
                            status: 'CLEARED',
                            settlement_id: settlementId,
                            updated_at: now
                        }).where(column, model.party_id).where('status', 'PENDING').callback(function(err) {
                            if (err) return done(err);
                            done();
                        });
                    });
                }, function(err) {
                    if (err) return $.invalid(500, 'Failed to create settlement');

                    FUNC.audit($, {
                        entity_type: 'settlements',
                        entity_id: settlementId,
                        action: 'create'
                    });

                    $.callback({ id: settlementId, settlement_number: number, net: net });
                });
            });
        }
    });

    // Approve a settlement
    schema.action('approveSettlement', {
        name: 'Approve settlement',
        params: '*id:UID',
        action: function($) {
            DB().one('settlements')
                .fields('id,status')
                .where('id', $.params.id)
                .callback(function(err, settlement) {
                    if (err) return $.invalid(500, 'Failed to load settlement');
                    if (!settlement) return $.invalid(404, 'Settlement not found');
                    if (settlement.status === 'PAID' || settlement.status === 'CANCELLED') {
                        return $.invalid(400, 'Settlement is already ' + settlement.status.toLowerCase());
                    }

                    var now = new Date();
                    DB().update('settlements', {
                        status: 'APPROVED',
                        approved_by: $.user.sub,
                        approved_at: now,
                        updated_at: now
                    }).where('id', settlement.id).callback(function(err) {
                        if (err) return $.invalid(500, 'Failed to approve settlement');

                        FUNC.audit($, {
                            entity_type: 'settlements',
                            entity_id: settlement.id,
                            action: 'approve'
                        });

                        $.success();
                    });
                });
        }
    });

    // Mark a settlement as paid
    schema.action('settleSettlement', {
        name: 'Settle settlement',
        params: '*id:UID',
        action: function($) {
            DB().one('settlements')
                .fields('id,status')
                .where('id', $.params.id)
                .callback(function(err, settlement) {
                    if (err) return $.invalid(500, 'Failed to load settlement');
                    if (!settlement) return $.invalid(404, 'Settlement not found');
                    if (settlement.status === 'PAID') return $.callback({ already_paid: true });
                    if (settlement.status === 'CANCELLED') {
                        return $.invalid(400, 'Settlement is cancelled');
                    }

                    var now = new Date();
                    FUNC.sequence(function(done) {
                        DB().update('settlements', {
                            status: 'PAID',
                            approved_by: $.user.sub,
                            approved_at: settlement.approved_at || now,
                            paid_at: now,
                            updated_at: now
                        }).where('id', settlement.id).callback(function(err) {
                            if (err) return done(err);

                            // Flip linked earnings to PAID (reconciliation trace)
                            var table = settlement.party_type === 'merchant' ? 'merchant_earnings' : 'driver_earnings';
                            DB().update(table, {
                                status: 'PAID',
                                updated_at: now
                            }).where('settlement_id', settlement.id).callback(function(err) {
                                if (err) return done(err);
                                done();
                            });
                        });
                    }, function(err) {
                        if (err) return $.invalid(500, 'Failed to settle');

                        FUNC.audit($, {
                            entity_type: 'settlements',
                            entity_id: settlement.id,
                            action: 'settle'
                        });

                        $.success();
                    });
                });
        }
    });
});

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------
function loadMyMerchant($, cb) {
    DB().one('merchants')
        .fields('id,owner_id,status,is_removed')
        .where('owner_id', $.user.sub)
        .where('is_removed', false)
        .callback(function(err, merchant) {
            if (err || !merchant) return cb(new Error('Merchant not found'));
            cb(null, merchant);
        });
}

function loadMyDriver($, cb) {
    DB().one('drivers')
        .fields('id,profile_id,status,is_removed')
        .where('profile_id', $.user.sub)
        .where('is_removed', false)
        .callback(function(err, driver) {
            if (err || !driver) return cb(new Error('Driver not found'));
            cb(null, driver);
        });
}