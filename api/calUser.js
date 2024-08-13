const express = require('express');
const { MongoClient } = require('mongodb');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();

const router = express.Router();
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

// Configuración de CORS
router.use(cors());
router.use(bodyParser.json());

// Middleware para conectar a la base de datos
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

// Verificar si el usuario tiene registros de calorías
router.get('/cal', async (req, res) => {
  const { userEmail } = req.query;

  if (!userEmail) {
    return res.status(400).json({ message: 'Email is required' });
  }

  try {
    const db = req.dbClient.db('abmUsers');
    const collection = db.collection('users');

    const user = await collection.findOne(
      { email: userEmail }
    );

    if (user && user.CalMonth) {
      return res.status(200).json({ CalMonth: user.CalMonth });
    }

    res.status(404).json({ message: 'No records found for this user' });
  } catch (error) {
    console.error('Error retrieving records:', error);
    res.status(500).json({ message: 'Error retrieving records' });
  }
});

// Actualizar calorías (PUT)
router.put('/cal', async (req, res) => {
  const { userEmail, month, day, calories } = req.body;

  if (!userEmail || !month || !day || calories == null) {
    return res.status(400).json({ message: 'Email, month, day, and calories are required' });
  }

  try {
    const db = req.dbClient.db('abmUsers');
    const collection = db.collection('users');

    // Actualizar el campo 'calories' en 'CalMonth' para el mes y el día especificados
    const result = await collection.updateOne(
      { email: userEmail },
      { $set: { [`CalMonth.${month}.days.${day}.calories`]: calories } }
    );

    if (result.modifiedCount > 0) {
      return res.status(200).json({ message: 'Calories updated successfully' });
    }

    res.status(404).json({ message: 'User not found or no record to update' });
  } catch (error) {
    console.error('Error updating calories:', error);
    res.status(500).json({ message: 'Error updating calories' });
  }
});

// Crear un nuevo registro de calorías (POST)
router.post('/cal', async (req, res) => {
  const { userEmail, month, day, calories } = req.body;

  if (!userEmail || !month || !day || calories == null) {
    return res.status(400).json({ message: 'Email, month, day, and calories are required' });
  }

  try {
    const db = req.dbClient.db('abmUsers');
    const collection = db.collection('users');

    // Agregar o actualizar el campo 'calories' en 'CalMonth' para el mes y el día especificados
    const result = await collection.updateOne(
      { email: userEmail },
      { $set: { [`CalMonth.${month}.days.${day}.calories`]: calories } },
      { upsert: true }
    );

    res.status(201).json({ message: 'Calories created successfully', data: result });
  } catch (error) {
    console.error('Error creating calories:', error);
    res.status(500).json({ message: 'Error creating calories' });
  }
});

// Middleware de manejo de errores
router.use((err, req, res, next) => {
  console.error('Error en Express middleware:', err);
  res.status(500).json({ message: 'Something broke!' });
});

module.exports = router;
