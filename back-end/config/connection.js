require('dotenv').config();
const { MongoClient } = require('mongodb');
const mongoose=require('mongoose')
const uri = "mongodb+srv://antokochumon2:<db_GMzbWxWNCN76EsV5>@cluster0.i8veo.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
const state = { db: null };

module.exports.connect = async function () {
  try {
    
    const url = process.env.MONGO_URI; // Load MongoDB URI from .env
    if (!url) {
      throw new Error("❌ MONGO_URI is not defined. Check your .env file.");
    }

    const client = await MongoClient.connect(url);

    state.db = client.db(); // Connect to the database
    console.log("✅ Connected to MongoDB Atlas");
    
  } catch (err) {
    console.error("❌ MongoDB Connection Error:", err);
    process.exit(1);
  }
};

module.exports.get = function () {
  if (!state.db) {
    throw new Error("❌ Database not connected. Ensure connection is established before accessing.");
  }
  return state.db;
};
