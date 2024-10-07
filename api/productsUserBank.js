const express = require('express');
const { MongoClient } = require('mongodb');
const bodyParser = require('body-parser');
const cors = require('cors');
const bcrypt = require('bcryptjs');
require('dotenv').config();
const router = express.Router();
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);
// Middleware para permitir solicitudes CORS desde cualquier origen (solo para pruebas locales)
router.use(cors());
// Middleware para analizar el cuerpo de la solicitud JSON
router.use(bodyParser.json());
// Middleware para conectar a MongoDB antes de cada solicitud
const connectMongoDB = async () => {
  try {
    if (!client.isConnected()) {
      await client.connect();
      console.log('Conexión establecida correctamente con MongoDB');
    }
  } catch (error) {
    console.error('Error al conectar con MongoDB:', error);
    throw error;
  }
};
// Middleware asincrónico para conectar MongoDB antes de cada solicitud
router.use(async (req, res, next) => {
  try {
    if (!client.topology || !client.topology.isConnected()) {
      await client.connect();
    }
    req.dbClient = client;
    next();
  } catch (error) {
    console.error('Error al conectar con MongoDB:', error);
    res.status(500).json({ message: 'Error connecting to database' });
  }
});


// Ruta POST para obtener un usuario por DNI y contraseña
router.post('/productsUserBank', async (req, res) => {
  const dbClient = req.dbClient;
  const { dni } = req.body;

  try {
    const database = dbClient.db('abmUsers');
    const collection = database.collection('usersBank');

    // Buscar el usuario con el DNI 
    const user = await collection.findOne(
        { dni: dni }, 
        { projection: { pass: 0 } }  // Excluir el campo "pass" para no sacarlo de la base de datos
      );
      
    // Verificar si se encontró el usuario
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({ data: user });
  } catch (error) {
    console.error('Error al obtener el usuario:', error);
    res.status(500).json({ message: 'Error fetching user' });
  }
});


module.exports = router;