// api/getUserById.js

const express = require('express');
const router = express.Router();

// Ruta para obtener un usuario por ID
router.get('/:userId', (req, res) => {
  const userId = req.params.userId;
  res.json({ userId });
});

module.exports = router;
