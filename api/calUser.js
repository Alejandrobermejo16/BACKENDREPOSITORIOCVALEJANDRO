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
      { email: userEmail },
      { projection: { calories: 1, CalMonth: 1 } }
    );

    if (user) {
      return res.status(200).json(user);
    }

    res.status(404).json({ message: 'No calories record found for this user' });
  } catch (error) {
    console.error('Error retrieving calories:', error);
    res.status(500).json({ message: 'Error retrieving calories' });
  }
});

// Actualizar o insertar calorías (POST/PUT)
router.put('/cal', async (req, res) => {
  const { userEmail, calories, CalMonth } = req.body;

  if (!userEmail || calories == null || !CalMonth) {
    return res.status(400).json({ message: 'Email, calories, and CalMonth are required' });
  }

  try {
    const db = req.dbClient.db('abmUsers');
    const collection = db.collection('users');

    const currentDate = new Date(calories.date);
    const currentMonth = currentDate.toLocaleString('default', { month: 'long' });
    const currentDay = currentDate.getDate();

    const user = await collection.findOne({ email: userEmail });

    if (user) {
      // Si ya existe un registro de calorías para el día actual, sumamos las nuevas calorías
      const existingCalories = user.CalMonth?.[currentMonth]?.days?.[currentDay]?.calories || 0;
      const updatedCalories = existingCalories + calories.value;

      // Actualizamos el registro de calorías del usuario
      const result = await collection.updateOne(
        { email: userEmail },
        {
          $set: {
            'calories.value': updatedCalories,
            'calories.date': currentDate,
            [`CalMonth.${currentMonth}.days.${currentDay}.calories`]: updatedCalories
          }
        },
        { upsert: true }
      );

      return res.status(200).json({ message: 'Calories updated successfully', data: result });
    } else {
      // Si el usuario no existe, creamos un nuevo documento para él
      const result = await collection.updateOne(
        { email: userEmail },
        {
          $set: {
            'calories.value': calories.value,
            'calories.date': currentDate,
            [`CalMonth.${currentMonth}.days.${currentDay}.calories`]: calories.value
          }
        },
        { upsert: true }
      );

      return res.status(201).json({ message: 'Calories created successfully', data: result });
    }
  } catch (error) {
    console.error('Error updating calories:', error);
    res.status(500).json({ message: 'Error updating calories' });
  }
});

// Middleware de manejo de errores
router.use((err, req, res, next) => {
  console.error('Error en Express middleware:', err);
  res.status(500).json({ message: 'Something broke!' });
});

module.exports = router;
