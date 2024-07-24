// scripts/updateCalories.js
const { MongoClient } = require('mongodb');
require('dotenv').config();

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

async function updateCalories() {
  try {
    await client.connect();
    const db = client.db('abmUsers');
    const collection = db.collection('users');

    // Actualizar el valor de las calorías a 0
    const result = await collection.updateMany(
      { 'calories.value': { $exists: true } },
      { $set: { 'calories.$[].value': 0 } }
    );

    console.log(`Número de documentos actualizados: ${result.modifiedCount}`);
  } catch (error) {
    console.error('Error al actualizar las calorías:', error);
  } finally {
    await client.close();
  }
}

updateCalories();
