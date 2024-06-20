require('dotenv').config();
const express = require('express');
const { MongoClient } = require('mongodb');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(bodyParser.json());

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

const connectMongoDB = async () => {
  try {
    await client.connect();
    console.log('Conexión establecida correctamente con MongoDB');
  } catch (error) {
    console.error('Error al conectar con MongoDB:', error);
    throw error;
  }
};

const asyncMiddleware = fn => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

app.use(asyncMiddleware(async (req, res, next) => {
  await connectMongoDB();
  req.dbClient = client;
  next();
}));

app.post('/api/users', asyncMiddleware(async (req, res) => {
  const { name, email, password } = req.body;
  const dbClient = req.dbClient;

  try {
    const database = dbClient.db('abmUsers');
    const collection = database.collection('users');

    const existingUser = await collection.findOne({ $or: [{ name }, { email }] });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const newUser = { name, email, password };
    const result = await collection.insertOne(newUser);
    res.status(201).json({ message: 'User created successfully', userId: result.insertedId });
  } catch (error) {
    console.error('Error inserting user:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}));

app.get('/', (req, res) => {
  res.send('¡Hola, mundo desde el backend!');
});

app.use((err, req, res, next) => {
  console.error('Error in Express middleware:', err);
  res.status(500).json({ message: 'Something broke!' });
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});
