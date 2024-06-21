require('dotenv').config();
const express = require('express');
const { MongoClient } = require('mongodb');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(bodyParser.json());

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

const connectMongoDB = async () => {
  if (!client.topology || !client.topology.isConnected()) {
    try {
      await client.connect();
      console.log('Conexión establecida correctamente con MongoDB');
    } catch (error) {
      console.error('Error al conectar con MongoDB:', error);
      throw error;
    }
  }
};

app.use(async (req, res, next) => {
  await connectMongoDB();
  req.dbClient = client;
  next();
});

app.post('/api/users', async (req, res, next) => {
  const { name, email, password } = req.body;
  console.log('Datos recibidos:', { name, email, password });
  const dbClient = req.dbClient;

  try {
    const database = dbClient.db('abmUsers');
    const collection = database.collection('users');

    const existingUser = await collection.findOne({ $or: [{ name }, { email }] });
    if (existingUser) {
      console.log('Usuario ya existe:', existingUser);
      return res.status(400).json({ message: 'User already exists' });
    }

    const newUser = { name, email, password };
    const result = await collection.insertOne(newUser);
    console.log('Usuario creado:', result.insertedId);
    res.status(201).json({ message: 'User created successfully', userId: result.insertedId });
  } catch (error) {
    console.error('Error al crear usuario:', error);
    next(error); 
  }
});

app.use((err, req, res, next) => {
  console.error('Error in Express middleware:', err);
  res.status(500).json({ message: 'Something broke!' });
});

app.listen(PORT, () => {
  console.log(`API de usuarios corriendo en el puerto ${PORT}`);
});

module.exports = app;
