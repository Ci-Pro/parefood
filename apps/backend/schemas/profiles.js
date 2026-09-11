// ==========================================
// PareFood Backend — Profiles Schema
// ==========================================

NEWSCHEMA('Profiles', function(schema) {

    // Read current user's profile
    schema.action('read', {
        name: 'Read profile',
        action: function($) {
            var userId = $.user.sub;

            DB().one('profiles')
                .fields('id,name,email,phone,role,is_active,is_verified,avatar_url,created_at,updated_at')
                .where('id', userId)
                .where('is_removed', false)
                .callback(function(err, profile) {
                    if (!profile) {
                        return $.invalid(404, 'Profile not found');
                    }
                    $.callback({ profile: profile });
                });
        }
    });

    // Update current user's profile
    schema.action('update', {
        name: 'Update profile',
        input: 'name:String,phone:String,avatar_url:String',
        action: function($, model) {
            var userId = $.user.sub;

            if (!model.name && !model.phone && !model.avatar_url) {
                return $.invalid(400, 'Nothing to update');
            }

            model.updated_at = new Date();

            DB().update('profiles', model)
                .where('id', userId)
                .where('is_removed', false)
                .audit($, 'Updated profile: ' + userId)
                .callback(function(err, response) {
                    if (err) {
                        return $.invalid(500, 'Failed to update profile');
                    }

                    FUNC.audit($, {
                        entity_type: 'profiles',
                        entity_id: userId,
                        action: 'update_profile'
                    });

                    $.success();
                });
        }
    });
});