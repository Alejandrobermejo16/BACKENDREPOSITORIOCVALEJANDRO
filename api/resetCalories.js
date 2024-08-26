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

    // Consulta para encontrar usuarios con calorías mayores a cero
    const usersWithCalories = await collection.find({
      'calories': {
        $elemMatch: { value: { $gt: 0 } } // Verifica si hay algún elemento con valor mayor a cero
      }
    }).toArray();

    console.log(`Usuarios encontrados con registros de calorías mayores a cero: ${usersWithCalories.length}`); // Añadido para depuración

    if (usersWithCalories.length === 0) {
      console.log('No hay usuarios con calorías mayores a cero.');
      return 0; // Retorna 0 si no hay usuarios con calorías positivas
    }

    // Actualiza las calorías de los usuarios encontrados
    const result = await collection.updateMany(
      { 'calories.value': { $gt: 0 } }, // Filtra los documentos que tengan algún valor mayor a cero
      { $set: { 'calories.$[elem].value': 0 } }, // Establece el valor de las calorías a cero
      { arrayFilters: [{ 'elem.value': { $gt: 0 } }] } // Aplica el filtro al array de calorías
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
