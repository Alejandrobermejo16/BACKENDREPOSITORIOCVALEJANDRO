const express = require('express');
const { MongoClient } = require('mongodb');
const bodyParser = require('body-parser');
const cors = require('cors');
const cron = require('node-cron'); // Añadido para el cron job
require('dotenv').config();
const router = express.Router();
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

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

    // Buscar el usuario y verificar si tiene calorías registradas
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
  const { userEmail, calories } = req.body;

  if (!userEmail || calories == null) {
    return res.status(400).json({ message: 'Email and calories are required' });
  }

  try {
    const db = req.dbClient.db('abmUsers');
    const collection = db.collection('users');

    // Actualizar el valor de las calorías del usuario
    const result = await collection.updateOne(
      { email: userEmail },
      { $set: { 'calories.$[elem].value': calories, 'calories.$[elem].date': new Date() } },
      { arrayFilters: [{ 'elem.value': { $exists: true } }] }
    );

    if (result.modifiedCount > 0) {
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
  const { userEmail, calories } = req.body;

  if (!userEmail || calories == null) {
    return res.status(400).json({ message: 'Email and calories are required' });
  }

  try {
    const db = req.dbClient.db('abmUsers');
    const collection = db.collection('users');

    // Insertar el nuevo registro de calorías si no existe
    const result = await collection.updateOne(
      { email: userEmail },
      { $push: { calories: { value: calories, date: new Date() } } },
      { upsert: true }
    );

    res.status(201).json({ message: 'Calories created successfully', data: result });
  } catch (error) {
    console.error('Error creating calories:', error);
    res.status(500).json({ message: 'Error creating calories' });
  }
});

// Cron job para restablecer las calorías del primer elemento a 0 cada minuto
cron.schedule('* * * * *', async () => {
  console.log('Cron job ejecutándose cada minuto para restablecer el valor de calorías a 0...');
  try {
    // Conectar a la base de datos si no está conectado
    if (!client.topology || !client.topology.isConnected()) {
      await client.connect();
      console.log('Conexión establecida correctamente con MongoDB desde cron job');
    }

    const db = client.db('abmUsers');
    const collection = db.collection('users');

    // Actualizar el valor de las calorías del primer elemento en el array a 0
    const result = await collection.updateMany(
      { 'calories.0.value': { $exists: true } }, // Asegurarse de que el primer elemento existe
      { $set: { 'calories.0.value': 0 } } // Actualizar solo el primer elemento del array
    );

    console.log('Calorías del primer elemento de todos los usuarios restablecidas a 0');
    console.log('Resultado de la actualización:', result);
  } catch (error) {
    console.error('Error al restablecer las calorías:', error);
  }
});

router.use((err, req, res, next) => {
  console.error('Error in Express middleware:', err);
  res.status(500).json({ message: 'Something broke!' });
});

module.exports = router;
