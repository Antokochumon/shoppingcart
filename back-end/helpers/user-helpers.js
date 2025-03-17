const db = require('../config/connection');
const collection = require('../config/collection');
const bcrypt = require('bcrypt');
const { ObjectId } = require('mongodb');
const stripe = require('stripe')('sk_test_51QvJF7HwIsttZj1KSGPSePhyHl2NixRylDnBUwtUi6c2Gy0Zveqw02eePzUSCVnkljgAIHdkrQGkKQPY1xogwhAc00LcudwveI'); // Use environment variable

module.exports = {
    // User signup function
    doSignup: (userData) => {
        return new Promise(async (resolve, reject) => {
            try {
                userData.Password = await bcrypt.hash(userData.Password, 10);
                let response = await db.get().collection(collection.USER_COLLECTION).insertOne(userData);
                let newUser = await db.get().collection(collection.USER_COLLECTION).findOne({ _id: response.insertedId });
                resolve(newUser);
            } catch (err) {
                reject(err);
            }
        });
    },

    // User login function
    doLogin: (userData) => {
        return new Promise(async (resolve, reject) => {
            try {
                let loginStatus = false;
                let response = {};

                let user = await db.get().collection(collection.USER_COLLECTION).findOne({ Email: userData.Email });

                if (user) {
                    let status = await bcrypt.compare(userData.Password, user.Password);
                    if (status) {
                        console.log("Login success");
                        response.user = user;
                        response.status = true;
                        resolve(response);
                    } else {
                        console.log("Login failed");
                        resolve({ status: false });
                    }
                } else {
                    resolve({ status: false });
                }
            } catch (err) {
                reject(err);
            }
        });
    },

    // Add to cart
    addToCart: (proId, userId) => {
        let proObj = {
            item: new ObjectId(proId),
            quantity: 1
        };
        return new Promise(async (resolve, reject) => {
            try {
                let userCart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: new ObjectId(userId) });

                if (userCart) {
                    let proIndex = userCart.products.findIndex(product => product.item.toString() === proId.toString());

                    if (proIndex !== -1) {
                        await db.get().collection(collection.CART_COLLECTION)
                            .updateOne(
                                { user: new ObjectId(userId), 'products.item': new ObjectId(proId) },
                                { $inc: { 'products.$.quantity': 1 } }
                            );
                    } else {
                        await db.get().collection(collection.CART_COLLECTION).updateOne(
                            { user: new ObjectId(userId) },
                            { $push: { products: proObj } }
                        );
                    }
                    resolve();
                } else {
                    let cartObj = {
                        user: new ObjectId(userId),
                        products: [proObj]
                    };
                    await db.get().collection(collection.CART_COLLECTION).insertOne(cartObj);
                    resolve();
                }
            } catch (err) {
                reject(err);
            }
        });
    },

    // Get cart products
    getCartProducts: (userId) => {
        return new Promise(async (resolve, reject) => {
            try {
                let cartItems = await db.get().collection(collection.CART_COLLECTION).aggregate([
                    {
                        $match: { user: new ObjectId(userId) }
                    },
                    {
                        $unwind: '$products'
                    },
                    {
                        $project: {
                            item: "$products.item",
                            quantity: { $toInt: "$products.quantity" }
                        }
                    },
                    {
                        $lookup: {
                            from: collection.PRODUCT_COLLECTION,
                            localField: 'item',
                            foreignField: '_id',
                            as: 'product'
                        }
                    },
                    {
                        $project: {
                            item: 1,
                            quantity: 1,
                            product: { $arrayElemAt: ['$product', 0] }
                        }
                    }
                ]).toArray();

                resolve(cartItems);
            } catch (err) {
                reject(err);
            }
        });
    },

    // Remove from cart
    removeFromCart: (productId, userId) => {
        return new Promise(async (resolve, reject) => {
            try {
                await db.get().collection(collection.CART_COLLECTION).updateOne(
                    { user: new ObjectId(userId) },
                    { $pull: { products: { item: new ObjectId(productId) } } }
                );
                resolve();
            } catch (err) {
                reject(err);
            }
        });
    },

    // Get cart count
    getCartCount: (userId) => {
        return new Promise(async (resolve, reject) => {
            try {
                let count = 0;
                let cart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: new ObjectId(userId) });

                if (cart) {
                    count = cart.products.length;
                }

                resolve(count);
            } catch (err) {
                reject(err);
            }
        });
    },

    // Change product quantity
    changeProductQuantity: (details) => {
        details.count = parseInt(details.count, 10);
        details.quantity = parseInt(details.quantity, 10);

        return new Promise(async (resolve, reject) => {
            try {
                let cart = await db.get().collection(collection.CART_COLLECTION).findOne(
                    { _id: new ObjectId(details.cart), 'products.item': new ObjectId(details.product) }
                );

                let productIndex = cart.products.findIndex(p => p.item.toString() === details.product.toString());

                if (productIndex !== -1) {
                    let newQuantity = cart.products[productIndex].quantity + details.count;

                    if (newQuantity <= 0) {
                        await db.get().collection(collection.CART_COLLECTION).updateOne(
                            { _id: new ObjectId(details.cart) },
                            { $pull: { products: { item: new ObjectId(details.product) } } }
                        );
                        resolve({ status: true, removeProduct: true });
                    } else {
                        await db.get().collection(collection.CART_COLLECTION).updateOne(
                            { _id: new ObjectId(details.cart), 'products.item': new ObjectId(details.product) },
                            { $inc: { 'products.$.quantity': details.count } }
                        );
                        resolve({ status: true, newQuantity });
                    }
                } else {
                    resolve({ status: true });
                }
            } catch (err) {
                reject(err);
            }
        });
    },

    // Get total amount
    getTotalAmount: (userId) => {
        return new Promise(async (resolve, reject) => {
            try {
                let total = await db.get().collection(collection.CART_COLLECTION).aggregate([
                    {
                        $match: { user: new ObjectId(userId) }
                    },
                    {
                        $unwind: '$products'
                    },
                    {
                        $project: {
                            item: "$products.item",
                            quantity: { $toInt: "$products.quantity" }
                        }
                    },
                    {
                        $lookup: {
                            from: collection.PRODUCT_COLLECTION,
                            localField: "item",
                            foreignField: "_id",
                            as: "product"
                        }
                    },
                    {
                        $project: {
                            item: 1,
                            quantity: 1,
                            price: {
                                $toDouble: {
                                    $ifNull: [{ $arrayElemAt: ["$product.Price", 0] }, 0]
                                }
                            }
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            total: { $sum: { $multiply: ["$quantity", "$price"] } }
                        }
                    }
                ]).toArray();

                resolve(total.length > 0 ? total[0].total : 0);
            } catch (err) {
                console.error("Error in getTotalAmount:", err);
                reject(err);
            }
        });
    },

    // Place order
    placeOrder: (order, products, total, paymentMethod) => {
        return new Promise(async (resolve, reject) => {
            try {
                let orderData = {
                    userId: new ObjectId(order.userId),
                    deliveryDetails: {
                        address: order.address,
                        pincode: order.pincode,
                        mobile: order.mobile,
                    },
                    paymentMethod: paymentMethod,
                    products: products.map(product => ({
                        item: new ObjectId(product.item),
                        quantity: product.quantity,
                    })),
                    totalAmount: total,
                    status: paymentMethod === 'ONLINE' ? 'paid' : 'placed',
                    date: new Date(),
                };
    
                let response = await db.get().collection(collection.ORDER_COLLECTION).insertOne(orderData);
                await db.get().collection(collection.CART_COLLECTION).deleteOne({ user: new ObjectId(order.userId) });
                resolve(response);
            } catch (err) {
                reject(err);
            }
        });
    },

    // Create Stripe payment intent
    createPaymentIntent: async (amount) => {
        try {
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount * 100, // Convert to cents
                currency: 'gbp',
                payment_method_types: ['card'],
            });
            return paymentIntent.client_secret;
        } catch (err) {
            console.error("Error creating payment intent:", err);
            throw err;
        }
    },

    // Get cart product list
    getCartProductList: (userId) => {
        return new Promise(async (resolve, reject) => {
            try {
                let cart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: new ObjectId(userId) });
                console.log("Cart Products:", cart ? cart.products : "No Products Found");
                resolve(cart ? cart.products : []);
            } catch (err) {
                console.error("Error fetching cart products:", err);
                reject(err);
            }
        });
    },
    

    // Get user orders
    getUserOrders: (userId) => {
        return new Promise(async (resolve, reject) => {
            try {
                let orders = await db.get().collection(collection.ORDER_COLLECTION)
                    .find({ userId: new ObjectId(userId) }).toArray();
                resolve(orders);
            } catch (err) {
                reject(err);
            }
        });
    },

    // Get order products
    getOrderProducts: (orderId) => {
        return new Promise(async (resolve, reject) => {
            try {
                let orderItems = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                    {
                        $match: { _id: new ObjectId(orderId) }
                    },
                    {
                        $unwind: '$products'
                    },
                    {
                        $project: {
                            item: "$products.item",
                            quantity: "$products.quantity"
                        }
                    },
                    {
                        $lookup: {
                            from: collection.PRODUCT_COLLECTION,
                            localField: "item",
                            foreignField: "_id",
                            as: "product"
                        }
                    },
                    {
                        $project: {
                            item: 1,
                            quantity: 1,
                            product: { $arrayElemAt: ["$product", 0] }
                        }
                    }
                ]).toArray();
                resolve(orderItems);
            } catch (err) {
                reject(err);
            }
        });
    },
    getProductById: async (productId) => {
        try {
            console.log("Fetching product from DB for ID:", productId); // Log the product ID
            const product = await db.get().collection(collection.PRODUCT_COLLECTION).findOne({ _id: new ObjectId(productId) });
            console.log("Product fetched from DB:", product); // Log the fetched product
            return product;
        } catch (error) {
            console.error('Error fetching product:', error); // Log the error
            throw new Error('Could not fetch product');
        }
    }
};