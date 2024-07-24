const { MongoClient } = require('mongodb');
require('dotenv').config();

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ message: 'Método no permitido' });
    return;
  }

  try {
    if (!client.topology || !client.topology.isConnected()) {
      await client.connect();
    }

    const db = client.db('abmUsers');
    const collection = db.collection('users');

    const result = await collection.updateMany(
      { 'calories.value': { $exists: true } },
      { $set: { 'calories.$[].value': 0 } }
    );

    console.log('Número de documentos actualizados:', result.modifiedCount);
    res.status(200).json({ message: 'Tarea programada ejecutada correctamente' });
  } catch (error) {
    console.error('Error ejecutando la tarea programada:', error);
    res.status(500).json({ message: 'Error ejecutando la tarea programada' });
  }
};
