// // scripts/resetCalories.js

// const cron = require('node-cron');
// const axios = require('axios');

// // Función para configurar el cron job
// const setupCronJobs = () => {
//   cron.schedule('* * * * *', async () => {
//     try {
//       console.log('Ejecutando cron job para restablecer las calorías a las 00:01...');
//       await axios.post('https://backendabmprojects.vercel.app/api/resetCalories');
//       console.log('Restablecimiento de calorías completado.');
//     } catch (error) {
//       console.error('Error al ejecutar cron job:', error); 
//     }
//   });
// };

// // Exportar la función para que pueda ser importada en el archivo principal
// module.exports = setupCronJobs;
