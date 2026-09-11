// ==========================================
// PareFood Backend — Merchants Schema
// ==========================================

NEWSCHEMA('Merchants', function(schema) {

    // Public: list approved merchants
    schema.action('list', {
        name: 'List merchants',
        query: 'category:String,search:String,page:Number,size:Number',
        action: function($, model) {
            var page = parseInt(model.page) || 1;
            var size = parseInt(model.size) || 20;
            var offset = (page - 1) * size;

            var builder = DB().find('merchants');
            builder.where('status', 'approved');
            builder.where('is_removed', false);

            if (model.search) {
                builder.where('name', model.search, 'LIKE');
            }

            builder.sort('rating', true);
            builder.take(size);
            builder.skip(offset);

            builder.callback(function(err, rows) {
                if (err) return $.invalid(500, 'Failed to fetch merchants');
                $.callback({
                    merchants: rows,
                    pagination: { page: page, size: size }
                });
            });
        }
    });

    // Public: read merchant by slug
    schema.action('read', {
        name: 'Read merchant',
        params: '*slug:String',
        action: function($) {
            DB().one('merchants')
                .where('slug', $.params.slug)
                .where('status', 'approved')
                .where('is_removed', false)
                .callback(function(err, merchant) {
                    if (!merchant) return $.invalid(404, 'Merchant not found');

                    // Get merchant hours
                    DB().find('merchant_hours')
                        .where('merchant_id', merchant.id)
                        .callback(function(err, hours) {
                            merchant.hours = hours || [];
                            $.callback({ merchant: merchant });
                        });
                });
        }
    });

    // Public: get merchant menu
    schema.action('menu', {
        name: 'Get merchant menu',
        params: '*id:UID',
        action: function($) {
            // Get categories
            DB().find('menu_categories')
                .where('merchant_id', $.params.id)
                .where('is_active', true)
                .where('is_removed', false)
                .sort('sort_order', true)
                .callback(function(err, categories) {
                    if (err) categories = [];

                    // Get menu items for merchant
                    DB().find('menu_items')
                        .where('merchant_id', $.params.id)
                        .where('is_removed', false)
                        .sort('sort_order', true)
                        .callback(function(err, items) {
                            if (err) items = [];

                            // Get variants for all items
                            var itemIds = items.map(function(i) { return i.id; });

                            DB().find('menu_variants')
                                .where('menu_item_id', itemIds)
                                .callback(function(err, variants) {
                                    if (err) variants = [];

                                    // Attach variants to items
                                    items.forEach(function(item) {
                                        item.variants = variants.filter(function(v) { return v.menu_item_id === item.id; });
                                    });

                                    $.callback({
                                        categories: categories,
                                        items: items
                                    });
                                });
                        });
                });
        }
    });
});