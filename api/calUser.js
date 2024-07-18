const express = require('express');
const { MongoClient } = require('mongodb');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();
const router = express.Router();
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

// Middleware para permitir solicitudes CORS desde cualquier origen (solo para pruebas locales)
router.use(cors());

// Middleware para analizar el cuerpo de la solicitud JSON
router.use(bodyParser.json());

// Middleware asincrónico para conectar MongoDB antes de cada solicitud
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

// Ruta para recibir y guardar las calorías
router.post('/cal', async (req, res) => {
  const { userEmail, calories } = req.body;

  if (!userEmail || !calories) {
    return res.status(400).json({ message: 'mail and calories are required' });
  }

  try {
    const db = req.dbClient.db('abmUsers');
    const collection = db.collection('users');

    // Actualiza el documento del usuario con las calorías
    const result = await collection.updateOne(
      { $push: { calories: { value: calories, date: new Date() } } },
      { upsert: true } // Crea un nuevo documento si no existe
    );

    res.status(201).json({ message: 'Calories added successfully', data: result });
  } catch (error) {
    console.error('Error saving calories:', error);
    res.status(500).json({ message: 'Error saving calories' });
  }
});

// Middleware de manejo de errores
router.use((err, req, res, next) => {
  console.error('Error in Express middleware:', err);
  res.status(500).json({ message: 'Something broke!' });
});

module.exports = router;
