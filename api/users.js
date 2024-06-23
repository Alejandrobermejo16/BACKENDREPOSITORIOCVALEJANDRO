const express = require('express');
const { MongoClient } = require('mongodb');
const bodyParser = require('body-parser');
require('dotenv').config();
const cors = require('cors'); // Importa el módulo CORS


const router = express.Router();
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

// Middleware para permitir solicitudes CORS desde un origen específico
app.use(cors({
  origin: 'https://abmprojects-7kay.vercel.app', // Cambia esto por tu dominio frontend
  methods: ['GET', 'POST', 'OPTIONS', 'PUT', 'PATCH', 'DELETE'], // Métodos HTTP permitidos
  allowedHeaders: ['Content-Type', 'Authorization'], // Encabezados permitidos
  credentials: true // Permite enviar credenciales (cookies)
}));

// Middleware para analizar el cuerpo de la solicitud JSON
router.use(bodyParser.json());

// Middleware para conectar a MongoDB antes de cada solicitud
const connectMongoDB = async () => {
  if (!client.topology || !client.topology.isConnected()) {
    try {
      await client.connect();
      console.log('Conexión establecida correctamente con MongoDB');
    } catch (error) {
      console.error('Error al conectar con MongoDB:', error);
      throw error;
    }
  }
};

// Middleware asincrónico para conectar MongoDB antes de cada solicitud
router.use(async (req, res, next) => {
  await connectMongoDB();
  req.dbClient = client;
  next();
});

// Ruta para crear usuarios
router.post('/', async (req, res) => {
  const { name, email, password } = req.body;
  const dbClient = req.dbClient;

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
