const express = require('express');
const router = express.Router();

// Middleware para habilitar CORS (Cross-Origin Resource Sharing)
router.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*'); // Permite acceso desde cualquier origen
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept'
  );
  next();
});

// Ruta para obtener un usuario por ID
router.get('users/:userId', (req, res) => {
  const userId = req.params.userId;
  res.json({ userId });
});

module.exports = router;
