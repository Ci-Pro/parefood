// ==========================================
// PareFood Backend — Support Tickets Schema
// ==========================================

NEWSCHEMA('Support', function(schema) {

    // Create support ticket
    schema.action('createTicket', {
        name: 'Create support ticket',
        input: '*subject:String,*message:String,category:String,related_order_id:UID',
        action: function($, model) {
            var userId = $.user.sub;
            var ticketId = FUNC.generateId();
            var now = new Date();

            var ticket = {
                id: ticketId,
                ticket_number: 'SUP-' + Date.now().toString().slice(-6),
                user_id: userId,
                subject: model.subject,
                category: model.category || 'general',
                status: 'OPEN',
                related_order_id: model.related_order_id || null,
                created_at: now,
                updated_at: now,
                is_removed: false
            };

            DB().transaction(function(done) {
                DB().insert('support_tickets', ticket).callback(function(err) {
                    if (err) return done(err);

                    DB().insert('support_messages', {
                        id: FUNC.generateId(),
                        ticket_id: ticketId,
                        user_id: userId,
                        message: model.message,
                        is_from_support: false,
                        created_at: now
                    }).callback(function(err) {
                        if (err) return done(err);
                        done();
                    });
                });
            }, function(err) {
                if (err) return $.invalid(500, 'Failed to create ticket');

                FUNC.audit($, {
                    entity_type: 'support_tickets',
                    entity_id: ticketId,
                    action: 'create_ticket'
                });

                $.callback({
                    id: ticketId,
                    ticket_number: ticket.ticket_number
                });
            });
        }
    });

    // List my tickets
    schema.action('listTickets', {
        name: 'List support tickets',
        query: 'page:Number,size:Number',
        action: function($, model) {
            var userId = $.user.sub;

            DB().find('support_tickets')
                .where('user_id', userId)
                .where('is_removed', false)
                .sort('created_at', true)
                .callback(function(err, rows) {
                    if (err) return $.invalid(500, 'Failed to fetch tickets');
                    $.callback({ tickets: rows });
                });
        }
    });

    // Read ticket with messages
    schema.action('readTicket', {
        name: 'Read ticket',
        params: '*id:UID',
        action: function($) {
            var userId = $.user.sub;

            DB().one('support_tickets')
                .where('id', $.params.id)
                .where('user_id', userId)
                .where('is_removed', false)
                .callback(function(err, ticket) {
                    if (!ticket) return $.invalid(404, 'Ticket not found');

                    DB().find('support_messages')
                        .where('ticket_id', ticket.id)
                        .sort('created_at', true)
                        .callback(function(err, messages) {
                            ticket.messages = messages || [];
                            $.callback({ ticket: ticket });
                        });
                });
        }
    });

    // Reply to ticket
    schema.action('replyTicket', {
        name: 'Reply to ticket',
        params: '*id:UID',
        input: '*message:String',
        action: function($, model) {
            var userId = $.user.sub;

            DB().one('support_tickets')
                .fields('id,status')
                .where('id', $.params.id)
                .where('user_id', userId)
                .where('is_removed', false)
                .callback(function(err, ticket) {
                    if (!ticket) return $.invalid(404, 'Ticket not found');
                    if (ticket.status === 'CLOSED') return $.invalid(400, 'Ticket is closed');

                    DB().transaction(function(done) {
                        DB().insert('support_messages', {
                            id: FUNC.generateId(),
                            ticket_id: ticket.id,
                            user_id: userId,
                            message: model.message,
                            is_from_support: false,
                            created_at: new Date()
                        }).callback(function(err) {
                            if (err) return done(err);

                            DB().update('support_tickets', {
                                status: 'REOPENED',
                                updated_at: new Date()
                            }).where('id', ticket.id).callback(function(err) {
                                if (err) return done(err);
                                done();
                            });
                        });
                    }, function(err) {
                        if (err) return $.invalid(500, 'Failed to send message');
                        $.success();
                    });
                });
        }
    });
});