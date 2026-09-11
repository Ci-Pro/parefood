// ==========================================
// PareFood Backend — Payment Service
// Provider abstraction. MVP ships the 'manual'
// provider (cash + offline bank transfer with
// customer confirmation & proof). Future online
// providers (Midtrans, Xendit, QRIS, VA,
// e-wallet) implement the same interface and
// are selected via CONF.payment_provider.
// ==========================================

FUNC.payments = {};

FUNC.payments.SUPPORTED_METHODS = ['cash', 'bank_transfer', 'qris', 'virtual_account', 'ewallet'];

FUNC.payments.providers = {};

FUNC.payments.isSupportedMethod = function(method) {
    return FUNC.payments.SUPPORTED_METHODS.indexOf(method) !== -1;
};

FUNC.payments.registerProvider = function(name, provider) {
    FUNC.payments.providers[name] = provider;
};

FUNC.payments.activeProvider = function() {
    var name = CONF.payment_provider || 'manual';
    return FUNC.payments.providers[name] || FUNC.payments.providers.manual;
};

// Insert (or reuse) the pending transaction for an order.
// Idempotent per order (order_id is unique in payment_transactions).
FUNC.payments.ensureTransaction = function(order, cb) {
    DB().find('payment_transactions')
        .fields('id,order_id,customer_id,method,amount,status,provider,provider_reference,paid_at,created_at,updated_at')
        .where('order_id', order.id)
        .where('is_removed', false)
        .callback(function(err, rows) {
            if (err) return cb(err);
            if (rows && rows.length > 0) return cb(null, rows[0]);

            var now = new Date();
            var transaction = {
                id: FUNC.generateId(),
                order_id: order.id,
                customer_id: order.customer_id,
                method: order.payment_method || 'cash',
                amount: order.grand_total || 0,
                status: 'PENDING',
                provider: CONF.payment_provider || 'manual',
                provider_reference: 'PAY-' + (order.order_number || order.id),
                idempotency_key: order.id,
                created_at: now,
                updated_at: now,
                is_removed: false
            };

            DB().insert('payment_transactions', transaction).callback(function(err) {
                if (err) return cb(err);
                FUNC.payments.addEvent(transaction.id, 'created', { method: transaction.method, amount: transaction.amount }, function() {
                    cb(null, transaction);
                });
            });
        });
};

// Append an immutable payment event.
FUNC.payments.addEvent = function(transactionId, eventType, payload, cb) {
    var event = {
        id: FUNC.generateId(),
        transaction_id: transactionId,
        event_type: eventType,
        payload: payload ? JSON.stringify(payload) : null,
        created_at: new Date()
    };
    DB().insert('payment_events', event).callback(function(err) {
        if (err) console.log('[PAYMENTS] Failed to write event:', err.message);
        if (cb) cb(err || null);
    });
};

// Confirm payment for an order and advance it PENDING_PAYMENT -> PAID.
// Idempotent: safe to call more than once for the same order.
FUNC.payments.confirmPayment = function($, order, method, actor, actorRole, reason, cb) {
    FUNC.payments.ensureTransaction(order, function(err, tx) {
        if (err) return cb(err);
        if (tx.status === 'PAID') return cb(null, tx);
        if (tx.status !== 'PENDING') return cb(new Error('Cannot confirm payment in state ' + tx.status));

        var now = new Date();
        FUNC.sequence(function(done) {
            DB().update('payment_transactions', {
                status: 'PAID',
                paid_at: now,
                updated_at: now
            }).where('id', tx.id).callback(function(err) {
                if (err) return done(err);
                FUNC.payments.addEvent(tx.id, 'confirmed', { method: method, actor: actorRole, note: reason || null }, function() {
                    DB().one('orders')
                        .fields('id,status,payment_status')
                        .where('id', order.id)
                        .where('is_removed', false)
                        .callback(function(err2, fresh) {
                            if (err2) return done(err2);
                            if (!fresh) return done(new Error('Order not found'));

                            if (fresh.status !== 'PENDING_PAYMENT') {
                                if (fresh.payment_status === 'PAID') return done();
                                DB().update('orders', { payment_status: 'PAID', updated_at: now })
                                    .where('id', fresh.id).callback(function(err3) { done(err3); });
                                return;
                            }

                            DB().update('orders', {
                                status: 'PAID',
                                payment_status: 'PAID',
                                updated_at: now
                            }).where('id', fresh.id).callback(function(err3) {
                                if (err3) return done(err3);
                                DB().insert('order_status_history', {
                                    id: FUNC.generateId(),
                                    order_id: fresh.id,
                                    from_status: 'PENDING_PAYMENT',
                                    to_status: 'PAID',
                                    actor_id: actor,
                                    actor_role: actorRole,
                                    reason: reason || null,
                                    created_at: now
                                }).callback(function(err4) {
                                    if (err4) return done(err4);
                                    FUNC.audit($, { entity_type: 'orders', entity_id: order.id, action: 'payment_confirm' });
                                    done();
                                });
                            });
                        });
                });
            });
        }, function(err) {
            cb(err, tx);
        });
    });
};

// Attach a payment proof (customer upload). Proof identity is kept in DB,
// not derived from client state.
FUNC.payments.attachProof = function(transactionId, orderId, profileId, imageUrl, note, cb) {
    DB().insert('payment_proofs', {
        id: FUNC.generateId(),
        transaction_id: transactionId,
        order_id: orderId,
        profile_id: profileId,
        image_url: imageUrl,
        note: note || null,
        created_at: new Date()
    }).callback(function(err) {
        if (err) console.log('[PAYMENTS] Failed to attach proof:', err.message);
        if (cb) cb(err || null);
    });
};

// --------------------------------------------------
// Manual provider (cash + offline methods)
// --------------------------------------------------
FUNC.payments.registerProvider('manual', {
    name: 'manual',
    create: function($, order, cb) {
        FUNC.payments.ensureTransaction(order, cb);
    },
    confirm: function($, order, method, actor, actorRole, reason, cb) {
        FUNC.payments.confirmPayment($, order, method, actor, actorRole, reason, cb);
    },
    fail: function($, order, reason, cb) {
        var done = cb || function() {};
        DB().update('payment_transactions', {
            status: 'FAILED',
            updated_at: new Date()
        }).where('order_id', order.id).callback(function(err) { done(err); });
    }
});