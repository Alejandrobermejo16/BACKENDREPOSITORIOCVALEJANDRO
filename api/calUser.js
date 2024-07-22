const express = require('express');
const { MongoClient } = require('mongodb');
const bodyParser = require('body-parser');
const cors = require('cors');
const cron = require('node-cron');
require('dotenv').config();

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

// Rutas para API
app.use('/api', require('./routes')); // Ajusta la ruta según la ubicación del archivo de rutas

// Cron job para restablecer calorías a 0
cron.schedule('27 16 * * *', async () => {
  console.log('Cron job ejecutándose para restablecer calorías a 0...');
  try {
    await client.connect();
    const db = client.db('abmUsers');
    const collection = db.collection('users');

    const result = await collection.updateMany(
      { 'calories.value': { $exists: true } },
      { $set: { 'calories.$[elem].value': 0 } },
      { arrayFilters: [{ 'elem.value': { $exists: true } }] }
    );

    console.log('Calorías de todos los usuarios restablecidas a 0');
    console.log('Resultado de la actualización:', result);
  } catch (error) {
    console.error('Error al restablecer las calorías:', error);
  }
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
