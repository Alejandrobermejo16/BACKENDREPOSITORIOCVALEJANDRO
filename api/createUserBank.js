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
  const { dni, name, pass, Accounts,Cards } = req.body;
  

  // Validación de campos requeridos
  if (!dni || !name || !pass ||  !Accounts || !Cards) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  const dbClient = req.dbClient;

  try {
    const database = dbClient.db('abmUsers');
    const collection = database.collection('usersBank');
  
    // Verificamos si el usuario ya existe en la base de datos usando el DNI
    const existingUser = await collection.findOne({ dni });
    
    // Si el usuario existe, retornamos el error 409 y terminamos la ejecución aquí
    if (existingUser) {
      return res.status(409).json({ message: 'Este usuario ya existe' });
    }
  
    // Si el usuario no existe, continuamos con la creación del nuevo usuario
    const hashedPassword = await bcrypt.hash(pass, 10);
    const newUser = { dni, name, pass: hashedPassword, Accounts,Cards };
  
    // Insertamos el nuevo usuario en la base de datos
    const result = await collection.insertOne(newUser);
  
    // Devolvemos una respuesta exitosa con el estado 201
    return res.status(201).json({ message: 'Usuario creado correctamente', userId: result.insertedId });
  
  } catch (error) {
    console.error('Error al crear usuario:', error);
    // Devolvemos un error 500 si algo falla en el proceso
    return res.status(500).json({ message: 'Error creating user' });
  }
});

// Ruta GET para obtener un usuario por DNI y contraseña
// router.post('/getUserByDniAndPassword', async (req, res) => {
//   const dbClient = req.dbClient;
//   const { dni, pass } = req.body; // Obtener DNI y contraseña de los parámetros de consulta

//   try {
//     const database = dbClient.db('abmUsers');
//     const collection = database.collection('usersBank');

//     // Buscar el usuario con el DNI y la contraseña proporcionados
//     const user = await collection.findOne({ dni: dni, pass: pass });

//     // Verificar si se encontró el usuario
//     if (!user) {
//       return res.status(404).json({ message: 'User not found or invalid credentials', user }); // 404 Not Found
//     }

//     res.status(200).json(user); // Retornar el usuario encontrado
//   } catch (error) {
//     console.error('Error al obtener el usuario:', error);
//     res.status(500).json({ message: 'Error fetching user' });
//   }
// });

module.exports = router;