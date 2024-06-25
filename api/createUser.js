



// EN ESTE ARCHIVO SE HACE BIEN EL POST Y EL GET


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

// Ruta para crear usuarios
router.post('/create', async (req, res) => {
  const { name, email, password } = req.body;
  const dbClient = req.dbClient;

// Ruta GET para obtener todos los usuarios
router.get('/', async (req, res) => {
  const dbClient = req.dbClient;

  try {
    const database = dbClient.db('abmUsers');
    const collection = database.collection('users');

    const users = await collection.find({}).toArray();
    res.status(200).json(users);
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    res.status(500).json({ message: 'Error fetching users' });
  }
});
 

  try {
    const database = dbClient.db('abmUsers');
    const collection = database.collection('users');

    const existingUser = await collection.findOne({ $or: [{ name }, { email }] });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const newUser = { name, email, password };
    const result = await collection.insertOne(newUser);
    res.status(201).json({ message: 'User created successfully', userId: result.insertedId });
  } catch (error) {
    console.error('Error al crear usuario:', error);
    res.status(500).json({ message: 'Error creating user' });
  }
});

// Middleware de manejo de errores
router.use((err, req, res, next) => {
  console.error('Error in Express middleware:', err);
  res.status(500).json({ message: 'Something broke!' });
});

module.exports = router;
