// index.js

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

const whiteList = ['http://localhost/3001','http://localhost/3000','https://backendabmprojects.vercel.app/api/users','https://backendabmprojects.vercel.app', 'https://abmprojects-7kay.vercel.app/']

app.use(cors({
  origin: whiteList, // Permitir solicitudes desde cualquier origen (ajustar según necesidades)
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

// Ruta de inicio
app.get('/users', (req, res) => {
  res.send('¡Hola, mundo desde el backend!');
});

// Ruta de inicio
app.get('/api/users', (req, res) => {
  res.send('¡Hola, mundo desde el backend!');
});

// Rutas de la API
const usersRouter = require('./api/users');
const createUserRouter = require('./api/createUser');
const getUserByIdRouter = require('./api/getUserById');

app.use('/api/users', usersRouter);
app.use('/api/users/create', createUserRouter);
app.use('/api/users/:userId', getUserByIdRouter);

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
