// ==========================================
// PareFood Backend — Finance Service
// Per-order earnings are recorded once when an
// order reaches COMPLETED (financial truth lives
// in the DB, never derived from UI state).
//
// Split per order:
//   merchant earnings  = subtotal - discount
//   driver earnings    = delivery fee
//   platform earnings  = service fee + tax
// ==========================================

FUNC.finance = {};

// Record earnings for a completed order. Idempotent
// (driven by unique order_id on each earnings table).
FUNC.finance.recordOrderEarnings = function(orderId, cb) {
    var done = cb || function() {};

    DB().one('orders')
        .fields('id,order_number,merchant_id,subtotal,discount,delivery_fee,service_fee,tax,grand_total')
        .where('id', orderId)
        .where('is_removed', false)
        .callback(function(err, order) {
            if (err || !order) return done(err || new Error('Order not found'));

            DB().find('merchant_earnings')
                .fields('id')
                .where('order_id', order.id)
                .callback(function(err, existing) {
                    if (err) return done(err);
                    if (existing && existing.length > 0) return done();

                    var grossMerchant = Math.round((parseFloat(order.subtotal || 0) - parseFloat(order.discount || 0)) * 100) / 100;
                    var grossDriver = Math.round(parseFloat(order.delivery_fee || 0) * 100) / 100;
                    var grossPlatform = Math.round((parseFloat(order.service_fee || 0) + parseFloat(order.tax || 0)) * 100) / 100;
                    var now = new Date();

                    FUNC.sequence(function(done2) {
                        DB().insert('merchant_earnings', {
                            id: FUNC.generateId(),
                            order_id: order.id,
                            merchant_id: order.merchant_id,
                            gross_amount: grossMerchant,
                            adjustments: 0,
                            net_amount: grossMerchant,
                            status: 'PENDING',
                            created_at: now,
                            updated_at: now
                        }).callback(function(err) {
                            if (err) return done2(err);

                            DB().insert('platform_earnings', {
                                id: FUNC.generateId(),
                                order_id: order.id,
                                gross_amount: grossPlatform,
                                net_amount: grossPlatform,
                                created_at: now,
                                updated_at: now
                            }).callback(function(err) {
                                if (err) return done2(err);

                                // Attach driver earnings (order completed implies a delivery)
                                DB().one('deliveries')
                                    .fields('id,driver_id')
                                    .where('order_id', order.id)
                                    .where('status', 'DELIVERED')
                                    .callback(function(err, delivery) {
                                        if (err) return done2(err);

                                        if (!delivery) return done2();

                                        DB().insert('driver_earnings', {
                                            id: FUNC.generateId(),
                                            delivery_id: delivery.id,
                                            order_id: order.id,
                                            driver_id: delivery.driver_id,
                                            gross_amount: grossDriver,
                                            adjustments: 0,
                                            net_amount: grossDriver,
                                            status: 'PENDING',
                                            created_at: now,
                                            updated_at: now
                                        }).callback(function(err) {
                                            done2(err);
                                        });
                                    });
                            });
                        });
                    }, function(err) {
                        if (err) return done(err);
                        done();
                    });
                });
        });
};