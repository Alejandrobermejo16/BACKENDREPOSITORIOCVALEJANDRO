// scripts/updateCalories.js
const { MongoClient } = require('mongodb');

// Obtén la URI de la base de datos y el secreto del entorno
const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('Error: MONGODB_URI no está definido.');
  process.exit(1);
}

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

async function updateCalories() {
  console.log('Inicio de la ejecución del script.');

  try {
    await client.connect();
    const db = client.db('abmUsers');
    const collection = db.collection('users');

    // Actualizar los documentos de calorías
    const result = await collection.updateMany({}, { $set: { 'calories.$[].value': 0 } });
    console.log(`${result.modifiedCount} documentos actualizados.`);
  } catch (error) {
    console.error('Error al actualizar las calorías:', error);
  } finally {
    await client.close();
    console.log('Conexión a MongoDB cerrada.');
  }
}

// Ejecutar la función
updateCalories();

