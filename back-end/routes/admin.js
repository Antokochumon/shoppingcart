const express = require('express');
const router = express.Router();
const productHelpers = require('../helpers/product-helpers');
const path = require('path');
const fs = require('fs');
const Order = require('../models/order'); // Ensure this path is correct


// Admin Dashboard - View Products
router.get('/', async (req, res) => {
    try {
        let products = await productHelpers.getAllProducts();
        res.render('admin/view-products', { admin: true, products });
    } catch (error) {
        console.error("Error fetching products:", error);
        res.status(500).send('Server error');
    }
});

// Render Add Product Page
router.get('/add-product', (req, res) => {
    res.render('admin/add-product');
});

// Handle Add Product
router.post('/add-product', async (req, res) => {
    try {
        console.log(req.body);

        if (!req.files || !req.files.Image) {
            return res.status(400).send('No image uploaded');
        }

        let productData = req.body;
        let image = req.files.Image;

        // Ensure that additional images are handled properly
        let additionalImages = req.files.additionalImages ? Array.isArray(req.files.additionalImages) ? req.files.additionalImages : [req.files.additionalImages] : [];

        // Assign filenames to productData
        productData.Image = `${Date.now()}_${image.name}`; // Main image filename
        productData.additionalImages = additionalImages.map((img, index) => `${Date.now()}_${index}_${img.name}`); // Additional image filenames

        // Insert the product and get the product ID
        let productId = await productHelpers.addProduct(productData);

        // Upload the main image
        let uploadPath = path.join(__dirname, '../public/product-images', productData.Image);
        
        if (!fs.existsSync(path.dirname(uploadPath))) {
            fs.mkdirSync(path.dirname(uploadPath), { recursive: true });
        }

        // Move the main image
        image.mv(uploadPath, (err) => {
            if (err) {
                console.error("Image upload failed:", err);
                return res.status(500).send('Image upload failed');
            }

            // Now handle the additional images
            additionalImages.forEach((img, index) => {
                let additionalImagePath = path.join(__dirname, '../public/product-images', productData.additionalImages[index]);
                img.mv(additionalImagePath, (err) => {
                    if (err) {
                        console.error("Additional image upload failed:", err);
                    }
                });
            });

            // After uploading all images, redirect to the admin page
            res.redirect('/admin/add-product');
        });
    } catch (error) {
        console.error("Error adding product:", error);
        res.status(500).send('Server error');
    }
});

// Delete Product
router.get('/delete-product/:id', async (req, res) => {
    try {
        let productId = req.params.id;
        console.log("Deleting product:", productId);

        await productHelpers.deleteProduct(productId);
        res.redirect('/admin');
    } catch (error) {
        console.error("Error deleting product:", error);
        res.status(500).send('Server error');
    }
});

// Render Edit Product Page
router.get('/edit-product/:id', async (req, res) => {
    try {
        let product = await productHelpers.getProductDetails(req.params.id);
        res.render('admin/edit-product', { product });
    } catch (error) {
        console.error("Error fetching product details:", error);
        res.status(500).send('Server error');
    }
});

// Handle Edit Product
router.post('/edit-product/:id', async (req, res) => {
    try {
        let productId = req.params.id;
        let productData = req.body;

        if (req.files) {
            if (req.files.Image) {
                let image = req.files.Image;
                let newImageName = `${Date.now()}_${image.name}`;
                let uploadPath = path.join(__dirname, '../public/product-images', newImageName);

                image.mv(uploadPath, async (err) => {
                    if (err) {
                        console.error("Image upload failed:", err);
                        return res.status(500).send('Image upload failed');
                    }
                });

                productData.Image = newImageName;
            }

            if (req.files.additionalImages) {
                let additionalImages = Array.isArray(req.files.additionalImages) ? req.files.additionalImages : [req.files.additionalImages];
                productData.additionalImages = additionalImages.map((img, index) => `${Date.now()}_${index}_${img.name}`);

                additionalImages.forEach((img, index) => {
                    let additionalImagePath = path.join(__dirname, '../public/product-images', productData.additionalImages[index]);
                    img.mv(additionalImagePath, (err) => {
                        if (err) {
                            console.error("Additional image upload failed:", err);
                        }
                    });
                });
            }
        }

        await productHelpers.updateProduct(productId, productData);
        res.redirect('/admin');
    } catch (error) {
        console.error("Error updating product:", error);
        res.status(500).send('Server error');
    }
});

