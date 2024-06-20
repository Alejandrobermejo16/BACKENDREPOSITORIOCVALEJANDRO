require('dotenv').config();
const express = require('express');
const { MongoClient } = require('mongodb');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(bodyParser.json());

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

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

// Middleware para manejar errores
const errorHandler = (err, req, res, next) => {
  console.error('Error in Express middleware:', err);
  res.status(500).json({ message: 'Something broke!' });
};

// Middleware asincrónico para conectar MongoDB antes de cada solicitud
app.use(async (req, res, next) => {
  await connectMongoDB();
  req.dbClient = client;
  next();
});

// Ruta para crear usuarios
app.post('/api/users', async (req, res, next) => {
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
    next(error); // Pasar el error al middleware de manejo de errores
  }
});

// Ruta de inicio
app.get('/', (req, res) => {
  res.send('¡Hola, mundo desde el backend !');
});

// Middleware de manejo de errores
app.use(errorHandler);

// Escuchar en el puerto
app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});
