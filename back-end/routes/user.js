const express = require('express');
const router = express.Router();
const productsHelper = require('../helpers/product-helpers');
const userHelpers = require('../helpers/user-helpers');

const verifyLogin = (req, res, next) => {
    if (req.session.loggedIn) {
        next();
    } else {
        res.redirect('/login');
    }
};

router.get('/', async (req, res) => {
    let user = req.session.user || null;
    try {
        let products = await productsHelper.getAllProducts();
        res.render('user/view-products', { products, user });
    } catch (err) {
        console.error("Error fetching products:", err);
        res.redirect('/');
    }
});


router.get('/login', (req, res) => {
    if (req.session.loggedIn) {
        return res.redirect('/');
    }
    res.render('user/login', { loginErr: req.session.loginErr || false });
    req.session.loginErr = false;
});

router.get('/signup', (req, res) => {
    res.render('user/signup');
});

router.post('/signup', async (req, res) => {
    try {
        let response = await userHelpers.doSignup(req.body);
        req.session.loggedIn = true;
        req.session.user = response;
        res.redirect('/');
    } catch (err) {
        console.error("Signup error:", err);
        res.redirect('/signup');
    }
});



router.post('/login', async (req, res) => {
    try {
        let response = await userHelpers.doLogin(req.body);
        if (response.status) {
            req.session.user = response.user;
            req.session.loggedIn = true;
            res.redirect('/');
        } else {
            req.session.loginErr = "Invalid username or password";
            res.redirect('/login');
        }
    } catch (err) {
        console.error("Login error:", err);
        res.redirect('/login');
    }
});

router.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

router.get('/cart', verifyLogin, async (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }

    try {
        let userId = req.session.user._id;
        let cartItems = await userHelpers.getCartProducts(userId);
        let totalValue = await userHelpers.getTotalAmount(userId);

        res.render('user/cart', {
            products: cartItems || [],
            user: req.session.user._id,
            totalValue
        });
    } catch (err) {
        console.error("Error fetching cart items:", err);
        res.redirect('/');
    }
});

router.get('/add-to-cart/:productId', verifyLogin, async (req, res) => {
    const productId = req.params.productId;
    const userId = req.session.user._id;
    try {
        await userHelpers.addToCart(productId, userId);
        res.json({ status: true });
    } catch (err) {
        console.error("Error adding to cart:", err);
        res.json({ status: false });
    }
});




  


router.get('/remove-item/:productId', verifyLogin, async (req, res) => {
    const productId = req.params.productId;
    const userId = req.session.user._id;
    try {
        await userHelpers.removeFromCart(productId, userId);
        res.redirect('/cart');
    } catch (err) {
        console.error("Error removing item from cart:", err);
        res.redirect('/cart');
    }
});

router.post('/change-product-quantity/', (req, res) => {
    userHelpers.changeProductQuantity(req.body)
        .then(async (response) => {
            response.total = await userHelpers.getTotalAmount(req.body.user);
            res.json(response);
        });
});

router.get('/place-order', verifyLogin, async (req, res) => {
    let total = await userHelpers.getTotalAmount(req.session.user._id);
    res.render('user/place-order', { total: total || 0, user: req.session.user });
});



router.post('/place-order', async (req, res) => {
  try {
      let products = await userHelpers.getCartProductList(req.body.userId);
      let totalPrice = await userHelpers.getTotalAmount(req.body.userId);

      if (req.body['payment-method'] === 'ONLINE') {
        const clientSecret = await userHelpers.createPaymentIntent(totalPrice);
        res.json({
            status: true,
            clientSecret,
            paymentMethod: 'ONLINE',
            products, // Ensure this is correctly populated
            totalPrice,
            orderDetails: {
                userId: req.body.userId,
                address: req.body.address,
                pincode: req.body.pincode,
                mobile: req.body.mobile,
            },
        });
    } else {
          userHelpers.placeOrder(req.body, products, totalPrice, 'COD')
              .then((response) => {
                  res.json({ status: true });
              })
              .catch((err) => {
                  console.error("Error placing order:", err);
                  res.json({ status: false, message: "Failed to place order." });
              });
      }
  } catch (err) {
      console.error("Server error in /place-order:", err);
      res.json({ status: false, message: "Internal server error." });
  }
});



router.get('/order-success', (req, res) => {
    res.render('user/order-success', { user: req.session.user});
});

router.get('/orders', async (req, res) => {
    let orders = await userHelpers.getUserOrders(req.session.user._id);
    res.render('user/orders', { user: req.session.user, orders });
});


router.get('/view-order-products/:id', async (req, res) => {

  try {
      let products = await userHelpers.getOrderProducts(req.params.id);
      console.log("Order Products:", products); // Debugging statement
      res.render('user/view-order-products', { user: req.session.user, products });
  } catch (err) {
      console.error("Error fetching order products:", err);
      res.status(500).send("Internal Server Error");
  }
});







router.post('/save-order', async (req, res) => {
    try {
        const { userId, address, pincode, mobile, totalAmount, paymentMethod } = req.body;
        
        // Fetch products from cart again to ensure data is stored correctly
        const products = await userHelpers.getCartProductList(userId);
  
        if (!products || products.length === 0) {
            return res.json({ status: false, message: "No products found in the cart!" });
        }
  
        // Save the order to the database
        await userHelpers.placeOrder(
            { userId, address, pincode, mobile },
            products,
            totalAmount,
            paymentMethod
        );
  
        res.json({ status: true });
    } catch (err) {
        console.error("Error saving order:", err);
        res.json({ status: false, message: "Failed to save order." });
    }
  });



  router.get('/product-details/:productId', async (req, res) => {
    try {
        console.log("Fetching product details for ID:", req.params.productId); // Log the product ID
        const productId = req.params.productId;
        const product = await userHelpers.getProductById(productId);

        if (!product) {
            console.log("Product not found for ID:", productId); // Log if product is not found
            return res.status(404).send('Product not found');
        }

        console.log("Product fetched successfully:", product); // Log the fetched product
        res.render('user/product-details', { user: req.session.user, product });
    } catch (error) {
        console.error("Error fetching product details:", error); // Log the error
        res.status(500).send('Server error');
    }
});




module.exports = router;

