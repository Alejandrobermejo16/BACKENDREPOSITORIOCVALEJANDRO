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

// Ruta para crear o actualizar una sección
router.post("/createNewSection", async (req, res) => {
  const { orderSections, contentSave } = req.body;

  try {
    const database = req.dbClient.db("abmUsers");
    const collection = database.collection("abmSections");

    // Verificamos si la sección ya existe
    const existingSection = await collection.findOne({
      Sections: orderSections,
    });

    if (existingSection) {
      // Si la sección ya existe y no tiene contenido (contentSave vacío), devolvemos un error
      if (!existingSection.contentSave) {
        return res.status(409).json({ message: "La sección ya existe pero no tiene contenido" });
      }

      // Si la sección existe y tiene contenido, la actualizamos con el nuevo contenido
      if (contentSave) {
        const updatedSection = {
          $set: { contentSave: contentSave }, // Actualizamos el campo contentSave
        };

        await collection.updateOne(
          { Sections: orderSections },
          updatedSection
        );

        return res.status(200).json({ message: "Sección actualizada correctamente" });
      }
    } else {
      // Si la sección no existe, la creamos sin contenido
      const newSection = {
        Sections: orderSections,
        contentSave: "", // Al principio no tiene contenido
      };

      await collection.insertOne(newSection);

      return res.status(201).json({ message: "Sección creada correctamente" });
    }
  } catch (error) {
    console.error("Error al crear o actualizar la sección:", error);
    return res.status(500).json({ message: "Error creando o actualizando sección" });
  }
});

// Ruta para actualizar solo el contenido de una sección existente (si ya existe)
router.post("/updateSectionContent", async (req, res) => {
  const { orderSections, contentSave } = req.body;

  try {
    const database = req.dbClient.db("abmUsers");
    const collection = database.collection("abmSections");

    // Verificamos si la sección existe
    const existingSection = await collection.findOne({
      Sections: orderSections,
    });

    if (existingSection) {
      // Si la sección existe, actualizamos solo el contenido
      const updatedSection = {
        $set: { contentSave: contentSave }, // Actualizamos el contenido de la sección
      };

      await collection.updateOne(
        { Sections: orderSections },
        updatedSection
      );

      return res.status(200).json({ message: "Contenido de la sección actualizado correctamente" });
    } else {
      return res.status(404).json({ message: "Sección no encontrada para actualización" });
    }
  } catch (error) {
    console.error("Error al actualizar el contenido de la sección:", error);
    return res.status(500).json({ message: "Error al actualizar el contenido de la sección" });
  }
});

// Exporta el router para que pueda ser utilizado en index.js
module.exports = router;
