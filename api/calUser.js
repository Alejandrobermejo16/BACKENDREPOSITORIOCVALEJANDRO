const express = require('express');
const { MongoClient } = require('mongodb');
const bodyParser = require('body-parser');
const cors = require('cors');
const cron = require('node-cron');
require('dotenv').config();

// Inicialización del servidor Express
const app = express();
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

app.use(cors());
app.use(bodyParser.json());

// Middleware para conectar con MongoDB
app.use(async (req, res, next) => {
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

// Endpoint para verificar calorías
app.get('/api/cal', async (req, res) => {
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

// Endpoint para actualizar calorías
app.put('/api/cal', async (req, res) => {
  const { userEmail, calories } = req.body;

  if (!userEmail || calories == null) {
    return res.status(400).json({ message: 'Email and calories are required' });
  }

  try {
    const db = req.dbClient.db('abmUsers');
    const collection = db.collection('users');
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

// Endpoint para crear un nuevo registro de calorías
app.post('/api/cal', async (req, res) => {
  const { userEmail, calories } = req.body;

  if (!userEmail || calories == null) {
    return res.status(400).json({ message: 'Email and calories are required' });
  }

  try {
    const db = req.dbClient.db('abmUsers');
    const collection = db.collection('users');
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

// Endpoint para restablecer las calorías a 0
app.post('/api/resetCalories', async (req, res) => {
  try {
    const db = req.dbClient.db('abmUsers');
    const collection = db.collection('users');

    // Restablecer las calorías de todos los usuarios a 0
    await collection.updateMany({}, { $set: { calories: [] } });
    res.status(200).json({ message: 'Calorías restablecidas' });
  } catch (error) {
    console.error('Error al restablecer las calorías:', error);
    res.status(500).json({ message: 'Error al restablecer las calorías' });
  }
});

// Configuración del cron job para restablecer calorías a 00:00
cron.schedule('0 0 * * *', async () => {
  try {
    await client.connect();
    const db = client.db('abmUsers');
    const collection = db.collection('users');

    // Restablecer las calorías de todos los usuarios a 0
    await collection.updateMany({}, { $set: { calories: [] } });
    console.log('Calorías de todos los usuarios restablecidas a 0');
  } catch (error) {
    console.error('Error al restablecer las calorías:', error);
  }
});

// Manejo de errores en middleware
app.use((err, req, res, next) => {
  console.error('Error en middleware de Express:', err);
  res.status(500).json({ message: '¡Algo salió mal!' });
});

module.exports = app;
