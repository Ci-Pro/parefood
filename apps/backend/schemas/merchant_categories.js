// ==========================================
// PareFood Backend — Merchant Categories Schema
// ==========================================

NEWSCHEMA('MerchantCategories', function(schema) {

    // List merchant categories (public)
    schema.action('list', {
        name: 'List merchant categories',
        action: function($) {
            DB().find('merchant_categories')
                .where('is_active', true)
                .where('is_removed', false)
                .sort('sort_order', true)
                .callback(function(err, rows) {
                    if (err) return $.invalid(500, 'Failed to fetch categories');
                    $.callback({ categories: rows });
                });
        }
    });
});