const express = require('express');
const router = express.Router();

// Middleware para habilitar CORS (Cross-Origin Resource Sharing)
router.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*'); // Permite acceso desde cualquier origen
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept'
  );
  if (req.method === 'OPTIONS') {
    res.header('Access-Control-Allow-Methods', 'POST');
    return res.status(200).json({});
  }
  next();
});

// Ruta para crear un usuario
router.post('/createUsers', (req, res) => {
  const { name, email } = req.body;
  res.status(201).json({ message: `Usuario creado: ${name}, ${email}` });
});

module.exports = router;
