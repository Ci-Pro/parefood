// ==========================================
// PareFood Backend — My Driver Schema
// (driver's own profile/onboarding)
// ==========================================

NEWSCHEMA('MyDriver', function(schema) {

    // Read driver's own profile
    schema.action('read', {
        name: 'Read my driver profile',
        action: function($) {
            var userId = $.user.sub;

            DB().one('drivers')
                .where('profile_id', userId)
                .where('is_removed', false)
                .callback(function(err, driver) {
                    if (err) return $.invalid(500, 'Failed to load driver profile');
                    if (!driver) return $.invalid(404, 'Driver profile not found');
                    $.callback({ driver: driver });
                });
        }
    });

    // Apply to become a driver (onboarding)
    schema.action('apply', {
        name: 'Apply for driver',
        input: '*vehicle_type:String,*vehicle_plate:String,latitude:Number,longitude:Number',
        action: function($, model) {
            var userId = $.user.sub;

            var validVehicles = ['motorcycle', 'car', 'bicycle'];
            if (validVehicles.indexOf(model.vehicle_type) === -1) {
                return $.invalid(400, 'Invalid vehicle type');
            }
            if (!model.vehicle_plate || !model.vehicle_plate.trim()) {
                return $.invalid(400, 'Vehicle plate is required');
            }

            // Check if already applied
            DB().one('drivers')
                .fields('id')
                .where('profile_id', userId)
                .where('is_removed', false)
                .callback(function(err, existing) {
                    if (err) return $.invalid(500, 'Failed to load driver profile');
                    if (existing) return $.invalid(409, 'You already have a driver application');

                    var id = FUNC.generateId();
                    var driver = {
                        id: id,
                        profile_id: userId,
                        status: 'pending',
                        vehicle_type: model.vehicle_type,
                        vehicle_plate: model.vehicle_plate.toUpperCase(),
                        current_latitude: model.latitude || null,
                        current_longitude: model.longitude || null,
                        total_deliveries: 0,
                        rating: 0,
                        rating_count: 0,
                        created_at: new Date(),
                        updated_at: new Date(),
                        is_removed: false
                    };

                    DB().insert('drivers', driver)
                        .callback(function(err) {
                            if (err) return $.invalid(500, 'Failed to submit application');

                            FUNC.audit($, {
                                entity_type: 'drivers',
                                entity_id: id,
                                action: 'apply'
                            });

                            $.callback({ id: id, status: 'pending' });
                        });
                });
        }
    });

    // Update driver profile (vehicle info)
    schema.action('update', {
        name: 'Update driver profile',
        input: 'vehicle_type:String,vehicle_plate:String',
        action: function($, model) {
            var userId = $.user.sub;

            DB().one('drivers')
                .fields('id,status')
                .where('profile_id', userId)
                .where('is_removed', false)
                .callback(function(err, driver) {
                    if (err) return $.invalid(500, 'Failed to load driver profile');
                    if (!driver) return $.invalid(404, 'Driver profile not found');

                    if (model.vehicle_type && ['motorcycle', 'car', 'bicycle'].indexOf(model.vehicle_type) === -1) {
                        return $.invalid(400, 'Invalid vehicle type');
                    }

                    var updates = { updated_at: new Date() };
                    if (model.vehicle_type) updates.vehicle_type = model.vehicle_type;
                    if (model.vehicle_plate) updates.vehicle_plate = model.vehicle_plate.toUpperCase();

                    DB().update('drivers', updates)
                        .where('id', driver.id)
                        .callback(function(err) {
                            if (err) return $.invalid(500, 'Failed to update driver profile');
                            FUNC.audit($, {
                                entity_type: 'drivers',
                                entity_id: driver.id,
                                action: 'update'
                            });
                            $.success();
                        });
                });
        }
    });

});