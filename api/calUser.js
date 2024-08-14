const express = require('express');
const { MongoClient } = require('mongodb');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();
const router = express.Router();
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

// Mapa de traducción de meses
const monthTranslations = {
  'January': 'enero',
  'February': 'febrero',
  'March': 'marzo',
  'April': 'abril',
  'May': 'mayo',
  'June': 'junio',
  'July': 'julio',
  'August': 'agosto',
  'September': 'septiembre',
  'October': 'octubre',
  'November': 'noviembre',
  'December': 'diciembre'
};

function translateMonthToSpanish(month) {
  return monthTranslations[month] || month;  // Usa el mismo nombre si no hay traducción
}

// Configuración de CORS
router.use(cors());
router.use(bodyParser.json());

// Middleware para conectar a la base de datos
router.use(async (req, res, next) => {
  try {
    if (!client.topology || !client.topology.isConnected()) {
      await client.connect();
      console.log('Conexión establecida correctamente con MongoDB');
    }
    req.dbClient = client;
    next();
  } catch (error) {
    console.error('Error al conectar con MongoDB:', error);
    res.status(500).json({ message: 'Error al conectar con la base de datos' });
  }
});

// Verificar si el usuario tiene registros de calorías
router.get('/cal', async (req, res) => {
  const { userEmail } = req.query;
  if (!userEmail) {
    return res.status(400).json({ message: 'Se requiere el correo electrónico' });
  }
  try {
    const db = req.dbClient.db('abmUsers');
    const collection = db.collection('users');
    // Obtener el mes y día actuales en español
const currentDate = new Date();
const currentMonth = currentDate.toLocaleString('es-ES', { month: 'long' }); // Mes en español, por ejemplo, "agosto"
const currentDay = currentDate.getDate(); // Día del mes, por ejemplo, 14

// Verificar si el usuario tiene registros de calorías o en CalMonth para el mes y día actuales
const user = await collection.findOne({
  email: userEmail,
  $or: [
    { 'calories.0': { $exists: true } },
    { [`CalMonth.${currentMonth}.days.${currentDay}.calories`]: { $exists: true } }
  ]
});

   // Verificar si existen registros en 'calories' y en 'CalMonth'
if (
  user &&
  user.calories &&
  user.calories.length > 0 &&
  user.CalMonth &&
  user.CalMonth[currentMonth] &&
  user.CalMonth[currentMonth].days &&
  user.CalMonth[currentMonth].days[currentDay] &&
  user.CalMonth[currentMonth].days[currentDay].calories
) {
  return res.status(200).json({ 
    calories: user.calories,
    CalMonth: user.CalMonth
  });
}
    res.status(404).json({ message: 'No se encontraron registros de calorías para este usuario' });
  } catch (error) {
    console.error('Error al recuperar las calorías:', error);
    res.status(500).json({ message: 'Error al recuperar las calorías' });
  }
});

// Actualizar calorías (PUT)
// Actualizar calorías (PUT)
router.put('/cal', async (req, res) => {
  const { userEmail, calories, CalMonth } = req.body;
  if (!userEmail || calories == null || !CalMonth) {
    return res.status(400).json({ message: 'Email, calories, and CalMonth are required' });
  }
  try {
    const db = req.dbClient.db('abmUsers');
    const collection = db.collection('users');
    // Actualizar el documento
    const result = await collection.updateOne(
      { email: userEmail },
      { 
        $set: { 
          'calories.$[elem].value': calories.value, 
          'calories.$[elem].date': new Date(calories.date),
          [`CalMonth.${translatedMonth}.days.${currentDay}.calories`]: updatedCalories,
        }
      },
      { 
        arrayFilters: [{ 'elem.value': { $exists: true } }],
        upsert: true 
      }
    );
    if (result.modifiedCount > 0 || result.upsertedCount > 0) {
      return res.status(200).json({ message: 'Calories updated successfully' });
    }
    res.status(404).json({ message: 'User not found or no calories to update' });
  } catch (error) {
    console.error('Error updating calories:', error);
    res.status(500).json({ message: 'Error updating calories' });
  }
});

    

// Crear o actualizar calorías (POST)
router.post('/cal', async (req, res) => {
  const { userEmail, calories, CalMonth } = req.body;
  if (!userEmail || calories == null || !CalMonth) {
    return res.status(400).json({ message: 'Correo electrónico, calorías y CalMonth son requeridos' });
  }

  try {
    const db = req.dbClient.db('abmUsers');
    const collection = db.collection('users');

    // Extraer mes y día del objeto CalMonth
    const [currentMonth] = Object.keys(CalMonth);
    const [currentDay] = Object.keys(CalMonth[currentMonth].days);
    const updatedCalories = CalMonth[currentMonth].days[currentDay].calories;

    // Traducir el mes al español
    const translatedMonth = translateMonthToSpanish(currentMonth);

    // Buscar el usuario
    const user = await collection.findOne({ email: userEmail });

    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Actualizar o agregar el mes y el día
    const result = await collection.updateOne(
      { email: userEmail },
      {
        $set: {
          [`CalMonth.${translatedMonth}.days.${currentDay}.calories`]: updatedCalories,
        },
        $push: { calories: { value: calories.value, date: new Date(calories.date) } }
      },
      { upsert: true }
    );

    res.status(201).json({ message: 'Calorías creadas correctamente', data: result });
  } catch (error) {
    console.error('Error al crear las calorías:', error);
    res.status(500).json({ message: 'Error al crear las calorías' });
  }
});

// Middleware de manejo de errores
router.use((err, req, res, next) => {
  console.error('Error en Express middleware:', err);
  res.status(500).json({ message: '¡Algo salió mal!' });
});

module.exports = router;
