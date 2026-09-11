// ==========================================
// PareFood Backend — Cart Schema
// ==========================================

NEWSCHEMA('Cart', function(schema) {

    // Read current user's cart
    schema.action('read', {
        name: 'Read cart',
        action: function($) {
            var userId = $.user.sub;

            DB().one('carts')
                .where('profile_id', userId)
                .where('is_removed', false)
                .callback(function(err, cart) {
                    if (!cart) {
                        return $.callback({ cart: { id: null, merchant_id: null, items: [], subtotal: 0 } });
                    }

                    // Get merchant info
                    var merchantId = cart.merchant_id;

                    DB().one('merchants')
                        .fields('id,name,slug,logo_url,min_order,is_open')
                        .where('id', merchantId)
                        .where('is_removed', false)
                        .callback(function(err, merchant) {
                            // Get cart items
                            DB().find('cart_items')
                                .where('cart_id', cart.id)
                                .where('is_removed', false)
                                .callback(function(err, items) {
                                    if (!items) items = [];

                                    // Get addons for items
                                    var itemIds = items.map(function(i) { return i.id; });
                                    var subtotal = 0;

                                    DB().find('cart_item_addons')
                                        .where('cart_item_id', itemIds)
                                        .callback(function(err, addons) {
                                            if (!addons) addons = [];

                                            items.forEach(function(item) {
                                                item.addons = addons.filter(function(a) { return a.cart_item_id === item.id; });

                                                // Calculate item total
                                                var itemTotal = item.unit_price * item.quantity;
                                                item.addons.forEach(function(a) {
                                                    itemTotal += a.option_price;
                                                });
                                                subtotal += itemTotal;
                                            });

                                            // Round subtotal
                                            subtotal = Math.round(subtotal * 100) / 100;

                                            $.callback({
                                                cart: {
                                                    id: cart.id,
                                                    merchant_id: cart.merchant_id,
                                                    merchant: merchant || null,
                                                    items: items,
                                                    subtotal: subtotal
                                                }
                                            });
                                        });
                                });
                        });
                });
        }
    });

    // Add item to cart
    schema.action('addItem', {
        name: 'Add item to cart',
        input: '*menu_item_id:UID,variant_id:UID,quantity:Number,notes:String,addons:JSON',
        action: function($, model) {
            var userId = $.user.sub;
            var quantity = parseInt(model.quantity) || 1;
            if (quantity < 1) quantity = 1;

            // Get menu item
            DB().one('menu_items')
                .fields('id,merchant_id,category_id,name,price,is_available,is_removed,preparation_time_minutes')
                .where('id', model.menu_item_id)
                .where('is_removed', false)
                .callback(function(err, item) {
                    if (!item) return $.invalid(404, 'Menu item not found');
                    if (!item.is_available) return $.invalid(400, 'Menu item is not available');

                    var merchantId = item.merchant_id;

                    // Check if user has cart, create if none
                    DB().one('carts')
                        .where('profile_id', userId)
                        .where('is_removed', false)
                        .callback(function(err, cart) {
                            if (!cart) {
                                // Create new cart for this merchant
                                cart = {
                                    id: FUNC.generateId(),
                                    profile_id: userId,
                                    merchant_id: merchantId,
                                    created_at: new Date(),
                                    updated_at: new Date()
                                };
                                DB().insert('carts', cart).callback(function() {});
                            } else if (cart.merchant_id !== merchantId) {
                                // Cart has items from another merchant — replace
                                DB().update('carts', {
                                    merchant_id: merchantId,
                                    updated_at: new Date()
                                }).where('id', cart.id).callback(function() {});
                                cart.merchant_id = merchantId;
                            }

                            // Check if same item already in cart
                            var checkBuilder = DB().one('cart_items');
                            checkBuilder.where('cart_id', cart.id);
                            checkBuilder.where('menu_item_id', model.menu_item_id);
                            if (model.variant_id) {
                                checkBuilder.where('variant_id', model.variant_id);
                            }
                            checkBuilder.where('is_removed', false);
                            checkBuilder.callback(function(err, existingItem) {
                                var variantPrice = 0;
                                var variantName = null;

                                // Get variant price if specified
                                if (model.variant_id) {
                                    DB().one('menu_variants')
                                        .fields('id,name,price,is_available')
                                        .where('id', model.variant_id)
                                        .where('menu_item_id', item.id)
                                        .callback(function(err, variant) {
                                            if (!variant) return $.invalid(400, 'Invalid variant');
                                            if (!variant.is_available) return $.invalid(400, 'Variant is not available');

                                            variantPrice = variant.price;
                                            variantName = variant.name;
                                            processAdd();
                                        });
                                } else {
                                    processAdd();
                                }

                                function processAdd() {
                                    var unitPrice = parseFloat(item.price) + parseFloat(variantPrice);

                                    if (existingItem) {
                                        // Update quantity (max 20)
                                        var newQty = existingItem.quantity + quantity;
                                        if (newQty > 20) newQty = 20;

                                        DB().update('cart_items', {
                                            quantity: newQty,
                                            notes: model.notes || existingItem.notes,
                                            updated_at: new Date()
                                        }).where('id', existingItem.id)
                                            .where('is_removed', false)
                                            .callback(function(err) {
                                                if (err) return $.invalid(500, 'Failed to update cart');

                                                // Handle addons
                                                handleAddons(existingItem.id, model.addons, function() {
                                                    loadCart(cart.id, $.callback);
                                                });
                                            });
                                    } else {
                                        var cartItemId = FUNC.generateId();
                                        var cartItem = {
                                            id: cartItemId,
                                            cart_id: cart.id,
                                            menu_item_id: item.id,
                                            variant_id: model.variant_id || null,
                                            quantity: quantity,
                                            unit_price: unitPrice,
                                            notes: model.notes || null,
                                            created_at: new Date(),
                                            updated_at: new Date(),
                                            is_removed: false
                                        };

                                        DB().insert('cart_items', cartItem)
                                            .callback(function(err) {
                                                if (err) return $.invalid(500, 'Failed to add to cart');

                                                handleAddons(cartItemId, model.addons, function() {
                                                    loadCart(cart.id, $.callback);
                                                });
                                            });
                                    }
                                }
                            });
                        });

                    function handleAddons(cartItemId, addons, done) {
                        if (!addons || !Array.isArray(addons) || addons.length === 0) {
                            return done();
                        }

                        var ops = addons.map(function(a, index) {
                            return function(cb) {
                                if (!a.addon_id || !a.option_id) return cb();

                                DB().one('menu_addon_options')
                                    .fields('id,addon_id,name,price')
                                    .where('id', a.option_id)
                                    .where('addon_id', a.addon_id)
                                    .callback(function(err, option) {
                                        if (!option) return cb();

                                        DB().one('menu_addons')
                                            .fields('id,name')
                                            .where('id', a.addon_id)
                                            .callback(function(err, addon) {
                                                DB().insert('cart_item_addons', {
                                                    id: FUNC.generateId(),
                                                    cart_item_id: cartItemId,
                                                    addon_id: a.addon_id,
                                                    addon_option_id: option.id,
                                                    option_name: option.name,
                                                    option_price: option.price,
                                                    created_at: new Date()
                                                }).callback(function(err) {
                                                    if (err) console.log('Failed to add addon:', err);
                                                    cb();
                                                });
                                            });
                                    });
                            };
                        });

                        ASYNC(ops, done);
                    }

                    function loadCart(cartId, callback) {
                        DB().find('cart_items')
                            .where('cart_id', cartId)
                            .where('is_removed', false)
                            .callback(function(err, items) {
                                var subtotal = 0;
                                var itemIds = items.map(function(i) { return i.id; });

                                DB().find('cart_item_addons')
                                    .where('cart_item_id', itemIds)
                                    .callback(function(err, addons) {
                                        items.forEach(function(item) {
                                            item.addons = (addons || []).filter(function(a) { return a.cart_item_id === item.id; });
                                            var total = item.unit_price * item.quantity;
                                            item.addons.forEach(function(a) { total += a.option_price; });
                                            subtotal += total;
                                        });

                                        callback({
                                            cart: {
                                                id: cartId,
                                                merchant_id: merchantId,
                                                items: items,
                                                subtotal: Math.round(subtotal * 100) / 100
                                            }
                                        });
                                    });
                            });
                    }
                });
        }
    });

    // Update cart item quantity
    schema.action('updateItem', {
        name: 'Update cart item',
        params: '*id:UID',
        input: 'quantity:Number,notes:String',
        action: function($, model) {
            var userId = $.user.sub;

            DB().one('cart_items')
                .fields('id,cart_id')
                .where('id', $.params.id)
                .where('is_removed', false)
                .callback(function(err, cartItem) {
                    if (!cartItem) return $.invalid(404, 'Cart item not found');

                    // Verify cart ownership
                    DB().one('carts')
                        .fields('id')
                        .where('id', cartItem.cart_id)
                        .where('profile_id', userId)
                        .where('is_removed', false)
                        .callback(function(err, cart) {
                            if (!cart) return $.invalid(403, 'Cart not owned by user');

                            var updates = { updated_at: new Date() };
                            if (model.quantity !== undefined) {
                                var qty = parseInt(model.quantity) || 1;
                                if (qty < 1) qty = 1;
                                if (qty > 20) qty = 20;
                                updates.quantity = qty;
                            }
                            if (model.notes !== undefined) updates.notes = model.notes;

                            DB().update('cart_items', updates)
                                .where('id', $.params.id)
                                .where('is_removed', false)
                                .callback(function(err) {
                                    if (err) return $.invalid(500, 'Failed to update cart item');
                                    $.success();
                                });
                        });
                });
        }
    });

    // Remove cart item
    schema.action('removeItem', {
        name: 'Remove cart item',
        params: '*id:UID',
        action: function($) {
            var userId = $.user.sub;

            DB().one('cart_items')
                .fields('id,cart_id')
                .where('id', $.params.id)
                .where('is_removed', false)
                .callback(function(err, cartItem) {
                    if (!cartItem) return $.invalid(404, 'Cart item not found');

                    DB().one('carts')
                        .fields('id')
                        .where('id', cartItem.cart_id)
                        .where('profile_id', userId)
                        .where('is_removed', false)
                        .callback(function(err, cart) {
                            if (!cart) return $.invalid(403, 'Cart not owned by user');

                            DB().update('cart_items', { is_removed: true, updated_at: new Date() })
                                .where('id', $.params.id)
                                .where('is_removed', false)
                                .callback(function(err) {
                                    if (err) return $.invalid(500, 'Failed to remove cart item');
                                    $.success();
                                });
                        });
                });
        }
    });

    // Clear cart
    schema.action('clear', {
        name: 'Clear cart',
        action: function($) {
            var userId = $.user.sub;

            DB().one('carts')
                .fields('id')
                .where('profile_id', userId)
                .where('is_removed', false)
                .callback(function(err, cart) {
                    if (!cart) {
                        return $.success();
                    }

                    DB().update('cart_items', { is_removed: true, updated_at: new Date() })
                        .where('cart_id', cart.id)
                        .where('is_removed', false)
                        .callback(function(err) {
                            if (err) return $.invalid(500, 'Failed to clear cart');
                            $.success();
                        });
                });
        }
    });
});