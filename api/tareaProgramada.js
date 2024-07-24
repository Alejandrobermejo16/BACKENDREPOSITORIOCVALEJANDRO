const { MongoClient } = require('mongodb');
const cron = require('node-cron');
require('dotenv').config();

// Configuración de la base de datos
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

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

// Configuración del cron job para actualizar calorías
cron.schedule('* * * * *', async () => {
  try {
    const db = client.db('abmUsers');
    const collection = db.collection('users');

    const result = await collection.updateMany(
      { 'calories.value': { $exists: true } },
      { $set: { 'calories.$[].value': 0 } }
    );

    console.log(`Actualización de calorías a 0 completada para ${result.modifiedCount} usuarios.`);
  } catch (error) {
    console.error('Error en el cron job:', error);
  }
});

// Conectar a la base de datos y configurar el cron job
connectDB();
