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

    // Consulta para encontrar usuarios con registros de calorías
    const usersWithCalories = await collection.find({ 'calories.0': { $exists: true } }).toArray();
    console.log(`Usuarios encontrados con registros de calorías: ${usersWithCalories.length}`); // Añadido para depuración

    if (usersWithCalories.length === 0) {
      console.log('No hay usuarios con registros de calorías.');
      return 0; // Retorna 0 si no hay usuarios con calorías
    }

    // Actualiza las calorías de los usuarios encontrados
    const result = await collection.updateMany(
      { 'calories.0': { $exists: true } },
      { $set: { 'calories.$[].value': 0 } }
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
