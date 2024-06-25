const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const createUserRouter = require('./api/createUser');
const transporter = require('./email/transporter'); // Archivo donde configuraste nodemailer
const db = require('./database/db'); // Archivo donde configuraste la conexión a MongoDB

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
app.post('/send-email', (req, res) => {
  const { destinatario, asunto, mensaje } = req.body;

  // Configurar el contenido del correo
  const mailOptions = {
    from: process.env.EMAIL_USER,
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

// Rutas de creación de usuario
app.use('/api/users', createUserRouter);

// Ruta de inicio
app.get('/', (req, res) => {
  res.send('¡Hola, mundo desde el backend!');
});

// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
