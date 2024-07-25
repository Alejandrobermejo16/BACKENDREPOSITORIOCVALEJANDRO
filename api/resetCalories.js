// api/resetCalories.js
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
    throw error;
  }
};

const resetCalories = async () => {
  try {
    await connectDB();
    const db = client.db('abmUsers');
    const collection = db.collection('users');

    const result = await collection.updateMany(
      { 'calories.value': { $exists: true } },
      { $set: { 'calories.$[].value': 0 } }
    );

    console.log(`Actualización de calorías a 0 completada para ${result.modifiedCount} usuarios.`);
    return result.modifiedCount;
  } catch (error) {
    console.error('Error en la actualización de calorías:', error);
    throw error;
  }
};

module.exports = resetCalories;
