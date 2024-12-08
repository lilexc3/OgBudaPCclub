const { MongoClient } = require('mongodb');
require('dotenv').config();

const uri = process.env.MONGO_URI;
let client;
let db;

async function connectToDatabase() {
    try {
        if (!client) {
            console.log('Attempting to connect with URI:', uri.replace(/\/\/.*@/, '//<credentials>@'));
            client = new MongoClient(uri);
            await client.connect();
            console.log('Connected to MongoDB Atlas');
        }
        db = client.db('ogbuda_db');
        return db;
    } catch (error) {
        console.error('Error connecting to MongoDB Atlas:', error);
        throw error;
    }
}

function getDb() {
    if (!db) {
        throw new Error('Database not initialized. Call connectToDatabase first.');
    }
    return db;
}

module.exports = { connectToDatabase, getDb };

