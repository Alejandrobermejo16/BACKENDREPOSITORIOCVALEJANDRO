const express = require('express');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const cors = require('cors');
const createUserRouter = require('./api/createUser');
const logguinUser = require('./api/logguin');
const calUser = require('./api/calUser');
const { MongoClient } = require('mongodb');
const cron = require('node-cron');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Configuración de la base de datos
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

// Middleware para permitir solicitudes CORS desde un origen específico
app.use(cors({
  origin: 'https://abmprojects-7kay.vercel.app'
}));

// Middleware para analizar el cuerpo de la solicitud JSON
app.use(bodyParser.json());

// Ruta para enviar correos
app.post('/', (req, res) => {
  const { destinatario, asunto, mensaje } = req.body;

  // Configurar el transporter para enviar correos
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'alejandrobermejomendez170712@gmail.com',
      pass: 'hkbj tofw gaoe xqpp'
    }
  });

  // Configurar el contenido del correo
  const mailOptions = {
    from: 'alejandrobermejomendez170712@gmail.com',
    to: destinatario,
    subject: asunto,
    text: mensaje
  };

  // Enviar el correo
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error(error);
      res.status(500).json({ error: 'Error al enviar el correo' });
    } else {
      console.log('Correo enviado: ' + info.response);
      res.status(200).json({ message: 'Correo enviado correctamente' });
    }
  });
});

// Ruta de inicio
app.get('/', (req, res) => {
  res.send('¡Hola, mundo desde el backend!');
});

// Rutas de creación de usuario
app.use('/api/users', createUserRouter);
app.use('/api/users', logguinUser);
app.use('/api/users', calUser);

// Middleware para conectar a la base de datos
app.use(async (req, res, next) => {
  try {
    if (!client.topology || !client.topology.isConnected()) {
      await client.connect();
      console.log('Conexión establecida correctamente con MongoDB');
    }
    req.dbClient = client;
    next();
  } catch (error) {
    console.error('Error al conectar con MongoDB:', error);
    res.status(500).json({ message: 'Error connecting to database' });
  }
});

// Programar una tarea con node-cron para actualizar las calorías
cron.schedule('* * * * *', async () => { // Ejecutar a la medianoche todos los días
  console.log('Ejecutando tarea diaria para actualizar calorías...');
  try {
    const db = client.db('abmUsers');
    const collection = db.collection('users');

    // Actualizar el valor de las calorías a 0
    const result = await collection.updateMany(
      { 'calories.value': { $exists: true } },
      { $set: { 'calories.$[].value': 0 } }
    );

    console.log('Número de documentos actualizados:', result.modifiedCount);
  } catch (error) {
    console.error('Error al actualizar las calorías:', error);
  }
});

// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
