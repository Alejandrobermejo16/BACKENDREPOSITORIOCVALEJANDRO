const { MongoClient } = require('mongodb');
require('dotenv').config();

const uri = process.env.MONGODB_URI; // Asegúrate de que esta variable esté configurada en GitHub Actions
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

async function updateCalories() {
  try {
    await client.connect();
    const db = client.db('abmUsers');
    const collection = db.collection('users');

    const result = await collection.updateMany(
      { 'calories.0': { $exists: true } },
      { $set: { 'calories.$[elem].value': 0 } },
      { arrayFilters: [{ 'elem.value': { $gt: 0 } }] }
    );

    console.log(`Número de documentos actualizados: ${result.modifiedCount}`);
  } catch (error) {
    console.error('Error al actualizar las calorías:', error);
  } finally {
    await client.close();
  }
}

updateCalories();
