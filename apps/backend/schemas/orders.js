// ==========================================
// PareFood Backend — Orders Schema
// ==========================================

NEWSCHEMA('Orders', function(schema) {

    // Helper to load order with all details
    function loadOrder(orderId, callback) {
        DB().one('orders')
            .where('id', orderId)
            .where('is_removed', false)
            .callback(function(err, order) {
                if (!order) return callback(null);

                // Get merchant name
                DB().one('merchants')
                    .fields('id,name,slug,logo_url')
                    .where('id', order.merchant_id)
                    .callback(function(err, merchant) {
                        order.merchant_name = merchant ? merchant.name : null;

                        // Get items
                        DB().find('order_items')
                            .where('order_id', order.id)
                            .callback(function(err, items) {
                                if (!items) items = [];
                                var itemIds = items.map(function(i) { return i.id; });

                                // Get item options
                                DB().find('order_item_options')
                                    .where('order_item_id', itemIds)
                                    .callback(function(err, options) {
                                        if (!options) options = [];
                                        items.forEach(function(item) {
                                            item.options = options.filter(function(o) { return o.order_item_id === item.id; });
                                        });
                                        order.items = items;

                                        // Get status history
                                        DB().find('order_status_history')
                                            .where('order_id', order.id)
                                            .sort('created_at', true)
                                            .callback(function(err, history) {
                                                order.status_history = history || [];

                                                // Get payment transaction
                                                DB().find('payment_transactions')
                                                    .fields('id,method,amount,status,provider,provider_reference,paid_at,created_at')
                                                    .where('order_id', order.id)
                                                    .where('is_removed', false)
                                                    .callback(function(err, payments) {
                                                        order.payment = (payments && payments.length > 0) ? payments[0] : null;
                                                        callback(order);
                                                    });
                                            });
                                    });
                            });
                    });
            });
    }

    // Checkout from cart
    schema.action('checkout', {
        name: 'Checkout order',
        input: '*address_id:UID,payment_method:String,customer_notes:String,promotion_code:String',
        action: function($, model) {
            var userId = $.user.sub;

            // Validate payment method
            var validPayments = ['cash', 'bank_transfer', 'qris', 'virtual_account', 'ewallet'];
            if (model.payment_method && validPayments.indexOf(model.payment_method) === -1) {
                return $.invalid(400, 'Invalid payment method');
            }

            // Get cart
            DB().one('carts')
                .where('profile_id', userId)
                .where('is_removed', false)
                .callback(function(err, cart) {
                    if (!cart) return $.invalid(400, 'Cart is empty');

                    // Get cart items
                    DB().find('cart_items')
                        .where('cart_id', cart.id)
                        .where('is_removed', false)
                        .callback(function(err, cartItems) {
                            if (!cartItems || cartItems.length === 0) {
                                return $.invalid(400, 'Cart is empty');
                            }

                            // Verify address ownership
                            DB().one('customer_addresses')
                                .fields('id,address,latitude,longitude,label')
                                .where('id', model.address_id)
                                .where('profile_id', userId)
                                .where('is_removed', false)
                                .callback(function(err, address) {
                                    if (!address) return $.invalid(400, 'Invalid delivery address');
                                    if (!address.latitude || !address.longitude) {
                                        return $.invalid(400, 'Address must have coordinates');
                                    }

                                    // Verify merchant
                                    DB().one('merchants')
                                        .fields('id,name,slug,is_open,status,min_order,latitude,longitude')
                                        .where('id', cart.merchant_id)
                                        .where('is_removed', false)
                                        .callback(function(err, merchant) {
                                            if (!merchant) return $.invalid(404, 'Merchant not found');
                                            if (merchant.status !== 'approved') return $.invalid(400, 'Merchant is not active');
                                            if (!merchant.is_open) return $.invalid(400, 'Merchant is currently closed');

                                            // Get menu items for full details
                                            var menuItemIds = cartItems.map(function(i) { return i.menu_item_id; });

                                            DB().find('menu_items')
                                                .fields('id,merchant_id,name,price,is_available,description,preparation_time_minutes')
                                                .where('id', menuItemIds)
                                                .callback(function(err, menuItems) {
                                                    if (!menuItems) menuItems = [];
                                                    var menuMap = {};
                                                    menuItems.forEach(function(m) { menuMap[m.id] = m; });

                                                    // Validate all items available
                                                    for (var i = 0; i < cartItems.length; i++) {
                                                        var mi = menuMap[cartItems[i].menu_item_id];
                                                        if (!mi || !mi.is_available) {
                                                            return $.invalid(400, 'Menu item is no longer available');
                                                        }
                                                    }

                                                    // Get item addons
                                                    var cartItemIds = cartItems.map(function(c) { return c.id; });
                                                    DB().find('cart_item_addons')
                                                        .where('cart_item_id', cartItemIds)
                                                        .callback(function(err, cartAddons) {
                                                            if (!cartAddons) cartAddons = [];

                                                            // Calculate pricing
                                                            var subtotal = 0;
                                                            cartItems.forEach(function(ci) {
                                                                subtotal += parseFloat(ci.unit_price) * ci.quantity;
                                                            });

                                                            // Add addon prices
                                                            cartAddons.forEach(function(a) {
                                                                subtotal += parseFloat(a.option_price);
                                                            });

                                                            subtotal = Math.round(subtotal * 100) / 100;

                                                            // Check min order
                                                            if (subtotal < merchant.min_order) {
                                                                return $.invalid(400, 'Minimum order is ' + FUNC.formatIDR(merchant.min_order));
                                                            }

                                                            // Calculate delivery fee
                                                            var distance = 0;
                                                            if (merchant.latitude && merchant.longitude) {
                                                                distance = FUNC.calculateDistance(
                                                                    parseFloat(merchant.latitude),
                                                                    parseFloat(merchant.longitude),
                                                                    parseFloat(address.latitude),
                                                                    parseFloat(address.longitude)
                                                                );
                                                            }

                                                            // Get delivery config
                                                            var baseFee = 5000;
                                                            var feePerKm = 2000;
                                                            var deliveryFee = Math.round((baseFee + distance * feePerKm) * 100) / 100;

                                                            // Service fee (5% of subtotal, min 1000, max 10000)
                                                            var serviceFee = Math.round(subtotal * 0.05);
                                                            serviceFee = Math.max(serviceFee, 1000);
                                                            serviceFee = Math.min(serviceFee, 10000);
                                                            serviceFee = Math.round(serviceFee * 100) / 100;

                                                            // Discount (from promotion, if any)
                                                            var discount = 0;
                                                            var promotionId = null;

                                                            if (model.promotion_code) {
                                                                // Validate promotion
                                                                DB().one('promotions')
                                                                    .where('code', model.promotion_code.toUpperCase())
                                                                    .where('is_active', true)
                                                                    .where('is_removed', false)
                                                                    .callback(function(err, promo) {
                                                                        if (promo) {
                                                                            // Check validity period
                                                                            var now = new Date();
                                                                            var valid = true;
                                                                            if (promo.valid_from && new Date(promo.valid_from) > now) valid = false;
                                                                            if (promo.valid_until && new Date(promo.valid_until) < now) valid = false;
                                                                            if (promo.min_order > subtotal) valid = false;

                                                                            if (!valid) { finalizeCheckout(); return; }

                                                                            // Check usage limits
                                                                            DB().count('promotion_redemptions')
                                                                                .where('promotion_id', promo.id)
                                                                                .callback(function(err, count) {
                                                                                    if (!err && promo.usage_limit && count >= promo.usage_limit) {
                                                                                        finalizeCheckout();
                                                                                        return;
                                                                                    }

                                                                                    // Check per-customer limit
                                                                                    DB().count('promotion_redemptions')
                                                                                        .where('promotion_id', promo.id)
                                                                                        .where('user_id', userId)
                                                                                        .callback(function(err2, userCount) {
                                                                                            if (!err2 && promo.per_customer_limit && userCount >= promo.per_customer_limit) {
                                                                                                finalizeCheckout();
                                                                                                return;
                                                                                            }

                                                                                            if (promo.discount_type === 'fixed') {
                                                                                                discount = promo.discount_value;
                                                                                            } else if (promo.discount_type === 'percentage') {
                                                                                                discount = Math.round(subtotal * promo.discount_value / 100);
                                                                                            }
                                                                                            // Apply max discount
                                                                                            if (promo.max_discount && discount > promo.max_discount) {
                                                                                                discount = promo.max_discount;
                                                                                            }
                                                                                            discount = Math.round(discount * 100) / 100;
                                                                                            promotionId = promo.id;
                                                                                            finalizeCheckout();
                                                                                        });
                                                                                });
                                                                        } else {
                                                                            finalizeCheckout();
                                                                        }
                                                                    });
                                                            } else {
                                                                finalizeCheckout();
                                                            }

                                                            function finalizeCheckout() {
                                                                // Tax (disabled by default)
                                                                var tax = 0;

                                                                // Grand total
                                                                var grandTotal = Math.round((subtotal - discount + deliveryFee + serviceFee + tax) * 100) / 100;

                                                                // Create order
                                                                var orderId = FUNC.generateId();
                                                                var orderNumber = 'PF-' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '-' + Math.floor(Math.random() * 999999).toString().padStart(6, '0');
                                                                var now = new Date();

                                                                var order = {
                                                                    id: orderId,
                                                                    order_number: orderNumber,
                                                                    customer_id: userId,
                                                                    merchant_id: cart.merchant_id,
                                                                    address_id: model.address_id,
                                                                    delivery_address: address.address,
                                                                    delivery_latitude: address.latitude,
                                                                    delivery_longitude: address.longitude,
                                                                    subtotal: subtotal,
                                                                    discount: discount,
                                                                    delivery_fee: deliveryFee,
                                                                    service_fee: serviceFee,
                                                                    tax: tax,
                                                                    grand_total: grandTotal,
                                                                    status: 'PENDING_PAYMENT',
                                                                    payment_status: 'UNPAID',
                                                                    payment_method: model.payment_method || 'cash',
                                                                    promotion_id: promotionId,
                                                                    customer_notes: model.customer_notes || null,
                                                                    estimated_time_minutes: 30,
                                                                    created_at: now,
                                                                    updated_at: now,
                                                                    is_removed: false
                                                                };

                                                                FUNC.sequence(function(done) {
                                                                    DB().insert('orders', order).callback(function(err) {
                                                                        if (err) return done(err);

                                                                        // Insert order items with snapshots
                                                                        var itemOps = cartItems.map(function(ci) {
                                                                            return function(cb) {
                                                                                var mi = menuMap[ci.menu_item_id];
                                                                                var orderItemId = FUNC.generateId();

                                                                                var orderItem = {
                                                                                    id: orderItemId,
                                                                                    order_id: orderId,
                                                                                    menu_item_id: ci.menu_item_id,
                                                                                    name: mi ? mi.name : 'Item',
                                                                                    description: mi ? mi.description : null,
                                                                                    unit_price: ci.unit_price,
                                                                                    quantity: ci.quantity,
                                                                                    notes: ci.notes || null,
                                                                                    created_at: now
                                                                                };

                                                                                // Get variant info
                                                                                if (ci.variant_id) {
                                                                                    DB().one('menu_variants')
                                                                                        .fields('id,name,price')
                                                                                        .where('id', ci.variant_id)
                                                                                        .callback(function(err, variant) {
                                                                                            if (variant) {
                                                                                                orderItem.variant_name = variant.name;
                                                                                                orderItem.variant_price = variant.price;
                                                                                            }
                                                                                            insertOrderItem(orderItem, ci, orderItemId, cb);
                                                                                        });
                                                                                } else {
                                                                                    insertOrderItem(orderItem, ci, orderItemId, cb);
                                                                                }
                                                                            };
                                                                        });

                                                                        DB().insert('order_status_history', {
                                                                            id: FUNC.generateId(),
                                                                            order_id: orderId,
                                                                            to_status: 'PENDING_PAYMENT',
                                                                            actor_id: userId,
                                                                            actor_role: 'customer',
                                                                            created_at: now
}).callback(function(err) {
                                            if (err) return done(err);

                                            // Record promotion redemption
                                            var recordRedemption = function(cb) {
                                                if (!promotionId) return cb();
                                                DB().insert('promotion_redemptions', {
                                                    id: FUNC.generateId(),
                                                    promotion_id: promotionId,
                                                    user_id: userId,
                                                    order_id: orderId,
                                                    created_at: now
                                                }).callback(function(err) { cb(err); });
                                            };

                                            recordRedemption(function(err) {
                                                if (err) return done(err);

                                                ASYNC(itemOps, function() {
                                                    // Clear cart
                                                    DB().update('cart_items', { is_removed: true, updated_at: now })
                                                        .where('cart_id', cart.id)
                                                        .callback(function() { done(); });
                                                });
                                            });
                                        });
                                                                    });
                                                                }, function(err) {
                                                                    if (err) return $.invalid(500, 'Failed to create order');

                                                                    var paymentMethod = order.payment_method;
                                                                    var paymentOrder = {
                                                                        id: orderId,
                                                                        order_number: orderNumber,
                                                                        customer_id: userId,
                                                                        payment_method: paymentMethod,
                                                                        grand_total: grandTotal
                                                                    };

                                                                    var provider = FUNC.payments.activeProvider();
                                                                    provider.create($, paymentOrder, function(err) {
                                                                        if (err) return $.invalid(500, 'Failed to create payment');

                                                                        FUNC.audit($, {
                                                                            entity_type: 'orders',
                                                                            entity_id: orderId,
                                                                            action: 'create'
                                                                        });

                                                                        if (paymentMethod === 'cash') {
                                                                            // Cash on delivery: payment is confirmed at checkout,
                                                                            // cash is collected when the order is delivered.
                                                                            provider.confirm($, paymentOrder, paymentMethod, userId, $.user.role, 'Dibayar tunai saat pengantaran', function(err) {
                                                                                if (err) return $.invalid(500, 'Failed to confirm payment');

                                                                                FUNC.audit($, {
                                                                                    entity_type: 'orders',
                                                                                    entity_id: orderId,
                                                                                    action: 'payment_cash'
                                                                                });

                                                                                $.callback({
                                                                                    order_id: orderId,
                                                                                    order_number: orderNumber,
                                                                                    status: 'PAID',
                                                                                    payment_status: 'PAID',
                                                                                    payment_method: paymentMethod,
                                                                                    grand_total: grandTotal,
                                                                                    subtotal: subtotal,
                                                                                    delivery_fee: deliveryFee,
                                                                                    service_fee: serviceFee,
                                                                                    discount: discount,
                                                                                    tax: tax,
                                                                                    estimated_time_minutes: 30
                                                                                });
                                                                            });
                                                                        } else {
                                                                            // Offline digital method: order waits for the customer
                                                                            // to confirm payment (Payments/confirm).
                                                                            $.callback({
                                                                                order_id: orderId,
                                                                                order_number: orderNumber,
                                                                                status: 'PENDING_PAYMENT',
                                                                                payment_status: 'UNPAID',
                                                                                payment_method: paymentMethod,
                                                                                grand_total: grandTotal,
                                                                                subtotal: subtotal,
                                                                                delivery_fee: deliveryFee,
                                                                                service_fee: serviceFee,
                                                                                discount: discount,
                                                                                tax: tax,
                                                                                estimated_time_minutes: 30
                                                                            });
                                                                        }
                                                                    });
                                                                });
                                                            }
                                                        });
                                                });
                                        });
                                });
                        });
                });
        }
    });

    // Read single order
    schema.action('read', {
        name: 'Read order',
        params: '*id:UID',
        action: function($) {
            var orderId = $.params.id;
            var userId = $.user.sub;
            var userRole = $.user.role;

            DB().one('orders')
                .fields('id,customer_id,merchant_id,status')
                .where('id', orderId)
                .where('is_removed', false)
                .callback(function(err, order) {
                    if (!order) return $.invalid(404, 'Order not found');

                    // Authorization check
                    var isCustomer = order.customer_id === userId;
                    var isAdmin = ['admin_operations', 'admin_support', 'admin_finance', 'super_admin'].indexOf(userRole) !== -1;

                    if (isCustomer || isAdmin) {
                        loadOrder(orderId, function(fullOrder) {
                            if (!fullOrder) return $.invalid(404, 'Order not found');
                            $.callback({ order: fullOrder });
                        });
                    } else {
                        // Check merchant access
                        DB().one('merchants')
                            .fields('id')
                            .where('id', order.merchant_id)
                            .where('owner_id', userId)
                            .where('is_removed', false)
                            .callback(function(err, merchant) {
                                if (merchant) {
                                    loadOrder(orderId, function(fullOrder) {
                                        if (!fullOrder) return $.invalid(404, 'Order not found');
                                        $.callback({ order: fullOrder });
                                    });
                                } else {
                                    // Check driver assignment
                                    DB().one('deliveries')
                                        .fields('id')
                                        .where('order_id', orderId)
                                        .where('driver_id', userId)
                                        .callback(function(err, delivery) {
                                            if (delivery) {
                                                loadOrder(orderId, function(fullOrder) {
                                                    if (!fullOrder) return $.invalid(404, 'Order not found');
                                                    $.callback({ order: fullOrder });
                                                });
                                            } else {
                                                return $.invalid(403, 'Forbidden');
                                            }
                                        });
                                }
                            });
                    }
                });
        }
    });

    // List my orders (customer)
    schema.action('mine', {
        name: 'List my orders',
        query: 'status:String,page:Number,size:Number',
        action: function($, model) {
            var userId = $.user.sub;
            var page = parseInt(model.page) || 1;
            var size = parseInt(model.size) || 20;
            var offset = (page - 1) * size;

            var builder = DB().find('orders');
            builder.where('customer_id', userId);
            builder.where('is_removed', false);
            if (model.status) builder.where('status', model.status.toUpperCase());
            builder.sort('created_at', true);
            builder.take(size);
            builder.skip(offset);
            builder.callback(function(err, rows) {
                if (err) return $.invalid(500, 'Failed to fetch orders');

                // Enrich with merchant names
                var merchantIds = [];
                rows.forEach(function(r) { if (merchantIds.indexOf(r.merchant_id) === -1) merchantIds.push(r.merchant_id); });

                DB().find('merchants')
                    .fields('id,name,slug,logo_url')
                    .where('id', merchantIds)
                    .callback(function(err, merchants) {
                        var merchantMap = {};
                        (merchants || []).forEach(function(m) { merchantMap[m.id] = m; });
                        rows.forEach(function(r) {
                            r.merchant_name = merchantMap[r.merchant_id] ? merchantMap[r.merchant_id].name : null;
                            r.merchant_slug = merchantMap[r.merchant_id] ? merchantMap[r.merchant_id].slug : null;
                            r.merchant_logo = merchantMap[r.merchant_id] ? merchantMap[r.merchant_id].logo_url : null;
                        });

                        $.callback({
                            orders: rows,
                            pagination: { page: page, size: size, total: rows.length }
                        });
                    });
            });
        }
    });

    // Cancel order (customer)
    schema.action('cancel', {
        name: 'Cancel order',
        params: '*id:UID',
        input: 'reason:String',
        action: function($, model) {
            var userId = $.user.sub;

            DB().one('orders')
                .fields('id,status,customer_id,created_at,payment_status')
                .where('id', $.params.id)
                .where('is_removed', false)
                .callback(function(err, order) {
                    if (!order) return $.invalid(404, 'Order not found');
                    if (order.customer_id !== userId) return $.invalid(403, 'Forbidden');

                    // Validate cancellable states
                    var cancellable = ['PENDING_PAYMENT', 'PAID', 'WAITING_MERCHANT', 'MERCHANT_ACCEPTED'];
                    if (cancellable.indexOf(order.status) === -1) {
                        return $.invalid(400, 'Order cannot be cancelled in current state');
                    }

                    // Check cancellation window
                    var windowMinutes = 10; // from config
                    var elapsedMinutes = (Date.now() - new Date(order.created_at).getTime()) / 60000;
                    if (order.status === 'MERCHANT_ACCEPTED' && elapsedMinutes > windowMinutes) {
                        return $.invalid(400, 'Order can no longer be cancelled');
                    }

                    var now = new Date();
                    FUNC.sequence(function(done) {
                        DB().update('orders', {
                            status: 'CANCELLED_BY_CUSTOMER',
                            cancelled_at: now,
                            cancel_reason: model.reason || 'Dibatalkan oleh customer',
                            cancelled_by: userId,
                            updated_at: now
                        }).where('id', order.id).callback(function(err) {
                            if (err) return done(err);

                            DB().insert('order_status_history', {
                                id: FUNC.generateId(),
                                order_id: order.id,
                                from_status: order.status,
                                to_status: 'CANCELLED_BY_CUSTOMER',
                                actor_id: userId,
                                actor_role: $.user.role,
                                reason: model.reason,
                                created_at: now
                            }).callback(function(err) {
                                if (err) return done(err);
                                done();
                            });
                        });
                    }, function(err) {
                        if (err) return $.invalid(500, 'Failed to cancel order');

                        FUNC.audit($, {
                            entity_type: 'orders',
                            entity_id: order.id,
                            action: 'cancel'
                        });
                        $.success();
                    });
                });
        }
    });

    // Confirm delivery (customer)
    schema.action('confirmDelivery', {
        name: 'Confirm delivery',
        params: '*id:UID',
        action: function($) {
            var userId = $.user.sub;

            DB().one('orders')
                .fields('id,status,customer_id')
                .where('id', $.params.id)
                .where('is_removed', false)
                .callback(function(err, order) {
                    if (!order) return $.invalid(404, 'Order not found');
                    if (order.customer_id !== userId) return $.invalid(403, 'Forbidden');

                    if (['ON_DELIVERY', 'DELIVERED'].indexOf(order.status) === -1) {
                        return $.invalid(400, 'Order is not in delivery');
                    }

                    var now = new Date();
                    FUNC.sequence(function(done) {
                        DB().update('orders', {
                            status: 'COMPLETED',
                            delivered_at: order.status === 'DELIVERED' ? order.delivered_at : now,
                            completed_at: now,
                            updated_at: now
                        }).where('id', order.id).callback(function(err) {
                            if (err) return done(err);

                            DB().insert('order_status_history', {
                                id: FUNC.generateId(),
                                order_id: order.id,
                                from_status: order.status,
                                to_status: 'COMPLETED',
                                actor_id: userId,
                                actor_role: $.user.role,
                                created_at: now
                            }).callback(function(err) {
                                if (err) return done(err);
                                done();
                            });
                        });
                    }, function(err) {
                        if (err) return $.invalid(500, 'Failed to confirm delivery');
                        $.success();
                    });
                });
        }
    });
});