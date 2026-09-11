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
                    DB().transaction(function(done) {
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
                    DB().transaction(function(done) {
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
});