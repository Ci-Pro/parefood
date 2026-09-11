// ==========================================
// PareFood Backend — Addresses Schema
// ==========================================

NEWSCHEMA('Addresses', function(schema) {

    // List customer addresses
    schema.action('list', {
        name: 'List addresses',
        action: function($) {
            var userId = $.user.sub;

            DB().find('customer_addresses')
                .where('profile_id', userId)
                .where('is_removed', false)
                .sort('is_default', true)
                .callback(function(err, rows) {
                    if (err) return $.invalid(500, 'Failed to fetch addresses');
                    $.callback({ addresses: rows });
                });
        }
    });

    // Read a specific address
    schema.action('read', {
        name: 'Read address',
        params: '*id:UID',
        action: function($) {
            var userId = $.user.sub;

            DB().one('customer_addresses')
                .where('id', $.params.id)
                .where('profile_id', userId)
                .where('is_removed', false)
                .callback(function(err, address) {
                    if (!address) return $.invalid(404, 'Address not found');
                    $.callback({ address: address });
                });
        }
    });

    // Create new address
    schema.action('create', {
        name: 'Create address',
        input: '*label:String,*address:String,latitude:Number,longitude:Number,is_default:Boolean,note:String',
        action: function($, model) {
            var userId = $.user.sub;
            var id = FUNC.generateId();
            var now = new Date();

            // If this is the first address or is_default is set, unset other defaults
            if (model.is_default) {
                DB().update('customer_addresses', { is_default: false })
                    .where('profile_id', userId)
                    .where('is_removed', false)
                    .callback(function() {});
            }

            var address = {
                id: id,
                profile_id: userId,
                label: model.label,
                address: model.address,
                latitude: model.latitude || null,
                longitude: model.longitude || null,
                is_default: model.is_default || false,
                note: model.note || null,
                created_at: now,
                updated_at: now,
                is_removed: false
            };

            // Check if this is the first address
            DB().count('customer_addresses')
                .where('profile_id', userId)
                .where('is_removed', false)
                .callback(function(err, count) {
                    if (!err && count === 0) {
                        address.is_default = true;
                    }

                    DB().insert('customer_addresses', address)
                        .callback(function(err) {
                            if (err) return $.invalid(500, 'Failed to create address');
                            FUNC.audit($, {
                                entity_type: 'customer_addresses',
                                entity_id: id,
                                action: 'create'
                            });
                            $.callback({ id: id, address: address });
                        });
                });
        }
    });

    // Update address
    schema.action('update', {
        name: 'Update address',
        params: '*id:UID',
        input: 'label:String,address:String,latitude:Number,longitude:Number,is_default:Boolean,note:String',
        action: function($, model) {
            var userId = $.user.sub;

            if (!model.label && !model.address && !model.note && model.is_default === undefined) {
                return $.invalid(400, 'Nothing to update');
            }

            model.updated_at = new Date();

            // If setting as default, unset other defaults
            if (model.is_default) {
                DB().update('customer_addresses', { is_default: false })
                    .where('profile_id', userId)
                    .where('is_removed', false)
                    .callback(function() {});
            }

            DB().update('customer_addresses', model)
                .where('id', $.params.id)
                .where('profile_id', userId)
                .where('is_removed', false)
                .callback(function(err) {
                    if (err) return $.invalid(500, 'Failed to update address');
                    FUNC.audit($, {
                        entity_type: 'customer_addresses',
                        entity_id: $.params.id,
                        action: 'update'
                    });
                    $.success();
                });
        }
    });

    // Remove address (soft delete)
    schema.action('remove', {
        name: 'Remove address',
        params: '*id:UID',
        action: function($) {
            var userId = $.user.sub;

            DB().update('customer_addresses', { is_removed: true, updated_at: new Date() })
                .where('id', $.params.id)
                .where('profile_id', userId)
                .where('is_removed', false)
                .callback(function(err) {
                    if (err) return $.invalid(500, 'Failed to remove address');
                    FUNC.audit($, {
                        entity_type: 'customer_addresses',
                        entity_id: $.params.id,
                        action: 'remove'
                    });
                    $.success();
                });
        }
    });
});