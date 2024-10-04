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
// Ruta para crear usuarios
router.post('/createUserBank', async (req, res) => {
    // Desestructuramos los campos del cuerpo de la solicitud
    const { dni, name, pass, card1, card2, account1, account2 } = req.body;
    
    console.log("Esto llega al back", req.body);
  
    // Validación de campos requeridos
    if (!dni || !name || !pass || !card1 || !card2 || !account1 || !account2) {
      return res.status(400).json({ message: 'All fields are required' });
    }
  
    const dbClient = req.dbClient;
  
    try {
      const database = dbClient.db('abmUsers');
      const collection = database.collection('usersBank');
  
      // Verificamos si el usuario ya existe en la base de datos usando el DNI
      const existingUser = await collection.findOne({ dni });
      if (existingUser) {
        return res.status(400).json({ message: 'User already exists' });
      }
  
      // Cifrar la contraseña antes de almacenarla
      const hashedPassword = await bcrypt.hash(pass, 10);
  
      // Creamos un nuevo usuario
      const newUser = { dni, name, pass: hashedPassword, card1, card2, account1, account2 };
      
      console.log('New user data:', newUser);
  
      // Insertamos el nuevo usuario en la base de datos
      const result = await collection.insertOne(newUser);
      
      res.status(201).json({ message: 'User created successfully', userId: result.insertedId });
    } catch (error) {
      console.error('Error al crear usuario:', error);
      res.status(500).json({ message: 'Error creating user' });
    }
  });

// Ruta GET para obtener todos los usuarios
router.get('/', async (req, res) => {
  const dbClient = req.dbClient;
  try {
    const database = dbClient.db('abmUsers');
    const collection = database.collection('usersBank');
    const users = await collection.find({}).toArray();
    res.status(200).json(users);
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    res.status(500).json({ message: 'Error fetching users' });
  }
});
// Middleware de manejo de errores
router.use((err, req, res, next) => {
  console.error('Error in Express middleware:', err);
  res.status(500).json({ message: 'Something broke!' });
});
module.exports = router;