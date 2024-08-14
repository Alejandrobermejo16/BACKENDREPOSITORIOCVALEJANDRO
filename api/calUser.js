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
  const { userEmail, month, day } = req.query;

  // Verificar que se proporcionen todos los parámetros necesarios
  if (!userEmail || !month || !day) {
    return res.status(400).json({ message: 'Se requieren el correo electrónico, el mes y el día' });
  }

  try {
    const db = req.dbClient.db('abmUsers');
    const collection = db.collection('users');

    // Buscar el usuario que tenga calorías o un registro en CalMonth para el mes y día especificados
    const user = await collection.findOne({
      email: userEmail,
      $or: [
        { 'calories.0': { $exists: true } },
        { [`CalMonth.${month}.days.${day}.calories`]: { $exists: true } }
      ]
    });

    // Verificar si se encontraron registros y devolver la respuesta correspondiente
    if (user) {
      return res.status(200).json({ message: 'Registro encontrado', user });
    } else {
      return res.status(404).json({ message: 'No se encontraron registros de calorías o CalMonth para este usuario' });
    }
  } catch (error) {
    console.error('Error al recuperar los registros:', error);
    res.status(500).json({ message: 'Error al recuperar los registros' });
  }
});


// Actualizar calorías (PUT)
router.put('/cal', async (req, res) => {
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

    // Verificar si el mes y el día existen en el documento del usuario
    const monthExists = user.CalMonth && user.CalMonth[translatedMonth];
    const dayExists = monthExists && user.CalMonth[translatedMonth].days && user.CalMonth[translatedMonth].days[currentDay];

    if (!monthExists || !dayExists) {
      return res.status(404).json({ message: 'Mes o día no encontrado' });
    }

    // Actualizar las calorías solo si hay cambios
    const updateResult = await collection.updateOne(
      { email: userEmail },
      {
        $set: {
          [`CalMonth.${translatedMonth}.days.${currentDay}.calories`]: updatedCalories,
          'calories.$[elem].value': calories.value,
          'calories.$[elem].date': new Date(calories.date),
        }
      },
      {
        arrayFilters: [{ 'elem.date': { $eq: new Date(calories.date).toISOString() } }],
        upsert: false
      }
    );

    if (updateResult.modifiedCount > 0) {
      return res.status(200).json({ message: 'Calorías actualizadas correctamente' });
    }

    res.status(404).json({ message: 'No se detectaron cambios o registro no encontrado' });
  } catch (error) {
    console.error('Error al actualizar las calorías:', error);
    res.status(500).json({ message: 'Error al actualizar las calorías' });
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
