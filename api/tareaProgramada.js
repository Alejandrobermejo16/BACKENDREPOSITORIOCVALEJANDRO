const { MongoClient } = require('mongodb');
require('dotenv').config();

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

const connectDB = async () => {
  try {
    if (!client.topology || !client.topology.isConnected()) {
      await client.connect();
      console.log('Conexión establecida correctamente con MongoDB');
    }
  } catch (error) {
    console.error('Error al conectar con MongoDB:', error);
    process.exit(1); // Terminar el proceso si no se puede conectar a la DB
  }
};

module.exports = async (req, res) => {
  if (req.method === 'GET') {
    await connectDB();
    try {
      const db = client.db('abmUsers');
      const collection = db.collection('users');

      const result = await collection.updateMany(
        { 'calories.value': { $exists: true } },
        { $set: { 'calories.$[].value': 0 } }
      );

      console.log(`Actualización de calorías a 0 completada para ${result.modifiedCount} usuarios.`);
      res.status(200).send('Calorías actualizadas a 0');
    } catch (error) {
      console.error('Error en el cron job:', error);
      res.status(500).send('Error actualizando calorías');
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
};
