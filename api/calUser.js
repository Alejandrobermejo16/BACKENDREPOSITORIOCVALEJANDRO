router.put('/cal', async (req, res) => {
  const { userEmail, calories, CalMonth } = req.body;

  if (!userEmail || calories == null || !CalMonth) {
    return res.status(400).json({ message: 'Email, calories, and CalMonth are required' });
  }

  try {
    const db = req.dbClient.db('abmUsers');
    const collection = db.collection('users');

    // Obtener la fecha actual
    const fechaActual = new Date();

    // Formatear mes y día en español
    const mesActualEnEspañol = new Intl.DateTimeFormat('es-ES', { month: 'long' }).format(fechaActual);
    const dia = fechaActual.getDate(); // Día actual del mes

    // Construir la ruta de actualización dinámica para `CalMonth`
    const updatePath = `CalMonth.${mesActualEnEspañol}.days.${dia}.calories`;

    // Verificar si el usuario existe
    const user = await collection.findOne({ email: userEmail });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Actualizar el documento en MongoDB
    const result = await collection.updateOne(
      { email: userEmail },
      {
        $set: {
          [updatePath]: calories.value,  // Actualiza las calorías en la ruta dinámica
        },
        $push: {
          'calories': {
            value: calories.value,
            date: new Date(calories.date) // Asegúrate de que la fecha sea en formato ISO.
          }
        }
      },
      { upsert: true } // Crea el documento si no existe
    );

    if (result.modifiedCount > 0 || result.upsertedCount > 0) {
      return res.status(200).json({ message: 'Calories updated successfully' });
    } else {
      return res.status(404).json({ message: 'No calories to update' });
    }

  } catch (error) {
    console.error('Error actualizando las calorías:', error);
    return res.status(500).json({ 
      message: 'Error actualizando las calorías', 
      errorDetails: error.message 
    });
  }
});
