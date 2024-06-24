// api/createUser.js

const express = require('express');
const router = express.Router();

// Ruta para crear un usuario
router.post('/', (req, res) => {
  const { name, email } = req.body;
  res.status(201).json({ message: `Usuario creado: ${name}, ${email}` });
});

module.exports = router;
