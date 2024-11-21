const express = require("express");
const { MongoClient } = require("mongodb");
const bodyParser = require("body-parser");
const cors = require("cors");
require("dotenv").config();

const router = express.Router();
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

// Middleware para permitir solicitudes CORS desde cualquier origen (solo para pruebas locales)
router.use(cors());

// Middleware para analizar el cuerpo de la solicitud JSON
router.use(bodyParser.json());

// Middleware para conectar a MongoDB antes de cada solicitud
const connectMongoDB = async () => {
  try {
    if (!client.isConnected()) {
      await client.connect();
      console.log("Conexión establecida correctamente con MongoDB");
    }
  } catch (error) {
    console.error("Error al conectar con MongoDB:", error);
    throw error;
  }
};

// Middleware asincrónico para conectar MongoDB antes de cada solicitud
router.use(async (req, res, next) => {
  try {
    if (!client.topology || !client.topology.isConnected()) {
      await client.connect();
    }
    req.dbClient = client; // Aquí asignas el cliente a req.dbClient
    next();
  } catch (error) {
    console.error("Error al conectar con MongoDB:", error);
    res.status(500).json({ message: "Error connecting to database" });
  }
});

// Ruta para crear una nueva sección
router.post("/createNewSection", async (req, res) => {
  const { orderSections } = req.body;

  try {
    const database = req.dbClient.db("abmUsers"); // Cambié dbClient por req.dbClient
    const collection = database.collection("abmSections");

    // Verificamos si la sección ya existe en la base de datos
    const existingorderSections = await collection.findOne({
      Sections: orderSections,
    });

    // Si la sección existe, retornamos el error 409
    if (existingorderSections) {
      return res.status(409).json({ message: "La sección ya existe" });
    }

    // Si la sección no existe, creamos la nueva
    if (!existingorderSections) {
      const neworderSections = { Sections: orderSections };
      // Insertamos la nueva sección en la base de datos
      const result = await collection.insertOne(neworderSections);

      // Devolvemos una respuesta exitosa con el estado 201
      return res.status(201).json({ message: "Sección creada correctamente" });
    }
  } catch (error) {
    console.error("Error al crear sección:", error);
    return res.status(500).json({ message: "Error creando sección" });
  }
});

// Exporta el router para que pueda ser utilizado en index.js
module.exports = router;
