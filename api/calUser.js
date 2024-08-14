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
      { email: userEmail, 'calories.0': { $exists: true } }
    );
    if (user && user.calories && user.calories.length > 0) {
      return res.status(200).json({ calories: user.calories });
    }
    res.status(404).json({ message: 'No calories record found for this user' });
  } catch (error) {
    console.error('Error retrieving calories:', error);
    res.status(500).json({ message: 'Error retrieving calories' });
  }
});

// Actualizar calorías (PUT)
router.put('/cal', async (req, res) => {
  const { userEmail, calories, CalMonth } = req.body;

  if (!userEmail || calories == null || !CalMonth) {
    return res.status(400).json({ message: 'Email, calories, and CalMonth are required' });
  }

  try {
    const db = req.dbClient.db('abmUsers');
    const collection = db.collection('users');

    const currentDate = new Date(calories.date);
    const currentMonth = Object.keys(CalMonth)[0];
    const currentDay = Object.keys(CalMonth[currentMonth]?.days || {})[0];

    // Filtro para encontrar el documento del usuario
    const filter = { email: userEmail };

    // Actualización para añadir o actualizar el mes y el día
    const update = {
      $set: {
        'calories.$[elem].value': calories.value,
        'calories.$[elem].date': currentDate,
        [`CalMonth.${currentMonth}.days.${currentDay}.calories`]: calories.value,
        [`CalMonth.${currentMonth}.days.${currentDay}.date`]: currentDate,
        [`CalMonth.${currentMonth}`]: {
          ...CalMonth[currentMonth],
          days: {
            ...CalMonth[currentMonth]?.days,
            [currentDay]: {
              calories: calories.value,
              date: currentDate
            }
          }
        }
      },
      $setOnInsert: {
        'CalMonth': CalMonth
      }
    };

    // Opciones para la actualización
    const options = {
      arrayFilters: [{ 'elem.value': { $exists: true } }],
      upsert: true
    };

    // Actualizar o insertar el documento
    const result = await collection.updateOne(filter, update, options);

    if (result.modifiedCount > 0 || result.upsertedCount > 0) {
      return res.status(200).json({ message: 'Calories updated successfully' });
    }

    res.status(404).json({ message: 'User not found or no calories to update' });
  } catch (error) {
    console.error('Error updating calories:', error);
    res.status(500).json({ message: 'Error updating calories' });
  }
});

// Crear un nuevo registro de calorías (POST)
router.post('/cal', async (req, res) => {
  const { userEmail, calories, CalMonth } = req.body;

  if (!userEmail || calories == null || !CalMonth) {
    return res.status(400).json({ message: 'Email, calories, and CalMonth are required' });
  }

  try {
    const db = req.dbClient.db('abmUsers');
    const collection = db.collection('users');

    const currentDate = new Date(calories.date);
    const currentMonth = Object.keys(CalMonth)[0];
    const currentDay = Object.keys(CalMonth[currentMonth]?.days || {})[0];

    // Actualizar o insertar el documento
    const result = await collection.updateOne(
      { email: userEmail },
      { 
        $push: { calories: { value: calories.value, date: currentDate } },
          $set: {
            [`CalMonth.${currentMonth}.days.${currentDay}`]: {
              calories: calories.value,
              date: currentDate
            },
            [`CalMonth.${currentMonth}`]: {
              ...CalMonth[currentMonth],
              days: {
                ...CalMonth[currentMonth]?.days,
                [currentDay]: {
                  calories: calories.value,
                  date: currentDate
                }
              }
            }
          }
      },
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
