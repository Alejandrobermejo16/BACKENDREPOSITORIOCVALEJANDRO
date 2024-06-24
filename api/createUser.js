const express = require('express');
const { MongoClient } = require('mongodb');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();

const app = express();
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

// Middleware para permitir solicitudes CORS desde tu frontend
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

// Rutas de tu aplicación
app.post('/api/users/create', async (req, res) => {
  // Tu lógica para crear usuarios
});

// Manejo de errores
app.use((err, req, res, next) => {
  console.error('Error en el middleware de Express:', err);
  res.status(500).json({ message: '¡Algo salió mal!' });
});

module.exports = app;
