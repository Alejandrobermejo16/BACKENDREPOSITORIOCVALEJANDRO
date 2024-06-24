const express = require('express');
const router = express.Router();

// Middleware para habilitar CORS (Cross-Origin Resource Sharing)
router.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*'); // Permite acceso desde cualquier origen
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, X-Custom-Header'
  );
  next();
});

// Middleware para procesar la cabecera personalizada X-Custom-Header
router.use((req, res, next) => {
  const customHeader = req.headers['x-custom-header'];
  if (customHeader) {
    console.log('Cabecera personalizada recibida:', customHeader);
  }
  next();
});

// Ruta para obtener todos los usuarios
router.get('/', (req, res) => {
  res.json({ message: 'Lista de usuarios' });
});

module.exports = router;
