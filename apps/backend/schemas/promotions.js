// ==========================================
// PareFood Backend — Promotions Schema
// ==========================================

NEWSCHEMA('Promotions', function(schema) {

    // List active promotions
    schema.action('list', {
        name: 'List promotions',
        action: function($) {
            var now = new Date();

            DB().find('promotions')
                .where('is_active', true)
                .where('is_removed', false)
                .sort('created_at', true)
                .callback(function(err, rows) {
                    if (err) return $.invalid(500, 'Failed to fetch promotions');

                    // Filter valid ones
                    rows = rows.filter(function(p) {
                        if (p.valid_from && new Date(p.valid_from) > now) return false;
                        if (p.valid_until && new Date(p.valid_until) < now) return false;
                        return true;
                    });

                    $.callback({ promotions: rows });
                });
        }
    });

    // Validate a promotion code
    schema.action('validate', {
        name: 'Validate promotion',
        input: '*code:String,subtotal:Number,merchant_id:UID',
        action: function($, model) {
            var userId = $.user.sub;
            var code = model.code.toUpperCase();

            DB().one('promotions')
                .where('code', code)
                .where('is_active', true)
                .where('is_removed', false)
                .callback(function(err, promo) {
                    if (!promo) return $.invalid(404, 'Promotion code not found');

                    var now = new Date();

                    // Check validity period
                    if (promo.valid_from && new Date(promo.valid_from) > now) {
                        return $.invalid(400, 'Promotion has not started yet');
                    }
                    if (promo.valid_until && new Date(promo.valid_until) < now) {
                        return $.invalid(400, 'Promotion has expired');
                    }

                    // Check merchant-specific
                    var promoType = promo.scope_type;
                    if (promoType === 'merchant' && promo.scope_id && promo.scope_id !== model.merchant_id) {
                        return $.invalid(400, 'Promotion not valid for this merchant');
                    }

                    // Check min order
                    if (promo.min_order && model.subtotal < promo.min_order) {
                        return $.invalid(400, 'Minimum order for this promotion is ' + FUNC.formatIDR(promo.min_order));
                    }

                    // Check usage limits
                    DB().count('promotion_redemptions')
                        .where('promotion_id', promo.id)
                        .callback(function(err, count) {
                            if (!err && promo.usage_limit && count >= promo.usage_limit) {
                                return $.invalid(400, 'Promotion has reached its usage limit');
                            }

                            // Check per-customer limit
                            DB().count('promotion_redemptions')
                                .where('promotion_id', promo.id)
                                .where('user_id', userId)
                                .callback(function(err, userCount) {
                                    if (!err && promo.per_customer_limit && userCount >= promo.per_customer_limit) {
                                        return $.invalid(400, 'Promotion has reached your usage limit');
                                    }

                                    // Calculate discount
                                    var discount = 0;
                                    if (promo.discount_type === 'fixed') {
                                        discount = promo.discount_value;
                                    } else if (promo.discount_type === 'percentage') {
                                        discount = Math.round(model.subtotal * promo.discount_value / 100);
                                    }
                                    // Apply max discount
                                    if (promo.max_discount && discount > promo.max_discount) {
                                        discount = promo.max_discount;
                                    }

                                    $.callback({
                                        valid: true,
                                        promotion: {
                                            id: promo.id,
                                            code: promo.code,
                                            title: promo.title,
                                            description: promo.description,
                                            discount: discount,
                                            discount_type: promo.discount_type,
                                            discount_value: promo.discount_value,
                                            max_discount: promo.max_discount
                                        }
                                    });
                                });
                        });
                });
        }
    });

    // Apply promotion (record redemption)
    schema.action('apply', {
        name: 'Apply promotion',
        input: '*code:String,order_id:UID',
        action: function($, model) {
            var userId = $.user.sub;

            DB().one('promotions')
                .where('code', model.code.toUpperCase())
                .where('is_active', true)
                .where('is_removed', false)
                .callback(function(err, promo) {
                    if (!promo) return $.invalid(404, 'Promotion code not found');

                    // Insert redemption
                    DB().insert('promotion_redemptions', {
                        id: FUNC.generateId(),
                        promotion_id: promo.id,
                        user_id: userId,
                        order_id: model.order_id,
                        created_at: new Date()
                    }).callback(function(err) {
                        if (err) return $.invalid(500, 'Failed to apply promotion');
                        $.success();
                    });
                });
        }
    });
});