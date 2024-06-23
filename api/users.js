const express = require('express');
const { MongoClient } = require('mongodb');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(bodyParser.json());

// Configurar MongoDB
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

const connectMongoDB = async () => {
  if (!client.isConnected()) {
    try {
      await client.connect();
      console.log('Conexión establecida correctamente con MongoDB');
    } catch (error) {
      console.error('Error al conectar con MongoDB:', error);
      throw error;
    }
  }
};

app.post('/api/users', async (req, res) => {
  const { name, email, password } = req.body;

  try {
    await connectMongoDB();
    const database = client.db('abmUsers');
    const collection = database.collection('users');

    const existingUser = await collection.findOne({ $or: [{ name }, { email }] });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const newUser = { name, email, password };
    const result = await collection.insertOne(newUser);
    res.status(201).json({ message: 'User created successfully', userId: result.insertedId });
  } catch (error) {
    console.error('Error al crear usuario:', error);
    res.status(500).json({ message: 'Error creating user' });
  }
});

// Middleware de manejo de errores
app.use((err, req, res, next) => {
  console.error('Error in Express middleware:', err);
  res.status(500).json({ message: 'Something broke!' });
});

module.exports = app;
