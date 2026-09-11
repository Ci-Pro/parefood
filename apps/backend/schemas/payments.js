// ==========================================
// PareFood Backend — Payments Schema
// ==========================================

NEWSCHEMA('Payments', function(schema) {

    // Confirm payment for an order (customer).
    // Cash is confirmed automatically at checkout. For offline
    // digital methods (bank transfer/QRIS/VA/e-wallet) the customer
    // confirms after paying, optionally attaching proof.
    schema.action('confirm', {
        name: 'Confirm payment',
        params: '*orderId:UID',
        input: '*method:String,proof_url:String,note:String',
        action: function($, model) {
            var userId = $.user.sub;

            DB().one('orders')
                .fields('id,order_number,customer_id,status,payment_status,payment_method,grand_total')
                .where('id', $.params.orderId)
                .where('is_removed', false)
                .callback(function(err, order) {
                    if (err) return $.invalid(500, 'Failed to load order');
                    if (!order) return $.invalid(404, 'Order not found');
                    if (order.customer_id !== userId) return $.invalid(403, 'Forbidden');

                    if (!FUNC.payments.isSupportedMethod(model.method)) {
                        return $.invalid(400, 'Unsupported payment method');
                    }
                    if (model.method !== order.payment_method) {
                        return $.invalid(400, 'Payment method does not match the order');
                    }
                    if (model.method === 'cash') {
                        return $.invalid(400, 'Cash payment is confirmed at checkout');
                    }
                    if (order.payment_status === 'PAID') {
                        return $.callback({ already_confirmed: true, status: order.status, payment_status: 'PAID', order_id: order.id });
                    }
                    if (order.status !== 'PENDING_PAYMENT') {
                        return $.invalid(400, 'Payment can only be confirmed while the order is unpaid');
                    }

                    var provider = FUNC.payments.activeProvider();
                    provider.confirm($, order, model.method, userId, $.user.role, model.note || 'Dikonfirmasi customer', function(err, tx) {
                        if (err) return $.invalid(500, 'Failed to confirm payment: ' + err.message);

                        if (model.proof_url && tx && tx.id) {
                            FUNC.payments.attachProof(tx.id, order.id, userId, model.proof_url, model.note || null, function() {});
                        }

                        $.callback({ status: 'PAID', payment_status: 'PAID', order_id: order.id, transaction_id: tx ? tx.id : null });
                    });
                });
        }
    });

});