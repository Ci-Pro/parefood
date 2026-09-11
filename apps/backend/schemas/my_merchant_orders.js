// ==========================================
// PareFood Backend — My Merchant Orders Schema
// ==========================================

NEWSCHEMA('MyMerchantOrders', function(schema) {

    // List orders for my merchant
    schema.action('list', {
        name: 'List my merchant orders',
        query: 'status:String,page:Number,size:Number',
        action: function($, model) {
            var userId = $.user.sub;
            var page = parseInt(model.page) || 1;
            var size = parseInt(model.size) || 20;
            var offset = (page - 1) * size;

            // Find merchant owned by user
            DB().one('merchants')
                .fields('id')
                .where('owner_id', userId)
                .where('is_removed', false)
                .callback(function(err, merchant) {
                    if (!merchant) return $.invalid(404, 'Merchant not found');

                    var builder = DB().find('orders');
                    builder.where('merchant_id', merchant.id);
                    if (model.status) {
                        builder.where('status', model.status.toUpperCase());
                    }
                    builder.sort('created_at', true);
                    builder.take(size);
                    builder.skip(offset);
                    builder.callback(function(err, rows) {
                        if (err) return $.invalid(500, 'Failed to fetch orders');
                        $.callback({ orders: rows, pagination: { page: page, size: size } });
                    });
                });
        }
    });

    // Accept order
    schema.action('accept', {
        name: 'Accept order',
        params: '*id:UID',
        action: function($) {
            var userId = $.user.sub;

            // Verify merchant ownership
            DB().one('merchants')
                .fields('id')
                .where('owner_id', userId)
                .where('is_removed', false)
                .callback(function(err, merchant) {
                    if (!merchant) return $.invalid(404, 'Merchant not found');

                    DB().one('orders')
                        .fields('id,status,merchant_id')
                        .where('id', $.params.id)
                        .where('merchant_id', merchant.id)
                        .where('is_removed', false)
                        .callback(function(err, order) {
                            if (!order) return $.invalid(404, 'Order not found');

                            // Validate state transition
                            var validTransitions = ['PAID', 'WAITING_MERCHANT'];
                            if (validTransitions.indexOf(order.status) === -1) {
                                return $.invalid(400, 'Order cannot be accepted in current state');
                            }

                            var now = new Date();
                            FUNC.sequence(function(done) {
                                DB().update('orders', {
                                    status: 'MERCHANT_ACCEPTED',
                                    accepted_at: now,
                                    updated_at: now
                                }).where('id', order.id).callback(function(err) {
                                    if (err) return done(err);

                                    DB().insert('order_status_history', {
                                        id: FUNC.generateId(),
                                        order_id: order.id,
                                        from_status: order.status,
                                        to_status: 'MERCHANT_ACCEPTED',
                                        actor_id: userId,
                                        actor_role: $.user.role,
                                        created_at: now
                                    }).callback(function(err) {
                                        if (err) return done(err);
                                        done();
                                    });
                                });
                            }, function(err) {
                                if (err) return $.invalid(500, 'Failed to accept order');
                                FUNC.audit($, {
                                    entity_type: 'orders',
                                    entity_id: order.id,
                                    action: 'merchant_accept'
                                });
                                $.success();
                            });
                        });
                });
        }
    });

    // Reject order
    schema.action('reject', {
        name: 'Reject order',
        params: '*id:UID',
        input: 'reason:String',
        action: function($, model) {
            var userId = $.user.sub;

            DB().one('merchants')
                .fields('id')
                .where('owner_id', userId)
                .where('is_removed', false)
                .callback(function(err, merchant) {
                    if (!merchant) return $.invalid(404, 'Merchant not found');

                    DB().one('orders')
                        .fields('id,status,merchant_id')
                        .where('id', $.params.id)
                        .where('merchant_id', merchant.id)
                        .where('is_removed', false)
                        .callback(function(err, order) {
                            if (!order) return $.invalid(404, 'Order not found');

                            var validTransitions = ['PAID', 'WAITING_MERCHANT'];
                            if (validTransitions.indexOf(order.status) === -1) {
                                return $.invalid(400, 'Order cannot be rejected in current state');
                            }

                            var now = new Date();
                            FUNC.sequence(function(done) {
                                DB().update('orders', {
                                    status: 'REJECTED_BY_MERCHANT',
                                    cancelled_at: now,
                                    cancel_reason: model.reason || 'Ditolak oleh merchant',
                                    cancelled_by: userId,
                                    updated_at: now
                                }).where('id', order.id).callback(function(err) {
                                    if (err) return done(err);

                                    DB().insert('order_status_history', {
                                        id: FUNC.generateId(),
                                        order_id: order.id,
                                        from_status: order.status,
                                        to_status: 'REJECTED_BY_MERCHANT',
                                        actor_id: userId,
                                        actor_role: $.user.role,
                                        reason: model.reason,
                                        created_at: now
                                    }).callback(function(err) {
                                        if (err) return done(err);
                                        done();
                                    });
                                });
                            }, function(err) {
                                if (err) return $.invalid(500, 'Failed to reject order');
                                FUNC.audit($, {
                                    entity_type: 'orders',
                                    entity_id: order.id,
                                    action: 'merchant_reject'
                                });
                                $.success();
                            });
                        });
                });
        }
    });

    // Mark order as preparing
    schema.action('preparing', {
        name: 'Mark preparing',
        params: '*id:UID',
        action: function($) {
            var userId = $.user.sub;

            DB().one('merchants')
                .fields('id')
                .where('owner_id', userId)
                .where('is_removed', false)
                .callback(function(err, merchant) {
                    if (!merchant) return $.invalid(404, 'Merchant not found');

                    DB().one('orders')
                        .fields('id,status,merchant_id')
                        .where('id', $.params.id)
                        .where('merchant_id', merchant.id)
                        .where('is_removed', false)
                        .callback(function(err, order) {
                            if (!order) return $.invalid(404, 'Order not found');

                            if (order.status !== 'MERCHANT_ACCEPTED') {
                                return $.invalid(400, 'Order must be accepted first');
                            }

                            var now = new Date();
                            FUNC.sequence(function(done) {
                                DB().update('orders', {
                                    status: 'PREPARING',
                                    prepared_at: now,
                                    updated_at: now
                                }).where('id', order.id).callback(function(err) {
                                    if (err) return done(err);

                                    DB().insert('order_status_history', {
                                        id: FUNC.generateId(),
                                        order_id: order.id,
                                        from_status: order.status,
                                        to_status: 'PREPARING',
                                        actor_id: userId,
                                        actor_role: $.user.role,
                                        created_at: now
                                    }).callback(function(err) {
                                        if (err) return done(err);
                                        done();
                                    });
                                });
                            }, function(err) {
                                if (err) return $.invalid(500, 'Failed to update status');
                                $.success();
                            });
                        });
                });
        }
    });

    // Mark order as ready for pickup
    schema.action('ready', {
        name: 'Mark ready for pickup',
        params: '*id:UID',
        action: function($) {
            var userId = $.user.sub;

            DB().one('merchants')
                .fields('id')
                .where('owner_id', userId)
                .where('is_removed', false)
                .callback(function(err, merchant) {
                    if (!merchant) return $.invalid(404, 'Merchant not found');

                    DB().one('orders')
                        .fields('id,status,merchant_id')
                        .where('id', $.params.id)
                        .where('merchant_id', merchant.id)
                        .where('is_removed', false)
                        .callback(function(err, order) {
                            if (!order) return $.invalid(404, 'Order not found');

                            if (['PREPARING', 'MERCHANT_ACCEPTED'].indexOf(order.status) === -1) {
                                return $.invalid(400, 'Order must be preparing first');
                            }

                            var now = new Date();
                            FUNC.sequence(function(done) {
                                DB().update('orders', {
                                    status: 'READY_FOR_PICKUP',
                                    ready_at: now,
                                    updated_at: now
                                }).where('id', order.id).callback(function(err) {
                                    if (err) return done(err);

                                    DB().insert('order_status_history', {
                                        id: FUNC.generateId(),
                                        order_id: order.id,
                                        from_status: order.status,
                                        to_status: 'READY_FOR_PICKUP',
                                        actor_id: userId,
                                        actor_role: $.user.role,
                                        created_at: now
                                    }).callback(function(err) {
                                        if (err) return done(err);
                                        done();
                                    });
                                });
                            }, function(err) {
                                if (err) return $.invalid(500, 'Failed to update status');
                                $.success();
                            });
                        });
                });
        }
    });
});