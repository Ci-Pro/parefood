// ==========================================
// PareFood Backend — My Merchant Schema
// (merchant owner's own merchant)
// ==========================================

NEWSCHEMA('MyMerchant', function(schema) {

    // Read merchant owner's merchant
    schema.action('read', {
        name: 'Read my merchant',
        action: function($) {
            var userId = $.user.sub;

            DB().one('merchants')
                .where('owner_id', userId)
                .where('is_removed', false)
                .callback(function(err, merchant) {
                    if (!merchant) return $.invalid(404, 'Merchant not found');

                    // Get hours
                    DB().find('merchant_hours')
                        .where('merchant_id', merchant.id)
                        .callback(function(err, hours) {
                            merchant.hours = hours || [];
                            $.callback({ merchant: merchant });
                        });
                });
        }
    });

    // Apply to become a merchant (onboarding)
    schema.action('apply', {
        name: 'Apply for merchant',
        input: '*name:String,*description:String,*address:String,*latitude:Number,*longitude:Number,*phone:String,categories:String',
        action: function($, model) {
            var userId = $.user.sub;
            var id = FUNC.generateId();
            var slug = model.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + FUNC.generateId().substring(0, 8);

            // Check if already has merchant
            DB().one('merchants')
                .fields('id')
                .where('owner_id', userId)
                .where('is_removed', false)
                .callback(function(err, existing) {
                    if (existing) return $.invalid(409, 'You already have a merchant application');

                    var merchant = {
                        id: id,
                        owner_id: userId,
                        name: model.name,
                        slug: slug,
                        description: model.description,
                        address: model.address,
                        latitude: model.latitude || null,
                        longitude: model.longitude || null,
                        phone: model.phone || null,
                        status: 'pending',
                        is_open: false,
                        min_order: 0,
                        rating: 0,
                        rating_count: 0,
                        created_at: new Date(),
                        updated_at: new Date(),
                        is_removed: false
                    };

                    DB().insert('merchants', merchant)
                        .audit($, 'Merchant application submitted: ' + model.name)
                        .callback(function(err) {
                            if (err) return $.invalid(500, 'Failed to submit application');

                            FUNC.audit($, {
                                entity_type: 'merchants',
                                entity_id: id,
                                action: 'apply'
                            });

                            // Add categories if provided
                            if (model.categories) {
                                var cats = model.categories.split(',');
                                cats.forEach(function(cat) {
                                    var map = {
                                        merchant_id: id,
                                        category_id: cat,
                                        created_at: new Date()
                                    };
                                    DB().insert('merchant_category_map', map).callback(function() {});
                                });
                            }

                            $.callback({ id: id, status: 'pending' });
                        });
                });
        }
    });

    // Update merchant info
    schema.action('update', {
        name: 'Update merchant',
        input: 'name:String,description:String,address:String,latitude:Number,longitude:Number,phone:String,min_order:Number,is_open:Boolean',
        action: function($, model) {
            var userId = $.user.sub;

            DB().one('merchants')
                .fields('id,status')
                .where('owner_id', userId)
                .where('is_removed', false)
                .callback(function(err, merchant) {
                    if (!merchant) return $.invalid(404, 'Merchant not found');

                    if (merchant.status !== 'approved') {
                        return $.invalid(403, 'Merchant must be approved first');
                    }

                    var updates = {};
                    if (model.name) updates.name = model.name;
                    if (model.description !== undefined) updates.description = model.description;
                    if (model.address) updates.address = model.address;
                    if (model.latitude !== undefined) updates.latitude = model.latitude;
                    if (model.longitude !== undefined) updates.longitude = model.longitude;
                    if (model.phone !== undefined) updates.phone = model.phone;
                    if (model.min_order !== undefined) updates.min_order = model.min_order;
                    if (model.is_open !== undefined) updates.is_open = model.is_open;
                    updates.updated_at = new Date();

                    DB().update('merchants', updates)
                        .where('id', merchant.id)
                        .callback(function(err) {
                            if (err) return $.invalid(500, 'Failed to update merchant');
                            FUNC.audit($, {
                                entity_type: 'merchants',
                                entity_id: merchant.id,
                                action: 'update'
                            });
                            $.success();
                        });
                });
        }
    });

    // Update merchant hours
    schema.action('updateHours', {
        name: 'Update merchant hours',
        input: 'hours:JSON',
        action: function($, model) {
            var userId = $.user.sub;

            DB().one('merchants')
                .fields('id')
                .where('owner_id', userId)
                .where('is_removed', false)
                .callback(function(err, merchant) {
                    if (!merchant) return $.invalid(404, 'Merchant not found');

                    if (model.hours && Array.isArray(model.hours)) {
                        var ops = model.hours.map(function(h, index) {
                            return function(done) {
                                if (h.id) {
                                    DB().update('merchant_hours', {
                                        day_of_week: h.day_of_week || 0,
                                        open_time: h.open_time || '08:00',
                                        close_time: h.close_time || '22:00',
                                        is_closed: h.is_closed || false,
                                        updated_at: new Date()
                                    }).where('id', h.id).callback(done);
                                } else {
                                    DB().insert('merchant_hours', {
                                        id: FUNC.generateId(),
                                        merchant_id: merchant.id,
                                        day_of_week: h.day_of_week || 0,
                                        open_time: h.open_time || '08:00',
                                        close_time: h.close_time || '22:00',
                                        is_closed: h.is_closed || false,
                                        created_at: new Date(),
                                        updated_at: new Date()
                                    }).callback(done);
                                }
                            };
                        });

                        ASYNC(ops, function() {
                            $.success();
                        });
                    } else {
                        $.success();
                    }
                });
        }
    });
});