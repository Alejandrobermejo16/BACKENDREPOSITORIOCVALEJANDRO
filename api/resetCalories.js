const { MongoClient } = require('mongodb');
require('dotenv').config();

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

const resetCalories = async () => {
  console.log('Iniciando la función de restablecimiento de calorías...'); // Añadido para depuración
  try {
    await client.connect();
    const db = client.db('abmUsers');
    const collection = db.collection('users');

    // Consulta para encontrar usuarios con calorías mayores a 0
    const usersWithCalories = await collection.find({ 'calories.value': { $gt: 0 } }).toArray();
    console.log(`Usuarios encontrados con calorías mayores a 0: ${usersWithCalories.length}`); // Añadido para depuración

    if (usersWithCalories.length === 0) {
      console.log('No hay usuarios con calorías mayores a 0.');
      return 0; // Retorna 0 si no hay usuarios con calorías mayores a 0
    }

    // Actualiza las calorías de los usuarios encontrados a 0
    const result = await collection.updateMany(
      { 'calories.value': { $gt: 0 } },
      { $set: { 'calories.value': 0 } }
    );
    console.log(`Calorías actualizadas para ${result.modifiedCount} usuarios.`); // Añadido para depuración

    return result.modifiedCount;
  } catch (error) {
    console.error('Error al restablecer las calorías:', error);
    throw error; // Asegúrate de lanzar el error para manejarlo en el controlador
  } finally {
    await client.close();
  }
};

module.exports = resetCalories;
