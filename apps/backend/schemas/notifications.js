// ==========================================
// PareFood Backend — Notifications Schema
// ==========================================

NEWSCHEMA('Notifications', function(schema) {

    // List my notifications
    schema.action('list', {
        name: 'List notifications',
        query: 'page:Number,size:Number',
        action: function($, model) {
            var userId = $.user.sub;
            var page = parseInt(model.page) || 1;
            var size = parseInt(model.size) || 20;
            var offset = (page - 1) * size;

            var builder = DB().find('notifications');
            builder.where('recipient_id', userId);
            builder.where('is_removed', false);
            builder.sort('created_at', true);
            builder.take(size);
            builder.skip(offset);
            builder.callback(function(err, rows) {
                if (err) return $.invalid(500, 'Failed to fetch notifications');

                // Count unread
                DB().count('notifications')
                    .where('recipient_id', userId)
                    .where('is_read', false)
                    .where('is_removed', false)
                    .callback(function(err, unread) {
                        $.callback({
                            notifications: rows,
                            unread_count: unread || 0,
                            pagination: { page: page, size: size }
                        });
                    });
            });
        }
    });

    // Mark notification as read
    schema.action('markRead', {
        name: 'Mark notification read',
        params: '*id:UID',
        action: function($) {
            var userId = $.user.sub;

            DB().update('notifications', {
                is_read: true,
                read_at: new Date()
            }).where('id', $.params.id)
                .where('recipient_id', userId)
                .where('is_removed', false)
                .callback(function(err) {
                    if (err) return $.invalid(500, 'Failed to mark notification');
                    $.success();
                });
        }
    });
});