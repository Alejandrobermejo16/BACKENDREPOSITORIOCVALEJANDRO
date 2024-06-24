const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

// Habilitar CORS globalmente para todas las rutas
app.use(cors({
  origin: '*', // Permitir solicitudes desde cualquier origen (ajustar según necesidades)
  methods: ['GET', 'POST', 'OPTIONS', 'PUT', 'PATCH', 'DELETE'], // Métodos HTTP permitidos
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Custom-Header'], // Encabezados permitidos (incluyendo X-Custom-Header)
  credentials: true // Permite enviar credenciales (cookies)
}));

// Middleware para analizar el cuerpo de la solicitud JSON
app.use(bodyParser.json());

// Ruta de inicio
app.get('/', (req, res) => {
  res.send('¡Hola, mundo desde el backend!');
});

// Rutas de la API
const usersRouter = require('./api/users');
const createUserRouter = require('./api/createUser');
const getUserByIdRouter = require('./api/getUserById');

app.use('/users', usersRouter); // Ruta para otras operaciones relacionadas con usuarios
app.use('/api/users', createUserRouter); // Ruta para crear usuarios

// Ruta para obtener un usuario por ID
app.use('/api/users/:userId', getUserByIdRouter);

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
