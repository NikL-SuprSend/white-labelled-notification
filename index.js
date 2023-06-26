require("dotenv").config()
const express = require("express")
const mongoose = require("mongoose")
const bodyParser = require("body-parser") 

const User = require("./models/user")
const Product = require("./models/product");

const {Suprsend} = require("@suprsend/node-sdk");
const { Workflow } = require("@suprsend/node-sdk")

const app = express();
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended:true})); 
app.use(express.static("public"));


mongoose.set('strictQuery', true);
const URI = process.env.MOGODB_URI;
mongoose.connect(URI, {useNewUrlParser: true});

const workspace_key = process.env.WORKSPACE_KEY;
const workspace_secret = process.env.WORKSPACE_SECRET;
const supr_client = new Suprsend(workspace_key, workspace_secret);


/********************************Handling Get requests ****************************************/

app.get("/",function(req, res){
    res.render("homepage");
}); 

app.get("/Add-Tenants",function(req, res){
  res.render("AddTenant");
}); 

app.get("/Add-Users",function(req, res){
  res.render("AddUser");
}); 

app.get("/Add-Products",function(req, res){
    res.render("AddProduct");
});

app.get("/show-products", async function(req, res) {
  try {
    const products = await Product.find({}, 'product_id product_name');
    const productArray = products.map(product => {
      return {
        product_id: product.product_id,
        product_name: product.product_name
      };
    });
    res.render("showproducts",{
      infoarr : productArray
    })
  } catch (error) {
    console.error('Error retrieving products:', error);
    res.status(500).send('Internal Server Error');
  }
});

/****************************************** Adding Users  ***************************************/

app.post("/AddUsers",function(req,res){
  const {name,email,phone} = req.body;
   const username = email;
   const newUser = new User({
    username: username,
    name : name,
    email : email,
    phone : phone,
   })
  User.findOne({ username: newUser.username })
  .then(existingUser => {
    if (existingUser) {
      return res.send('<script>alert("Sorry, but the user already exists Please try again with different user name"); window.location.href = "/Add-Users";</script>');
    } else {
      newUser.save()
        .then(savedUser => {
           console.log("user saved");
        })
        .catch(err => {
          console.log(err);
        });
        res.redirect("/");
    }
  })
  .catch(err => {
    console.log(err);
  });
})


/****************************************** Adding Products ***************************************/

app.post("/AddProducts",function(req,res){
    const {product_id,product_name,category,price} = req.body;
    const newProduct = new Product({
      product_id : product_id,
      product_name : product_name,
      category : category,
      price : price
  })
  Product.findOne({product_id: newProduct.product_id})
  .then(existingProduct => {
    if (existingProduct) {
      return res.send('<script>alert("Sorry, but the Product with the same id already exists Please try again with different Product id"); window.location.href = "/Add-Products" ;</script>');
    } else {
      console.log(existingProduct);
      newProduct.save()
        .then(savedProduct => {
          console.log("product Saved");
        })
        .catch(err => {
          console.log(err);
        });
        res.redirect("/");
    }
  })
  .catch(err => {
    console.log(err);
  });
})


/****************************************** Adding Tenants to suprsend ***************************************/

app.post("/AddTenants",function(req,res){
  const {brand_id,brand_name,logo_url,website,company_name,primaryColor,secondaryColor,tertiaryColor} = req.body;
  brand_payload = {
    "brand_id": brand_id,
    "brand_name": brand_name,
    "logo": logo_url,
    "primary_color": primaryColor,
    "secondary_color": secondaryColor,
    "tertiary_color": tertiaryColor,
    "social_links": {
      "website": website,
      "facebook": "https://www.facebook.com/"+company_name,
      "linkedin": "https://in.linkedin.com/company/"+company_name,
      "twitter": "https://twitter.com/"+company_name,
      "instagram": "https://www.instagram.com/"+company_name,
    },
    "properties": {
      "prop1": "value1",
      "prop2": "value2"
    }
   }   

  const response = supr_client.brands.upsert(brand_id, brand_payload); // returns promise
  response.then((res) => console.log("response", res));
  res.redirect("/");
})

/****************************************** Sending Notifications ***************************************/

app.post("/send-notification", async (req, res) => {
  const { user_id, product_id, order_no, date, tenant_id } = req.body;
  let user_phone = "",user_email = "",user_name = "";
  let product_name = "",product_category = "",product_price = "";

  let user_exists = true;
  let product_exists = true;

  try {
    const existingUser = await User.findOne({ username: user_id });
    if (existingUser) {
      user_phone = existingUser.phone;
      user_name = existingUser.name;
      user_email = existingUser.email;
    } else {
      console.log("User does not exist");
      user_exists = false;
    }

    const existingProduct = await Product.findOne({ product_id: product_id });
    if (existingProduct) {
      product_name = existingProduct.product_name;
      product_category = existingProduct.category;
      product_price = existingProduct.price;
    } else {
      console.log("Product does not exist");
      product_exists = false;
    }

    if(!user_exists||!product_exists){
      return res.send('<script>alert("Sorry,But the User_id or Product_id you entered does not exists "); window.location.href = "/" ;</script>');
    }
    else
{

    const workflow_body = {
    "name": "White labeled notification",
    "template": "suprsend-white-labelled-notification-2",
    "notification_category": "transactional",
    "users": [
      {
        "distinct_id": user_id,
        "$email": [user_email],
        "$sms" : ["+"+user_phone],
      }
    ],

    "delivery": {
      "success": "seen",
      "mandatory_channels": [] 
    },

    "data": {
        "name":user_name,
        "product":product_name,
        "order_no" : order_no,
        "Product_price" : product_price,
        "Date":date,
    }
  }
  let check = true;
  const wf = new Workflow(workflow_body,{brand_id : tenant_id });
  const response =  supr_client.trigger_workflow(wf) 
  response.then((res) =>{ 
    console.log("response", res)
    if(res.success===true && res.status_code==202){
      check = true;
    }
    else{
      check = false;
    }
  });  
  if(check){
     res.render("Alerts/notificationsent.ejs")
  }
  else {
    res.render("Alerts/notsent.ejs")
  }
}
  } catch (err) {
    console.log(err);
    res.status(500).send("Internal Server Error");
  }
});

/****************************************** Listen event  ***************************************/

app.listen(3000,function(){
    console.log("server started on port 3000");
})
