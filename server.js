const express = require('express');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware para analizar el cuerpo de la solicitud JSON
app.use(bodyParser.json());

// Configurar el transporter para enviar correos
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'alejandrobermejomendez170712@gmail.com',
    pass: 'hkbj tofw gaoe xqpp' // Reemplaza con tu nueva contraseña de aplicación
  }
});

// Ruta para enviar correos
app.post('/', (req, res) => {
  const { destinatario, asunto, mensaje } = req.body;

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
      res.status(500).send('Error al enviar el correo');
    } else {
      console.log('Correo enviado: ' + info.response);
      res.status(200).send('Correo enviado correctamente');
    }
  });
});

// Ruta de inicio
app.get('/', (req, res) => {
  res.send('¡Hola, mundo desde el backend!');
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
