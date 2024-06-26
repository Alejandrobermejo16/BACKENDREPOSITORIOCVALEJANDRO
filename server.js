// users.js

const express = require('express');
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config();
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware para analizar el cuerpo de la solicitud JSON
app.use(bodyParser.json());

// URI de conexión a MongoDB desde el archivo .env
const uri = process.env.MONGODB_URI;

// Configurar el cliente de MongoDB
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

// Middleware para manejar errores asíncronos
const asyncMiddleware = fn => (req, res, next) => {
  Promise.resolve(fn(req, res, next))
    .catch(next);
};

// Conectar a MongoDB antes de escuchar las solicitudes
app.use(asyncMiddleware(async (req, res, next) => {
  if (!client.isConnected()) {
    await client.connect();
  }
  req.dbClient = client;
  next();
}));

// Ruta para crear usuarios
app.post('/api/users', asyncMiddleware(async (req, res) => {
  const { name, email, password } = req.body;
  const dbClient = req.dbClient;

  try {
    const database = dbClient.db('abmUsers'); // Cambia el nombre de la base de datos si es necesario
    const collection = database.collection('users');

    // Verificar si el usuario ya existe por nombre o correo electrónico
    const existingUser = await collection.findOne({ $or: [{ name }, { email }] });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const newUser = { name, email, password };
    const result = await collection.insertOne(newUser);
    res.status(201).json({ message: 'User created successfully', userId: result.insertedId });
  } catch (error) {
    console.error('Error inserting user:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}));

// Ruta de inicio
app.get('/', (req, res) => {
  res.send('¡Hola, mundo desde el backend!');
});

// Manejar errores generales
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something broke!' });
});

// Iniciar el servidor Express
app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});
