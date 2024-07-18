const express = require('express');
const { MongoClient } = require('mongodb');
const bodyParser = require('body-parser');
const cors = require('cors');
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
// Ruta para verificar existencia de usuario y autenticación
const bcrypt = require('bcryptjs');

// Ruta para verificar existencia de usuario y autenticación
router.post('/loggin', async (req, res) => {
  const { email, password: receivedPassword } = req.body; // Renombramos 'password' recibido desde el frontend como 'receivedPassword'
  const dbClient = req.dbClient;
  try {
    const database = dbClient.db('abmUsers');
    const collection = database.collection('users');
    
    // Buscar usuario por email
    const existingUser = await collection.findOne({ email });
    if (!existingUser) {
      return res.status(404).json({ message: 'User not found', receivedData: { email, receivedPassword } });
    }
    
    // Verificar contraseña
    const passwordMatch = await bcrypt.compare(receivedPassword, existingUser.password);
    if (!passwordMatch) {
      return res.status(401).json({ message: 'Incorrect password', receivedData: { email, receivedPassword } });
    }
    
    // Usuario autenticado correctamente
    res.status(200).json({ 
      message: 'User authenticated successfully', 
      userId: existingUser._id, 
      receivedData: { email, receivedPassword }, // Datos recibidos del frontend
      userData: existingUser // Datos del usuario almacenados en la base de datos
    });
    
  } catch (error) {
    console.error('Error al autenticar usuario:', error);
    res.status(500).json({ message: 'Error authenticating user', error: error.message });
  }
}); 



// Middleware de manejo de errores
router.use((err, req, res, next) => {
  console.error('Error in Express middleware:', err);
  res.status(500).json({ message: 'Something broke!' });
});
module.exports = router;