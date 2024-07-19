const express = require('express');
const { MongoClient } = require('mongodb');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();
const router = express.Router();
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

router.use(cors());
router.use(bodyParser.json());

router.use(async (req, res, next) => {
  try {
    if (!client.topology || !client.topology.isConnected()) {
      await client.connect();
      console.log('Conexión establecida correctamente con MongoDB');
    }
    req.dbClient = client;
    next();
  } catch (error) {
    console.error('Error al conectar con MongoDB:', error);
    res.status(500).json({ message: 'Error connecting to database' });
  }
});

router.post('/cal', async (req, res) => {
  const { userEmail, calories } = req.body;

  if (!userEmail || !calories) {
    return res.status(400).json({ message: 'Email and calories are required' });
  }

  try {
    const db = req.dbClient.db('abmUsers');
    const collection = db.collection('users');

    const result = await collection.updateOne(
      { email: userEmail }, // Usamos el campo `email` como filtro
      { $push: { calories: { value: calories, date: new Date() } } }, // Agregamos las calorías
      { upsert: false } // No crear un nuevo documento si no existe
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(201).json({ message: 'Calories added successfully', data: result });
  } catch (error) {
    console.error('Error saving calories:', error);
    res.status(500).json({ message: 'Error saving calories' });
  }
});

router.use((err, req, res, next) => {
  console.error('Error in Express middleware:', err);
  res.status(500).json({ message: 'Something broke!' });
});

module.exports = router;
