// ==========================================
// PareFood Backend — Admin Schema
// ==========================================

NEWSCHEMA('Admin', function(schema) {

    // Dashboard summary
    schema.action('dashboard', {
        name: 'Admin dashboard',
        action: function($) {
            var result = {};

            // Total orders today
            DB().count('orders')
                .where('created_at', new Date(new Date().setHours(0, 0, 0, 0)), '>=')
                .callback(function(err, count) {
                    result.orders_today = count || 0;

                    // Total merchant applications pending
                    DB().count('merchants')
                        .where('status', 'pending')
                        .where('is_removed', false)
                        .callback(function(err, pending) {
                            result.merchants_pending = pending || 0;

                            // Total drivers
                            DB().count('drivers')
                                .where('status', 'approved')
                                .where('is_removed', false)
                                .callback(function(err, drivers) {
                                    result.drivers_active = drivers || 0;

                                    // Total revenue
                                    DB().query('SELECT COALESCE(SUM(grand_total), 0) AS total FROM orders WHERE status = \'COMPLETED\'')
                                        .callback(function(err, rows) {
                                            result.revenue = rows && rows[0] ? rows[0].total : 0;
                                            $.callback({ dashboard: result });
                                        });
                                });
                        });
                });
        }
    });

    // List pending merchants
    schema.action('merchantsPending', {
        name: 'List pending merchants',
        action: function($) {
            DB().find('merchants')
                .where('status', 'pending')
                .where('is_removed', false)
                .sort('created_at', true)
                .callback(function(err, rows) {
                    if (err) return $.invalid(500, 'Failed to fetch merchants');
                    $.callback({ merchants: rows });
                });
        }
    });

    // Approve merchant
    schema.action('approveMerchant', {
        name: 'Approve merchant',
        params: '*id:UID',
        action: function($) {
            var userId = $.user.sub;

            DB().one('merchants')
                .fields('id,status,owner_id')
                .where('id', $.params.id)
                .where('is_removed', false)
                .callback(function(err, merchant) {
                    if (!merchant) return $.invalid(404, 'Merchant not found');
                    if (merchant.status !== 'pending') return $.invalid(400, 'Merchant is not pending review');

                    var now = new Date();
                    FUNC.sequence(function(done) {
                        DB().update('merchants', {
                            status: 'approved',
                            approved_at: now,
                            approved_by: userId,
                            updated_at: now
                        }).where('id', merchant.id).callback(function(err) {
                            if (err) return done(err);

                            // Insert notification to merchant owner
                            DB().insert('notifications', {
                                id: FUNC.generateId(),
                                recipient_id: merchant.owner_id,
                                type: 'merchant_approved',
                                title: 'Merchant Disetujui',
                                body: 'Selamat! Merchant Anda telah disetujui. Anda dapat mulai mengelola menu.',
                                is_read: false,
                                created_at: now
                            }).callback(function(err) {
                                if (err) return done(err);
                                done();
                            });
                        });
                    }, function(err) {
                        if (err) return $.invalid(500, 'Failed to approve merchant');

                        FUNC.audit($, {
                            entity_type: 'merchants',
                            entity_id: merchant.id,
                            action: 'approve'
                        });
                        $.success();
                    });
                });
        }
    });

    // Reject merchant
    schema.action('rejectMerchant', {
        name: 'Reject merchant',
        params: '*id:UID',
        input: 'reason:String',
        action: function($, model) {
            var userId = $.user.sub;

            DB().one('merchants')
                .fields('id,status,owner_id')
                .where('id', $.params.id)
                .where('is_removed', false)
                .callback(function(err, merchant) {
                    if (!merchant) return $.invalid(404, 'Merchant not found');
                    if (merchant.status !== 'pending') return $.invalid(400, 'Merchant is not pending review');

                    var now = new Date();
                    FUNC.sequence(function(done) {
                        DB().update('merchants', {
                            status: 'rejected',
                            updated_at: now
                        }).where('id', merchant.id).callback(function(err) {
                            if (err) return done(err);

                            DB().insert('notifications', {
                                id: FUNC.generateId(),
                                recipient_id: merchant.owner_id,
                                type: 'merchant_rejected',
                                title: 'Merchant Ditolak',
                                body: 'Mohon maaf, aplikasi merchant Anda ditolak: ' + (model.reason || 'Tidak memenuhi syarat'),
                                is_read: false,
                                created_at: now
                            }).callback(function(err) {
                                if (err) return done(err);
                                done();
                            });
                        });
                    }, function(err) {
                        if (err) return $.invalid(500, 'Failed to reject merchant');

                        FUNC.audit($, {
                            entity_type: 'merchants',
                            entity_id: merchant.id,
                            action: 'reject',
                            metadata: { reason: model.reason }
                        });
                        $.success();
                    });
                });
        }
    });

    // List orders (admin)
    schema.action('orders', {
        name: 'List orders',
        query: 'status:String,page:Number,size:Number',
        action: function($, model) {
            var page = parseInt(model.page) || 1;
            var size = parseInt(model.size) || 20;
            var offset = (page - 1) * size;

            var builder = DB().find('orders');
            builder.where('is_removed', false);
            if (model.status) builder.where('status', model.status.toUpperCase());
            builder.sort('created_at', true);
            builder.take(size);
            builder.skip(offset);
            builder.callback(function(err, rows) {
                if (err) return $.invalid(500, 'Failed to fetch orders');
                $.callback({ orders: rows, pagination: { page: page, size: size } });
            });
        }
    });

    // List users (admin)
    schema.action('users', {
        name: 'List users',
        query: 'role:String,search:String,page:Number,size:Number',
        action: function($, model) {
            var page = parseInt(model.page) || 1;
            var size = parseInt(model.size) || 20;
            var offset = (page - 1) * size;

            var builder = DB().find('profiles');
            builder.where('is_removed', false);
            if (model.role) builder.where('role', model.role);
            if (model.search) builder.where('name', model.search, 'LIKE');
            builder.sort('created_at', true);
            builder.take(size);
            builder.skip(offset);
            builder.callback(function(err, rows) {
                if (err) return $.invalid(500, 'Failed to fetch users');
                $.callback({ users: rows, pagination: { page: page, size: size } });
            });
        }
    });

    // List drivers (admin)
    schema.action('drivers', {
        name: 'List drivers',
        query: 'status:String,page:Number,size:Number',
        action: function($, model) {
            var page = parseInt(model.page) || 1;
            var size = parseInt(model.size) || 20;
            var offset = (page - 1) * size;

            var builder = DB().find('drivers');
            builder.where('is_removed', false);
            if (model.status) builder.where('status', model.status);
            builder.sort('created_at', true);
            builder.take(size);
            builder.skip(offset);
            builder.callback(function(err, rows) {
                if (err) return $.invalid(500, 'Failed to fetch drivers');
                $.callback({ drivers: rows, pagination: { page: page, size: size } });
            });
        }
    });

    // List pending drivers
    schema.action('driversPending', {
        name: 'List pending drivers',
        action: function($) {
            DB().find('drivers')
                .where('status', 'pending')
                .where('is_removed', false)
                .sort('created_at', true)
                .callback(function(err, rows) {
                    if (err) return $.invalid(500, 'Failed to fetch drivers');
                    $.callback({ drivers: rows });
                });
        }
    });

    // Approve driver
    schema.action('approveDriver', {
        name: 'Approve driver',
        params: '*id:UID',
        action: function($) {
            var userId = $.user.sub;

            DB().one('drivers')
                .fields('id,status,profile_id')
                .where('id', $.params.id)
                .where('is_removed', false)
                .callback(function(err, driver) {
                    if (err) return $.invalid(500, 'Failed to load driver');
                    if (!driver) return $.invalid(404, 'Driver not found');
                    if (driver.status !== 'pending') return $.invalid(400, 'Driver is not pending review');

                    var now = new Date();
                    FUNC.sequence(function(done) {
                        DB().update('drivers', {
                            status: 'approved',
                            approved_at: now,
                            approved_by: userId,
                            updated_at: now
                        }).where('id', driver.id).callback(function(err) {
                            if (err) return done(err);

                            DB().insert('notifications', {
                                id: FUNC.generateId(),
                                recipient_id: driver.profile_id,
                                type: 'driver_approved',
                                title: 'Driver Disetujui',
                                body: 'Selamat! Aplikasi driver Anda telah disetujui. Silakan masuk untuk mulai menerima pesanan.',
                                is_read: false,
                                created_at: now
                            }).callback(function(err) {
                                if (err) return done(err);
                                done();
                            });
                        });
                    }, function(err) {
                        if (err) return $.invalid(500, 'Failed to approve driver');

                        FUNC.audit($, {
                            entity_type: 'drivers',
                            entity_id: driver.id,
                            action: 'approve'
                        });
                        $.success();
                    });
                });
        }
    });

    // Reject driver
    schema.action('rejectDriver', {
        name: 'Reject driver',
        params: '*id:UID',
        input: 'reason:String',
        action: function($, model) {
            var userId = $.user.sub;

            DB().one('drivers')
                .fields('id,status,profile_id')
                .where('id', $.params.id)
                .where('is_removed', false)
                .callback(function(err, driver) {
                    if (err) return $.invalid(500, 'Failed to load driver');
                    if (!driver) return $.invalid(404, 'Driver not found');
                    if (driver.status !== 'pending') return $.invalid(400, 'Driver is not pending review');

                    var now = new Date();
                    FUNC.sequence(function(done) {
                        DB().update('drivers', {
                            status: 'rejected',
                            updated_at: now
                        }).where('id', driver.id).callback(function(err) {
                            if (err) return done(err);

                            DB().insert('notifications', {
                                id: FUNC.generateId(),
                                recipient_id: driver.profile_id,
                                type: 'driver_rejected',
                                title: 'Driver Ditolak',
                                body: 'Mohon maaf, aplikasi driver Anda ditolak: ' + (model.reason || 'Tidak memenuhi syarat'),
                                is_read: false,
                                created_at: now
                            }).callback(function(err) {
                                if (err) return done(err);
                                done();
                            });
                        });
                    }, function(err) {
                        if (err) return $.invalid(500, 'Failed to reject driver');

                        FUNC.audit($, {
                            entity_type: 'drivers',
                            entity_id: driver.id,
                            action: 'reject',
                            metadata: { reason: model.reason }
                        });
                        $.success();
                    });
                });
        }
    });

    // Read a single order with full details (admin)
    schema.action('orderDetail', {
        name: 'Read order',
        params: '*id:UID',
        action: function($) {
            DB().one('orders')
                .where('id', $.params.id)
                .where('is_removed', false)
                .callback(function(err, order) {
                    if (err) return $.invalid(500, 'Failed to load order');
                    if (!order) return $.invalid(404, 'Order not found');

                    DB().find('order_items')
                        .where('order_id', order.id)
                        .callback(function(err, items) {
                            if (err) return $.invalid(500, 'Failed to load order items');

                            DB().find('order_status_history')
                                .where('order_id', order.id)
                                .sort('created_at', true)
                                .callback(function(err, history) {
                                    if (err) return $.invalid(500, 'Failed to load history');

                                    DB().one('deliveries')
                                        .fields('id,driver_id,status,accepted_at,picked_up_at,delivered_at,delivery_proof_note')
                                        .where('order_id', order.id)
                                        .where('status', 'DELIVERED')
                                        .callback(function(err, delivery) {
                                            if (err) return $.invalid(500, 'Failed to load delivery');

                                            order.items = items || [];
                                            order.status_history = history || [];
                                            order.delivery = delivery || null;
                                            $.callback({ order: order });
                                        });
                                });
                        });
                });
        }
    });

    // Dispatch board — active orders and their deliveries (admin)
    schema.action('dispatch', {
        name: 'Dispatch board',
        action: function($) {
            var active = ['READY_FOR_PICKUP', 'DRIVER_ASSIGNED', 'PICKING_UP', 'PICKED_UP', 'ON_DELIVERY', 'DELIVERED'];

            DB().find('orders')
                .fields('id,order_number,status,merchant_id,customer_id,grand_total,delivery_address,created_at')
                .where('is_removed', false)
                .callback(function(err, rows) {
                    if (err) return $.invalid(500, 'Failed to fetch orders');

                    var orders = (rows || []).filter(function(r) { return active.indexOf(r.status) !== -1; });
                    var orderIds = orders.map(function(r) { return r.id; });

                    DB().find('deliveries')
                        .fields('id,order_id,driver_id,status,picked_up_at,delivered_at')
                        .where('order_id', orderIds)
                        .callback(function(err, deliveries) {
                            if (err) return $.invalid(500, 'Failed to fetch deliveries');

                            var deliveryMap = {};
                            (deliveries || []).forEach(function(d) { deliveryMap[d.order_id] = d; });
                            orders.forEach(function(o) { o.delivery = deliveryMap[o.id] || null; });

                            $.callback({ orders: orders });
                        });
                });
        }
    });

    // Force cancel an order (admin incident handling)
    schema.action('cancelOrder', {
        name: 'Cancel order',
        params: '*id:UID',
        input: 'reason:String',
        action: function($, model) {
            var userId = $.user.sub;
            var cancellable = ['PENDING_PAYMENT', 'PAID', 'WAITING_MERCHANT', 'MERCHANT_ACCEPTED', 'PREPARING', 'READY_FOR_PICKUP', 'DRIVER_ASSIGNED', 'PICKED_UP', 'ON_DELIVERY'];

            DB().one('orders')
                .fields('id,status,customer_id,order_number')
                .where('id', $.params.id)
                .where('is_removed', false)
                .callback(function(err, order) {
                    if (err) return $.invalid(500, 'Failed to load order');
                    if (!order) return $.invalid(404, 'Order not found');
                    if (cancellable.indexOf(order.status) === -1) {
                        return $.invalid(400, 'Order cannot be cancelled in state ' + order.status);
                    }

                    var now = new Date();
                    FUNC.sequence(function(done) {
                        DB().update('orders', {
                            status: 'CANCELLED_BY_ADMIN',
                            updated_at: now
                        }).where('id', order.id).callback(function(err) {
                            if (err) return done(err);

                            DB().insert('order_status_history', {
                                id: FUNC.generateId(),
                                order_id: order.id,
                                from_status: order.status,
                                to_status: 'CANCELLED_BY_ADMIN',
                                actor_id: userId,
                                actor_role: 'admin',
                                reason: model.reason || null,
                                created_at: now
                            }).callback(function(err) {
                                if (err) return done(err);
                                done();
                            });
                        });
                    }, function(err) {
                        if (err) return $.invalid(500, 'Failed to cancel order');

                        // Notify the customer
                        DB().insert('notifications', {
                            id: FUNC.generateId(),
                            recipient_id: order.customer_id,
                            type: 'order_cancelled_by_admin',
                            title: 'Pesanan Dibatalkan',
                            body: model.reason || ('Pesanan ' + order.order_number + ' dibatalkan oleh admin.'),
                            is_read: false,
                            created_at: now
                        }).callback(function() {});

                        FUNC.audit($, {
                            entity_type: 'orders',
                            entity_id: order.id,
                            action: 'cancel',
                            metadata: { reason: model.reason || null, actor: 'admin' }
                        });
                        $.success();
                    });
                });
        }
    });

    // List support tickets (admin)
    schema.action('tickets', {
        name: 'List support tickets',
        query: 'status:String,page:Number,size:Number',
        action: function($, model) {
            var page = parseInt(model.page) || 1;
            var size = parseInt(model.size) || 20;
            var offset = (page - 1) * size;

            var builder = DB().find('support_tickets');
            builder.where('is_removed', false);
            if (model.status) builder.where('status', model.status.toUpperCase());
            builder.sort('created_at', true);
            builder.take(size);
            builder.skip(offset);
            builder.callback(function(err, rows) {
                if (err) return $.invalid(500, 'Failed to fetch tickets');
                rows = rows || [];

                var ids = rows.map(function(r) { return r.id; });
                if (!ids.length) {
                    return $.callback({ tickets: rows, pagination: { page: page, size: size } });
                }

                DB().query('SELECT ticket_id, COUNT(*)::int AS message_count, MAX(created_at) AS last_message_at FROM support_messages WHERE ticket_id IN (\'' + ids.join('\',\'') + '\') GROUP BY ticket_id')
                    .callback(function(err2, agg) {
                        if (err2) return $.invalid(500, 'Failed to fetch ticket stats');
                        var map = {};
                        (agg || []).forEach(function(a) { map[a.ticket_id] = a; });
                        rows.forEach(function(r) {
                            var stat = map[r.id];
                            r.message_count = stat ? stat.message_count : 0;
                            r.last_message_at = stat ? stat.last_message_at : null;
                        });
                        $.callback({ tickets: rows, pagination: { page: page, size: size } });
                    });
            });
        }
    });

    // Read a support ticket with messages (admin)
    schema.action('ticketRead', {
        name: 'Read support ticket',
        params: '*id:UID',
        action: function($) {
            DB().one('support_tickets')
                .where('id', $.params.id)
                .where('is_removed', false)
                .callback(function(err, ticket) {
                    if (err) return $.invalid(500, 'Failed to load ticket');
                    if (!ticket) return $.invalid(404, 'Ticket not found');

                    DB().find('support_messages')
                        .where('ticket_id', ticket.id)
                        .sort('created_at', true)
                        .callback(function(err, messages) {
                            if (err) return $.invalid(500, 'Failed to load messages');
                            ticket.messages = messages || [];
                            $.callback({ ticket: ticket });
                        });
                });
        }
    });

    // Reply to a support ticket as PareFood support (admin)
    schema.action('ticketReply', {
        name: 'Reply to ticket',
        params: '*id:UID',
        input: '*message:String',
        action: function($, model) {
            DB().one('support_tickets')
                .fields('id,status')
                .where('id', $.params.id)
                .where('is_removed', false)
                .callback(function(err, ticket) {
                    if (err) return $.invalid(500, 'Failed to load ticket');
                    if (!ticket) return $.invalid(404, 'Ticket not found');
                    if (ticket.status === 'CLOSED') return $.invalid(400, 'Ticket is closed');

                    var now = new Date();
                    FUNC.sequence(function(done) {
                        DB().insert('support_messages', {
                            id: FUNC.generateId(),
                            ticket_id: ticket.id,
                            user_id: $.user.sub,
                            message: model.message,
                            is_from_support: true,
                            created_at: now
                        }).callback(function(err) {
                            if (err) return done(err);

                            DB().update('support_tickets', {
                                status: 'IN_PROGRESS',
                                updated_at: now
                            }).where('id', ticket.id).callback(function(err) {
                                if (err) return done(err);
                                done();
                            });
                        });
                    }, function(err) {
                        if (err) return $.invalid(500, 'Failed to send reply');
                        $.success();
                    });
                });
        }
    });

    // Close a support ticket (admin)
    schema.action('ticketClose', {
        name: 'Close support ticket',
        params: '*id:UID',
        action: function($) {
            DB().one('support_tickets')
                .fields('id,status')
                .where('id', $.params.id)
                .where('is_removed', false)
                .callback(function(err, ticket) {
                    if (err) return $.invalid(500, 'Failed to load ticket');
                    if (!ticket) return $.invalid(404, 'Ticket not found');
                    if (ticket.status === 'CLOSED') return $.success();

                    DB().update('support_tickets', {
                        status: 'CLOSED',
                        updated_at: new Date()
                    }).where('id', ticket.id).callback(function(err) {
                        if (err) return $.invalid(500, 'Failed to close ticket');
                        $.success();
                    });
                });
        }
    });

    // Sales & finance reports (admin)
    schema.action('reports', {
        name: 'Reports',
        query: 'from:String,to:String',
        action: function($, model) {
            if ((model.from && !/^\d{4}-\d{2}-\d{2}$/.test(model.from)) || (model.to && !/^\d{4}-\d{2}-\d{2}$/.test(model.to))) {
                return $.invalid(400, 'Invalid date format (YYYY-MM-DD)');
            }

            var now = new Date();
            var from = model.from ? model.from + 'T00:00:00.000Z' : new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
            var to = model.to ? model.to + 'T23:59:59.999Z' : now.toISOString();

            DB().query("SELECT COUNT(*) AS total_orders, COALESCE(SUM(grand_total), 0) AS gmv FROM orders WHERE is_removed = false AND status = 'COMPLETED' AND created_at BETWEEN '" + from + "' AND '" + to + "'").callback(function(err, orders) {
                if (err) return $.invalid(500, 'Failed to build report');

                DB().query("SELECT COALESCE(SUM(net_amount), 0) AS total FROM platform_earnings WHERE created_at BETWEEN '" + from + "' AND '" + to + "'").callback(function(err, platform) {
                    if (err) return $.invalid(500, 'Failed to build report');

                    DB().query("SELECT COALESCE(SUM(net_amount), 0) AS total FROM driver_earnings WHERE status = 'PAID' AND created_at BETWEEN '" + from + "' AND '" + to + "'").callback(function(err, driverPaid) {
                        if (err) return $.invalid(500, 'Failed to build report');

                        DB().query("SELECT COALESCE(SUM(net_amount), 0) AS total FROM merchant_earnings WHERE status = 'PAID' AND created_at BETWEEN '" + from + "' AND '" + to + "'").callback(function(err, merchantPaid) {
                            if (err) return $.invalid(500, 'Failed to build report');

                            DB().query("SELECT merchant_id, SUM(grand_total) AS total FROM orders WHERE is_removed = false AND status = 'COMPLETED' AND created_at BETWEEN '" + from + "' AND '" + to + "' GROUP BY merchant_id ORDER BY total DESC LIMIT 5").callback(function(err, top) {
                                if (err) return $.invalid(500, 'Failed to build report');

                                var merchantIds = (top || []).map(function(r) { return r.merchant_id; });
                                DB().query("SELECT id, name FROM merchants WHERE id IN ('" + merchantIds.join("','") + "')").callback(function(err, merchants) {
                                    if (err) return $.invalid(500, 'Failed to build report');

                                    var merchantMap = {};
                                    (merchants || []).forEach(function(m) { merchantMap[m.id] = m; });

                                    var topMerchants = (top || []).map(function(r) {
                                        return { merchant_id: r.merchant_id, name: merchantMap[r.merchant_id] ? merchantMap[r.merchant_id].name : null, total: Number(r.total) };
                                    });

                                    $.callback({
                                        report: {
                                            period_start: from,
                                            period_end: to,
                                            total_orders: Number(orders[0].total_orders),
                                            gmv: Number(orders[0].gmv),
                                            platform_revenue: Number(platform[0].total),
                                            driver_paid: Number(driverPaid[0].total),
                                            merchant_paid: Number(merchantPaid[0].total)
                                        },
                                        top_merchants: topMerchants
                                    });
                                });
                            });
                        });
                    });
                });
            });
        }
    });

    // Audit logs (admin)
    schema.action('audit', {
        name: 'Audit logs',
        query: 'entity_type:String,page:Number,size:Number',
        action: function($, model) {
            var page = parseInt(model.page) || 1;
            var size = parseInt(model.size) || 50;
            var offset = (page - 1) * size;

            var builder = DB().find('audit_logs');
            if (model.entity_type) builder.where('entity_type', model.entity_type);
            builder.sort('created_at', true);
            builder.take(size);
            builder.skip(offset);
            builder.callback(function(err, rows) {
                if (err) return $.invalid(500, 'Failed to fetch audit logs');
                $.callback({ logs: rows || [], pagination: { page: page, size: size } });
            });
        }
    });
});