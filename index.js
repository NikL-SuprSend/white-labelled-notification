require("dotenv").config()

const express = require("express")

const bodyParser = require("body-parser") 

const {Suprsend} = require("@suprsend/node-sdk");
const { Workflow } = require("@suprsend/node-sdk")


const app = express();

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended:true})); 
app.use(express.static("public"));

const workspace_key = process.env.WORKSPACE_KEY;
const workspace_secret = process.env.WORKSPACE_SECRET;

const supr_client = new Suprsend(workspace_key, workspace_secret);
const bulk_ins = supr_client.bulk_workflows.new_instance()

app.get("/",function(req, res){
    res.render("homepage");
 }); 

app.post("/send-notification", (req, res) => {
    const sender = req.body.sender;
    const message = req.body.message;
    const email = req.body.Email;
    const phone  = req.body.phone;
    const order = req.body.orderno;
    const receiver = req.body.receiver;
    const product = req.body.product;
/* * * * * prepare work flow for the users so that they can notified about their order * * * * */

    const workflow_body1 = {
    "name": "Developer Testing - white labelled notifcation",
    "template": "suprsend-white-labelled-notification",
    "notification_category": "transactional",
  
    "users": [
      {
        "distinct_id": email,
        "$email": [email],
        "$sms" : [phone],
      }
    ],

    // delivery instruction. how should notifications be sent, and whats the success metric
    "delivery": {
      "success": "seen",
      "mandatory_channels": [] // list of mandatory channels e.g ["email"]
    },
    // data can be any json
    "data": {
      "sender": sender,
      "message":message,
      "order_no":order,
      "receiver":receiver,
      "product":product,
      "nested_key_example": {
        "nested_key1": "some_value_1",
        "nested_key2": {
          "nested_key3": "some_value_3",
        },
      }
    }
  }

/* * * * * prepare work flow for the company so that they can notified about the order * * * * */
  
const company_mail = process.env.COMPANY_EMAIL;

const workflow_body2 = {
  "name": "Developer Testing - company",
  "template": "suprsend-company-notification",
  "notification_category": "transactional",

  "users": [
    {
      "distinct_id": email,
      "$email": [company_mail],
    }
  ],

  // delivery instruction. how should notifications be sent, and whats the success metric
  "delivery": {
    "success": "seen",
    "mandatory_channels": [] // list of mandatory channels e.g ["email"]
  },
  // data can be any json
  "data": {
    "sender": sender,
    "message":message,
    "order_no":order,
    "receiver":receiver,
    "product":product,
    "nested_key_example": {
      "nested_key1": "some_value_1",
      "nested_key2": {
        "nested_key3": "some_value_3",
      },
    }
  }
}

  const workflow1 = new Workflow(workflow_body1,{brand_id : "customlogo"})
  const workflow2 = new Workflow(workflow_body2,{brand_id : "customlogo"})

  // Trigger workflow

  // --- use .append on bulk instance to add one or more records
  bulk_ins.append(workflow1, workflow2)

  const response = bulk_ins.trigger()
  response.then((res) => console.log("response", res));

  res.send('Notification sent successfully!');
});

app.listen(3000,function(){
    console.log("server started on port 3000");
})