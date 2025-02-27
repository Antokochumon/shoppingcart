var express = require('express');

var router = express.Router();
const productHelpers=require('../helpers/product-helpers');
const { response } = require('../app');
/* GET users listing. */
router.get('/', function(req, res, next) {
 productHelpers.getAllProducts().then((products)=>{
  console.log(products);
  res.render('admin/view-products',{admin:true,products})
 })
 
});
router.get('/add-product',function(req,res){
  res.render('admin/add-product')
})
router.post('/add-product',(req,res)=>{
router.post('/add-product', (req, res) => {
    console.log(req.body);
    console.log(req.files.Image);

    productHelpers.addProduct(req.body, (id) => {
        let image = req.files.Image;
        console.log(id);

        // Define the path where the image will be saved
        const uploadPath = path.join(__dirname, '../public/product-images', `${id}.jpg`);

        // Ensure that the 'product-images' directory exists
        const dirPath = path.dirname(uploadPath);
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }

        // Move the image to the specified path
        image.mv(uploadPath, (err) => {
            if (!err) {
                res.redirect('/admin'); // Redirect to admin page after successful upload
            } else {
                console.log(err);
                res.status(500).send('Image upload failed');
            }
        });
    });
})
router.get('/delete-product/:id', (req, res) =>{
    
      let proId = req.params.id;
      console.log( proId);
  
      productHelpers.deleteProduct(proId).then((response)=>{
        res.redirect('/admin/');
      })
  });
  
  router.get('/edit-product/:id', async (req, res) => {
      let product = await productHelpers.getProductDetails(req.params.id); // ✅ Correct function name
      console.log(product);
      res.render('admin/edit-product',{product}); // ✅ Pass product data to the view
   
  });
  


  const path = require('path');  // Import path module
  
  router.post('/edit-product/:id', async (req, res) => {
      console.log(req.params.id);
      let id = req.params.id;
  
      
      try {
          await productHelpers.updateProduct(id, req.body);
  
          if (req.files && req.files.Image) {
              let image = req.files.Image;
              let uploadPath = path.join(__dirname, '../public/product-images', id + '.jpg'); // Define upload path
  
              image.mv(uploadPath, (err) => {
                  if (err) {
                      console.log(err);
                      return res.status(500).send('Image upload failed');  // Respond and return to prevent multiple responses
                  }
                  res.redirect('/admin'); // Redirect only after successful upload
              });
          } else {
              res.redirect('/admin'); // Redirect if there's no image upload
          }
      } catch (err) {
          console.error(err);
          res.status(500).send('Error updating product');
      }
  });
  
  
module.exports = router;
