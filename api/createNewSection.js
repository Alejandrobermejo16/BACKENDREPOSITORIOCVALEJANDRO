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
router.post('/createNewSection', async (req, res) => {
  // Desestructuramos los campos del cuerpo de la solicitud
  const { orderSections } = req.body;
  
  try {
    const database = dbClient.db('abmUsers');
    const collection = database.collection('abmorderSectionss');
  
    // Verificamos si el usuario ya existe en la base de datos usando el DNI
    const existingorderSections = await collection.findOne({ orderSections });
    
    // Si el usuario existe, retornamos el error 409 y terminamos la ejecución aquí
    if (existingorderSections) {
      return res.status(409).json({ message: 'La seccion ya existe' });
    }
  
    // Si la seccion no existe, continuamos con la creación
    const neworderSections = { Sections: orderSections };
  
    // Insertamos el nuevo usuario en la base de datos
    const result = await collection.insertOne(neworderSections);
  
    // Devolvemos una respuesta exitosa con el estado 201
    return res.status(201).json({ message: 'Seccion creada correctamente'});
  
  } catch (error) {
    console.error('Error al crear seccion:', error);
    // Devolvemos un error 500 si algo falla en el proceso
    return res.status(500).json({ message: 'Error creating user' });
  }
});