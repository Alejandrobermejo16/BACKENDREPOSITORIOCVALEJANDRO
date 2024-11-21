const express = require('express');
const router = express.Router();

router.get('/getSections', async (req, res) => {
    const dbClient = req.dbClient;

    try {
        const database = dbClient.db('abmUsers');
        const collection = database.collection('abmSections');
        
        const sections = await collection.find({}).toArray();

        if (sections.length === 0) {
            return res.status(404).json({ message: 'No secciones encontradas' });
        }

        res.status(200).json({ message: 'Secciones encontradas', sections });
    } catch (error) {
        console.error('Error al obtener las secciones:', error);
        res.status(500).json({ message: 'Error al obtener las secciones' });
    }
});

module.exports = router;
