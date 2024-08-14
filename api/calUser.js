const express = require('express');
const { MongoClient } = require('mongodb');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();
const cron = require('node-cron');
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

    // Extraer mes y día del objeto CalMonth
    const [currentMonth] = Object.keys(CalMonth);
    const [currentDay] = Object.keys(CalMonth[currentMonth].days);
    const updatedCalories = CalMonth[currentMonth].days[currentDay].calories;

    // Buscar el usuario
    const user = await collection.findOne({ email: userEmail });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verificar si el mes y el día existen en el documento del usuario
    const monthExists = user.CalMonth && user.CalMonth[currentMonth];
    const dayExists = monthExists && user.CalMonth[currentMonth].days && user.CalMonth[currentMonth].days[currentDay];

    if (!monthExists || !dayExists) {
      return res.status(404).json({ message: 'Month or day not found' });
    }

    // Actualizar las calorías solo si hay cambios
    const updateResult = await collection.updateOne(
      { email: userEmail },
      {
        $set: {
          [`CalMonth.${currentMonth}.days.${currentDay}.calories`]: updatedCalories,
          'calories.$[elem].value': calories.value,
          'calories.$[elem].date': new Date(calories.date),
        }
      },
      {
        arrayFilters: [{ 'elem.date': { $eq: new Date(calories.date).toISOString() } }],
        upsert: false
      }
    );

    if (updateResult.modifiedCount > 0) {
      return res.status(200).json({ message: 'Calories updated successfully' });
    }

    res.status(404).json({ message: 'No changes detected or record not found' });
  } catch (error) {
    console.error('Error updating calories:', error);
    res.status(500).json({ message: 'Error updating calories' });
  }
});


// Crear o actualizar calorías (POST)
router.post('/cal', async (req, res) => {
  const { userEmail, calories, CalMonth } = req.body;
  if (!userEmail || calories == null || !CalMonth) {
    return res.status(400).json({ message: 'Email, calories, and CalMonth are required' });
  }

  try {
    const db = req.dbClient.db('abmUsers');
    const collection = db.collection('users');

    // Extraer mes y día del objeto CalMonth
    const [currentMonth] = Object.keys(CalMonth);
    const [currentDay] = Object.keys(CalMonth[currentMonth].days);
    const updatedCalories = CalMonth[currentMonth].days[currentDay].calories;

    // Buscar el usuario
    const user = await collection.findOne({ email: userEmail });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Actualizar o agregar el mes y el día
    const result = await collection.updateOne(
      { email: userEmail },
      {
        $set: {
          // Crear o actualizar el mes con el día y las calorías
          [`CalMonth.${currentMonth}.days.${currentDay}.calories`]: updatedCalories,
        },
        $push: { calories: { value: calories.value, date: new Date(calories.date) } }
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