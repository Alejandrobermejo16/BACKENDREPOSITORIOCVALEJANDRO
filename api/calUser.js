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
router.put('/cal', async (req, res) => {
  const { userEmail, calories, CalMonth } = req.body;

  if (!userEmail || calories == null || !CalMonth) {
    return res.status(400).json({ message: 'Email, calories, and CalMonth are required' });
  }

  try {
    const db = req.dbClient.db('abmUsers');
    const collection = db.collection('users');

    // Obtener la fecha actual
    const fechaActual = new Date();

    // Formatear mes y día en español
    const mesActualEnEspañol = new Intl.DateTimeFormat('es-ES', { month: 'long' }).format(fechaActual);
    const dia = fechaActual.getDate(); // Día actual del mes

    // Construir la ruta de actualización dinámica
    const updatePath = `CalMonth.${mesActualEnEspañol}.days.${dia}.calories`;

    console.log("updatePath:", updatePath);
    console.log("calories.value:", calories.value);
    console.log("calories.date:", calories.date);

    // Verificar si el usuario existe y la estructura básica
    const user = await collection.findOne({ email: userEmail });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Actualizar el documento en MongoDB
    const result = await collection.updateOne(
      { email: userEmail },
      { 
        $set: { 
          [updatePath]: calories.value,  // Actualiza las calorías en la ruta dinámica
          'calories.value': calories.value,
          'calories.date': new Date(calories.date),
        }
      }
    );

    if (result.modifiedCount > 0) {
      return res.status(200).json({ message: 'Calories updated successfully' });
    } else {
      return res.status(404).json({ message: 'No calories to update' });
    }

  } catch (error) {
    console.error('Error actualizando las calorías:', error);
    return res.status(500).json({ message: 'Error actualizando las calorías', errorDetails: error });
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
        $set: { CalMonth: CalMonth }
      },
      { upsert: true }
    );
    res.status(201).json({ message: 'Calories created successfully', data: result, CalMonth: CalMonth });
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