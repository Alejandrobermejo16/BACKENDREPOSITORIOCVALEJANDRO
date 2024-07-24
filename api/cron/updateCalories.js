const { MongoClient } = require('mongodb');

// Reemplaza con tu URI de conexión a MongoDB
const uri = process.env.MONGODB_URI;

module.exports = async (req, res) => {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ success: false });
  }

  try {
    const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    await client.connect();

    const db = client.db('nombreDeTuBaseDeDatos');  // Reemplaza con tu nombre de base de datos
    const collection = db.collection('nombreDeTuColeccion');  // Reemplaza con el nombre de la colección

    const result = await collection.updateMany({}, { $set: { calorias: 0 } });

    console.log(`Número de documentos actualizados: ${result.modifiedCount}`);

    res.status(200).json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
};
