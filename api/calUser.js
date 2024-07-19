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
    return res.status(400).json({ message: 'mail and calories are required' });
  }

  try {
    const db = req.dbClient.db('abmUsers');
    const collection = db.collection('users');

    const result = await collection.updateOne(
      { userEmail }, // Filtro para encontrar el documento
      { $push: { calories: { value: calories, date: new Date() } } }, // Actualización
      { upsert: true } // Crear un nuevo documento si no existe
    );

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
