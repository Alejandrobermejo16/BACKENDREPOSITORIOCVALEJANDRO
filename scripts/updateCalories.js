const { MongoClient } = require('mongodb');

module.exports = async (req, res) => {
  console.log('Inicio de la ejecución del script.');

  const authHeader = req.headers.authorization;
  const expectedAuthHeader = `Bearer ${process.env.CRON_SECRET}`;

  // Verificar el secreto de autenticación
  if (!authHeader || authHeader !== expectedAuthHeader) {
    console.log('Autenticación fallida.');
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  // Conectar a MongoDB
  const uri = process.env.MONGODB_URI;
  const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

  try {
    console.log('Conectando a MongoDB...');
    await client.connect();
    const db = client.db('abmUsers');
    const collection = db.collection('users');

    // Actualizar los documentos
    console.log('Actualizando documentos...');
    const result = await collection.updateMany({}, { $set: { 'calories.$[].value': 0 } });
    console.log(`Número de documentos actualizados: ${result.modifiedCount}`);
    
    res.status(200).json({ success: true, message: `${result.modifiedCount} documents updated` });
  } catch (error) {
    console.error('Error en la actualización de calorías:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  } finally {
    await client.close();
    console.log('Conexión a MongoDB cerrada.');
  }
};
