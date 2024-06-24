const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

// Middleware para permitir solicitudes CORS desde cualquier origen (solo para pruebas locales)
app.use(cors());

// Middleware para analizar el cuerpo de la solicitud JSON
app.use(bodyParser.json());

// Middleware para conectar a MongoDB antes de cada solicitud
const connectMongoDB = async () => {
  if (!client.isConnected()) {
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
app.use(async (req, res, next) => {
  await connectMongoDB();
  req.dbClient = client;
  next();
});

// Ruta para crear usuarios
app.post('/users', async (req, res) => {
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

// Ruta para obtener productos (simulado)
app.get('/products', async (req, res) => {
  const dbClient = req.dbClient;

  try {
    const database = dbClient.db('abmProducts');
    const collection = database.collection('products');

    const products = await collection.find({}).toArray();
    res.json(products);
  } catch (error) {
    console.error('Error al obtener productos:', error);
    res.status(500).json({ message: 'Error retrieving products' });
  }
});

// Middleware de manejo de errores
app.use((err, req, res, next) => {
  console.error('Error in Express middleware:', err);
  res.status(500).json({ message: 'Something broke!' });
});

// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
