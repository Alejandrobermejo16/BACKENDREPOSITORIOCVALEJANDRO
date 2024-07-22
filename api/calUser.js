const express = require('express');
const { MongoClient } = require('mongodb');
const bodyParser = require('body-parser');
const cors = require('cors');
const cron = require('node-cron'); // Asegúrate de tener esta dependencia instalada
require('dotenv').config();

const app = express();
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

// Configuración del middleware
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

// Router con las rutas para GET, POST y PUT
const router = express.Router();

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

app.use('/api', router);

// Configuración del cron job para restablecer las calorías a 0
cron.schedule('32 16 * * *', async () => {
  console.log('Cron job ejecutándose para restablecer calorías a 0...');
  try {
    await client.connect();
    const db = client.db('abmUsers');
    const collection = db.collection('users');

    // Actualizar el valor de las calorías a 0 en todos los registros
    const result = await collection.updateMany(
      { 'calories.value': { $exists: true } }, // Filtro para documentos que tienen calorías
      { $set: { 'calories.$[elem].value': 0 } }, // Actualiza el valor a 0
      { arrayFilters: [{ 'elem.value': { $exists: true } }] } // Filtro para los elementos en el array
    );

    console.log('Calorías de todos los usuarios restablecidas a 0');
    console.log('Resultado de la actualización:', result);
  } catch (error) {
    console.error('Error al restablecer las calorías:', error);
  }
});

// Manejo de errores en middleware
app.use((err, req, res, next) => {
  console.error('Error en middleware de Express:', err);
  res.status(500).json({ message: '¡Algo salió mal!' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});
