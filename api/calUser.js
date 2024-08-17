const express = require('express');
const { MongoClient } = require('mongodb');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();
const cron = require('node-cron');
const router = express.Router();
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
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
    res.status(500).json({ message: 'Error connecting to database' });
  }
});


router.get('/cal', async (req, res) => {
  const { userEmail } = req.query;
  if (!userEmail) {
    return res.status(400).json({ message: 'Email is required' });
  }
  
  const fechaActual = new Date();
  const mesActualEnEspañol = new Intl.DateTimeFormat('es-ES', { month: 'long' }).format(fechaActual);
  const dia = fechaActual.getDate(); // Día actual del mes

  try {
    const db = req.dbClient.db('abmUsers');
    const collection = db.collection('users');
    const user = await collection.findOne({ email: userEmail });

    if (user) {
      const calMonth = user.CalMonth || {};
      const monthExists = calMonth[mesActualEnEspañol];
      const dayExists = monthExists && calMonth[mesActualEnEspañol].days && calMonth[mesActualEnEspañol].days[dia];

      if (user.calories && user.calories.length > 0) {
        // Usuario tiene calorías registradas
        if (monthExists) {
          // El mes actual existe
          if (dayExists) {
            // El día actual existe dentro del mes
            return res.status(200).json({
              status: "success",
              message: "Calorías y calorías mensuales recuperadas",
              calories: user.calories,
              CalMonth: {
                [mesActualEnEspañol]: {
                  days: {
                    [dia]: dayExists
                  }
                }
              }
            });
          } else {
            // El día actual no existe dentro del mes
            return res.status(200).json({
              status: "missing_day",
              message: "Calorías registradas, pero no se encontró el día actual en el mes",
              calories: user.calories,
              CalMonth: {
                [mesActualEnEspañol]: {
                  days: {}
                }
              }
            });
          }
        } else {
          // El mes actual no existe
          return res.status(200).json({
            status: "missing_month",
            message: "Calorías registradas, pero no se encontró el mes actual",
            calories: user.calories,
            CalMonth: {
              [mesActualEnEspañol]: {
                days: {}
              }
            }
          });
        }
      } else {
        // Usuario no tiene calorías registradas
        return res.status(200).json({
          status: "no_calories",
          message: "No se encontraron calorías registradas para el usuario",
          calories: user.calories,
          CalMonth: {
            [mesActualEnEspañol]: {
              days: {}
            }
          }
        });
      }
    } else {
      // Usuario no encontrado
      res.status(404).json({ status: "not_found", message: 'No records found for this user' });
    }
  } catch (error) {
    console.error('Error retrieving calories:', error);
    res.status(500).json({ status: "error", message: 'Error retrieving calories' });
  }
});



//PETICION PUT
router.put('/cal', async (req, res) => {
  const { userEmail, calories } = req.body;
  if (!userEmail || calories == null) {
    return res.status(400).json({ message: 'Email and calories are required' });
  }

  try {
    const db = req.dbClient.db('abmUsers');
    const collection = db.collection('users');

    // Obtener la fecha actual
    const fechaActual = new Date();
    const mesActualEnEspañol = new Intl.DateTimeFormat('es-ES', { month: 'long' }).format(fechaActual);
    const dia = fechaActual.getDate();


    // Verificar si el usuario existe
    const user = await collection.findOne({ email: userEmail });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const lastIndex = user.calories ? user.calories.length - 1 : 0;

    // Comprobar la existencia del mes
    if (!user.CalMonth) {
      // Crear la estructura completa si CalMonth no existe
      await collection.updateOne(
        { email: userEmail },
        {
          $set: {
            [`CalMonth.${mesActualEnEspañol}`]: {
              days: {
                [dia]: {
                  calories: calories.value
                }
              }
            },
            [`calories.${lastIndex}.value`]: calories.value, // Actualiza el valor de calorías
            [`calories.${lastIndex}.date`]: new Date(calories.date), // Actualiza la fecha de calorías
          }
        }
      );
      return res.status(200).json({ message: 'Month and day added with calories',  calories: calories.value,
        calMonth: updatedUser.CalMonth});
    }

    if (!user.CalMonth[mesActualEnEspañol]) {
      // Crear el mes con el día y calorías si el mes no existe
      await collection.updateOne(
        { email: userEmail },
        {
          $set: {
            [`CalMonth.${mesActualEnEspañol}`]: {
              days: {
                [dia]: {
                  calories: calories.value
                }
              }
            },
            [`calories.${lastIndex}.value`]: calories.value, // Actualiza el valor de calorías
            [`calories.${lastIndex}.date`]: new Date(calories.date), // Actualiza la fecha de calorías
          }
        }
      );
      return res.status(200).json({ message: 'Month added with day and calories', calories: calories.value,
        calMonth: updatedUser.CalMonth });
    }

    if (!user.CalMonth[mesActualEnEspañol].days[dia]) {
      // Añadir el día con calorías si el día no existe
      await collection.updateOne(
        { email: userEmail },
        {
          $set: {
            [`CalMonth.${mesActualEnEspañol}.days.${dia}`]: {
              calories: calories.value
            },
            [`calories.${lastIndex}.value`]: calories.value, // Actualiza el valor de calorías
            [`calories.${lastIndex}.date`]: new Date(calories.date), // Actualiza la fecha de calorías
          }
        }
      );
      return res.status(200).json({ message: 'Day added with calories', calories: calories.value,
        calMonth: updatedUser.CalMonth });
    }

    // Si el mes y el día existen, actualizar las calorías del último día del mes
    const days = user.CalMonth[mesActualEnEspañol].days;
    const lastDay = Math.max(...Object.keys(days).map(Number)); // Encuentra el último día

    await collection.updateOne(
      { email: userEmail },
      {
        $set: {
          [`CalMonth.${mesActualEnEspañol}.days.${lastDay}.calories`]: calories.value,
          [`calories.${lastIndex}.value`]: calories.value, // Actualiza el valor de calorías
          [`calories.${lastIndex}.date`]: new Date(calories.date), // Actualiza la fecha de calorías
        }
      }
    );
    return res.status(200).json({ message: 'Calories updated for the last day of the month', calories: calories.value,
      calMonth: updatedUser.CalMonth });

  } catch (error) {
    console.error('Error actualizando las calorías:', error);
    return res.status(500).json({
      message: 'Error actualizando las calorías',
      errorDetails: error.message
    });
  }
});





// Crear un nuevo registro de calorías (POST)
router.post('/cal', async (req, res) => {
  const { userEmail, calories, CalMonth } = req.body;
  if (!userEmail || calories == null || !CalMonth) {
    return res.status(400).json({ message: 'Email, calories, and CalMonth are required' });
  }
  try {
    const db = req.dbClient.db('abmUsers');
    const collection = db.collection('users');
    // Actualizar o insertar el documento
    const result = await collection.updateOne(
      { email: userEmail },
      { 
        $push: { calories: { value: calories.value, date: new Date(calories.date) } },
        $set: { CalMonth: CalMonth }
      },
      { upsert: true }
    );
    res.status(201).json({ message: 'Calories created successfully', data: result, CalMonth: CalMonth });
  } catch (error) {
    console.error('Error creating calories:', error);
    res.status(500).json({ message: 'Error creating calories' });
  }
});
// Middleware de manejo de errores
router.use((err, req, res, next) => {
  console.error('Error en Express middleware:', err);
  res.status(500).json({ message: 'Something broke!' });
});
module.exports = router;