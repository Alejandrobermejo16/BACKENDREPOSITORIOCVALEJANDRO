// api/cron/updateCalories.js
const { MongoClient } = require('mongodb');

module.exports = async (req, res) => {
  const authHeader = req.headers.authorization;
  const expectedAuthHeader = `Bearer ${process.env.CRON_SECRET}`;

  // Verificar el secreto de autenticación
  if (!authHeader || authHeader !== expectedAuthHeader) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  // Conectar a MongoDB
  const uri = process.env.MONGODB_URI;
  const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

  try {
    await client.connect();
    const database = client.db('yourDatabaseName');
    const collection = database.collection('yourCollectionName');
    
    // Actualizar los documentos
    const result = await collection.updateMany({}, { $set: { calorias: 0 } });
    res.status(200).json({ success: true, message: `${result.modifiedCount} documents updated` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  } finally {
    await client.close();
  }
};

