// api/tareaProgramada.js

module.exports = (req, res) => {
    if (req.method === 'POST') {
      // Lógica para manejar la tarea programada
      console.log("Tarea programada ejecutada.");
      res.status(200).json({ message: "Tarea programada ejecutada correctamente." });
    } else {
      res.status(405).json({ message: "Método no permitido." });
    }
  };
  