require('dotenv').config(); // Load environment variables

const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const exphbs = require('express-handlebars');
const fileUpload = require('express-fileupload');
const session = require('express-session');
const db = require('./config/connection');
const userHelpers = require('./helpers/user-helpers');

// Create the express app
const app = express();


const port = process.env.PORT || 8081;  
// Set up view engine with express-handlebars
app.engine(
  'hbs',
  exphbs.engine({
    extname: 'hbs',
    defaultLayout: 'layout',
    layoutsDir: path.join(__dirname, 'views/layout/'),
    partialsDir: path.join(__dirname, 'views/partials/'),
    helpers: {
      defaultCartCount: function (value) {
        return value || 0;
      }
    }
  })
);



// Set view engine
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));  // Path to views directory

// Middlewares
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(fileUpload());
app.use(session({
  secret: 'yourSecretKey',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}));

// Database connection
db.connect((err) => {
  if (err) {
    console.log("❌ Database Connection Error:", err);
    process.exit(1);
  } else {
    console.log("✅ Database Connected");
  }
});

// Define routes (example)
const userRouter = require('./routes/user');
const adminRouter = require('./routes/admin');
app.use('/', userRouter);
app.use('/admin', adminRouter);

// Route for placing order
app.post('/place-order', async (req, res) => {
  try {
    let products = await userHelpers.getCartProducts(req.body.userId);
    let totalAmount = await userHelpers.getTotalAmount(req.body.userId);

    if (!products || products.length === 0) {
      return res.json({ success: false, message: "Your cart is empty!" });
    }

    let order = {
      user: req.body.userId,
      deliveryDetails: {
        address: req.body.address,
        pincode: req.body.pincode,
        mobile: req.body.mobile
      },
      paymentMethod: req.body['payment-method'],
      products: products,
      totalAmount: totalAmount,
      status: 'Pending',
      date: new Date()
    };

    let orderResult = await db.get().collection('orders').insertOne(order);

    if (orderResult.insertedId) {
      // Clear cart after order placement
      await userHelpers.clearCart(req.body.userId);
      res.json({ success: true });
    } else {
      res.json({ success: false, message: "Order placement failed." });
    }
  } catch (err) {
    console.error("Error placing order:", err);
    res.json({ success: false, message: "Internal server error." });
  }
});

try {
  app.listen(port, () => {
    console.log(`🚀 Server running on http://localhost:8081`);
  });
} catch (err) {
  console.error("❌ Server failed to start:", err);
  process.exit(1);
}


module.exports = app;
         
