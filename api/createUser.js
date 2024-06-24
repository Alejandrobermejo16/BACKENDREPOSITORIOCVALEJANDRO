const express = require('express');
const router = express.Router();

// Middleware para habilitar CORS (Cross-Origin Resource Sharing)
router.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*'); // Permitir acceso desde cualquier origen (ajustar según necesidades)
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept'
  );
  if (req.method === 'OPTIONS') {
    res.header('Access-Control-Allow-Methods', 'POST'); // Permitir solo el método POST en las solicitudes OPTIONS
    return res.status(200).json({});
  }
  next();
});

// Ruta para crear un usuario (POST /api/users)
router.post('/', (req, res) => {
  const { name, email } = req.body;
  // Aquí iría la lógica para crear un usuario en la base de datos
  res.status(201).json({ message: `Usuario creado: ${name}, ${email}` });
});

module.exports = router;
