// ==========================================
// PareFood Backend — Driver Orders Schema
// ==========================================

NEWSCHEMA('DriverOrders', function(schema) {

    // List available orders for drivers
    schema.action('available', {
        name: 'Available orders',
        query: 'latitude:Number,longitude:Number,radius:Number',
        action: function($, model) {
            var builder = DB().find('orders');
            builder.where('status', 'READY_FOR_PICKUP');
            builder.where('is_removed', false);
            builder.sort('created_at', true);
            builder.callback(function(err, rows) {
                if (err) return $.invalid(500, 'Failed to fetch orders');

                // Check none are already assigned
                var orderIds = rows.map(function(r) { return r.id; });

                DB().find('deliveries')
                    .where('order_id', orderIds)
                    .where('status', 'ACCEPTED')
                    .callback(function(err, deliveries) {
                        var assignedIds = {};
                        (deliveries || []).forEach(function(d) { assignedIds[d.order_id] = true; });
                        rows = rows.filter(function(r) { return !assignedIds[r.id]; });

                        $.callback({ orders: rows });
                    });
            });
        }
    });

    // Accept a delivery
    schema.action('accept', {
        name: 'Accept delivery',
        params: '*id:UID',
        action: function($) {
            var userId = $.user.sub;

            // Check driver status is approved/online
            DB().one('drivers')
                .fields('id,status')
                .where('profile_id', userId)
                .where('is_removed', false)
                .callback(function(err, driver) {
                    if (!driver) return $.invalid(404, 'Driver profile not found');
                    if (driver.status !== 'online' && driver.status !== 'approved') {
                        return $.invalid(403, 'Driver must be online');
                    }

                    // Check order is available
                    DB().one('orders')
                        .fields('id,status,merchant_id,customer_id,grand_total,delivery_address,delivery_latitude,delivery_longitude,order_number')
                        .where('id', $.params.id)
                        .where('status', 'READY_FOR_PICKUP')
                        .where('is_removed', false)
                        .callback(function(err, order) {
                            if (!order) return $.invalid(404, 'Order not found or already assigned');

                            // Check no existing active delivery
                            DB().one('deliveries')
                                .fields('id,status')
                                .where('order_id', order.id)
                                .where('status', ['OFFERED', 'ACCEPTED', 'PICKING_UP', 'PICKED_UP', 'ON_DELIVERY'])
                                .callback(function(err, existing) {
                                    if (existing) return $.invalid(409, 'Order already assigned');

                                    var deliveryId = FUNC.generateId();
                                    var now = new Date();

                                    // Create delivery record
                                    var delivery = {
                                        id: deliveryId,
                                        order_id: order.id,
                                        driver_id: userId,
                                        status: 'ACCEPTED',
                                        assigned_at: now,
                                        accepted_at: now,
                                        created_at: now,
                                        updated_at: now
                                    };

                                    DB().transaction(function(done) {
                                        DB().insert('deliveries', delivery).callback(function(err) {
                                            if (err) return done(err);

                                            // Update order status
                                            DB().update('orders', {
                                                status: 'DRIVER_ASSIGNED',
                                                updated_at: now
                                            }).where('id', order.id).callback(function(err) {
                                                if (err) return done(err);

                                                DB().insert('order_status_history', {
                                                    id: FUNC.generateId(),
                                                    order_id: order.id,
                                                    from_status: 'READY_FOR_PICKUP',
                                                    to_status: 'DRIVER_ASSIGNED',
                                                    actor_id: userId,
                                                    actor_role: 'driver',
                                                    created_at: now
                                                }).callback(function(err) {
                                                    if (err) return done(err);
                                                    done();
                                                });
                                            });
                                        });
                                    }, function(err) {
                                        if (err) return $.invalid(500, 'Failed to accept delivery');

                                        FUNC.audit($, {
                                            entity_type: 'deliveries',
                                            entity_id: deliveryId,
                                            action: 'driver_accept'
                                        });

                                        $.callback({
                                            delivery_id: deliveryId,
                                            order: order
                                        });
                                    });
                                });
                        });
                });
        }
    });

    // Confirm pickup
    schema.action('pickup', {
        name: 'Confirm pickup',
        params: '*id:UID',
        action: function($) {
            var userId = $.user.sub;

            DB().one('deliveries')
                .fields('id,order_id,driver_id,status')
                .where('order_id', $.params.id)
                .where('driver_id', userId)
                .callback(function(err, delivery) {
                    if (!delivery) return $.invalid(404, 'Delivery not found');

                    if (['ACCEPTED', 'DRIVER_ASSIGNED'].indexOf(delivery.status) === -1) {
                        return $.invalid(400, 'Delivery cannot be picked up in current state');
                    }

                    var now = new Date();
                    DB().transaction(function(done) {
                        DB().update('deliveries', {
                            status: 'PICKED_UP',
                            pickup_at: now,
                            updated_at: now
                        }).where('id', delivery.id).callback(function(err) {
                            if (err) return done(err);

                            DB().update('orders', {
                                status: 'PICKED_UP',
                                picked_up_at: now,
                                updated_at: now
                            }).where('id', delivery.order_id).callback(function(err) {
                                if (err) return done(err);

                                DB().insert('order_status_history', {
                                    id: FUNC.generateId(),
                                    order_id: delivery.order_id,
                                    from_status: 'DRIVER_ASSIGNED',
                                    to_status: 'PICKED_UP',
                                    actor_id: userId,
                                    actor_role: 'driver',
                                    created_at: now
                                }).callback(function(err) {
                                    if (err) return done(err);
                                    done();
                                });
                            });
                        });
                    }, function(err) {
                        if (err) return $.invalid(500, 'Failed to confirm pickup');
                        $.success();
                    });
                });
        }
    });

    // Confirm delivery
    schema.action('deliver', {
        name: 'Confirm delivery',
        params: '*id:UID',
        input: 'proof_note:String',
        action: function($, model) {
            var userId = $.user.sub;

            DB().one('deliveries')
                .fields('id,order_id,driver_id,status')
                .where('order_id', $.params.id)
                .where('driver_id', userId)
                .callback(function(err, delivery) {
                    if (!delivery) return $.invalid(404, 'Delivery not found');

                    if (['PICKED_UP', 'ON_DELIVERY'].indexOf(delivery.status) === -1) {
                        return $.invalid(400, 'Delivery cannot be completed in current state');
                    }

                    var now = new Date();
                    DB().transaction(function(done) {
                        DB().update('deliveries', {
                            status: 'DELIVERED',
                            delivered_at: now,
                            delivery_proof_note: model.proof_note || null,
                            updated_at: now
                        }).where('id', delivery.id).callback(function(err) {
                            if (err) return done(err);

                            DB().update('orders', {
                                status: 'DELIVERED',
                                delivered_at: now,
                                updated_at: now
                            }).where('id', delivery.order_id).callback(function(err) {
                                if (err) return done(err);

                                DB().insert('order_status_history', {
                                    id: FUNC.generateId(),
                                    order_id: delivery.order_id,
                                    from_status: delivery.status === 'PICKED_UP' ? 'PICKED_UP' : 'ON_DELIVERY',
                                    to_status: 'DELIVERED',
                                    actor_id: userId,
                                    actor_role: 'driver',
                                    created_at: now
                                }).callback(function(err) {
                                    if (err) return done(err);
                                    done();
                                });
                            });
                        });
                    }, function(err) {
                        if (err) return $.invalid(500, 'Failed to confirm delivery');

                        FUNC.audit($, {
                            entity_type: 'deliveries',
                            entity_id: delivery.id,
                            action: 'driver_deliver'
                        });
                        $.success();
                    });
                });
        }
    });

    // List my deliveries (driver)
    schema.action('mine', {
        name: 'My deliveries',
        query: 'status:String,page:Number,size:Number',
        action: function($, model) {
            var userId = $.user.sub;
            var page = parseInt(model.page) || 1;
            var size = parseInt(model.size) || 20;
            var offset = (page - 1) * size;

            var builder = DB().find('deliveries');
            builder.where('driver_id', userId);
            if (model.status) builder.where('status', model.status.toUpperCase());
            builder.sort('created_at', true);
            builder.take(size);
            builder.skip(offset);
            builder.callback(function(err, rows) {
                if (err) return $.invalid(500, 'Failed to fetch deliveries');

                // Enrich with order info
                var orderIds = rows.map(function(r) { return r.order_id; });

                DB().find('orders')
                    .fields('id,order_number,merchant_id,grand_total,delivery_address,status')
                    .where('id', orderIds)
                    .callback(function(err, orders) {
                        var orderMap = {};
                        (orders || []).forEach(function(o) { orderMap[o.id] = o; });
                        rows.forEach(function(d) { d.order = orderMap[d.order_id] || null; });

                        $.callback({ deliveries: rows, pagination: { page: page, size: size } });
                    });
            });
        }
    });
});