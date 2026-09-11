// ==========================================
// PareFood Backend — Reviews Schema
// Customers review completed orders (one review
// per order). Merchant owners can reply.
// ==========================================

NEWSCHEMA('Reviews', function(schema) {

    // Create a review for a completed order (customer)
    schema.action('create', {
        name: 'Create review',
        input: '*order_id:UID,*rating:Number,comment:String',
        action: function($, model) {
            var userId = $.user.sub;

            if (model.rating < 1 || model.rating > 5) {
                return $.invalid(400, 'Rating must be between 1 and 5');
            }

            DB().one('orders')
                .fields('id,order_number,customer_id,merchant_id,status')
                .where('id', model.order_id)
                .where('is_removed', false)
                .callback(function(err, order) {
                    if (err) return $.invalid(500, 'Failed to load order');
                    if (!order) return $.invalid(404, 'Order not found');
                    if (order.customer_id !== userId) return $.invalid(403, 'Forbidden');
                    if (order.status !== 'COMPLETED') {
                        return $.invalid(400, 'Order must be completed before giving a review');
                    }

                    DB().one('reviews')
                        .fields('id')
                        .where('order_id', order.id)
                        .where('is_removed', false)
                        .callback(function(err, existing) {
                            if (err) return $.invalid(500, 'Failed to check existing review');
                            if (existing) return $.invalid(409, 'Order already reviewed');

                            var reviewId = FUNC.generateId();
                            DB().insert('reviews', {
                                id: reviewId,
                                order_id: order.id,
                                merchant_id: order.merchant_id,
                                customer_id: userId,
                                rating: model.rating,
                                comment: model.comment || null,
                                created_at: new Date(),
                                updated_at: new Date(),
                                is_removed: false
                            }).callback(function(err) {
                                if (err) return $.invalid(500, 'Failed to create review');

                                FUNC.reviews.updateMerchantRating(order.merchant_id, function() {});

                                FUNC.audit($, {
                                    entity_type: 'reviews',
                                    entity_id: reviewId,
                                    action: 'create'
                                });

                                $.callback({ id: reviewId });
                            });
                        });
                });
        }
    });

    // Public list of reviews for a merchant (by slug)
    schema.action('list', {
        name: 'List merchant reviews',
        params: '*slug:String',
        action: function($) {
            DB().one('merchants')
                .fields('id')
                .where('slug', $.params.slug)
                .where('is_removed', false)
                .callback(function(err, merchant) {
                    if (err) return $.invalid(500, 'Failed to load merchant');
                    if (!merchant) return $.invalid(404, 'Merchant not found');

                    DB().find('reviews')
                        .fields('id,rating,comment,admin_reply,customer_id,created_at,replied_at')
                        .where('merchant_id', merchant.id)
                        .where('is_removed', false)
                        .sort('created_at', true)
                        .callback(function(err, rows) {
                            if (err) return $.invalid(500, 'Failed to fetch reviews');
                            var reviews = rows || [];

                            if (!reviews.length) return $.callback({ reviews: [], total: 0 });

                            var ids = reviews.map(function(r) { return r.customer_id; });
                            var quoted = ids.map(function(id) { return "'" + id + "'"; }).join(',');
                            DB().query("SELECT id, full_name FROM profiles WHERE id IN (" + quoted + ")").callback(function(err, profiles) {
                                var profileMap = {};
                                (profiles || []).forEach(function(p) { profileMap[p.id] = p.full_name; });

                                var out = reviews.map(function(r) {
                                    return {
                                        id: r.id,
                                        rating: r.rating,
                                        comment: r.comment,
                                        admin_reply: r.admin_reply,
                                        replied_at: r.replied_at,
                                        customer_name: profileMap[r.customer_id] || 'Customer',
                                        created_at: r.created_at
                                    };
                                });

                                $.callback({ reviews: out, total: out.length });
                            });
                        });
                });
        }
    });

    // Customer's own reviews
    schema.action('mine', {
        name: 'My reviews',
        action: function($) {
            DB().find('reviews')
                .fields('id,merchant_id,rating,comment,admin_reply,created_at,replied_at')
                .where('customer_id', $.user.sub)
                .where('is_removed', false)
                .sort('created_at', true)
                .callback(function(err, rows) {
                    if (err) return $.invalid(500, 'Failed to fetch reviews');
                    var reviews = rows || [];

                    if (!reviews.length) return $.callback({ reviews: [], total: 0 });

                    var ids = reviews.map(function(r) { return r.merchant_id; });
                    var quoted = ids.map(function(id) { return "'" + id + "'"; }).join(',');
                    DB().query("SELECT id, name, slug FROM merchants WHERE id IN (" + quoted + ")").callback(function(err, merchants) {
                        var merchantMap = {};
                        (merchants || []).forEach(function(m) { merchantMap[m.id] = m; });

                        var out = reviews.map(function(r) {
                            return {
                                id: r.id,
                                rating: r.rating,
                                comment: r.comment,
                                admin_reply: r.admin_reply,
                                replied_at: r.replied_at,
                                created_at: r.created_at,
                                merchant: merchantMap[r.merchant_id] || null
                            };
                        });

                        $.callback({ reviews: out, total: out.length });
                    });
                });
        }
    });

    // Merchant owner (or admin) replies to a review
    schema.action('reply', {
        name: 'Reply to review',
        params: '*id:UID',
        input: '*reply:String',
        action: function($, model) {
            var userId = $.user.sub;

            DB().one('reviews')
                .fields('id,merchant_id')
                .where('id', $.params.id)
                .where('is_removed', false)
                .callback(function(err, review) {
                    if (err) return $.invalid(500, 'Failed to load review');
                    if (!review) return $.invalid(404, 'Review not found');

                    var applyReply = function() {
                        DB().update('reviews')
                            .set('admin_reply', model.reply)
                            .set('replied_at', new Date())
                            .set('updated_at', new Date())
                            .where('id', review.id)
                            .callback(function(err) {
                                if (err) return $.invalid(500, 'Failed to save reply');

                                FUNC.audit($, {
                                    entity_type: 'reviews',
                                    entity_id: review.id,
                                    action: 'reply'
                                });

                                $.success();
                            });
                    };

                    if ($.user.role === 'merchant_owner') {
                        DB().one('merchants')
                            .fields('id,owner_id')
                            .where('id', review.merchant_id)
                            .callback(function(err, merchant) {
                                if (err) return $.invalid(500, 'Failed to load merchant');
                                if (!merchant) return $.invalid(404, 'Merchant not found');
                                if (merchant.owner_id !== userId) return $.invalid(403, 'Forbidden');
                                applyReply();
                            });
                    } else {
                        applyReply();
                    }
                });
        }
    });

});