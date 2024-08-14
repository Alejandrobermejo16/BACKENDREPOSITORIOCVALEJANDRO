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

  const todayDate = new Date(calories.date);
  const day = todayDate.getDate(); // Día del mes
  const month = todayDate.getMonth() + 1; // Mes en formato 1-12
  const year = todayDate.getFullYear(); // Año actual
  const monthKey = `${year}-${month.toString().padStart(2, '0')}`; // Clave del mes en formato YYYY-MM

  try {
    const db = req.dbClient.db('abmUsers');
    const collection = db.collection('users');
    
    // Encontrar el usuario
    const user = await collection.findOne({ email: userEmail });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Obtener el objeto CalMonth del usuario
    const calMonthData = user.CalMonth || {};

    // Verificar si el mes existe en CalMonth
    if (calMonthData[monthKey]) {
      // Verificar si el día existe dentro del mes
      if (calMonthData[monthKey][day]) {
        // Si el día existe, actualizar las calorías sumando el nuevo valor
        await collection.updateOne(
          { email: userEmail, [`CalMonth.${monthKey}.${day}`]: { $exists: true } },
          {
            $inc: { [`CalMonth.${monthKey}.${day}.calories`]: calories.value }
          }
        );
        return res.status(200).json({ message: 'Calories updated successfully' });
      } else {
        // Si el día no existe, insertar el nuevo registro
        await collection.updateOne(
          { email: userEmail },
          {
            $set: { [`CalMonth.${monthKey}.${day}`]: { calories: calories.value, date: todayDate } }
          },
          { upsert: true }
        );
        return res.status(201).json({ message: 'Calories created successfully' });
      }
    } else {
      // Si el mes no existe, crear el mes y el día
      await collection.updateOne(
        { email: userEmail },
        {
          $set: { [`CalMonth.${monthKey}`]: { [day]: { calories: calories.value, date: todayDate } } }
        },
        { upsert: true }
      );
      return res.status(201).json({ message: 'Month and day created successfully' });
    }
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
    // Actualizar o insertar el documento
    const result = await collection.updateOne(
      { email: userEmail },
      { 
        $push: { calories: { value: calories.value, date: new Date(calories.date) } },
        $set: CalMonth,
        $set: { 'CalMonth': CalMonth }
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
