var db = require('../config/connection');
var collection=require('../config/collection')
const { ObjectId } = require('mongodb');
const { response } = require('../app');
module.exports = {
   

    addProduct:(product,callback)=>{
      console.log(product);

      db.get().collection('product').insertOne(product).then((data)=>{
       
        callback(data.insertedId)
      })


    },
    getAllProducts:()=>{
      return new Promise(async(resolve,rejects)=>{
        let products=await db.get().collection(collection.PRODUCT_COLLECTION).find().toArray();
        resolve(products)
      })
    },
    deleteProduct: (productId) => {
      return new Promise((resolve, reject) => {
        // Use the productId passed in, not proId
        db.get().collection(collection.PRODUCT_COLLECTION).deleteOne({ _id: new ObjectId(productId) })
          .then((response) => {
            console.log("Delete response:", response);
            resolve(response);  // Resolve with response
          })
          .catch((err) => {
            console.error("Delete error:", err);
            reject(err);  // Reject with error
          });
      });
    },
    getProductDetails: (productId) => {
      return new Promise((resolve, reject) => {
        db.get().collection(collection.PRODUCT_COLLECTION).findOne({ _id: new ObjectId(productId) }).then((product) => {
            resolve(product);
          })
      });
    },
    updateProduct:(proId,proDetails)=>{
      return new Promise((resolve,reject)=>{
        db.get().collection(collection.PRODUCT_COLLECTION)
        .updateOne({_id: new ObjectId(proId)},{
          $set:{
            Name:proDetails.Name,
            Description:proDetails.Description,
            price:proDetails.price,
            Category:proDetails.Category
          }
        }).then((response)=>{
          resolve()
        })
      })
    }
    
}
