// ==========================================
// PareFood Backend — My Menu Categories Schema
// ==========================================

NEWSCHEMA('MyMenuCategories', function(schema) {

    // Helper to get merchant ID
    function getMerchantId(userId, callback) {
        DB().one('merchants')
            .fields('id,status')
            .where('owner_id', userId)
            .where('is_removed', false)
            .callback(callback);
    }

    // List my menu categories
    schema.action('list', {
        name: 'List my menu categories',
        action: function($) {
            getMerchantId($.user.sub, function(err, merchant) {
                if (!merchant) return $.invalid(404, 'Merchant not found');

                DB().find('menu_categories')
                    .where('merchant_id', merchant.id)
                    .where('is_removed', false)
                    .sort('sort_order', true)
                    .callback(function(err, rows) {
                        if (err) return $.invalid(500, 'Failed to fetch categories');
                        $.callback({ categories: rows });
                    });
            });
        }
    });

    // Create menu category
    schema.action('create', {
        name: 'Create menu category',
        input: '*name:String,description:String,sort_order:Number',
        action: function($, model) {
            getMerchantId($.user.sub, function(err, merchant) {
                if (!merchant) return $.invalid(404, 'Merchant not found');

                if (merchant.status !== 'approved') {
                    return $.invalid(403, 'Merchant must be approved first');
                }

                var slug = model.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'category';

                var category = {
                    id: FUNC.generateId(),
                    merchant_id: merchant.id,
                    name: model.name,
                    slug: slug,
                    description: model.description || null,
                    sort_order: model.sort_order || 0,
                    is_active: true,
                    created_at: new Date(),
                    updated_at: new Date(),
                    is_removed: false
                };

                DB().insert('menu_categories', category)
                    .audit($, 'Created menu category: ' + model.name)
                    .callback(function(err) {
                        if (err) return $.invalid(500, 'Failed to create category');
                        $.callback({ id: category.id, category: category });
                    });
            });
        }
    });

    // Update menu category
    schema.action('update', {
        name: 'Update menu category',
        params: '*id:UID',
        input: 'name:String,description:String,sort_order:Number,is_active:Boolean',
        action: function($, model) {
            getMerchantId($.user.sub, function(err, merchant) {
                if (!merchant) return $.invalid(404, 'Merchant not found');

                var updates = {};
                if (model.name) updates.name = model.name;
                if (model.description !== undefined) updates.description = model.description;
                if (model.sort_order !== undefined) updates.sort_order = model.sort_order;
                if (model.is_active !== undefined) updates.is_active = model.is_active;
                updates.updated_at = new Date();

                DB().update('menu_categories', updates)
                    .where('id', $.params.id)
                    .where('merchant_id', merchant.id)
                    .where('is_removed', false)
                    .callback(function(err) {
                        if (err) return $.invalid(500, 'Failed to update category');
                        $.success();
                    });
            });
        }
    });

    // Remove menu category (soft delete)
    schema.action('remove', {
        name: 'Remove menu category',
        params: '*id:UID',
        action: function($) {
            getMerchantId($.user.sub, function(err, merchant) {
                if (!merchant) return $.invalid(404, 'Merchant not found');

                DB().update('menu_categories', { is_removed: true, updated_at: new Date() })
                    .where('id', $.params.id)
                    .where('merchant_id', merchant.id)
                    .where('is_removed', false)
                    .callback(function(err) {
                        if (err) return $.invalid(500, 'Failed to remove category');
                        $.success();
                    });
            });
        }
    });
});