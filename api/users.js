// api/users.js

const express = require('express');
const router = express.Router();

// Ruta para obtener todos los usuarios
router.get('/', (req, res) => {
  res.json({ message: 'Lista de usuarios' });
});

// Middleware para procesar la cabecera personalizada X-Custom-Header
router.use((req, res, next) => {
  const customHeader = req.headers['x-custom-header'];
  if (customHeader) {
    console.log('Cabecera personalizada recibida:', customHeader);
  }
  next();
});

module.exports = router;
