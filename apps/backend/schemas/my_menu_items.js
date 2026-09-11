// ==========================================
// PareFood Backend — My Menu Items Schema
// ==========================================

NEWSCHEMA('MyMenuItems', function(schema) {

    // Helper to get merchant ID
    function getMerchantId(userId, callback) {
        DB().one('merchants')
            .fields('id,status')
            .where('owner_id', userId)
            .where('is_removed', false)
            .callback(callback);
    }

    // List my menu items
    schema.action('list', {
        name: 'List my menu items',
        query: 'category_id:String,page:Number,size:Number',
        action: function($, model) {
            getMerchantId($.user.sub, function(err, merchant) {
                if (!merchant) return $.invalid(404, 'Merchant not found');

                var builder = DB().find('menu_items');
                builder.where('merchant_id', merchant.id);
                builder.where('is_removed', false);

                if (model.category_id) {
                    builder.where('category_id', model.category_id);
                }

                builder.sort('sort_order', true);
                builder.callback(function(err, rows) {
                    if (err) return $.invalid(500, 'Failed to fetch menu items');

                    // Get variants and addons for all items
                    var itemIds = rows.map(function(i) { return i.id; });

                    DB().find('menu_variants')
                        .where('menu_item_id', itemIds)
                        .callback(function(err, variants) {
                            rows.forEach(function(item) {
                                item.variants = (variants || []).filter(function(v) { return v.menu_item_id === item.id; });
                            });
                            $.callback({ items: rows });
                        });
                });
            });
        }
    });

    // Read single menu item
    schema.action('read', {
        name: 'Read menu item',
        params: '*id:UID',
        action: function($) {
            getMerchantId($.user.sub, function(err, merchant) {
                if (!merchant) return $.invalid(404, 'Merchant not found');

                DB().one('menu_items')
                    .where('id', $.params.id)
                    .where('merchant_id', merchant.id)
                    .where('is_removed', false)
                    .callback(function(err, item) {
                        if (!item) return $.invalid(404, 'Menu item not found');

                        // Get variants
                        DB().find('menu_variants')
                            .where('menu_item_id', item.id)
                            .callback(function(err, variants) {
                                item.variants = variants || [];

                                // Get addons
                                DB().find('menu_item_addons')
                                    .where('menu_item_id', item.id)
                                    .callback(function(err, maps) {
                                        if (!maps || maps.length === 0) {
                                            item.addons = [];
                                            return $.callback({ item: item });
                                        }

                                        var addonIds = maps.map(function(m) { return m.addon_id; });

                                        DB().find('menu_addons')
                                            .where('id', addonIds)
                                            .where('is_active', true)
                                            .callback(function(err, addons) {
                                                item.addons = addons || [];

                                                // Get addon options
                                                var addonIdList = item.addons.map(function(a) { return a.id; });
                                                if (addonIdList.length > 0) {
                                                    DB().find('menu_addon_options')
                                                        .where('addon_id', addonIdList)
                                                        .callback(function(err, options) {
                                                            item.addons.forEach(function(addon) {
                                                                addon.options = (options || []).filter(function(o) { return o.addon_id === addon.id; });
                                                            });
                                                            $.callback({ item: item });
                                                        });
                                                } else {
                                                    $.callback({ item: item });
                                                }
                                            });
                                    });
                            });
                    });
            });
        }
    });

    // Create menu item
    schema.action('create', {
        name: 'Create menu item',
        input: '*category_id:UID,*name:String,description:String,*price:Number,old_price:Number,image_url:String,preparation_time_minutes:Number,variants:JSON,addons:JSON',
        action: function($, model) {
            getMerchantId($.user.sub, function(err, merchant) {
                if (!merchant) return $.invalid(404, 'Merchant not found');

                if (merchant.status !== 'approved') {
                    return $.invalid(403, 'Merchant must be approved first');
                }

                // Verify category belongs to merchant
                DB().one('menu_categories')
                    .fields('id')
                    .where('id', model.category_id)
                    .where('merchant_id', merchant.id)
                    .where('is_removed', false)
                    .callback(function(err, category) {
                        if (!category) return $.invalid(400, 'Invalid category');

                        var id = FUNC.generateId();
                        var now = new Date();

                        var item = {
                            id: id,
                            merchant_id: merchant.id,
                            category_id: model.category_id,
                            name: model.name,
                            description: model.description || null,
                            price: model.price,
                            old_price: model.old_price || null,
                            image_url: model.image_url || null,
                            is_available: true,
                            is_featured: false,
                            preparation_time_minutes: model.preparation_time_minutes || null,
                            sort_order: 0,
                            created_at: now,
                            updated_at: now,
                            is_removed: false
                        };

                        DB().insert('menu_items', item)
                            .callback(function(err) {
                                if (err) return $.invalid(500, 'Failed to create menu item');

                                FUNC.audit($, {
                                    entity_type: 'menu_items',
                                    entity_id: id,
                                    action: 'create_menu_item',
                                    metadata: { name: model.name }
                                });

                                // Create variants
                                if (model.variants && Array.isArray(model.variants)) {
                                    model.variants.forEach(function(v) {
                                        DB().insert('menu_variants', {
                                            id: FUNC.generateId(),
                                            menu_item_id: id,
                                            name: v.name,
                                            price: v.price || 0,
                                            is_default: v.is_default || false,
                                            is_available: true,
                                            created_at: now,
                                            updated_at: now
                                        }).callback(function() {});
                                    });
                                }

                                $.callback({ id: id, item: item });
                            });
                    });
            });
        }
    });

    // Update menu item
    schema.action('update', {
        name: 'Update menu item',
        params: '*id:UID',
        input: 'category_id:UID,name:String,description:String,price:Number,old_price:Number,image_url:String,is_available:Boolean,is_featured:Boolean,preparation_time_minutes:Number',
        action: function($, model) {
            getMerchantId($.user.sub, function(err, merchant) {
                if (!merchant) return $.invalid(404, 'Merchant not found');

                var updates = {};
                if (model.category_id) updates.category_id = model.category_id;
                if (model.name) updates.name = model.name;
                if (model.description !== undefined) updates.description = model.description;
                if (model.price !== undefined) updates.price = model.price;
                if (model.old_price !== undefined) updates.old_price = model.old_price;
                if (model.image_url !== undefined) updates.image_url = model.image_url;
                if (model.is_available !== undefined) updates.is_available = model.is_available;
                if (model.is_featured !== undefined) updates.is_featured = model.is_featured;
                if (model.preparation_time_minutes !== undefined) updates.preparation_time_minutes = model.preparation_time_minutes;
                updates.updated_at = new Date();

                DB().update('menu_items', updates)
                    .where('id', $.params.id)
                    .where('merchant_id', merchant.id)
                    .where('is_removed', false)
                    .callback(function(err) {
                        if (err) return $.invalid(500, 'Failed to update menu item');
                        $.success();
                    });
            });
        }
    });

    // Remove menu item (soft delete)
    schema.action('remove', {
        name: 'Remove menu item',
        params: '*id:UID',
        action: function($) {
            getMerchantId($.user.sub, function(err, merchant) {
                if (!merchant) return $.invalid(404, 'Merchant not found');

                DB().update('menu_items', { is_removed: true, updated_at: new Date() })
                    .where('id', $.params.id)
                    .where('merchant_id', merchant.id)
                    .where('is_removed', false)
                    .callback(function(err) {
                        if (err) return $.invalid(500, 'Failed to remove menu item');
                        $.success();
                    });
            });
        }
    });

    // Toggle availability
    schema.action('toggleAvailability', {
        name: 'Toggle availability',
        params: '*id:UID',
        input: '*is_available:Boolean',
        action: function($, model) {
            getMerchantId($.user.sub, function(err, merchant) {
                if (!merchant) return $.invalid(404, 'Merchant not found');

                DB().update('menu_items', {
                    is_available: model.is_available,
                    updated_at: new Date()
                }).where('id', $.params.id)
                    .where('merchant_id', merchant.id)
                    .where('is_removed', false)
                    .callback(function(err) {
                        if (err) return $.invalid(500, 'Failed to update availability');
                        $.success();
                    });
            });
        }
    });
});