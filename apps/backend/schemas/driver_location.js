// ==========================================
// PareFood Backend — Driver Location & Status
// ==========================================

NEWSCHEMA('DriverLocation', function(schema) {

    // Update driver location
    schema.action('update', {
        name: 'Update driver location',
        input: '*latitude:Number,*longitude:Number',
        action: function($, model) {
            var userId = $.user.sub;

            DB().update('drivers', {
                current_latitude: model.latitude,
                current_longitude: model.longitude,
                last_location_at: new Date()
            }).where('profile_id', userId)
                .where('is_removed', false)
                .callback(function(err) {
                    if (err) return $.invalid(500, 'Failed to update location');
                    $.success();
                });
        }
    });
});

NEWSCHEMA('DriverStatus', function(schema) {

    // Update driver status (online/offline)
    schema.action('update', {
        name: 'Update driver status',
        input: '*status:String',
        action: function($, model) {
            var userId = $.user.sub;

            var validStatus = ['online', 'offline'];
            if (validStatus.indexOf(model.status) === -1) {
                return $.invalid(400, 'Invalid status. Must be online or offline');
            }

            DB().one('drivers')
                .fields('id,status')
                .where('profile_id', userId)
                .where('is_removed', false)
                .callback(function(err, driver) {
                    if (!driver) return $.invalid(404, 'Driver profile not found');

                    if (model.status === 'online' && driver.status !== 'approved' && driver.status !== 'offline') {
                        return $.invalid(403, 'Driver must be approved first');
                    }

                    if (model.status === 'online' && driver.status === 'pending') {
                        return $.invalid(403, 'Driver application is still pending');
                    }

                    DB().update('drivers', {
                        status: model.status,
                        updated_at: new Date()
                    }).where('id', driver.id)
                        .callback(function(err) {
                            if (err) return $.invalid(500, 'Failed to update status');

                            FUNC.audit($, {
                                entity_type: 'drivers',
                                entity_id: driver.id,
                                action: 'status_change',
                                metadata: { status: model.status }
                            });
                            $.callback({ status: model.status });
                        });
                });
        }
    });
});