// Remove additional image
router.delete('/remove-additional-image/:id', async (req, res) => {
    try {
        let productId = req.params.id;
        let imageName = req.query.imageName;

        // Remove image from filesystem
        let imagePath = path.join(__dirname, '../public/product-images', imageName);
        if (fs.existsSync(imagePath)) {
            fs.unlinkSync(imagePath);
        }

        // Update the product record in the database
        let product = await productHelpers.getProductDetails(productId);
        product.additionalImages = product.additionalImages.filter(img => img !== imageName);

        await productHelpers.updateProduct(productId, product);
        res.status(200).send({ success: true });
    } catch (error) {
        console.error("Error removing additional image:", error);
        res.status(500).send('Server error');
    }
});

const multer = require('multer');

// Set up storage for images
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../public/product-images/')); // Ensure this path is correct
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname)); // Unique filename
    }
});

const upload = multer({ storage: storage });

router.post('/add-product', upload.fields([
    { name: 'Image', maxCount: 1 }, // Main image
    { name: 'additionalImages', maxCount: 5 } // Additional images
]), async (req, res) => {
    try {
        let product = req.body;

        // Save the main image
        if (req.files['Image']) {
            product.Image = req.files['Image'][0].filename; // Save main image filename
        }

        // Save additional images
        if (req.files['additionalImages']) {
            product.additionalImages = req.files['additionalImages'].map(file => file.filename); // Save additional image filenames
        } else {
            product.additionalImages = []; // Empty array if no additional images
        }

        console.log("Product data before saving:", product);
        await productHelpers.addProduct(product);
        res.redirect('/add-product');
    } catch (error) {
        console.error("Error adding product:", error);
        res.status(500).send("Error adding product");
    }
});

 


const { ObjectId } = require('mongodb'); // Add this line
const db = require('../config/connection'); // Import the connection module

// Fetch all orders
router.get('/all-orders', async (req, res) => {
  try {
    console.log('Fetching orders...');

    // Get the database instance
    const database = db.get();

    // Fetch orders from the "order" collection
    const orders = await database.collection('order').find({}).toArray();

    // Fetch product and user details for each order
    const ordersWithDetails = await Promise.all(
      orders.map(async (order) => {
        // Fetch user details from the "user" collection
        const user = await database
          .collection('user')
          .findOne({ _id: new ObjectId(order.userId) });

        // Fetch product details for each product in the order
        const productsWithDetails = await Promise.all(
          order.products.map(async (item) => {
            // Check if item.item exists and is a valid ObjectId
            if (!item.item || !ObjectId.isValid(item.item)) {
              console.error("Invalid product item:", item);
              return null; // Skip this item
            }

            // Fetch the product details from the "product" collection
            const product = await database
              .collection('product')
              .findOne({ _id: new ObjectId(item.item) });

            if (!product) {
              console.error("Product not found for ID:", item.item);
              return null; // Skip this item
            }

            return {
              product: product,
              quantity: item.quantity
            };
          })
        );

        // Filter out null values (invalid products)
        const validProducts = productsWithDetails.filter(item => item !== null);

        return {
          ...order,
          user: {
            name: user ? user.Name : 'Unknown',
            email: user ? user.Email : 'Unknown'
          },
          products: validProducts // Use the filtered products array
        };
      })
    );

    console.log('Orders fetched successfully:', ordersWithDetails);

    // Render the all-orders view with the fetched orders
    res.render('admin/all-orders', { orders: ordersWithDetails });
  } catch (err) {
    console.error("❌ Error fetching orders:", err);
    res.status(500).send('Error fetching orders');
  }
});

module.exports = router;
