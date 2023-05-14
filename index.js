
const express = require("express");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const jwt = require('jsonwebtoken');

// middle wares 
app.use(cors());
app.use(express.json());



const uri = `mongodb+srv://${process.env.DB_User}:${process.env.DB_Pass}@cluster0.bna95n2.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});


const verifyJWT = (req, res, next) =>{
  // const token = req.headers.authorization.split(" ")[1];
  const authorization = req.headers.authorization;
  console.log(authorization)

  // if header is not valid
  if(!authorization){
    return res.status(401).send({error: true, message: "Unauthorized access"});
  }

  const token = authorization.split(" ")[1];
  jwt.verify(token, process.env.SECRET_ACCESS_TOCKEN, (error, decoded)=>{
    if(error){
      return res.status(403).send({error: true, message: "Unauthorized access"});
    }
    req.decoded = decoded;
    next();
  })
}

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();


    const serviceCollection = client.db("CarDoctorServer").collection("services");
    const bookingCollection = client.db("CarDoctorServer").collection("booking");

    //JWT 
    app.post("/jwt", (req, res)=>{
      const user = req.body;
      console.log(user)
      const token = jwt.sign(user, process.env.SECRET_ACCESS_TOCKEN, {expiresIn: "1h"});

      res.send({token});
    })

    // services 
    app.get("/services", async (req, res) => {
      const cursor = serviceCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    })

    app.get("/services/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id)};

      const options = {
        projection: { _id: 1, title: 1, price: 1, img:1 },
      };
      const result = await serviceCollection.findOne(query, options);
      res.send(result)
    })

    // Bookings 
    app.post("/booking", async(req, res) =>{
      const data = req.body;
      // console.log(data);
      const result = await bookingCollection.insertOne(data);
      res.send(result)
    })

    app.get("/bookings", verifyJWT, async (req, res) =>{
      // console.log(req.decoded.email)
      if(req.decoded.email !== req.query.email){
        return req.status(403).send({error: true, message: "Forbidden access"});
      }


      let query = {};
      // console.log(req.query?.email)

      if(req.query?.email){
        query = {email: req.query.email};
      }

      const cursor = bookingCollection.find(query);
      const result = await cursor.toArray();
      res.send(result)
    })

    app.delete("/bookings/:id", async(req, res) =>{
      const id = req.params.id;

      const query = {_id: new ObjectId(id)};
      const result = await bookingCollection.deleteOne(query);
      res.send(result);
    })

    app.patch("/bookings/:id", async (req, res) =>{
      const id = req.params.id;
      const status = req.body;

      const filter = {_id: new ObjectId(id)}
      const options = { upsert: true };
      const updatedBooking = {
        $set: {
          status: status.status
        }
      }

      const result = await bookingCollection.updateOne(filter, updatedBooking, options)
      res.send(result);
    })

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);






app.get("/", (req, res) => {
  res.send("Doctor is running");
})

app.listen(port, () => {
  console.log(`Doctor server is running on port ${port}`);
})