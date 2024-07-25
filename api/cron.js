// api/cron.js
const { MongoClient } = require('mongodb');
require('dotenv').config();

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

module.exports = async (req, res) => {
  try {
    if (!client.topology || !client.topology.isConnected()) {
      await client.connect();
      console.log('Conexión establecida correctamente con MongoDB desde cron job');
    }

    const db = client.db('abmUsers');
    const collection = db.collection('users');

    const result = await collection.updateMany(
      {}, // Filtro vacío para seleccionar todos los documentos
      { $set: { 'calories.$[elem].value': 0 } }, // Actualiza el valor a 0
      { arrayFilters: [{ 'elem.value': { $exists: true } }] } // Filtro para los elementos en el array
    );

    console.log('Calorías de todos los usuarios restablecidas a 0');
    console.log('Resultado de la actualización:', result);

    res.status(200).json({ message: 'Calorías restablecidas a 0' });
  } catch (error) {
    console.error('Error al restablecer las calorías:', error);
    res.status(500).json({ message: 'Error al restablecer las calorías' });
  }
};
