const db = require('../config/connection');
const collection = require('../config/collection');
const { ObjectId } = require('mongodb');
const fs = require('fs');
const path = require('path');

module.exports = {
    // Add a new product
    addProduct: (product) => {
        return new Promise(async (resolve, reject) => {
            try {
                // Validate required fields
                if (!product.Name || !product.Category || !product.Price || !product.Description || !product.Image) {
                    throw new Error("Missing required fields");
                }

                const productData = {
                    Name: product.Name,
                    Category: product.Category,
                    Price: product.Price,
                    Description: product.Description,
                    Image: product.Image, // Save main image filename
                    additionalImages: product.additionalImages || [] // Save additional image filenames
                };

                console.log("Product data being inserted:", productData); // Log the product data

                let data = await db.get().collection(collection.PRODUCT_COLLECTION).insertOne(productData);
                console.log("Product inserted successfully. Inserted ID:", data.insertedId); // Log the inserted ID
                resolve(data.insertedId);
            } catch (err) {
                console.error("Error inserting product:", err); // Log any errors
                reject(err);
            }
        });
    },

    // Get all products
    getAllProducts: (page = 1, limit = 10) => {
        return new Promise(async (resolve, reject) => {
            try {
                let skip = (page - 1) * limit;
                let products = await db.get().collection(collection.PRODUCT_COLLECTION)
                    .find()
                    .skip(skip)
                    .limit(limit)
                    .toArray();
                resolve(products);
            } catch (err) {
                console.error("Error fetching products:", err);
                reject(err);
            }
        });
    },

    // Delete a product
    deleteProduct: (productId) => {
        return new Promise(async (resolve, reject) => {
            try {
                // Fetch the product to get image filenames
                let product = await db.get().collection(collection.PRODUCT_COLLECTION).findOne({ _id: new ObjectId(productId) });
                if (!product) {
                    throw new Error("Product not found");
                }

                // Delete the main image
                if (product.Image) {
                    let imagePath = path.join(__dirname, '../public/product-images', product.Image);
                    if (fs.existsSync(imagePath)) {
                        fs.unlinkSync(imagePath);
                    }
                }

                // Delete additional images
                if (product.additionalImages && product.additionalImages.length > 0) {
                    product.additionalImages.forEach(image => {
                        let imagePath = path.join(__dirname, '../public/product-images', image);
                        if (fs.existsSync(imagePath)) {
                            fs.unlinkSync(imagePath);
                        }
                    });
                }

                // Delete the product from the database
                let response = await db.get().collection(collection.PRODUCT_COLLECTION).deleteOne({ _id: new ObjectId(productId) });
                console.log("Delete response:", response);
                resolve(response);
            } catch (err) {
                console.error("Delete error:", err);
                reject(err);
            }
        });
    },

    // Get product details by ID
    getProductDetails: (productId) => {
        return new Promise(async (resolve, reject) => {
            try {
                let product = await db.get().collection(collection.PRODUCT_COLLECTION).findOne({ _id: new ObjectId(productId) });
                resolve(product);
            } catch (err) {
                reject(err);
            }
        });
    },

    // Update a product
    updateProduct: (proId, proDetails) => {
        return new Promise(async (resolve, reject) => {
            try {
                let updateData = {
                    Name: proDetails.Name,
                    Description: proDetails.Description,
                    Price: proDetails.Price,
                    Category: proDetails.Category,
                };
    
                // Update the main image if provided
                if (proDetails.Image) {
                    updateData.Image = proDetails.Image;
                }
    
                // Update additional images if provided
                if (proDetails.additionalImages) {
                    updateData.additionalImages = proDetails.additionalImages;
                }
    
                let response = await db.get().collection(collection.PRODUCT_COLLECTION)
                    .updateOne({ _id: new ObjectId(proId) }, { $set: updateData });
    
                resolve(response);
            } catch (err) {
                reject(err);
            }
        });
    },
    // Remove additional image from product
    removeAdditionalImage: (productId, imageName) => {
        return new Promise(async (resolve, reject) => {
            try {
                let response = await db.get().collection(collection.PRODUCT_COLLECTION)
                    .updateOne({ _id: new ObjectId(productId) }, { $pull: { additionalImages: imageName } });

                resolve(response);
            } catch (err) {
                reject(err);
            }
        });
    },

    // Get products by category
    getProductsByCategory: (category) => {
        return new Promise(async (resolve, reject) => {
            try {
                let products = await db.get().collection(collection.PRODUCT_COLLECTION)
                    .find({ Category: category })
                    .toArray();
                resolve(products);
            } catch (err) {
                console.error("Error fetching products by category:", err);
                reject(err);
            }
        });
    }
};