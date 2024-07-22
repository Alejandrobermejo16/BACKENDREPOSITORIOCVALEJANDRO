const cron = require('node-cron');
const { MongoClient } = require('mongodb');
require('dotenv').config();

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

// Configura el cron job para que se ejecute a las 15:05 todos los días
cron.schedule('15 15 * * *', async () => {
  try {
    await client.connect();
    const db = client.db('abmUsers');
    const collection = db.collection('users');

    // Restablecer las calorías de todos los usuarios a 0
    await collection.updateMany({}, { $set: { calories: [] } });
    console.log('Calorías de todos los usuarios restablecidas a 0 a las 15:05');
  } catch (error) {
    console.error('Error al restablecer las calorías:', error);
  }
});

// Código del servidor Express
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const router = express.Router();
const app = express();

app.use(cors());
app.use(bodyParser.json());
app.use(router);

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

router.use((err, req, res, next) => {
  console.error('Error in Express middleware:', err);
  res.status(500).json({ message: 'Something broke!' });
});

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});
