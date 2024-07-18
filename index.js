//aqui funciona el envio de usuarios a bd

const express = require('express');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const cors = require('cors');
const createUserRouter = require('./api/createUser');
const logguinUser = require('./api/logguin');
const calUser = require('./api/calUser')
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

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
//rutas que estarán disponibles bajo el prefijo /api/users.
//para llamar desde frontal , la llamada será a /api/users/endpoint del archivo, por ejemplo, /logguin que esta definido en el archivo de logguinUser
app.use('/api/users', createUserRouter);
app.use('/api/users',logguinUser);
app.use('/api/users',calUser);

// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
